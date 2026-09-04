import * as CANNON from 'cannon-es';

/**
 * High-Performance F1 Arcade & Raycast Physics Controller
 * Built on Cannon-es with realistic aerodynamic downforce, speed-sensitive steering,
 * 8-speed transmission with RPM simulation, lateral slip friction, and off-track penalties.
 */
export class PhysicsWorld {
  constructor() {
    // 1. Cannon World Setup (Strict track plane simulation)
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, 0, 0) // Track vertical position is explicitly locked at Y=0.04
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.defaultContactMaterial.friction = 0.0;
    this.world.defaultContactMaterial.restitution = 0.0;

    // Track surface check callback (provided by Track)
    this.isOnTrackCallback = null;
    this.track = null;

    // Gear Ratios (1 to 8 + Reverse)
    // Tuned so gears 1 to 6 are actively used during track driving, and 7-8 on high-speed straights
    this.gearRatios = [
      { gear: 1, minSpeed: 0, maxSpeed: 45, ratio: 3.4 },
      { gear: 2, minSpeed: 40, maxSpeed: 85, ratio: 2.6 },
      { gear: 3, minSpeed: 80, maxSpeed: 130, ratio: 2.0 },
      { gear: 4, minSpeed: 125, maxSpeed: 180, ratio: 1.55 },
      { gear: 5, minSpeed: 175, maxSpeed: 230, ratio: 1.25 },
      { gear: 6, minSpeed: 225, maxSpeed: 280, ratio: 1.05 },
      { gear: 7, minSpeed: 275, maxSpeed: 315, ratio: 0.90 },
      { gear: 8, minSpeed: 310, maxSpeed: 350, ratio: 0.78 }
    ];

