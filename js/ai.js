import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { F1Car } from './car.js?v=32';

/**
 * 10-Driver Authentic Grand Prix Roster
 */
export const DRIVER_ROSTER = [
  {
    id: 'player',
    name: 'PLAYER',
    code: 'YOU',
    team: 'Ferrari',
    number: '16',
    color: 0xdc0000,
    secondaryHex: '#ffffff',
    accentHex: '#111827',
    accentColor: 0xffffff,
    isPlayer: true
  },
  {
    id: 'ai_1',
    name: 'M. Verstappen',
    code: 'VER',
    team: 'Orion Racing',
    number: '07',
    color: 0x0a1d3b,
    secondaryHex: '#0e1117',
    accentHex: '#e30613',
    accentColor: 0xffcc00,
    isPlayer: false,
    baseSkill: 0.99,
    teamId: 'redbull'
  },
  {
    id: 'ai_2',
    name: 'L. Hamilton',
    code: 'HAM',
    team: 'Mercedes-AMG',
    number: '44',
    color: 0x00d2be,
    secondaryHex: '#c0c0c0',
    accentHex: '#0a0a0a',
    accentColor: 0x00f0ff,
    isPlayer: false,
    baseSkill: 0.97,
    teamId: 'mercedes'
  },
  {
    id: 'ai_3',
    name: 'L. Norris',
    code: 'NOR',
    team: 'McLaren',
    number: '4',
    color: 0xff8000,
    secondaryHex: '#00d2be',
    accentHex: '#141416',
    accentColor: 0x00d2be,
    isPlayer: false,
    baseSkill: 0.96,
    teamId: 'mclaren'
  },
  {
    id: 'ai_4',
    name: 'F. Alonso',
    code: 'ALO',
    team: 'Aston Martin',
    number: '14',
    color: 0x00594f,
    secondaryHex: '#cedc00',
    accentHex: '#0c221f',
    accentColor: 0xcedc00,
    isPlayer: false,
    baseSkill: 0.95,
    teamId: 'astonmartin'
  },
  {
    id: 'ai_5',
    name: 'P. Gasly',
    code: 'GAS',
    team: 'Alpine',
    number: '10',
    color: 0x0090ff,
    secondaryHex: '#fd4bc7',
    accentHex: '#111111',
    accentColor: 0xfd4bc7,
    isPlayer: false,
    baseSkill: 0.93,
    teamId: 'alpine'
  },
  {
    id: 'ai_6',
    name: 'A. Albon',
    code: 'ALB',
    team: 'Williams',
    number: '23',
    color: 0x0040c0,
    secondaryHex: '#00d2be',
    accentHex: '#ffffff',
    accentColor: 0x00d2be,
    isPlayer: false,
    baseSkill: 0.92,
    teamId: 'williams'
  },
  {
    id: 'ai_7',
    name: 'V. Bottas',
    code: 'BOT',
    team: 'Kick Sauber',
    number: '77',
    color: 0x00e700,
    secondaryHex: '#111111',
    accentHex: '#000000',
    accentColor: 0x00e700,
    isPlayer: false,
    baseSkill: 0.91,
    teamId: 'sauber'
  },
  {
    id: 'ai_8',
    name: 'N. Hülkenberg',
    code: 'HUL',
    team: 'Haas',
    number: '27',
    color: 0xe6002b,
    secondaryHex: '#ffffff',
    accentHex: '#1a1a1a',
    accentColor: 0xffffff,
    isPlayer: false,
    baseSkill: 0.90,
    teamId: 'haas'
  },
  {
    id: 'ai_9',
    name: 'L. Lawson',
    code: 'LAW',
    team: 'Racing Bulls',
    number: '30',
    color: 0x1634ca,
    secondaryHex: '#ffffff',
    accentHex: '#d81e05',
    accentColor: 0xffffff,
    isPlayer: false,
    baseSkill: 0.88,
    teamId: 'rb'
  }
];

export const DIFFICULTY_MODES = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD'
};

export const DIFFICULTY_CONFIG = {
  EASY: {
    name: 'Noob / Casual Racer',
    speedMultiplier: 0.80, // Approachable, casual pace
    accelMultiplier: 0.78,
    earlyBrakingDistance: 15.0, // Beginners brake early
    aggression: 0.20,
    yieldDistance: 2.6,
    overtakeCapable: true,
    defendApex: false, // Never aggressively blocks
    drafting: false,
    overtakeCommitDistance: 20.0,
    lineVariance: 0.40, // Imperfect wandering racing line
    steerWobble: 0.035, // Natural human hand micro-jitter on wheel
    yieldWhenPassed: 0.85, // Courteously leaves space and lifts throttle when player attacks
    qualiMinTime: 84.0,
    qualiMaxTime: 90.0
  },
  MEDIUM: {
    name: 'Amateur / Club Racer',
    speedMultiplier: 0.89, // Balanced, competitive amateur pace
    accelMultiplier: 0.86,
    earlyBrakingDistance: 6.0,
    aggression: 0.50,
    yieldDistance: 1.8,
    overtakeCapable: true,
    defendApex: true, // Occasionally covers apex
    drafting: false,
    overtakeCommitDistance: 26.0,
    lineVariance: 0.18,
    steerWobble: 0.018,
    yieldWhenPassed: 0.50, // Respects track limits and leaves 1 car width
    qualiMinTime: 75.0,
    qualiMaxTime: 78.8
  },
  HARD: {
    name: 'Pro / Esports Racer',
    speedMultiplier: 0.97, // True F1 esports / pro pace
    accelMultiplier: 0.96,
    earlyBrakingDistance: 1.5, // Ultra-late braking
    aggression: 0.82,
    yieldDistance: 1.3,
    overtakeCapable: true,
    defendApex: true, // Aggressively defends inside line
    drafting: true, // Slingshots out of slipstream
    overtakeCommitDistance: 34.0,
    lineVariance: 0.05, // Laser-sharp consistency
    steerWobble: 0.008, // Smooth esports inputs
    yieldWhenPassed: 0.15, // Fierce wheel-to-wheel battles
    qualiMinTime: 72.2,
    qualiMaxTime: 74.5
  }
};

/**
 * Controller for an Individual AI Opponent Car
 */
