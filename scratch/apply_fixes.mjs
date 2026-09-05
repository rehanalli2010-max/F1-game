import fs from 'fs';

// -------------------------------------------------------------
// 1. Fix js/ai.js
// -------------------------------------------------------------
let aiCode = fs.readFileSync('js/ai.js', 'utf8').replace(/\r\n/g, '\n');

// In positionPlayerInGridSlot: save playerSpawnGridPos and yaw
const posPlayerTarget = `    this.physics.resetVehicle(this.playerVehicle, spawnX, spawnY, spawnZ, yaw, 0);
    this.playerVehicle.currentGear = 1;
    this.playerVehicle.rpm = 4000;

    const trackLen = this.track.trackLength || 1850;
    const distFromStart = (1.0 - slotT) * trackLen;
    this.playerRaceDistance = -distFromStart;
    this.playerLastTrackT = slotT;`;

const posPlayerReplacement = `    this.physics.resetVehicle(this.playerVehicle, spawnX, spawnY, spawnZ, yaw, 0);
    this.playerVehicle.currentGear = 1;
    this.playerVehicle.rpm = 4000;

    this.playerSpawnGridPos = new THREE.Vector3(spawnX, spawnY, spawnZ);
    this.playerSpawnGridYaw = yaw;

    const trackLen = this.track.trackLength || 1850;
    const distFromStart = (1.0 - slotT) * trackLen;
    this.playerRaceDistance = -distFromStart;
    this.playerLastTrackT = slotT;`;

if (!aiCode.includes(posPlayerTarget)) {
  console.error('Failed to match posPlayerTarget in js/ai.js');
} else {
  aiCode = aiCode.replace(posPlayerTarget, posPlayerReplacement);
  console.log('Matched posPlayerTarget in js/ai.js');
}

// In generateRacingLineWaypoints: ensure starting grid straight has full race target speed
const wpSpeedTarget = `      const wpPos = new THREE.Vector3().copy(pt).addScaledVector(norm, offset);

      this.waypoints.push({`;

const wpSpeedReplacement = `      // On the starting grid straight (t > 0.94 or t < 0.05), ensure targetSpeed is full straight pace
      if (t > 0.94 || t < 0.05) {
        targetSpeed = Math.max(targetSpeed, 78.0);
      }

      const wpPos = new THREE.Vector3().copy(pt).addScaledVector(norm, offset);

      this.waypoints.push({`;

if (!aiCode.includes(wpSpeedTarget)) {
  console.error('Failed to match wpSpeedTarget in js/ai.js');
} else {
  aiCode = aiCode.replace(wpSpeedTarget, wpSpeedReplacement);
  console.log('Matched wpSpeedTarget in js/ai.js');
}

fs.writeFileSync('js/ai.js', aiCode, 'utf8');

// -------------------------------------------------------------
// 2. Fix js/main.js
// -------------------------------------------------------------
let mainCode = fs.readFileSync('js/main.js', 'utf8').replace(/\r\n/g, '\n');

// A. In updateControls(dt): Strictly zero throttle and apply full brake during countdown
const controlsTarget = `    // If controls locked during lights countdown in Race mode
    if (this.session.currentMode === SESSION_TYPES.RACE && (this.session.raceState === 'LIGHTS_COUNTDOWN' || this.session.raceState === 'PRE_START')) {
      const isAcc = (this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w'] || this.touchThrottle > 0 || (this.gamepad && this.gamepad.buttons[7].pressed)); // RT/R2
      this.controls.throttle = isAcc ? 0.3 : 0; // jump start probe
      this.controls.brake = 1.0;
      this.controls.steer = 0;
      return;
    }`;

const controlsReplacement = `    // If controls locked during lights countdown in Race mode
    if (this.session.currentMode === SESSION_TYPES.RACE && (this.session.raceState === 'LIGHTS_COUNTDOWN' || this.session.raceState === 'PRE_START')) {
      const isAcc = (this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w'] || this.touchThrottle > 0 || (this.gamepad && this.gamepad.buttons[7].pressed)); // RT/R2
      this.controls.throttle = 0; // Strictly zero throttle - car cannot move before red lights go off!
      this.controls.brake = 1.0;
      this.controls.steer = 0;
      // Allow visual/audio RPM revving on the grid without moving the car
      if (isAcc && this.playerVehicle) {
        this.playerVehicle.rpm = Math.min(12500, Math.max(this.playerVehicle.rpm || 4000, 10800));
      }
      return;
    }`;

