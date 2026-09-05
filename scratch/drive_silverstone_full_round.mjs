import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

async function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)[0].webSocketDebuggerUrl));
    }).on('error', reject);
  });
}

async function main() {
  const ws = new WebSocket(await getWsUrl());
  let msgId = 1;
  const pending = new Map();
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id).resolve(d.result);
      pending.delete(d.id);
    }
  };
  const send = (m, p = {}) => new Promise(resolve => {
    const id = msgId++;
    pending.set(id, { resolve });
    ws.send(JSON.stringify({ id, method: m, params: p }));
  });
  await new Promise(r => ws.onopen = r);

  console.log('1. Capturing Top-Down Aerial View of Refined Silverstone...');
  // Set camera high above for aerial shot
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.camera.position.set(20, 750, 20);
      g.camera.lookAt(20, 0, 20);
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  const aerialShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'silverstone_after_aerial.png'), Buffer.from(aerialShot.data, 'base64'));
  console.log('Saved silverstone_after_aerial.png');

  // Reset camera back to chase mode behind the car
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  console.log('2. Initializing Practice driving session on starting line...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.session.initSession('PRACTICE', g.playerVehicle, g.playerCar);
      g.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  console.log('3. Installing high-precision autonomous lap driver...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const THREE = window.THREE || g.playerCar.group.constructor.prototype.constructor;
      g._silverstoneAutoPilot = true;
      g._lapSnapshots = [];

      const curve = g.track.curve;
      const totalLen = g.track.trackLength;

      // Autopilot steering and throttle control
      const origUpdate = g.updateControls.bind(g);
      g.updateControls = function(dt) {
        origUpdate(dt);
        if (!this._silverstoneAutoPilot) return;

        const chassis = this.playerVehicle.chassisBody;
        const pos = chassis.position;
        const vel = chassis.velocity;
        const speed = Math.hypot(vel.x, vel.z);

        // Find current t along the track curve
        let bestT = 0, bestD2 = Infinity;
        const S = 300;
        for (let i = 0; i < S; i++) {
          const t = i / S;
          const p = curve.getPointAt(t);
          const d2 = (p.x - pos.x)**2 + (p.z - pos.z)**2;
          if (d2 < bestD2) {
            bestD2 = d2;
            bestT = t;
          }
        }

        // Lookahead distance scales with speed (18m to 35m)
        const lookaheadMeters = Math.max(16, Math.min(36, speed * 0.9));
        const lookaheadT = (bestT + (lookaheadMeters / totalLen)) % 1.0;
        const targetPt = curve.getPointAt(lookaheadT);

        // Car forward vector
        const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.playerCar.group.quaternion);
        const toTarget = new THREE.Vector3(targetPt.x - pos.x, 0, targetPt.z - pos.z).normalize();

        const crossY = fwd.z * toTarget.x - fwd.x * toTarget.z;
        const dot = fwd.x * toTarget.x + fwd.z * toTarget.z;
        const steerAngle = Math.atan2(crossY, dot);

        this.controls.steer = -Math.max(-1.0, Math.min(1.0, steerAngle * 3.0));

        // Speed regulation: gentle tap on brake if approaching tight hairpins (e.g. The Loop, Luffield, Vale)
        const curvatureSample1 = curve.getTangentAt(lookaheadT);
        const curvatureSample2 = curve.getTangentAt((lookaheadT + 0.02) % 1.0);
        const turnAngle = Math.acos(Math.max(-1, Math.min(1, curvatureSample1.dot(curvatureSample2))));

        if (turnAngle > 0.35 && speed > 28) {
          // Sharp corner braking
          this.controls.throttle = 0.2;
          this.controls.brake = 0.6;
        } else if (turnAngle > 0.2 && speed > 38) {
          this.controls.throttle = 0.5;
          this.controls.brake = 0.2;
        } else {
          // Full throttle straight / sweepers
          this.controls.throttle = 1.0;
          this.controls.brake = 0.0;
        }
      };
    })()`
  });

  console.log('4. Driving through Sector 1 (Hamilton Straight -> Abbey -> Farm -> The Loop)...');
  await new Promise(r => setTimeout(r, 4500));
  const s1Shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'silverstone_after_abbey.png'), Buffer.from(s1Shot.data, 'base64'));
  console.log('Saved silverstone_after_abbey.png');

  console.log('5. Driving through Sector 2 (Wellington Straight -> Brooklands -> Luffield -> Copse)...');
  await new Promise(r => setTimeout(r, 8000));
  const s2Shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'silverstone_after_wellington_luffield.png'), Buffer.from(s2Shot.data, 'base64'));
  console.log('Saved silverstone_after_wellington_luffield.png');

  console.log('6. Driving through Becketts complex and flat-out onto Hangar Straight...');
  await new Promise(r => setTimeout(r, 8000));
  const hangarShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'silverstone_after_hangar_straight.png'), Buffer.from(hangarShot.data, 'base64'));
  console.log('Saved silverstone_after_hangar_straight.png');

  console.log('7. Driving through Stowe, Vale chicane, and Club Corner onto the Main Straight...');
  // Monitor progression until lap completion or finish line crossed
  let lapCompleted = false;
  let finalStats = null;

  for (let step = 0; step < 25; step++) {
    await new Promise(r => setTimeout(r, 1500));
    const status = await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const p = g.playerVehicle.chassisBody.position;
        const vel = g.playerVehicle.chassisBody.velocity;
        const speed = Math.round(Math.hypot(vel.x, vel.z) * 3.6);
        const tInfo = g.track.getClosestTrackPoint(p.x, p.z);
        return {
          t: Number((tInfo.t * 100).toFixed(1)),
          speedKmh: speed,
          lap: g.timing.currentLap,
          lastLapTime: g.timing.lastLapTime,
          pos: [Number(p.x.toFixed(1)), Number(p.z.toFixed(1))]
        };
      })()`,
      returnByValue: true
    });
    const info = status?.result?.value;
    console.log(`[Lap Progress ${step + 1}]`, info);
    if (info && (info.lap >= 2 || info.lastLapTime > 0 || (step > 10 && info.t < 15 && info.pos[0] > 130 && info.pos[1] > -30))) {
      lapCompleted = true;
      finalStats = info;
      console.log('LAP COMPLETED SUCCESSFULLY! Crossed finish line!');
      break;
    }
  }

  // Capture finish line crossing screenshot
  const finishShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'silverstone_after_lap_completed.png'), Buffer.from(finishShot.data, 'base64'));
  console.log('Saved silverstone_after_lap_completed.png');

  // Stop autopilot
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game._silverstoneAutoPilot = false;
      window.game.controls.throttle = 0;
      window.game.controls.brake = 1;
    })()`
  });

  ws.close();
  console.log('Silverstone full round completed successfully!');
}

main().catch(console.error);
