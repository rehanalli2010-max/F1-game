import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { F1Car } from './car.js?v=28';

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
    team: 'Red Bull Racing',
    number: '1',
    color: 0x03102c,
    secondaryHex: '#fcd700',
    accentHex: '#dc0000',
    accentColor: 0xffd700,
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
    speedMultiplier: 0.84, // 84% pace: smooth and fun, player can easily overtake and win
    earlyBrakingDistance: 16.0, // Early braking into corners (gives player easy dive-bomb overtakes)
    aggression: 0.2,
    yieldDistance: 2.2, // Emergency proximity margin
    overtakeCapable: true, // CAN overtake slower/stopped cars ahead
    defendApex: false, // Does NOT block or defend; leaves open racing line for player
    drafting: false,
    overtakeCommitDistance: 26.0, // Lookahead to change lanes to pass
    qualiMinTime: 82.5,
    qualiMaxTime: 88.5
  },
  MEDIUM: {
    speedMultiplier: 0.94, // 94% pace: equal, fair match to player performance for balanced practice
    earlyBrakingDistance: 6.0, // Moderate realistic braking
    aggression: 0.5,
    yieldDistance: 1.8,
    overtakeCapable: true,
    defendApex: true, // Protects apex cleanly
    drafting: false,
    overtakeCommitDistance: 30.0,
    qualiMinTime: 75.0,
    qualiMaxTime: 78.8
  },
  HARD: {
    speedMultiplier: 1.00, // 100% pace: elite F1 driver pace, requires pushing hard to win
    earlyBrakingDistance: 1.5, // Late apex braking
    aggression: 0.85,
    yieldDistance: 1.4,
    overtakeCapable: true,
    defendApex: true, // Aggressively blocks passing lanes and defends apex
    drafting: true, // Slipstream suction + DRS boost on straights
    overtakeCommitDistance: 38.0,
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
      teamName: this.info.team
    });
    this.visualCar.group.visible = false;

    // Slipstream drafting timer/state
    this.isDrafting = false;
    this.draftBonusSpeed = 0;

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

    const sideSign = (slotIndex % 2 === 1) ? -1 : 1;
    const sideDist = 3.2 * sideSign;
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

  hide() {
    this.active = false;
    if (this.visualCar) {
      this.visualCar.group.visible = false;
    }
  }

  /**
   * Main AI Update Tick
   */
  update(dt, waypoints, difficulty, allCars = [], playerCarPos = null, playerCarVel = null, targetLaps = 3, currentRaceTime = null) {
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

    // 1. Determine closest waypoint & lookahead target along racing line
    const wpCount = waypoints.length;
    let closestWpIdx = 0;
    let minDistsq = Infinity;
    for (let i = 0; i < wpCount; i++) {
      const wp = waypoints[i];
      const dx = wp.position.x - pos.x;
      const dz = wp.position.z - pos.z;
      const dsq = dx * dx + dz * dz;
      if (dsq < minDistsq) {
        minDistsq = dsq;
        closestWpIdx = i;
      }
    }

    const currentWp = waypoints[closestWpIdx];
    this.trackProgress = currentWp.t;

    // Dynamic lookahead based on speed (pure pursuit)
    const lookaheadMeters = Math.max(6.0, Math.min(26.0, this.currentSpeed * 0.28));
    const stepCount = Math.max(2, Math.round(lookaheadMeters / 6.0));
    const targetWpIdx = (closestWpIdx + stepCount) % wpCount;
    const targetWp = waypoints[targetWpIdx];

    // 2. Behavioral Adjustments: Active Overtaking, Defensive Line, and Drafting
    let desiredOffset = targetWp.racingLineOffset || 0;

    // Vector and distances to player
    const pPos = (typeof playerCarPos !== 'undefined' && playerCarPos) ? playerCarPos : { x: 0, y: 0, z: 0 };
    const toPlayer = new THREE.Vector3(pPos.x - pos.x, 0, pPos.z - pos.z);
    const distToPlayer = toPlayer.length();
    const forwardVec = new THREE.Vector3(0, 0, 1).applyQuaternion(this.visualCar.group.quaternion);
    const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(this.visualCar.group.quaternion);
    const fwdDistToPlayer = toPlayer.dot(forwardVec);
    const latDistToPlayer = toPlayer.dot(rightVec);

    let emergencyBrake = 0;

    // A. Scan for Any Slower Car Ahead to Execute Active Overtaking
    let carAheadDist = Infinity;
    let carAheadLat = 0;
    let isCarAheadPlayer = false;

    for (const other of allCars) {
      if (other === this) continue;
      const oPos = other.getPosition();
      const dx = oPos.x - pos.x;
      const dz = oPos.z - pos.z;
      const dFwd = dx * forwardVec.x + dz * forwardVec.z;
      const dLat = dx * rightVec.x + dz * rightVec.z;

      // Detect if someone is directly ahead in our corridor
      if (dFwd > 1.2 && dFwd < config.overtakeCommitDistance && Math.abs(dLat) < 3.4) {
        if (dFwd < carAheadDist) {
          carAheadDist = dFwd;
          carAheadLat = dLat;
          isCarAheadPlayer = !!other.isPlayer;
        }
      }
    }

    // B. ACTIVE OVERTAKING EXECUTION (All Difficulties):
    if (config.overtakeCapable && carAheadDist < config.overtakeCommitDistance) {
      // Pick clear passing lane:
      // targetWp.normal points to the track LEFT (+norm = left, -norm = right).
      // If car ahead is on our right (carAheadLat >= 0), pass on the LEFT (+2.8m).
      // If car ahead is on our left (carAheadLat < 0), pass on the RIGHT (-2.8m).
      const passSide = carAheadLat >= 0 ? 2.8 : -2.8;
      desiredOffset = passSide;

      // Drafting & Slipstream in HARD mode on straights
      if (config.drafting && isCarAheadPlayer && Math.abs(targetWp.curvature) < 0.006) {
        this.isDrafting = true;
        this.draftBonusSpeed = 5.5; // +20 km/h aerodynamic boost
      } else {
        this.isDrafting = false;
        this.draftBonusSpeed = 0;
      }
    } else {
      this.isDrafting = false;
      this.draftBonusSpeed = 0;

      // C. DEFENSIVE LOGIC (When Player is Behind AI):
      if (difficulty === DIFFICULTY_MODES.EASY) {
        // EASY MODE: Zero defensive blocking!
        // AI strictly holds its racing line, leaving passing lane wide open for player.
        // Early braking in corners allows the player to easily dive inside and re-overtake.
        desiredOffset = targetWp.racingLineOffset || 0;
      } else if (difficulty === DIFFICULTY_MODES.MEDIUM) {
        // MEDIUM MODE: Veers toward inside line to protect apex when player approaches from behind (< 20m)
        if (fwdDistToPlayer < -1.0 && fwdDistToPlayer > -20.0 && Math.abs(latDistToPlayer) < 4.5) {
          const insideSign = targetWp.insideApexSign || (targetWp.racingLineOffset < 0 ? -1 : 1);
          desiredOffset = insideSign * 2.4;
        }
      } else if (difficulty === DIFFICULTY_MODES.HARD) {
        // HARD MODE: Aggressively mirrors player's lateral line to block passing lanes into braking zones
        if (fwdDistToPlayer < -0.5 && fwdDistToPlayer > -26.0) {
          // Block toward the player's side (-latDistToPlayer aligns with normal)
          const blockOffset = Math.max(-4.2, Math.min(4.2, -latDistToPlayer * 0.85));
          desiredOffset = blockOffset;
        }
      }
    }

    // Dynamic lateral lane transition
    const laneSpeed = config.aggression > 0.5 ? 6.0 : 4.5;
    this.targetOffset = desiredOffset;
    this.lateralOffset += (this.targetOffset - this.lateralOffset) * Math.min(1.0, dt * laneSpeed);

    // 3. Collision Avoidance & Proximity Repulsion
    let obstacleAhead = false;
    let obstacleDistance = Infinity;

    for (const other of allCars) {
      if (other === this) continue;
      const oPos = other.getPosition();
      const dx = oPos.x - pos.x;
      const dz = oPos.z - pos.z;
      const d = Math.sqrt(dx * dx + dz * dz);

      // Gentle lateral repulsion if within 2.6m
      if (d < 2.6) {
        const nx = dx / (d || 1);
        const nz = dz / (d || 1);
        pos.x -= nx * (2.6 - d) * 0.3;
        pos.z -= nz * (2.6 - d) * 0.3;
      }

      // Emergency braking: ONLY if an obstacle is immediately ahead in the SAME narrow corridor (< 1.8m)
      const dFwd = dx * forwardVec.x + dz * forwardVec.z;
      const dLat = dx * rightVec.x + dz * rightVec.z;

      if (dFwd > 0.5 && dFwd < 7.5 && Math.abs(dLat) < 1.8) {
        obstacleAhead = true;
        if (dFwd < obstacleDistance) {
          obstacleDistance = dFwd;
        }
      }
    }

    if (obstacleAhead) {
      const prox = Math.max(0, 1.0 - (obstacleDistance / 7.5));
      emergencyBrake = Math.max(emergencyBrake, prox * 0.75);
    }

    // 4. Pure Pursuit Steering
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

    const rawSteer = Math.max(-1.0, Math.min(1.0, angleDiff * 2.8));
    this.currentSteer += (rawSteer - this.currentSteer) * Math.min(1.0, dt * 14.0);

    // 5. Speed Calculation & Braking Zones
    let baseTargetSpeed = targetWp.targetSpeed * config.speedMultiplier;
    // Driver personal skill variance (top drivers like Verstappen run slightly sharper pace)
    baseTargetSpeed *= (0.98 + (this.info.baseSkill || 0.9) * 0.04);
    baseTargetSpeed += this.draftBonusSpeed;

    // Early braking adjustments for Easy & Medium
    if (targetWp.isBrakingZone && config.earlyBrakingDistance > 0) {
      baseTargetSpeed *= Math.max(0.70, 1.0 - (config.earlyBrakingDistance / 100.0));
    }

    let throttle = 0;
    let brake = emergencyBrake;

    if (this.currentSpeed < baseTargetSpeed - 1.0 && brake < 0.2) {
      throttle = 1.0;
      brake = 0.0;
      // Progressive F1 acceleration curve perfectly matched to player vehicle power & drag physics
      const speedFraction = Math.min(1.0, this.currentSpeed / 95.0); // 0 to 340 km/h
      const realisticAccel = 15.2 - (speedFraction * 9.8); // 15.2 m/s² at launch down to 5.4 m/s² at top speed
      this.currentSpeed += dt * realisticAccel;
    } else if (this.currentSpeed > baseTargetSpeed + 1.5 || brake > 0.2) {
      throttle = 0.0;
      const brakeForce = Math.min(1.0, Math.max(brake, (this.currentSpeed - baseTargetSpeed) / 10.0));
      brake = brakeForce;
      this.currentSpeed -= dt * (22.0 * brakeForce); // Progressive braking
    } else {
      throttle = 0.5;
      brake = 0.0;
    }

    this.currentSpeed = Math.max(0, this.currentSpeed);

    // 6. Advance Physics Body & Visual Group
    const trackLen = this.track.trackLength || 1850;
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

    body.position.set(finalX, 0.04, finalZ);
    body.velocity.set(newTgt.x * this.currentSpeed, 0, newTgt.z * this.currentSpeed);

    const q = this.visualCar.group.quaternion;
    q.setFromAxisAngle(upVec, targetYaw);
    this.visualCar.group.position.set(finalX, 0.04, finalZ);

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
    if (this.aiCars && this.aiCars.length > 0) {
      this.aiCars[0].remoteInputs = inputs;
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
      { id: 'ai_1', name: 'M. Verstappen', code: 'VER', team: 'Red Bull Racing', number: '1', color: 0x03102c, secondaryHex: '#fcd700', accentHex: '#dc0000', accentColor: 0xffd700, teamId: 'redbull' },
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
          driverName: assigned.name
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
        driverName: 'PLAYER'
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
    for (const ai of this.aiCars) {
      ai.track = newTrack;
      ai.waypoints = this.waypoints;
      ai.currentWaypointIdx = 0;
      ai.trackProgress = 0;
      ai.currentLap = 1;
      ai.totalDistance = 0;
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

      if (Math.abs(curvature) > 0.08) {
        insideApexSign = curvature > 0 ? -1 : 1;
        offset = insideApexSign * 3.4; // Clip inside curb
        targetSpeed = Math.max(32.0, 84.0 - Math.abs(curvature) * 220.0);
      } else if (Math.abs(curvature) > 0.03) {
        insideApexSign = curvature > 0 ? -1 : 1;
        offset = insideApexSign * 2.0;
        targetSpeed = Math.max(48.0, 86.0 - Math.abs(curvature) * 180.0);
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
      if (this.isMultiplayer) {
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

    const sideSign = (slotIndex % 2 === 1) ? -1 : 1;
    const sideDist = 3.2 * sideSign;
    const spawnX = pt.x + normal.x * sideDist;
    const spawnY = (pt.y || 0) + 0.04;
    const spawnZ = pt.z + normal.z * sideDist;
    const yaw = Math.atan2(tgt.x, tgt.z);

    this.physics.resetVehicle(this.playerVehicle, spawnX, spawnY, spawnZ, yaw, 0);
    this.playerVehicle.currentGear = 1;
    this.playerVehicle.rpm = 4000;

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
  update(dt, playerPos, playerVel, playerLap, currentRaceTime = null, targetLaps = 3) {
    // Collect all active cars for collision avoidance
    const allCars = [];
    for (const ai of this.aiCars) {
      if (ai.active) allCars.push(ai);
    }
    // Add player proxy
    const playerProxy = {
      getPosition: () => playerPos,
      isPlayer: true
    };
    allCars.push(playerProxy);

    // Update each AI car
    for (const ai of this.aiCars) {
      if (ai.active) {
        ai.update(dt, this.waypoints, this.difficulty, allCars, playerPos, playerVel, targetLaps, currentRaceTime);
      }
    }

    // Update live 10-car position tracker
    this.updateLeaderboard(playerPos, playerLap);
  }

  /**
   * Check if any AI car crossed the finish line on the final lap
   */
  getRaceWinner(targetLaps = 3) {
    const trackLen = this.track.trackLength || 1850;
    const finishDist = targetLaps * trackLen;

    for (const ai of this.aiCars) {
      if (ai.active && ai.raceDistance >= finishDist) {
        return ai.info;
      }
    }
    return null;
  }

  /**
   * Computes real-time positions for all 10 cars based on track progress & lap
   */
  updateLeaderboard(playerPos, playerLap) {
    const trackLen = this.track.trackLength || 1850;
    const entries = [];

    // 1. Calculate player continuous race distance
    const pTrackInfo = this.track.getClosestTrackPoint(playerPos.x, playerPos.z);
    const currentT = pTrackInfo.t;

    // Continuous player distance based on true lap and spline progress
    const completedLaps = Math.max(0, (playerLap || 1) - 1);
    const inLapDist = currentT * trackLen;
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
    for (const ai of this.aiCars) {
      if (ai.active && ai.finished) {
        return {
          name: ai.info.name,
          code: ai.info.code,
          team: ai.info.team,
          finishTime: ai.finishTime,
          isPlayer: false
        };
      }
    }
    if (this.playerFinished) {
      return {
        name: 'PLAYER',
        code: 'YOU',
        team: this.playerTeam ? this.playerTeam.name : 'PLAYER',
        finishTime: this.playerFinishTime,
        isPlayer: true
      };
    }
    return null;
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

