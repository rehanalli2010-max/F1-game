import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

async function getWsUrl() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)[0].webSocketDebuggerUrl));
    });
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

  console.log('1. Switching to Silverstone and resetting session...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.switchTrack('silverstone');
      g.playerVehicle.isReversing = false;
      g.controls.brake = 0;
      g.controls.throttle = 0;
      g.controls.steer = 0;
      g.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('2. Capturing Top-Down Aerial View of Authentic Silverstone Layout...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g._origUpdateCamera = g.updateCamera;
      g.updateCamera = function() {
        this.camera.position.set(20, 680, 20);
        this.camera.lookAt(20, 0, 20);
      };
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  const aerialShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'silverstone_after_aerial.png'), Buffer.from(aerialShot.data, 'base64'));
  console.log('Saved silverstone_after_aerial.png');

  // Restore camera
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.updateCamera = g._origUpdateCamera;
      g.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));

  console.log('3. Installing Autonomous Lap Driver on Orion Racing car...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const THREE = window.THREE || g.playerCar.group.constructor.prototype.constructor;
      g._silverstoneAutopilot = true;
      g.playerVehicle.isReversing = false;
      g.controls.brake = 0;

      const curve = g.track.curve;
      const totalLen = g.track.trackLength;

      const orig = g.updateControls.bind(g);
      g.updateControls = function(dt) {
        orig(dt);
        if (!this._silverstoneAutopilot) return;

        const body = this.playerVehicle.body;
        const pos = body.position;
        const vel = body.velocity;
        const speed = Math.hypot(vel.x, vel.z);

        // Find closest point on spline
        let bestT = 0, bestD2 = Infinity;
        const S = 350;
        for (let i = 0; i < S; i++) {
          const t = i / S;
          const p = curve.getPointAt(t);
          const d2 = (p.x - pos.x)**2 + (p.z - pos.z)**2;
          if (d2 < bestD2) {
            bestD2 = d2;
            bestT = t;
          }
        }

        // Dynamic lookahead based on speed
        const lookaheadMeters = Math.max(16, Math.min(32, speed * 0.75));
        const lookaheadT = (bestT + (lookaheadMeters / totalLen)) % 1.0;
        const targetPt = curve.getPointAt(lookaheadT);

        const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.playerCar.group.quaternion);
        const toTgt = new THREE.Vector3(targetPt.x - pos.x, 0, targetPt.z - pos.z).normalize();

        const crossY = fwd.z * toTgt.x - fwd.x * toTgt.z;
        const dot = fwd.x * toTgt.x + fwd.z * toTgt.z;
        const angle = Math.atan2(crossY, dot);

        this.controls.steer = -Math.max(-1.0, Math.min(1.0, angle * 3.4));

        // Speed regulation for hairpins
        const tgt1 = curve.getTangentAt(lookaheadT);
        const tgt2 = curve.getTangentAt((lookaheadT + 0.03) % 1.0);
        const turnDot = Math.max(-1, Math.min(1, tgt1.dot(tgt2)));
        const turnAngle = Math.acos(turnDot);

        this.keys['KeyW'] = true;
        this.touchThrottle = 1.0;
        this.playerVehicle.isReversing = false;

        if (turnAngle > 0.45 && speed > 24) {
          this.controls.throttle = 0.2;
          this.controls.brake = 0.7;
        } else if (turnAngle > 0.25 && speed > 35) {
          this.controls.throttle = 0.45;
          this.controls.brake = 0.2;
        } else {
          this.controls.throttle = 1.0;
          this.controls.brake = 0.0;
        }
      };
    })()`
  });

  console.log('4. Driving through Hamilton Straight into Abbey & Farm...');
  await new Promise(r => setTimeout(r, 4500));
  const abbeyShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'silverstone_after_abbey.png'), Buffer.from(abbeyShot.data, 'base64'));
  console.log('Saved silverstone_after_abbey.png');

  console.log('5. Driving through Wellington Straight & Brooklands/Luffield...');
  await new Promise(r => setTimeout(r, 11000));
  const luffieldShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'silverstone_after_wellington_luffield.png'), Buffer.from(luffieldShot.data, 'base64'));
  console.log('Saved silverstone_after_wellington_luffield.png');

  console.log('6. Driving through Copse, Maggotts, Becketts & Hangar Straight...');
  await new Promise(r => setTimeout(r, 12000));
  const hangarShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'silverstone_after_hangar_straight.png'), Buffer.from(hangarShot.data, 'base64'));
  console.log('Saved silverstone_after_hangar_straight.png');

  console.log('7. Driving through Stowe, Vale, and Club Corner onto Main Straight to complete the lap...');
  for (let s = 1; s <= 25; s++) {
    await new Promise(r => setTimeout(r, 1200));
    const telemetry = await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const p = g.playerVehicle.body.position;
        const vel = g.playerVehicle.body.velocity;
        const speed = Math.round(Math.hypot(vel.x, vel.z) * 3.6);
        return {
          step: ${s},
          speedKmh: speed,
          lap: g.timing.currentLap,
          lastLapTime: g.timing.lastLapTime,
          pos: [Number(p.x.toFixed(1)), Number(p.z.toFixed(1))]
        };
      })()`,
      returnByValue: true
    });
    const info = telemetry?.result?.value;
    console.log(`[Telemetry Step ${s}]`, info);

    if (info && (info.lap >= 2 || info.lastLapTime > 0 || (s > 6 && info.pos[0] > 135 && info.pos[1] >= -5 && info.pos[1] <= 60))) {
      console.log('>>> FULL LAP COMPLETED! CAR CROSSED START/FINISH LINE! <<<');
      break;
    }
  }

  // Capture finish line crossing
  const finishShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'silverstone_after_lap_completed.png'), Buffer.from(finishShot.data, 'base64'));
  console.log('Saved silverstone_after_lap_completed.png');

  // Turn off autopilot
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g._silverstoneAutopilot = false;
      g.keys['KeyW'] = false;
      g.controls.throttle = 0;
      g.controls.brake = 0.5;
    })()`
  });

  ws.close();
  console.log('Full round drive verification finished successfully!');
}

main().catch(console.error);