export class AICar {
  constructor(info, physicsWorld, scene, track) {
    this.info = info;
    this.physics = physicsWorld;
    this.scene = scene;
    this.track = track;

    this.active = false;
    this.currentSpeed = 0; // m/s
    this.trackProgress = 0.0; // t in [0, 1)
    this.currentLap = 1;
    this.totalDistance = 0;
    this.currentSteer = 0;
    this.lateralOffset = 0; // Deviation from optimal racing line (-left, +right)
    this.targetOffset = 0;

    // Physics body & visual mesh
    this.vehicle = this.physics.createVehicleBody(0, 0.04, 0);
    this.visualCar = new F1Car(this.scene, false, {
      primaryColor: this.info.color,
      secondaryHex: this.info.secondaryHex,
      accentHex: this.info.accentHex,
      accentColor: this.info.accentColor,
      carNumber: this.info.number,
      driverName: this.info.name,
      teamName: this.info.team,
      teamId: this.info.teamId
    });
    this.visualCar.group.visible = false;

    // Slipstream drafting timer/state
    this.isDrafting = false;
    this.draftBonusSpeed = 0;

    // Human driver personality & micro-jitter state
    this.driverSeed = Math.random() * 100.0;
    this.humanWobbleTimer = Math.random() * 10.0;
    this.isBeingPassed = false;

    // Remote multiplayer Guest control state
    this.isRemoteGuest = false;
    this.remoteInputs = { throttle: 0, brake: 0, steer: 0 };
  }

  updateLivery(teamOptions) {
    if (this.visualCar && typeof this.visualCar.updateLivery === 'function') {
      this.visualCar.updateLivery(teamOptions);
    }
  }

  setAsRemoteGuest(isGuest = true) {
    this.isRemoteGuest = isGuest;
    if (isGuest) {
      this.info.name = 'GUEST';
      this.info.code = 'GST';
      this.info.team = 'Guest Racing';
      this.info.color = 0x00d2be;
    }
  }

  resetToSlot(slotIndex, totalSlots = 10) {
    // 2x2 staggered starting grid behind Start/Finish line (t = 0.0)
    // Slot 1 is Pole (odd -> left side, offset -3.2m, t ~ 0.993)
    // Slot 2 is P2 (even -> right side, offset +3.2m, t ~ 0.986)
    const slotT = (1.0 - (slotIndex * 0.0065)) % 1.0;
    const pt = this.track.curve.getPointAt(slotT);
    const tgt = this.track.curve.getTangentAt(slotT).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

    const trackWidth = (this.track && this.track.trackWidth) ? this.track.trackWidth : 16.0;
    const sideSpacing = Math.min(3.0, trackWidth * 0.22);
    const sideSign = (slotIndex % 2 === 1) ? -1 : 1;
    const sideDist = sideSpacing * sideSign;
    const spawnX = pt.x + normal.x * sideDist;
    const spawnY = (pt.y || 0) + 0.04;
    const spawnZ = pt.z + normal.z * sideDist;
    const yaw = Math.atan2(tgt.x, tgt.z);

    this.physics.resetVehicle(this.vehicle, spawnX, spawnY, spawnZ, yaw, 0);
    this.trackProgress = slotT;
    this.currentSpeed = 0;
    this.currentLap = 1;
    this.finished = false;
    this.finishTime = null;
    const trackLen = this.track.trackLength || 1850;
    const distFromStart = (1.0 - slotT) * trackLen;
    this.raceDistance = -distFromStart; // Distance relative to start line (negative on grid)
    this.totalDistance = this.raceDistance;
    this.lateralOffset = sideDist * 0.5;
    this.targetOffset = 0;
    this.currentSteer = 0;
    this.isDrafting = false;

    const q = this.visualCar.group.quaternion;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this.visualCar.group.position.set(spawnX, spawnY, spawnZ);
    this.visualCar.group.visible = true;
    this.active = true;
  }

  getPosition() {
    if (this.vehicle && this.vehicle.body) {
      return this.vehicle.body.position;
    }
    if (this.visualCar && this.visualCar.group) {
      return this.visualCar.group.position;
    }
    return { x: 0, y: 0, z: 0 };
  }

  hide() {
    this.active = false;
    if (this.visualCar) {
      this.visualCar.group.visible = false;
    }
  }