if (!mainCode.includes(controlsTarget)) {
  console.error('Failed to match controlsTarget in js/main.js');
} else {
  mainCode = mainCode.replace(controlsTarget, controlsReplacement);
  console.log('Matched controlsTarget in js/main.js');
}

// B. In animate(timestamp): Pin vehicle position/velocity during countdown
const animLoopTarget = `    this.physics.updateVehicle(this.playerVehicle, this.controls, dt, this.audio);
    this.physics.step(dt);`;

const animLoopReplacement = `    // During countdown, keep player car firmly locked on starting grid position
    if (this.session.currentMode === SESSION_TYPES.RACE && (this.session.raceState === 'LIGHTS_COUNTDOWN' || this.session.raceState === 'PRE_START')) {
      this.playerVehicle.body.velocity.set(0, 0, 0);
      this.playerVehicle.body.angularVelocity.set(0, 0, 0);
      if (this.aiGrid && this.aiGrid.playerSpawnGridPos) {
        this.playerVehicle.body.position.copy(this.aiGrid.playerSpawnGridPos);
      }
    }

    this.physics.updateVehicle(this.playerVehicle, this.controls, dt, this.audio);
    this.physics.step(dt);

    if (this.session.currentMode === SESSION_TYPES.RACE && (this.session.raceState === 'LIGHTS_COUNTDOWN' || this.session.raceState === 'PRE_START')) {
      this.playerVehicle.body.velocity.set(0, 0, 0);
      this.playerVehicle.body.angularVelocity.set(0, 0, 0);
      if (this.aiGrid && this.aiGrid.playerSpawnGridPos) {
        this.playerVehicle.body.position.copy(this.aiGrid.playerSpawnGridPos);
      }
    }`;

if (!mainCode.includes(animLoopTarget)) {
  console.error('Failed to match animLoopTarget in js/main.js');
} else {
  mainCode = mainCode.replace(animLoopTarget, animLoopReplacement);
  console.log('Matched animLoopTarget in js/main.js');
}

// C. In animate(timestamp): Add session.update, timing.update, audio.update, and track.update
const afterCarUpdateTarget = `    this.playerCar.update(
      dt,
      speedMps,
      this.playerVehicle.steerAngle,
      this.playerVehicle.lateralSlip,
      this.controls.throttle,
      this.controls.brake,
      isBottomingOut
    );

    this.updateCamera(dt, this.playerCar.group.position, forward, speedMps);`;

const afterCarUpdateReplacement = `    this.playerCar.update(
      dt,
      speedMps,
      this.playerVehicle.steerAngle,
      this.playerVehicle.lateralSlip,
      this.controls.throttle,
      this.controls.brake,
      isBottomingOut
    );

    // Update Session state machine & 10-car AI grid dynamics
    this.session.update(dt, this.playerVehicle, pPos, vel);
    this.timing.update(pPos, vel);
    this.lastCheckedLap = this.timing.currentLap;

    if (this.track && this.track.update) {
      this.track.update(dt);
    }

    this.audio.update(
      this.playerVehicle.rpm,
      this.controls.throttle,
      speedKmh,
      this.playerVehicle.lateralSlip
    );

    this.updateCamera(dt, this.playerCar.group.position, forward, speedMps);`;

if (!mainCode.includes(afterCarUpdateTarget)) {
  console.error('Failed to match afterCarUpdateTarget in js/main.js');
} else {
  mainCode = mainCode.replace(afterCarUpdateTarget, afterCarUpdateReplacement);
  console.log('Matched afterCarUpdateTarget in js/main.js');
}

fs.writeFileSync('js/main.js', mainCode, 'utf8');
console.log('ALL FIXES WRITTEN SUCCESSFULLY!');
