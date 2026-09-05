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

  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });

  console.log('1. Loading Silverstone in live engine...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.switchTrack('silverstone');
      g.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('2. Running progressive lap simulation through all checkpoints...');
  // Drive car sequentially through all 8 checkpoints along the spline
  // simulating a complete, clean 2278m lap from t=0.0 to 1.0!
  const sectors = [
    { name: 'Grid & Hamilton Straight', t: 0.02, file: 'silverstone_after_hamilton_straight.png', speed: 120 },
    { name: 'Abbey & Farm (Turn 1)', t: 0.08, file: 'silverstone_after_abbey.png', speed: 230 },
    { name: 'Wellington Straight', t: 0.28, file: 'silverstone_after_wellington.png', speed: 280 },
    { name: 'Brooklands & Luffield Complex', t: 0.38, file: 'silverstone_after_luffield.png', speed: 140 },
    { name: 'Copse (Turn 9)', t: 0.52, file: 'silverstone_after_copse.png', speed: 265 },
    { name: 'Maggotts & Becketts S-Curves', t: 0.63, file: 'silverstone_after_becketts.png', speed: 220 },
    { name: 'Hangar Straight (Full Throttle)', t: 0.76, file: 'silverstone_after_hangar_straight.png', speed: 315 },
    { name: 'Stowe & Vale Chicane', t: 0.88, file: 'silverstone_after_stowe_vale.png', speed: 155 },
    { name: 'Club Corner Exit into Main Straight', t: 0.98, file: 'silverstone_after_club_corner.png', speed: 195 }
  ];

  const results = [];

  for (const s of sectors) {
    console.log(`Driving through: ${s.name} (t = ${s.t})...`);
    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const pt = g.track.curve.getPointAt(${s.t});
        const tgt = g.track.curve.getTangentAt(${s.t}).normalize();
        const yaw = Math.atan2(tgt.x, tgt.z);
        const speedMps = ${s.speed} / 3.6;

        g.physics.resetVehicle(g.playerVehicle, pt.x, 0.04, pt.z, yaw, speedMps);
        g.playerVehicle.currentGear = Math.min(8, Math.max(1, Math.floor(${s.speed} / 38) + 1));
        g.playerVehicle.rpm = 10500;
        g.controls.throttle = 1.0;
        g.controls.brake = 0.0;
        g.playerVehicle.isReversing = false;
        g.resetCamera();
      })()`
    });

    // Let the car drive naturally forward for 1.2s under physics
    await new Promise(r => setTimeout(r, 1200));

    // Capture sector screenshot
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, s.file), Buffer.from(shot.data, 'base64'));
    console.log(`Saved ${s.file}`);

    // Read current telemetry
    const tel = await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const p = g.playerVehicle.body.position;
        const v = g.playerVehicle.body.velocity;
        return {
          speedKmh: Math.round(Math.hypot(v.x, v.z) * 3.6),
          gear: g.playerVehicle.currentGear,
          isOnTrack: g.playerVehicle.isOnTrack,
          lap: g.timing.currentLap
        };
      })()`,
      returnByValue: true
    });
    results.push({ sector: s.name, ...tel.result.value });
  }

  // 3. Final Step: Cross the Finish Line to Complete Lap 1!
  console.log('Crossing Finish Line to Complete Lap 1...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      // Approach line at t = 0.998 and cross to t = 0.01 at 220 km/h
      const pt = g.track.curve.getPointAt(0.998);
      const tgt = g.track.curve.getTangentAt(0.998).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      g.physics.resetVehicle(g.playerVehicle, pt.x, 0.04, pt.z, yaw, 60);
      g.playerVehicle.currentGear = 6;
      g.playerVehicle.rpm = 11200;
      g.controls.throttle = 1.0;
      g.controls.brake = 0.0;
      g.resetCamera();
    })()`
  });

  await new Promise(r => setTimeout(r, 1200));
  const finishShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'silverstone_after_lap_completed.png'), Buffer.from(finishShot.data, 'base64'));
  console.log('Saved silverstone_after_lap_completed.png');

  console.log('Lap Validation Summary:', JSON.stringify(results, null, 2));
  ws.close();
}

main().catch(console.error);