  /**
   * Main AI Update Tick
   */
  update(dt, waypoints, difficulty, allCars = [], playerCarPos = null, playerCarVel = null, targetLaps = 3, currentRaceTime = null, audioManager = null) {
    if (!this.active || !this.track) return;

    // Remote Guest Vehicle: Controlled directly via streaming player inputs from WebRTC
    if (this.isRemoteGuest) {
      const controls = {
        throttle: this.remoteInputs.throttle || 0,
        brake: this.remoteInputs.brake || 0,
        steer: this.remoteInputs.steer || 0
      };
      this.physics.updateVehicle(this.vehicle, controls, dt, audioManager);
      this.currentSpeed = this.vehicle.body.velocity.length();
      this.totalDistance += this.currentSpeed * dt;

      if (this.track && waypoints && waypoints.length > 0) {
        const p = this.vehicle.body.position;
        const info = this.track.getClosestTrackPoint(p.x, p.z);
        this.trackProgress = info.t;
      }

      this.visualCar.update(
        this.vehicle.body.position,
        this.vehicle.body.quaternion,
        this.currentSpeed * 3.6,
        controls.steer,
        this.vehicle.currentGear,
        controls.throttle,
        controls.brake
      );
      return;
    }

    const body = this.vehicle.body;
    const pos = body.position;
    const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.MEDIUM;

    // 1. Determine current waypoint along racing line from continuous trackProgress
    const wpCount = waypoints.length;
    const progressClamped = ((this.trackProgress % 1.0) + 1.0) % 1.0;
    const closestWpIdx = Math.min(wpCount - 1, Math.max(0, Math.floor(progressClamped * wpCount)));
    const currentWp = waypoints[closestWpIdx];

    // Dynamic lookahead based on speed and curvature (pure pursuit)
    const isSharpCurve = Math.abs(currentWp.curvature) > 0.07;
    const minLookahead = isSharpCurve ? 3.8 : 5.5;
    const lookaheadMeters = Math.max(minLookahead, Math.min(26.0, this.currentSpeed * 0.26));
    const trackLen = this.track.trackLength || 1850;
    const segLen = trackLen / wpCount;
    const stepCount = Math.max(1, Math.round(lookaheadMeters / Math.max(1.0, segLen)));
    const targetWpIdx = (closestWpIdx + stepCount) % wpCount;
    const targetWp = waypoints[targetWpIdx];

    // 2. Behavioral Adjustments: Active Overtaking, Defensive Line, and Drafting
    let desiredOffset = targetWp.racingLineOffset || 0;
    const forwardVec = new THREE.Vector3(0, 0, 1).applyQuaternion(this.visualCar.group.quaternion);
    const trackNormal = targetWp.normal.clone();

    let carAheadDist = Infinity;
    let carAheadLat = 0;
    let isCarAheadPlayer = false;
    let carAheadSpeed = 999;

    let carAlongside = false;
    let alongsideLat = 0;
    let isAlongsidePlayer = false;

    for (const other of allCars) {
      if (other === this) continue;
      const oPos = other.getPosition();

      // Determine distance along track centerline progress
      let otherT = other.trackProgress;
      if (otherT === undefined || otherT === null) {
        const info = this.track.getClosestTrackPoint(oPos.x, oPos.z);
        otherT = info.t;
      }

      let tDiff = (otherT - this.trackProgress + 1.0) % 1.0;
      if (tDiff > 0.5) tDiff -= 1.0;
      const distAlongTrack = tDiff * trackLen;

      const dx = oPos.x - pos.x;
      const dz = oPos.z - pos.z;
      const dLat = dx * trackNormal.x + dz * trackNormal.z;

      // WHEEL-TO-WHEEL RADAR: Detect rivals alongside (within +/- 4.5m along track and within 3.4m laterally)
      if (Math.abs(distAlongTrack) < 4.5 && Math.abs(dLat) < 3.4) {
        carAlongside = true;
        alongsideLat = dLat;
        if (other.isPlayer) isAlongsidePlayer = true;
      }

      // If other car is strictly behind (distAlongTrack <= 0.2m), don't treat as obstacle ahead
      if (distAlongTrack <= 0.2) continue;

      // Detect if someone is directly ahead in our corridor
      if (distAlongTrack < config.overtakeCommitDistance && Math.abs(dLat) < 3.2) {
        if (distAlongTrack < carAheadDist) {
          carAheadDist = distAlongTrack;
          carAheadLat = dLat;
          isCarAheadPlayer = !!other.isPlayer;
          carAheadSpeed = (other.currentSpeed !== undefined && other.currentSpeed !== null) ? other.currentSpeed : 45.0;
        }
      }
    }

    const trackWidth = (this.track && this.track.trackWidth) ? this.track.trackWidth : 16.0;
    const maxSafeOffset = Math.max(1.8, trackWidth * 0.35);

    // Active Human Racing Behavior & Space-Leaving:
    if (carAlongside) {
      // Car is alongside (wheel-to-wheel racing or being overtaken)!
      // "Leave racing room": shift smoothly away from the rival to preserve a 2.0m-2.4m corridor
      const roomSide = alongsideLat >= 0 ? -1 : 1; // If rival is to our right, shift left; if to our left, shift right
      const roomOffset = Math.min(2.3, trackWidth * 0.22);
      desiredOffset = roomSide * roomOffset;

      if (isAlongsidePlayer && difficulty === DIFFICULTY_MODES.EASY) {
        // Noob player lifts throttle so the user can easily and cleanly pass through
        this.isBeingPassed = true;
      } else {
        this.isBeingPassed = false;
      }
    } else if (config.overtakeCapable && carAheadDist < config.overtakeCommitDistance) {
      // Pick clear passing lane scaled to track width
      const passOffset = Math.min(2.2, trackWidth * 0.22);
      const passSide = carAheadLat >= 0 ? passOffset : -passOffset;
      desiredOffset = passSide;

      if (config.drafting && isCarAheadPlayer && Math.abs(targetWp.curvature) < 0.006) {
        this.isDrafting = true;
        this.draftBonusSpeed = 4.0; // +15 km/h aerodynamic draft
      } else {
        this.isDrafting = false;
        this.draftBonusSpeed = 0;
      }
      this.isBeingPassed = false;
    } else {
      this.isDrafting = false;
      this.draftBonusSpeed = 0;
      this.isBeingPassed = false;

      // Pro Defense in Hard mode: protect inside apex into braking zones when rival is trailing closely
      let defendOffset = 0;
      if (config.defendApex && targetWp.insideApexSign !== 0 && targetWp.isBrakingZone) {
        for (const other of allCars) {
          if (other.isPlayer) {
            const oPos = other.getPosition();
            const pInfo = this.track.getClosestTrackPoint(oPos.x, oPos.z);
            let pDiff = (this.trackProgress - pInfo.t + 1.0) % 1.0;
            if (pDiff > 0.5) pDiff -= 1.0;
            const pDistBehind = pDiff * trackLen;
            if (pDistBehind > 0 && pDistBehind < 22.0) {
              defendOffset = targetWp.insideApexSign * Math.min(2.3, trackWidth * 0.23);
            }
          }
        }
      }

      // Default racing line with organic human line variance
      const humanLineVariance = Math.sin(this.humanWobbleTimer * 0.35 + this.driverSeed) * (config.lineVariance || 0.15);
      desiredOffset = defendOffset !== 0 ? defendOffset : ((targetWp.racingLineOffset || 0) + humanLineVariance);
    }

    // Clamp desired offset within track boundaries
    desiredOffset = Math.max(-maxSafeOffset, Math.min(maxSafeOffset, desiredOffset));

    // Dynamic lateral lane transition
    const laneSpeed = config.aggression > 0.5 ? 5.5 : 4.0;
    this.targetOffset = desiredOffset;
    this.lateralOffset += (this.targetOffset - this.lateralOffset) * Math.min(1.0, dt * laneSpeed);
    this.lateralOffset = Math.max(-maxSafeOffset, Math.min(maxSafeOffset, this.lateralOffset));

    // 3. Proximity Pacing & Speed Management (NEVER stall to 0 km/h on track!)
    let safeSpeedCap = Infinity;
    if (carAheadDist < 6.0 && Math.abs(carAheadLat) < 1.6) {
      // Directly stuck behind a car in the same lane: match their pace safely until passing lane opens
      safeSpeedCap = Math.max(16.0, carAheadSpeed - 0.5);
    }

    // 4. Pure Pursuit Steering with Human Micro-Corrections
    const targetPos = new THREE.Vector3()
      .copy(targetWp.centerPoint || targetWp.position)
      .addScaledVector(targetWp.normal, this.lateralOffset);

    const toTarget = new THREE.Vector3().subVectors(targetPos, pos);
    toTarget.normalize();

    // Calculate angle difference between car heading and target
    const currentHeading = Math.atan2(forwardVec.x, forwardVec.z);
    const targetHeading = Math.atan2(toTarget.x, toTarget.z);
    let angleDiff = targetHeading - currentHeading;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Organic Human Steering Jitter (simulates subtle hand corrections on wheel/gamepad)
    this.humanWobbleTimer += dt;
    const wobbleFreq = (this.humanWobbleTimer * 7.5) + (this.driverSeed % 4.0);
    const wobbleAmp = (config.steerWobble || 0.02) * (1.0 - (this.info.baseSkill || 0.9) * 0.35);
    const humanSteerJitter = Math.sin(wobbleFreq) * wobbleAmp;

    const steerGain = isSharpCurve ? 3.4 : 2.8;
    const rawSteer = Math.max(-1.0, Math.min(1.0, (angleDiff * steerGain) + humanSteerJitter));
    this.currentSteer += (rawSteer - this.currentSteer) * Math.min(1.0, dt * 14.0);

    // 5. Speed Calculation & Balanced Power Matching (matches human player car capabilities)
    let baseTargetSpeed = targetWp.targetSpeed * config.speedMultiplier;
    baseTargetSpeed *= (0.98 + (this.info.baseSkill || 0.9) * 0.04);
    baseTargetSpeed += this.draftBonusSpeed;

    // If Noob AI is being passed by player, lift throttle so user passes easily
    if (this.isBeingPassed) {
      baseTargetSpeed *= 0.78;
    }

    // Early braking adjustments for Easy & Medium in corners
    if (targetWp.isBrakingZone && config.earlyBrakingDistance > 0) {
      baseTargetSpeed *= Math.max(0.72, 1.0 - (config.earlyBrakingDistance / 100.0));
    }

    // Apply safe speed cap if queuing behind another car
    if (baseTargetSpeed > safeSpeedCap) {
      baseTargetSpeed = safeSpeedCap;
    }

    // Finished cooldown pacing (80 km/h in-lap cool-down)
    if (this.finished) {
      baseTargetSpeed = Math.min(baseTargetSpeed, 22.0);
    }

    // Human player matched progressive power acceleration curve
    const currentKmh = this.currentSpeed * 3.6;
    let maxPowerAccel = 0;
    if (currentKmh < 90) {
      maxPowerAccel = 9.8 - (currentKmh / 90) * 2.2; // 9.8 down to 7.6 m/s²
    } else if (currentKmh < 180) {
      maxPowerAccel = 7.6 - ((currentKmh - 90) / 90) * 2.8; // 7.6 down to 4.8 m/s²
    } else if (currentKmh < 260) {
      maxPowerAccel = 4.8 - ((currentKmh - 180) / 80) * 2.4; // 4.8 down to 2.4 m/s²
    } else {
      maxPowerAccel = Math.max(0.6, 2.4 - ((currentKmh - 260) / 65) * 1.8); // 2.4 down to 0.6 m/s²
    }

    const accelMultiplier = config.accelMultiplier || (difficulty === DIFFICULTY_MODES.EASY ? 0.80 : (difficulty === DIFFICULTY_MODES.HARD ? 0.96 : 0.88));

    let throttle = 0;
    let brake = 0;

    if (this.currentSpeed < baseTargetSpeed - 0.5) {
      throttle = 1.0;
      brake = 0.0;
      this.currentSpeed += dt * maxPowerAccel * accelMultiplier;
    } else if (this.currentSpeed > baseTargetSpeed + 1.0) {
      throttle = 0.0;
      const brakeForce = Math.min(1.0, (this.currentSpeed - baseTargetSpeed) / 8.0);
      brake = brakeForce;
      this.currentSpeed -= dt * (18.0 * brakeForce);
    } else {
      throttle = 0.4;
      brake = 0.0;
    }

    this.currentSpeed = Math.max(0, this.currentSpeed);

    // 6. Advance Physics Body & Visual Group
    const progressDelta = (this.currentSpeed * dt) / trackLen;
    this.trackProgress = (this.trackProgress + progressDelta) % 1.0;

    // Accumulate continuous race distance based on physical speed
    this.raceDistance = (this.raceDistance !== undefined ? this.raceDistance : 0) + (this.currentSpeed * dt);
    this.currentLap = Math.max(1, Math.floor(Math.max(0, this.raceDistance) / trackLen) + 1);
    this.totalDistance = this.raceDistance;

    // Check race finish for this AI car
    const finishDist = targetLaps * trackLen;
    if (this.raceDistance >= finishDist) {
      this.finished = true;
      if (!this.finishTime && currentRaceTime) {
        this.finishTime = currentRaceTime;
      }
      baseTargetSpeed = Math.min(baseTargetSpeed, 22.0); // Cool down after checkered flag
    }

    // Interpolated spline coordinate
    const newPt = this.track.curve.getPointAt(this.trackProgress);
    const newTgt = this.track.curve.getTangentAt(this.trackProgress).normalize();
    const upVec = new THREE.Vector3(0, 1, 0);
    const newNorm = new THREE.Vector3().crossVectors(newTgt, upVec).normalize();

    const finalX = newPt.x + newNorm.x * this.lateralOffset;
    const finalZ = newPt.z + newNorm.z * this.lateralOffset;

    // Heading yaw aligned with path + steer angle
    const targetYaw = Math.atan2(newTgt.x, newTgt.z) + (this.currentSteer * 0.12);

    const newPtY = (newPt && Number.isFinite(newPt.y)) ? newPt.y : 0;
    body.position.set(finalX, newPtY + 0.04, finalZ);
    body.velocity.set(newTgt.x * this.currentSpeed, 0, newTgt.z * this.currentSpeed);

    const q = this.visualCar.group.quaternion;
    q.setFromAxisAngle(upVec, targetYaw);
    if (newTgt && Number.isFinite(newTgt.y)) {
      const pitchAngle = -Math.asin(Math.max(-0.45, Math.min(0.45, newTgt.y)));
      if (!this._aiPitch) this._aiPitch = new THREE.Quaternion();
      this._aiPitch.setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchAngle);
      q.multiply(this._aiPitch);
    }
    this.visualCar.group.position.set(finalX, newPtY + 0.04, finalZ);

