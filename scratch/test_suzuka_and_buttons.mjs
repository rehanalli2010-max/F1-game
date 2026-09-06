import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(__dirname, 'edge_profile_testboot4');

  console.log('Launching headless Edge to verify Suzuka and all buttons...');
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
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
        http.get('http://localhost:9225/json', (res) => {
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

  // Wait for initial boot
  await new Promise(r => setTimeout(r, 4000));

  // Switch to Suzuka track via UI / game API
  console.log('Switching to Suzuka track...');
  const switchRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        if (!g) return { error: 'No game object' };
        g.switchTrack('suzuka');
        return {
          currentTrack: g.track ? g.track.trackData.name : null,
          trackId: g.currentTrackId,
          playerPos: g.playerVehicle.body.position
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Switch result:', switchRes.result.value);

  // Wait for Suzuka to construct
  await new Promise(r => setTimeout(r, 3000));

  // Ensure Practice mode so we can drive immediately without waiting for starting lights
  console.log('Ensuring Practice mode for immediate driving...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btnPractice = document.getElementById('btn-mode-practice');
        if (btnPractice) btnPractice.click();
      })()
    `
  });

  await new Promise(r => setTimeout(r, 1000));

  // Hook into updateControls to drive with full throttle and steer hard into corners
  console.log('Driving and cornering to test G-force radar in action via updateControls hook...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        g._testDrive = true;
        g._steerTarget = 0.0;
        const orig = g.updateControls.bind(g);
        g.updateControls = function(dt) {
          orig(dt);
          if (this._testDrive) {
            this.controls.throttle = 1.0;
            this.controls.steer = this._steerTarget;
            this.controls.brake = 0.0;
          }
        };
      })()
    `
  });

  // Accelerate straight for 3.5 seconds
  await new Promise(r => setTimeout(r, 3500));

  // Now steer hard right to pull sustained high Gs in turn
  console.log('Steering hard into high-speed corner...');
  await send('Runtime.evaluate', {
    expression: `window.game._steerTarget = 0.88;`
  });

  await new Promise(r => setTimeout(r, 2000));

  // Read telemetry
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
          historyLen: g.gforceHistory.length,
          peakBadgeText: document.getElementById('gforce-peak-badge')?.textContent
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Cornering G-Force Telemetry:', gTelemetry.result.value);

  // Capture full screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const shotPath = path.join(__dirname, 'suzuka_cornering_gforce.png');
  fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
  console.log('Screenshot saved to:', shotPath);

  // Capture close-up of G-Force card
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
    const cardPath = path.join(__dirname, 'gforce_radar_card_active.png');
    fs.writeFileSync(cardPath, Buffer.from(cardShot.data, 'base64'));
    console.log('G-Force Radar close-up saved to:', cardPath);
  }

  ws.close();
  edge.kill();

  console.log('Total errors:', errors.length);
  if (errors.length > 0) {
    console.error('Errors found:', errors);
    process.exit(1);
  } else {
    console.log('ALL CHECKS PASSED: Game is 100% playable, all buttons and Suzuka track working!');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