    // Reused Cannon vectors — never allocate inside the sim tick
    this._fwd = new CANNON.Vec3();
    this._right = new CANNON.Vec3();
    this._force = new CANNON.Vec3();
  }

  _applyScaledForce(body, dir, magnitude) {
    this._force.set(dir.x * magnitude, dir.y * magnitude, dir.z * magnitude);
    body.applyForce(this._force);
  }

  setTrack(track) {
    this.track = track;
  }

  createVehicleBody(startX = 0, startY = 0.04, startZ = 0) {
    // F1 Chassis dimensions: ~1.8m width, 0.55m height, 4.6m length
    const chassisShape = new CANNON.Box(new CANNON.Vec3(0.9, 0.25, 2.2));
    const chassisBody = new CANNON.Body({
      mass: 880, // Heavy realistic F1 model (880 kg with fuel & driver for solid road inertia)
      position: new CANNON.Vec3(startX, 0.04, startZ),
      shape: chassisShape,
      linearDamping: 0.08,
      angularDamping: 0.70, // High rotational damping strictly < 1.0 (prevents Math.pow NaN)
      angularFactor: new CANNON.Vec3(0, 1, 0), // Strictly rotate around Y (yaw/steer) - prevents flipping!
      linearFactor: new CANNON.Vec3(1, 0, 1)    // Strictly move on track plane (X, Z) - prevents flying into the air!
    });

    this.world.addBody(chassisBody);

    // Vehicle dynamic state
    const vehicle = {
      body: chassisBody,
      currentGear: 1,
      rpm: 4000,
      targetRpm: 4000,
      lateralSlip: 0,
      isOnTrack: true,
      drsActive: false,
      isReversing: false,
      steerAngle: 0,
      justImpacted: false,
      impactImpulse: 0,
      lastImpactTime: 0,
      // Phase 6: Damage multipliers
      steeringDragMultiplier: 1.0,
      topSpeedMultiplier: 1.0
    };

    return vehicle;
  }

  /**
   * Apply realistic F1 physics forces to the vehicle
   */
  updateVehicle(vehicle, controls, dt, audioManager = null) {
    const body = vehicle.body;

    // Guarantee finite position and velocity (prevents NaN corruption)
    if (!Number.isFinite(body.position.x) || !Number.isFinite(body.position.y) || !Number.isFinite(body.position.z)) {
      body.position.set(120, 0.04, -150);
    }
    if (!Number.isFinite(body.velocity.x) || !Number.isFinite(body.velocity.y) || !Number.isFinite(body.velocity.z)) {
      body.velocity.set(0, 0, 0);
    }

    // Local Coordinate Vectors (reused — no per-tick allocation)
    const forward = this._fwd;
    forward.set(0, 0, 1);
    body.quaternion.vmult(forward, forward);

    const right = this._right;
    right.set(1, 0, 0);
    body.quaternion.vmult(right, right);

    // Velocities in local space
    const vel = body.velocity;
    const rawForward = vel.dot(forward);
    const rawLateral = vel.dot(right);
    const forwardSpeed = Number.isFinite(rawForward) ? rawForward : 0; // m/s
    const lateralSpeed = Number.isFinite(rawLateral) ? rawLateral : 0; // m/s
    const speedKmh = Math.abs(forwardSpeed) * 3.6;

    // Check if on track asphalt vs off-track grass/gravel
    vehicle.isOnTrack = this.isOnTrackCallback ? this.isOnTrackCallback(body.position.x, body.position.z) : true;
    
    // 100% MAXIMUM TRACTION CONTROL (Permanent & Unchangeable by user request)
    // Default 100% full traction locked at all times
    const gripMultiplier = 1.0;
    const dragMultiplier = 1.0;

    // 1. MASSIVE AERODYNAMIC DOWNFORCE (F_down = C_down * v^2)
    // F1 cars generate immense aerodynamic suction that glues them to the asphalt
    const baseDownforceCoeff = 6.2;
    vehicle.drsActive = speedKmh > 220 && Math.abs(controls.steer) < 0.1;
    const effectiveDownforceCoeff = vehicle.drsActive ? baseDownforceCoeff * 0.75 : baseDownforceCoeff;
    const downforceMagnitude = effectiveDownforceCoeff * (forwardSpeed * forwardSpeed);

    // 2. AERODYNAMIC DRAG (F_drag = C_drag * v^2)
    const baseDragCoeff = 0.85;
    const effectiveDragCoeff = (vehicle.drsActive ? baseDragCoeff * 0.75 : baseDragCoeff) * dragMultiplier;
    this._applyScaledForce(body, forward, -effectiveDragCoeff * forwardSpeed * Math.abs(forwardSpeed));

    // 3. GEARBOX & ENGINE PROPULSION
    let throttle = controls.throttle;
    let brake = controls.brake;

    // Reverse gear handling: only engage when brake is held and car is fully stopped.
    // CRITICAL: clearing reverse mode must depend ONLY on user intent (throttle press),
    // not on velocity sign — otherwise near-zero velocity causes isReversing to flicker
    // every tick and the reverse force (negative) fights the engine force (positive).
    if (vehicle.isReversing) {
      if (throttle > 0.1) {
        vehicle.isReversing = false;
      }
    } else {
      if (controls.brake > 0.5 && Math.abs(forwardSpeed) < 0.15) {
        vehicle.isReversing = true;
      }
    }

    if (vehicle.isReversing) {
      vehicle.currentGear = -1; // Reverse
      if (controls.brake > 0 && forwardSpeed > -16) { // max ~58 km/h in reverse
        const reverseForce = -controls.brake * 5200 * gripMultiplier;
        this._applyScaledForce(body, forward, reverseForce);
      }
      // If pressing throttle while reversing, brake to stop (clamped to prevent overshoot).
      // Gate on a wider gap so we don't fight the reverse force every tick near standstill.
      if (throttle > 0 && forwardSpeed < -0.3) {
        const maxStopForce = Math.abs(forwardSpeed) * 880 / Math.max(dt, 1 / 120);
        const stopForce = Math.min(maxStopForce, throttle * 28.0 * 880);
        this._applyScaledForce(body, forward, stopForce);
      }
    } else {
      // Auto-Shift Gears based on speed
      let newGear = 1;
      for (let g = this.gearRatios.length - 1; g >= 0; g--) {
        if (speedKmh >= this.gearRatios[g].minSpeed) {
          newGear = this.gearRatios[g].gear;
          break;
        }
      }

      if (newGear !== vehicle.currentGear && audioManager) {
        audioManager.playGearShift();
      }
      vehicle.currentGear = newGear;

      // Engine Acceleration Force (scaled for 880 kg heavy chassis)
      if (throttle > 0) {
        const gearRatio = this.gearRatios[vehicle.currentGear - 1].ratio;
        let engineForce = throttle * 14200 * gearRatio * gripMultiplier;

        // Top speed limit on track with damage multiplier
        const effectiveTopSpeed = 355 * (vehicle.topSpeedMultiplier || 1.0);
        if (vehicle.isOnTrack && speedKmh > effectiveTopSpeed) {
          engineForce = 0;
        }

        this._applyScaledForce(body, forward, engineForce);
      }

      // ENGINE BRAKING + ROLLING RESISTANCE (applied whenever the throttle is released)
      // Real F1 cars decelerate strongly when the driver lifts off the accelerator
      // because the engine + drivetrain still drags the wheels along (engine braking).
      if (throttle <= 0.01 && Math.abs(forwardSpeed) > 0.05) {
        const speedAbs = Math.abs(forwardSpeed);

        // Engine braking (scales with current gear ratio — higher gear = stronger compression braking)
        const gearRatio = this.gearRatios[vehicle.currentGear - 1].ratio;
        const engineBrakeForce = 1800 * gearRatio * gripMultiplier;
        this._applyScaledForce(body, forward, -Math.sign(forwardSpeed) * engineBrakeForce);

        // Rolling resistance: small constant opposing force (tyre deformation + bearing friction)
        const rollingResistanceForce = 380 * gripMultiplier;
        this._applyScaledForce(body, forward, -Math.sign(forwardSpeed) * rollingResistanceForce);

        // Clamp so deceleration never overshoots zero velocity this frame
        const maxDecelForce = speedAbs * 880 / Math.max(dt, 1 / 120);
        // (The two opposing forces above are already well under this limit, but guard anyway)
        if ((engineBrakeForce + rollingResistanceForce) > maxDecelForce) {
          const scale = maxDecelForce / (engineBrakeForce + rollingResistanceForce);
          this._applyScaledForce(body, forward, -Math.sign(forwardSpeed) * scale * (engineBrakeForce + rollingResistanceForce));
        }
      }

      // Braking Force: clamped to never overshoot past zero velocity (prevents oscillation)
      if (brake > 0 && Math.abs(forwardSpeed) > 0.05) {
        // Maximum force that would bring the car to exactly zero this frame
        const maxBrakeForce = Math.abs(forwardSpeed) * 880 / Math.max(dt, 1 / 120);
        const desiredBrakeForce = brake * 32.0 * gripMultiplier * 880;
        const clampedBrakeForce = Math.min(maxBrakeForce, desiredBrakeForce);
        this._applyScaledForce(body, forward, -Math.sign(forwardSpeed) * clampedBrakeForce);
      }
    }

    // Velocity Clamping: limit maximum velocity to 100 m/s (360 km/h)
    const currentSpeedSq = body.velocity.lengthSquared();
    if (currentSpeedSq > 10000) {
      body.velocity.scale(100.0 / Math.sqrt(currentSpeedSq), body.velocity);
    }

    // 4. ENGINE RPM CALCULATION
    if (vehicle.isReversing) {
      vehicle.rpm = 4000 + Math.abs(forwardSpeed / 18) * 6000;
    } else {
      const gearIndex = Math.max(0, Math.min(this.gearRatios.length - 1, (vehicle.currentGear || 1) - 1));
      const currentGearData = this.gearRatios[gearIndex];
      const gearRange = Math.max(1, currentGearData.maxSpeed - currentGearData.minSpeed);
      const speedInGear = Math.max(0, speedKmh - currentGearData.minSpeed);
      const rpmFraction = Math.min(1.0, speedInGear / gearRange);
      const idleRpm = throttle > 0.1 ? 6000 : 4200;
      vehicle.rpm = idleRpm + rpmFraction * 7800 + (throttle * 1200);
      if (vehicle.rpm > 13500) vehicle.rpm = 13500;
      if (!Number.isFinite(vehicle.rpm)) vehicle.rpm = 4200;
    }

    // 5. AAA DYNAMIC STEERING & PROGRESSIVE YAW CONTROL
    // A / Left: Steer LEFT (+1)
    // D / Right: Steer RIGHT (-1)
    vehicle.steerAngle = controls.steer;

    if (Math.abs(forwardSpeed) > 0.3) {
      const turnDir = Math.sign(forwardSpeed);

      // AAA Non-Linear S-Curve: Small wheel movements allow micro-adjustments on straights;
      // deeper turns give full lock for hairpins without twitchiness:
      const steerSign = Math.sign(controls.steer);
      const steerMag = Math.abs(controls.steer);
      const progressiveSteer = steerSign * Math.pow(steerMag, 1.4);

      // Speed-dependent max turn rate (rad/sec):
      // Low-speed (hairpins): ~1.85 rad/s (tight turns)
      // High-speed (300 km/h): ~0.82 rad/s (laser-steady, silky-smooth carving)
      const speedFactor = Math.max(0.38, 1.0 - (speedKmh / 360) * 0.62);
      
      // Apply steering drag multiplier from damage (increased drag = slower turn rate)
      const steeringDrag = vehicle.steeringDragMultiplier || 1.0;
      const maxTurnRate = (1.85 / steeringDrag) * speedFactor;
      const targetYawRate = progressiveSteer * turnDir * maxTurnRate;

      // Smooth yaw acceleration filter (eliminates instant angular jerking)
      body.angularVelocity.y += (targetYawRate - body.angularVelocity.y) * Math.min(1.0, dt * 14.0);

      // 6. 100% MAXIMUM CORNERING TRACTION (PROGRESSIVE VELOCITY CURVE)
      // In AAA racing games, the velocity vector follows the heading smoothly with zero snap and zero slide!
      const totalSpeed = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.z * body.velocity.z);
      if (totalSpeed > 0.2) {
        const forwardSign = Math.sign(forwardSpeed || 1);
        const targetVelX = forward.x * totalSpeed * forwardSign;
        const targetVelZ = forward.z * totalSpeed * forwardSign;

        // Progressive momentum transition (100% glued traction, zero lag, silky smooth)
        const corneringRate = Math.min(1.0, dt * 15.0);
        body.velocity.x += (targetVelX - body.velocity.x) * corneringRate;
        body.velocity.z += (targetVelZ - body.velocity.z) * corneringRate;
      }
    } else {
      body.angularVelocity.y = 0;
    }

    // Visual / audio slip is derived from inputs (physics stay glued)
    vehicle.lateralSlip = 0.0;

    // 7. IMPENETRABLE SIDE BARRIER DEFLECTION & CONTAINMENT
    if (this.track && typeof this.track.getClosestTrackPoint === 'function') {
      const trackInfo = this.track.getClosestTrackPoint(body.position.x, body.position.z);
      const barrierLimit = (this.track.barrierDistance || 11.5) - 0.85;

      if (trackInfo && trackInfo.distance > barrierLimit && trackInfo.point) {
        const dx = trackInfo.point.x - body.position.x;
        const dz = trackInfo.point.z - body.position.z;
        const distToCenter = Math.sqrt(dx * dx + dz * dz);

        if (distToCenter > 0.001) {
          const nx = dx / distToCenter; // inward unit normal
          const nz = dz / distToCenter;

          // Clamp position strictly inside barrier
          body.position.x = trackInfo.point.x - nx * barrierLimit;
          body.position.z = trackInfo.point.z - nz * barrierLimit;

          // Reflect velocity off barrier
          const inwardSpeed = body.velocity.x * nx + body.velocity.z * nz;
          if (inwardSpeed < 0) {
            const impactSpeed = -inwardSpeed;
            body.velocity.x -= (1.0 + 0.35) * inwardSpeed * nx;
            body.velocity.z -= (1.0 + 0.35) * inwardSpeed * nz;

            body.velocity.x *= 0.92;
            body.velocity.z *= 0.92;

            vehicle.lateralSlip = Math.max(0.75, vehicle.lateralSlip);

            const nowMs = performance.now();
            if (impactSpeed > 4.5 && nowMs - (vehicle.lastImpactTime || 0) > 140) {
              vehicle.justImpacted = true;
              vehicle.impactImpulse = impactSpeed;
              vehicle.lastImpactTime = nowMs;
            }
          }
        }
      }

      // 8. ANTI-REVERSE SYSTEM (Prevent reversing back through start line/gantry lights)
      if (trackInfo && (trackInfo.t < 0.025 || trackInfo.t > 0.975)) {
        if (forwardSpeed < -0.15) {
          body.velocity.x = 0;
          body.velocity.z = 0;
          vehicle.isReversing = false;
          vehicle.reverseBlocked = true;
        } else {
          vehicle.reverseBlocked = false;
        }
      } else {
        vehicle.reverseBlocked = false;
      }
    }

    // 9. GROUND RETENTION GUARANTEE (Lock vertical position to track surface)
    const trackElev = (trackInfo && trackInfo.point && Number.isFinite(trackInfo.point.y)) ? trackInfo.point.y : 0;
    body.position.y = trackElev + 0.04;
    body.velocity.y = 0;
    body.angularVelocity.x = 0;
    body.angularVelocity.z = 0;
  }

  /**
   * Step physics simulation
   */
  step(dt) {
    this.world.step(1 / 60, dt, 3);
  }

  resetVehicle(vehicle, x, y, z, yawAngle = 0, initialForwardSpeed = 0) {
    const validY = Number.isFinite(y) ? y : 0.04;
    vehicle.body.position.set(x, validY, z);
    vehicle.body.velocity.set(0, 0, 0);
    vehicle.body.angularVelocity.set(0, 0, 0);

    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yawAngle);
    vehicle.body.quaternion.copy(q);

    if (initialForwardSpeed !== 0) {
      const forward = new CANNON.Vec3(0, 0, 1);
      q.vmult(forward, forward);
      vehicle.body.velocity.copy(forward.scale(initialForwardSpeed));
    }

    vehicle.currentGear = 1;
    vehicle.rpm = 4000;
    vehicle.lateralSlip = 0;
    vehicle.isReversing = false;
  }

  /**
   * Toggles ghost collision filtering between two vehicles (e.g. Host & Guest during Qualifying)
   */
  setGhostCollision(bodyA, bodyB, isGhost = true) {
    if (!bodyA || !bodyB) return;
    const body1 = bodyA.body || bodyA;
    const body2 = bodyB.body || bodyB;

    if (isGhost) {
      // Group 2 (Car 1): collides with all except Group 4 (Car 2)
      body1.collisionFilterGroup = 2;
      body1.collisionFilterMask = ~4;

      // Group 4 (Car 2): collides with all except Group 2 (Car 1)
      body2.collisionFilterGroup = 4;
      body2.collisionFilterMask = ~2;
    } else {
      // Restore standard collision with all bodies
      body1.collisionFilterGroup = 1;
      body1.collisionFilterMask = -1;
      body2.collisionFilterGroup = 1;
      body2.collisionFilterMask = -1;
    }
  }
}