    // Update wheels and visuals
    this.visualCar.update(dt, this.currentSpeed, this.currentSteer, 0, throttle, brake);
  }

  getPosition() {
    return this.vehicle.body.position;
  }
}

/**
 * High-Level Manager for the 10-Car Grid
 */
export class AIGridManager {
  constructor(track, physicsWorld, scene) {
    this.track = track;
    this.physics = physicsWorld;
    this.scene = scene;

    this.difficulty = DIFFICULTY_MODES.MEDIUM;
    this.aiCars = [];
    this.playerVehicle = null;
    this.playerCar = null;

    // Racing line waypoints
    this.waypoints = [];
    this.generateRacingLineWaypoints();

    // 10-Car Live Leaderboard
    this.leaderboard = [];
    this.currentGridOrder = []; // Array of driver IDs in 1st..10th position order

    // Multiplayer Guest status
    this.isMultiplayer = false;
  }

  setGuestRemote(isRemote = true) {
    this.isMultiplayer = isRemote;
    if (this.aiCars && this.aiCars.length > 0) {
      this.aiCars[0].setAsRemoteGuest(isRemote);
    }
  }

  applyGuestInput(inputs) {
    if (this.aiCars && this.aiCars.length > 0 && inputs && typeof inputs === 'object') {
      const throttle = Number(inputs.throttle);
      const brake = Number(inputs.brake);
      const steer = Number(inputs.steer);
      this.aiCars[0].remoteInputs = {
        throttle: Number.isFinite(throttle) ? Math.max(0, Math.min(1, throttle)) : 0,
        brake: Number.isFinite(brake) ? Math.max(0, Math.min(1, brake)) : 0,
        steer: Number.isFinite(steer) ? Math.max(-1, Math.min(1, steer)) : 0
      };
    }
  }

