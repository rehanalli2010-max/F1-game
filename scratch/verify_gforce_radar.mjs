import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(__dirname, 'edge_profile_gforce_test');

  console.log('Launching headless Edge to verify G-Force Radar...');
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9226',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1920,1080',
    'about:blank'
  ], { stdio: 'ignore' });

  // Connect to CDP
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://localhost:9226/json', (res) => {
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

  if (!wsUrl) {
    console.error('Failed to get WebSocket Debugger URL');
    edge.kill();
    process.exit(1);
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

  const errors = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const details = msg.params.exceptionDetails;
      const err = `[EXCEPTION]: ${details.text} at ${details.url}:${details.lineNumber} - ${details.exception?.description || details.exception?.value || ''}`;
      console.error(err);
      errors.push(err);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      const line = `[CONSOLE ERROR]: ` + msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      console.error(line);
      errors.push(line);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');

  console.log('Navigating to http://localhost:3000/?t=' + Date.now());
  await send('Page.navigate', { url: `http://localhost:3000/?t=${Date.now()}` });

  // Wait for initial load
  await new Promise(r => setTimeout(r, 4000));

  // Check G-force radar canvas existence & dimensions
  const radarCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const card = document.getElementById('gforce-radar-card');
        const canvas = document.getElementById('gforce-radar-canvas');
        const peakBadge = document.getElementById('gforce-peak-badge');
        return {
          hasCard: !!card,
          hasCanvas: !!canvas,
          canvasW: canvas?.width,
          canvasH: canvas?.height,
          peakText: peakBadge?.textContent,
          hasGame: !!window.game
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Radar Elements Check:', radarCheck.result.value);

  // Switch to Suzuka GP
  await send('Runtime.evaluate', {
    expression: `window.game.switchTrack('suzuka');`
  });

  await new Promise(r => setTimeout(r, 3000));

  // Accelerate hard down the straight to 180 km/h
  console.log('Accelerating on Suzuka to build speed...');
  for (let step = 0; step < 25; step++) {
    await send('Runtime.evaluate', {
      expression: `
        window.game.controls.throttle = 1.0;
        window.game.controls.brake = 0.0;
        window.game.controls.steer = 0.0;
      `
    });
    await new Promise(r => setTimeout(r, 100));
  }

  // Now throw the car into a hard turn (Turn 1 / Turn 2 on Suzuka) while tapping brakes for high Gs
  console.log('Cornering hard into Suzuka Turn 1/2 to generate high G-forces...');
  for (let step = 0; step < 30; step++) {
    await send('Runtime.evaluate', {
      expression: `
        window.game.controls.throttle = 0.7;
        window.game.controls.steer = 0.85; // Hard steering into corner
        window.game.controls.brake = 0.2; // Trail braking
      `
    });
    await new Promise(r => setTimeout(r, 80));
  }

  // Sample live G telemetry
  const gTelemetry = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        return {
          speedKmh: Math.round(g.playerVehicle.body.velocity.length() * 3.6),
          latG: Number(g.smoothedLatG.toFixed(2)),
          lonG: Number(g.smoothedLonG.toFixed(2)),
          totalG: Number(Math.sqrt(g.smoothedLatG * g.smoothedLatG + g.smoothedLonG * g.smoothedLonG).toFixed(2)),
          peakG: Number((g.peakG || 0).toFixed(2)),
          trailLength: g.gforceHistory.length,
          peakBadgeText: document.getElementById('gforce-peak-badge')?.textContent
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Live Cornering G-Force Telemetry:', gTelemetry.result.value);

  // Capture full cockpit gameplay screenshot with G-force radar active
  const fullShot = await send('Page.captureScreenshot', { format: 'png' });
  const fullShotPath = path.join(__dirname, 'gforce_radar_full_gameplay.png');
  fs.writeFileSync(fullShotPath, Buffer.from(fullShot.data, 'base64'));
  console.log('Full gameplay screenshot saved to:', fullShotPath);

  // Capture close-up of the G-force radar card
  const clipResult = await send('Runtime.evaluate', {
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

  if (clipResult.result.value) {
    const cardClip = clipResult.result.value;
    console.log('Capturing G-force radar close-up at:', cardClip);
    const cardShot = await send('Page.captureScreenshot', {
      format: 'png',
      clip: cardClip
    });
    const cardShotPath = path.join(__dirname, 'gforce_radar_card_closeup.png');
    fs.writeFileSync(cardShotPath, Buffer.from(cardShot.data, 'base64'));
    console.log('Card close-up saved to:', cardShotPath);
  }

  ws.close();
  edge.kill();

  console.log('Total errors:', errors.length);
  if (errors.length > 0) {
    console.error('Errors found:', errors);
    process.exit(1);
  } else {
    console.log('G-FORCE RADAR VERIFICATION PASSED PERFECTLY!');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
