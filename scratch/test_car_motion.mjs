import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(__dirname, 'edge_profile_test_motion2');

  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9228',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--window-size=1920,1080',
    'about:blank'
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://localhost:9228/json', (res) => {
          let str = '';
          res.on('data', d => str += d);
          res.on('end', () => resolve(JSON.parse(str)));
        }).on('error', reject);
      });
      if (data && data.length > 0 && data[0].webSocketDebuggerUrl) {
        wsUrl = data[0].webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.result?.exceptionDetails) {
        console.error('CDP EVAL EXCEPTION:', JSON.stringify(msg.result.exceptionDetails));
      }
      resolve(msg.result);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');

  await send('Page.navigate', { url: `http://localhost:3000/?t=${Date.now()}` });
  
  // Wait until window.game and playerVehicle are fully initialized
  console.log('Waiting for game to initialize...');
  for (let i = 0; i < 30; i++) {
    const ready = await send('Runtime.evaluate', {
      expression: `!!(window.game && window.game.playerVehicle && window.game.playerVehicle.body)`
    });
    if (ready.result?.value) {
      console.log('Game initialized successfully!');
      break;
    }
    await new Promise(r => setTimeout(r, 400));
  }

  // Drive car in a dynamic turning arc for 60 frames
  console.log('Simulating 60 physics frames of high-speed cornering...');
  const driveResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        const body = g.playerVehicle.body;

        // Give car initial high speed of 220 km/h down the track
        // In local vehicle space, forward is (0, 0, 1)
        const q = g.playerCar.group.quaternion;
        const fx = 2 * (q.x * q.z + q.w * q.y);
        const fz = 1 - 2 * (q.x * q.x + q.y * q.y);
        const speedMps = 220 / 3.6; // ~61.1 m/s
        body.velocity.set(fx * speedMps, 0, fz * speedMps);

        const dt = 0.0166;
        const telemetrySnapshots = [];

        // Simulate 45 frames of heavy high-G cornering (steering right + braking)
        for (let frame = 0; frame < 45; frame++) {
          // Set controls: trail braking + hard steer
          g.controls.throttle = 0.4;
          g.controls.brake = 0.6;
          g.controls.steer = 0.85;

          // Step physics
          g.physics.updateVehicle(g.playerVehicle, g.controls, dt, g.audio);
          g.physics.step(dt);

          // Update G-forces calculation
          g.calculateGForces(dt);

          // Render G-Force radar
          g.drawGForceRadar();

          telemetrySnapshots.push({
            speedKmh: Math.round(body.velocity.length() * 3.6),
            latG: Number(g.smoothedLatG.toFixed(2)),
            lonG: Number(g.smoothedLonG.toFixed(2)),
            magG: Number(Math.sqrt(g.smoothedLatG*g.smoothedLatG + g.smoothedLonG*g.smoothedLonG).toFixed(2)),
            peakG: Number(g.peakG.toFixed(2))
          });
        }

        // Also render full scene
        g.renderer.render(g.scene, g.camera);

        return {
          snapshotsCount: telemetrySnapshots.length,
          lastTelemetry: telemetrySnapshots[telemetrySnapshots.length - 1],
          peakG: g.peakG,
          historyCount: g.gforceHistory.length
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Cornering Simulation Result:', JSON.stringify(driveResult.result.value, null, 2));

  // Capture close-up of active high-G radar
  const clipRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const card = document.getElementById('gforce-radar-card');
        if (!card) return null;
        const rect = card.getBoundingClientRect();
        return {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scale: 1
        };
      })()
    `,
    returnByValue: true
  });

  if (clipRes.result.value) {
    const cardShot = await send('Page.captureScreenshot', {
      format: 'png',
      clip: clipRes.result.value
    });
    const cardPath = path.join(__dirname, 'gforce_radar_card_cornering_active.png');
    fs.writeFileSync(cardPath, Buffer.from(cardShot.data, 'base64'));
    console.log('Active high-G radar close-up saved to:', cardPath);
  }

  // Capture full cockpit gameplay screenshot
  const fullShot = await send('Page.captureScreenshot', { format: 'png' });
  const fullPath = path.join(__dirname, 'gforce_radar_full_cornering.png');
  fs.writeFileSync(fullPath, Buffer.from(fullShot.data, 'base64'));
  console.log('Full cockpit gameplay screenshot saved to:', fullPath);

  ws.close();
  edge.kill();
}

main().catch(console.error);