  get10CarStateSnapshot(playerVehicle, playerCar, playerLap = 1) {
    const cars = [];
    if (playerVehicle && playerCar) {
      cars.push({
        id: 'player',
        name: 'HOST (P1)',
        code: 'YOU',
        color: 0xe10600,
        x: playerVehicle.body.position.x,
        y: playerVehicle.body.position.y,
        z: playerVehicle.body.position.z,
        qx: playerVehicle.body.quaternion.x,
        qy: playerVehicle.body.quaternion.y,
        qz: playerVehicle.body.quaternion.z,
        qw: playerVehicle.body.quaternion.w,
        speed: playerVehicle.body.velocity.length() * 3.6,
        gear: playerVehicle.currentGear,
        rpm: playerVehicle.rpm,
        drs: playerVehicle.drsActive,
        lap: playerLap,
        progress: this.playerTrackProgress || 0
      });
    }

    for (let i = 0; i < this.aiCars.length; i++) {
      const ai = this.aiCars[i];
      cars.push({
        id: ai.info.id,
        name: ai.info.name,
        code: ai.info.code,
        color: ai.info.color,
        x: ai.vehicle.body.position.x,
        y: ai.vehicle.body.position.y,
        z: ai.vehicle.body.position.z,
        qx: ai.vehicle.body.quaternion.x,
        qy: ai.vehicle.body.quaternion.y,
        qz: ai.vehicle.body.quaternion.z,
        qw: ai.vehicle.body.quaternion.w,
        speed: ai.currentSpeed * 3.6,
        gear: ai.vehicle.currentGear,
        rpm: ai.vehicle.rpm,
        drs: ai.vehicle.drsActive,
        lap: ai.currentLap,
        progress: ai.trackProgress
      });
    }
    return cars;
  }

  init(playerVehicle, playerCar) {
    this.playerVehicle = playerVehicle;
    this.playerCar = playerCar;

    // Instantiate 9 AI cars
    this.aiCars = [];
    for (let i = 1; i < DRIVER_ROSTER.length; i++) {
      const driverInfo = DRIVER_ROSTER[i];
      const ai = new AICar(driverInfo, this.physics, this.scene, this.track);
      this.aiCars.push(ai);
    }

    // Default grid order: Player in P1, rest in roster order
    this.currentGridOrder = DRIVER_ROSTER.map(d => d.id);
  }

  setPlayerTeam(teamData) {
    if (!teamData) return;
    this.currentTeamId = teamData.id;

    // 1. Update player entry in DRIVER_ROSTER
    DRIVER_ROSTER[0].team = teamData.fullName || teamData.name;
    DRIVER_ROSTER[0].number = teamData.driverNumber || '16';
    DRIVER_ROSTER[0].color = teamData.primaryColor;
    DRIVER_ROSTER[0].secondaryHex = teamData.secondaryHex;
    DRIVER_ROSTER[0].accentHex = teamData.accentHex;
    DRIVER_ROSTER[0].accentColor = teamData.accentColor;

    // 2. Default canonical AI roster representing the other 9 constructors
    const defaultRoster = [
      { id: 'ai_1', name: 'M. Verstappen', code: 'VER', team: 'Orion Racing', number: '07', color: 0x0a1d3b, secondaryHex: '#0e1117', accentHex: '#e30613', accentColor: 0xffcc00, teamId: 'redbull' },
      { id: 'ai_2', name: 'L. Hamilton', code: 'HAM', team: 'Mercedes-AMG', number: '44', color: 0x00d2be, secondaryHex: '#c0c0c0', accentHex: '#0a0a0a', accentColor: 0x00f0ff, teamId: 'mercedes' },
      { id: 'ai_3', name: 'L. Norris', code: 'NOR', team: 'McLaren', number: '4', color: 0xff8000, secondaryHex: '#00d2be', accentHex: '#141416', accentColor: 0x00d2be, teamId: 'mclaren' },
      { id: 'ai_4', name: 'F. Alonso', code: 'ALO', team: 'Aston Martin', number: '14', color: 0x00594f, secondaryHex: '#cedc00', accentHex: '#0c221f', accentColor: 0xcedc00, teamId: 'astonmartin' },
      { id: 'ai_5', name: 'P. Gasly', code: 'GAS', team: 'Alpine', number: '10', color: 0x0090ff, secondaryHex: '#fd4bc7', accentHex: '#111111', accentColor: 0xfd4bc7, teamId: 'alpine' },
      { id: 'ai_6', name: 'A. Albon', code: 'ALB', team: 'Williams', number: '23', color: 0x0040c0, secondaryHex: '#00d2be', accentHex: '#ffffff', accentColor: 0x00d2be, teamId: 'williams' },
      { id: 'ai_7', name: 'V. Bottas', code: 'BOT', team: 'Kick Sauber', number: '77', color: 0x00e700, secondaryHex: '#111111', accentHex: '#000000', accentColor: 0x00e700, teamId: 'sauber' },
      { id: 'ai_8', name: 'N. Hülkenberg', code: 'HUL', team: 'Haas', number: '27', color: 0xe6002b, secondaryHex: '#ffffff', accentHex: '#1a1a1a', accentColor: 0xffffff, teamId: 'haas' },
      { id: 'ai_9', name: 'L. Lawson', code: 'LAW', team: 'Racing Bulls', number: '30', color: 0x1634ca, secondaryHex: '#ffffff', accentHex: '#d81e05', accentColor: 0xffffff, teamId: 'rb' }
    ];

    const ferrariFallback = {
      name: 'C. Leclerc', code: 'LEC', team: 'Ferrari', number: '16',
      color: 0xdc0000, secondaryHex: '#ffffff', accentHex: '#111827', accentColor: 0xffffff
    };

    if (this.aiCars && this.aiCars.length > 0) {
      this.aiCars.forEach((ai, idx) => {
        const def = defaultRoster[idx];
        let assigned = { ...def };

        if (teamData.id !== 'ferrari' && def.teamId === teamData.id) {
          assigned = {
            ...assigned,
            ...ferrariFallback
          };
        }

        Object.assign(ai.info, assigned);
        if (DRIVER_ROSTER[idx + 1]) {
          Object.assign(DRIVER_ROSTER[idx + 1], assigned);
        }

        ai.updateLivery({
          primaryColor: assigned.color,
          secondaryHex: assigned.secondaryHex,
          accentHex: assigned.accentHex,
          accentColor: assigned.accentColor,
          carNumber: assigned.number,
          teamName: assigned.team,
          driverName: assigned.name,
          teamId: assigned.teamId
        });
      });
    }

    // 3. Update player car 3D livery
    if (this.playerCar && typeof this.playerCar.updateLivery === 'function') {
      this.playerCar.updateLivery({
        primaryColor: teamData.primaryColor,
        secondaryHex: teamData.secondaryHex,
        accentHex: teamData.accentHex,
        accentColor: teamData.accentColor,
        haloColor: teamData.haloColor,
        carNumber: teamData.driverNumber,
        driverNumber: teamData.driverNumber,
        teamName: teamData.fullName || teamData.name,
        driverName: 'PLAYER',
        teamId: teamData.id
      });
    }
  }

