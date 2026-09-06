import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

async function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const arr = JSON.parse(data);
        const target = arr.find(x => x.type === 'page') || arr[0];
        resolve(target ? target.webSocketDebuggerUrl : null);
      });
    }).on('error', reject);
  });
}

async function main() {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id).resolve(d);
      pending.delete(d.id);
    }
  };
  const send = (m, p = {}) => new Promise(resolve => {
    const id = msgId++;
    pending.set(id, { resolve });
    ws.send(JSON.stringify({ id, method: m, params: p }));
  });
  await new Promise(r => ws.onopen = r);

  console.log('1. Switching to Spa and setting camera to look at floating grandstand...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.switchTrack('spa');
      window.game.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // Screenshot 1: Look at the floating grandstand at t=0.14 or t=0.50
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      // Grandstand at t = 0.50 (pos: -212.2, y: 12.17, z: 216.2)
      // Camera looking at it from ground level to see the 3.82m floating gap!
      g.camera.position.set(-185, 12, 216);
      g.camera.lookAt(-212, 12, 216);
    })()`
  });
  await new Promise(r => setTimeout(r, 500));
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_bug_floating_grandstand_pouhon.png'), Buffer.from(shot.result.data, 'base64'));
  console.log('Saved spa_bug_floating_grandstand_pouhon.png');

  // Screenshot 2: Look at the grandstand at Eau Rouge / La Source (t = 0.14)
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      // Grandstand at pos: (107.3, y: -4.03, z: 57.1)
      g.camera.position.set(75, -2, 57);
      g.camera.lookAt(107, -4, 57);
    })()`
  });
  await new Promise(r => setTimeout(r, 500));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_bug_floating_grandstand_eau_rouge.png'), Buffer.from(shot.result.data, 'base64'));
  console.log('Saved spa_bug_floating_grandstand_eau_rouge.png');

  // Screenshot 3: Car going INSIDE the track when touching the curb at t = 0.264 (Raidillon climb)
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const track = g.track;
      const t = 0.264;
      const pt = track.curve.getPointAt(t);
      const tgt = track.curve.getTangentAt(t).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      const normLen = Math.hypot(tgt.z, -tgt.x) || 1;
      const nx = tgt.z / normLen;
      const nz = -tgt.x / normLen;

      // Position car on right curb (lat = +8.5m)
      const lat = 8.5;
      const px = pt.x + nx * lat;
      const pz = pt.z + nz * lat;

      g.physics.resetVehicle(g.playerVehicle, px, pt.y + 0.04, pz, yaw, 0);
      // Run update to trigger targetCarY
      g.updateVehicleVisuals(0.016);
      g.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_bug_car_sunk_in_track.png'), Buffer.from(shot.result.data, 'base64'));
  console.log('Saved spa_bug_car_sunk_in_track.png');

  ws.close();
}

main().catch(console.error);