  setDifficulty(mode) {
    if (DIFFICULTY_MODES[mode]) {
      this.difficulty = mode;
    }
  }

  setTrack(newTrack) {
    this.track = newTrack;
    this.generateRacingLineWaypoints();
    this.playerFinished = false;
    this.playerFinishTime = null;
    this.playerRaceDistance = 0;
    for (const ai of this.aiCars) {
      ai.track = newTrack;
      ai.waypoints = this.waypoints;
      ai.currentWaypointIdx = 0;
      ai.trackProgress = 0;
      ai.currentLap = 1;
      ai.totalDistance = 0;
      ai.raceDistance = 0;
      ai.finished = false;
      ai.finishTime = null;
      ai.currentSpeed = 0;
      ai.hide();
    }
  }

  /**
   * Generates 300 smooth 3D waypoints along the circuit with apex clipping & braking zones
   */
  generateRacingLineWaypoints() {
    this.waypoints = [];
    const count = 300;
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const pt = this.track.curve.getPointAt(t);
      const tgt = this.track.curve.getTangentAt(t).normalize();
      const norm = new THREE.Vector3().crossVectors(tgt, up).normalize();

      // Curvature estimation from next & previous tangents
      const tPrev = (t - 0.01 + 1.0) % 1.0;
      const tNext = (t + 0.01) % 1.0;
      const tgtPrev = this.track.curve.getTangentAt(tPrev).normalize();
      const tgtNext = this.track.curve.getTangentAt(tNext).normalize();
      const crossY = new THREE.Vector3().crossVectors(tgtPrev, tgtNext).y;
      const curvature = crossY * 50.0; // Positive = turning left, Negative = turning right

      // Racing Line Offset:
      // In left turn: apex is on inside left (-norm), entry outside right (+norm)
      // In right turn: apex is on inside right (+norm), entry outside left (-norm)
      let offset = 0;
      let insideApexSign = 0;
      let targetSpeed = 86.0; // ~310 km/h default straight speed

      const trackWidth = this.track?.trackWidth || 16.0;
      const maxApexOffset = Math.min(2.8, trackWidth * 0.25);

      if (Math.abs(curvature) > 0.12) {
        insideApexSign = curvature > 0 ? -1 : 1;
        offset = insideApexSign * maxApexOffset; // Clip inside curb safely within track width
        // Hairpin apexes (Monaco Fairmont Hairpin, etc.): safe cornering ~48 km/h
        targetSpeed = Math.max(13.5, 74.0 - Math.abs(curvature) * 300.0);
      } else if (Math.abs(curvature) > 0.06) {
        insideApexSign = curvature > 0 ? -1 : 1;
        offset = insideApexSign * Math.min(2.2, maxApexOffset * 0.85);
        targetSpeed = Math.max(26.0, 80.0 - Math.abs(curvature) * 240.0);
      } else if (Math.abs(curvature) > 0.025) {
        insideApexSign = curvature > 0 ? -1 : 1;
        offset = insideApexSign * Math.min(1.5, maxApexOffset * 0.6);
        targetSpeed = Math.max(42.0, 86.0 - Math.abs(curvature) * 180.0);
      }

      // On the starting grid straight (t > 0.94 or t < 0.05), ensure targetSpeed is full straight pace
      if (t > 0.94 || t < 0.05) {
        targetSpeed = Math.max(targetSpeed, 78.0);
      }

      const wpPos = new THREE.Vector3().copy(pt).addScaledVector(norm, offset);

      this.waypoints.push({
        index: i,
        t: t,
        position: wpPos,
        centerPoint: pt,
        tangent: tgt,
        normal: norm,
        curvature: curvature,
        racingLineOffset: offset,
        insideApexSign: insideApexSign,
        targetSpeed: targetSpeed,
        isBrakingZone: false
      });
    }

    // Backward pass to calculate braking zones
    const maxDecel = 30.0; // m/s^2 carbon-ceramic brake capability
    const segLen = (this.track.trackLength || 1850) / count;

    for (let pass = 0; pass < 2; pass++) {
      for (let i = count - 1; i >= 0; i--) {
        const nextIdx = (i + 1) % count;
        const nextSpeed = this.waypoints[nextIdx].targetSpeed;
        const allowedSpeed = Math.sqrt(nextSpeed * nextSpeed + 2 * maxDecel * segLen);

        if (this.waypoints[i].targetSpeed > allowedSpeed) {
          this.waypoints[i].targetSpeed = allowedSpeed;
          this.waypoints[i].isBrakingZone = true;
        }
      }
    }
  }

  /**
   * Prepares grid for session mode
   */
  setupSession(sessionMode, qualifiedGrid = null) {
    if (qualifiedGrid && Array.isArray(qualifiedGrid) && qualifiedGrid.length > 0) {
      this.currentGridOrder = qualifiedGrid;
    }

    if (sessionMode === 'PRACTICE') {
      if (this.isMultiplayer) {
        // MULTIPLAYER PRACTICE: Guest car is active and on track at slot 2!
        this.aiCars[0].resetToSlot(2, 10);
        for (let i = 1; i < this.aiCars.length; i++) {
          this.aiCars[i].hide();
        }
      } else {
        // SOLO PRACTICE: Hide all 9 AI cars
        for (const ai of this.aiCars) {
          ai.hide();
        }
      }
    } else if (sessionMode === 'QUALIFYING') {
      if (this.isMultiplayer) {
        // MULTIPLAYER QUALIFYING: Spawn Guest car at rolling approach alongside Player 1
        const spawnT = 0.95;
        const pt = this.track.curve.getPointAt(spawnT);
        const tgt = this.track.curve.getTangentAt(spawnT).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();
        const spawnX = pt.x - normal.x * 3.5;
        const spawnY = (pt.y || 0) + 0.04;
        const spawnZ = pt.z - normal.z * 3.5;
        const yaw = Math.atan2(tgt.x, tgt.z);

        this.physics.resetVehicle(this.aiCars[0].vehicle, spawnX, spawnY, spawnZ, yaw, 61.0);
        this.aiCars[0].vehicle.currentGear = 6;
        this.aiCars[0].vehicle.rpm = 11500;
        this.aiCars[0].visualCar.group.visible = true;
        this.aiCars[0].active = true;

        // Enable ghost mode between Player 1 and Guest Car
        this.physics.setGhostCollision(this.playerVehicle, this.aiCars[0].vehicle, true);

        for (let i = 1; i < this.aiCars.length; i++) {
          this.aiCars[i].hide();
        }
      } else {
        for (const ai of this.aiCars) {
          ai.hide();
        }
      }
    } else if (sessionMode === 'RACE') {
      // Re-enable collisions between all cars
      // Always disable ghost collision regardless of multiplayer state to ensure clean state
      if (this.aiCars && this.aiCars.length > 0 && this.playerVehicle) {
        this.physics.setGhostCollision(this.playerVehicle, this.aiCars[0].vehicle, false);
      }
      this.spawnRaceGrid();
    }
  }

  /**
   * Spawns all 10 cars in their exact qualified positions on the 2x2 staggered starting grid
   */
  spawnRaceGrid() {
    // Current grid order is array of driver IDs (pos 1 to pos 10)
    for (let slot = 1; slot <= 10; slot++) {
      const driverId = this.currentGridOrder[slot - 1];

      if (driverId === 'player') {
        // Position player vehicle in this slot
        this.positionPlayerInGridSlot(slot);
      } else {
        const ai = this.aiCars.find(c => c.info.id === driverId);
        if (ai) {
          ai.resetToSlot(slot, 10);
        }
      }
    }

    // Immediately build and sort initial grid leaderboard so tower is populated during lights countdown
    this.updateLeaderboard(this.playerVehicle.body.position, 1);
  }

  positionPlayerInGridSlot(slotIndex) {
    const slotT = (1.0 - (slotIndex * 0.0065)) % 1.0;
    const pt = this.track.curve.getPointAt(slotT);
    const tgt = this.track.curve.getTangentAt(slotT).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

    const trackWidth = (this.track && this.track.trackWidth) ? this.track.trackWidth : 16.0;
    const sideSpacing = Math.min(3.0, trackWidth * 0.22);
    const sideSign = (slotIndex % 2 === 1) ? -1 : 1;
    const sideDist = sideSpacing * sideSign;
    const spawnX = pt.x + normal.x * sideDist;
    const spawnY = (pt.y || 0) + 0.04;
    const spawnZ = pt.z + normal.z * sideDist;
    const yaw = Math.atan2(tgt.x, tgt.z);

    this.physics.resetVehicle(this.playerVehicle, spawnX, spawnY, spawnZ, yaw, 0);
    this.playerVehicle.currentGear = 1;
    this.playerVehicle.rpm = 4000;

    this.playerSpawnGridPos = new THREE.Vector3(spawnX, spawnY, spawnZ);
    this.playerSpawnGridYaw = yaw;

    const trackLen = this.track.trackLength || 1850;
    const distFromStart = (1.0 - slotT) * trackLen;
    this.playerRaceDistance = -distFromStart;
    this.playerLastTrackT = slotT;
  }

  /**
   * Simulate realistic Qualifying lap times for all AI drivers based on difficulty
   */
  simulateQualifyingTimes(playerLapTime, guestLapTime = null) {
    const config = DIFFICULTY_CONFIG[this.difficulty] || DIFFICULTY_CONFIG.MEDIUM;
    const minT = config.qualiMinTime;
    const maxT = config.qualiMaxTime;

    const classification = [];

    // In multiplayer: Car #2 (ai_1) is the Guest with recorded guestLapTime
    const startIdx = (this.isMultiplayer && guestLapTime !== null) ? 2 : 1;

    for (let i = startIdx; i < DRIVER_ROSTER.length; i++) {
      const info = DRIVER_ROSTER[i];
      const skillWeight = 1.0 - (info.baseSkill || 0.9);
      const simulatedTime = minT + (skillWeight * (maxT - minT)) + (Math.random() * 0.7 - 0.35);

      classification.push({
        id: info.id,
        name: info.name,
        code: info.code,
        team: info.team,
        color: info.color,
        time: Math.round(simulatedTime * 1000) / 1000,
        isPlayer: false
      });
    }

    // If multiplayer, add Guest's recorded lap time
    if (this.isMultiplayer && guestLapTime !== null) {
      classification.push({
        id: 'ai_1',
        name: 'GUEST',
        code: 'GST',
        team: 'Guest Racing',
        color: 0x00d2be,
        time: Math.round(guestLapTime * 1000) / 1000,
        isPlayer: false,
        isGuest: true
      });
    }

    // Insert Player's recorded lap time
    classification.push({
      id: 'player',
      name: this.isMultiplayer ? 'HOST' : 'PLAYER',
      code: 'YOU',
      team: DRIVER_ROSTER[0].team || 'Ferrari',
      color: DRIVER_ROSTER[0].color || 0xdc0000,
      time: Math.round(playerLapTime * 1000) / 1000,
      isPlayer: true
    });

    // Sort 1st to 10th by lap time ascending
    classification.sort((a, b) => a.time - b.time);

    // Assign positions & gap to pole
    const poleTime = classification[0].time;
    classification.forEach((entry, idx) => {
      entry.pos = idx + 1;
      entry.gapToPole = entry.time - poleTime;
    });

    this.currentGridOrder = classification.map(e => e.id);
    const playerEntry = classification.find(e => e.isPlayer);

    return {
      position: playerEntry.pos,
      playerPosition: playerEntry.pos,
      playerTime: playerLapTime,
      guestTime: guestLapTime,
      poleTime: poleTime,
      deltaToPole: playerEntry.gapToPole,
      gridOrder: this.currentGridOrder,
      classification: classification
    };
  }

  /**
   * Main AI Grid Update
   */
  update(dt, playerPos, playerVel, playerLap, currentRaceTime = null, targetLaps = 3, audioManager = null) {
    // Collect all active cars for collision avoidance
    const allCars = [];
    for (const ai of this.aiCars) {
      if (ai.active) allCars.push(ai);
    }
    // Add player proxy with track progress and speed (3D height and hintT aware)
    const playerY = (playerPos && Number.isFinite(playerPos.y)) ? playerPos.y : null;
    const pTrackInfo = this.track.getClosestTrackPoint(playerPos.x, playerPos.z, playerY, this.playerLastTrackT);
    const pSpeed = playerVel ? Math.sqrt(playerVel.x * playerVel.x + playerVel.z * playerVel.z) : 0;
    const playerProxy = {
      getPosition: () => playerPos,
      isPlayer: true,
      trackProgress: pTrackInfo.t,
      currentSpeed: pSpeed,
      totalDistance: this.playerRaceDistance || 0
    };
    allCars.push(playerProxy);

    // Update each AI car
    for (const ai of this.aiCars) {
      if (ai.active) {
        ai.update(dt, this.waypoints, this.difficulty, allCars, playerPos, playerVel, targetLaps, currentRaceTime, audioManager);
      }
    }

    // Update live 10-car position tracker
    this.updateLeaderboard(playerPos, playerLap);
  }

  /**
   * Computes real-time positions for all 10 cars based on track progress & lap
   */
  updateLeaderboard(playerPos, playerLap) {
    const trackLen = this.track.trackLength || 1850;
    const entries = [];

    // 1. Calculate player continuous race distance (3D height and hintT aware)
    const curPlayerY = (playerPos && Number.isFinite(playerPos.y)) ? playerPos.y : null;
    const pTrackInfo = this.track.getClosestTrackPoint(playerPos.x, playerPos.z, curPlayerY, this.playerLastTrackT);
    const currentT = pTrackInfo.t;

    // Continuous player distance based on true lap and spline progress
    const completedLaps = Math.max(0, (playerLap || 1) - 1);
    let inLapDist = currentT * trackLen;
    if (completedLaps === 0 && currentT > 0.85) {
      inLapDist = (currentT - 1.0) * trackLen;
    }
    this.playerRaceDistance = (completedLaps * trackLen) + inLapDist;
    this.playerLastTrackT = currentT;

    entries.push({
      id: 'player',
      name: 'PLAYER',
      code: 'YOU',
      team: DRIVER_ROSTER[0].team || 'Ferrari',
      color: '#' + (DRIVER_ROSTER[0].color !== undefined ? DRIVER_ROSTER[0].color : 0xdc0000).toString(16).padStart(6, '0'),
      isPlayer: true,
      lap: playerLap || 1,
      totalDistance: this.playerRaceDistance,
      trackProgress: currentT,
      finished: this.playerFinished || false,
      finishTime: this.playerFinishTime || null
    });

    // 2. Active AI cars
    for (const ai of this.aiCars) {
      if (ai.active) {
        entries.push({
          id: ai.info.id,
          name: ai.info.name,
          code: ai.info.code,
          team: ai.info.team,
          color: '#' + ai.info.color.toString(16).padStart(6, '0'),
          isPlayer: false,
          lap: ai.currentLap,
          totalDistance: ai.totalDistance,
          trackProgress: ai.trackProgress,
          finished: ai.finished || false,
          finishTime: ai.finishTime || null
        });
      }
    }

    // Sort: Finished cars first by finishTime ascending, then racing cars by totalDistance descending
    entries.sort((a, b) => {
      if (a.finished && b.finished) {
        return (a.finishTime || 0) - (b.finishTime || 0);
      }
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.totalDistance - a.totalDistance;
    });

    const leader = entries[0];
    const leaderDist = leader.totalDistance;
    const leaderTime = leader.finishTime;

    entries.forEach((entry, idx) => {
      entry.pos = idx + 1;
      if (idx === 0) {
        entry.gapSeconds = 'LEADER';
      } else {
        if (leaderTime && entry.finishTime) {
          const gap = Math.max(0.1, entry.finishTime - leaderTime);
          entry.gapSeconds = gap.toFixed(1);
        } else {
          const gapDist = Math.max(0, leaderDist - entry.totalDistance);
          entry.gapSeconds = gapDist > 0.5 ? (gapDist / 65.0).toFixed(1) : 'LEADER';
        }
      }
    });

    this.leaderboard = entries;
  }

  getLiveLeaderboard() {
    return this.leaderboard;
  }

  getRaceWinner(targetLaps = 3) {
    const finishers = [];
    if (this.playerFinished && this.playerFinishTime) {
      finishers.push({
        name: 'PLAYER',
        code: 'YOU',
        team: DRIVER_ROSTER[0].team || 'Ferrari',
        finishTime: this.playerFinishTime,
        isPlayer: true
      });
    }
    for (const ai of this.aiCars) {
      if (ai.active && ai.finished && ai.finishTime) {
        finishers.push({
          name: ai.info.name,
          code: ai.info.code,
          team: ai.info.team,
          finishTime: ai.finishTime,
          isPlayer: false
        });
      }
    }
    if (finishers.length === 0) return null;
    finishers.sort((a, b) => a.finishTime - b.finishTime);
    return finishers[0];
  }

  getPlayerLivePosition() {
    const p = this.leaderboard.find(e => e.isPlayer);
    return p ? p.pos : 1;
  }

  /**
   * Builds official Grand Prix finishing classification
   */
  getFinalClassification(targetLaps, playerTotalTime, playerLaps) {
    const playerFinished = (playerLaps > targetLaps);
    this.playerFinished = playerFinished;
    if (playerFinished && !this.playerFinishTime) {
      this.playerFinishTime = playerTotalTime;
    }

    if (this.playerVehicle) {
      this.updateLeaderboard(this.playerVehicle.body.position, playerLaps);
    }
    return this.leaderboard;
  }
}

export const AIGrid = AIGridManager;

