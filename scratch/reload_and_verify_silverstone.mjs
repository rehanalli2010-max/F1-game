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

  console.log('Reloading Silverstone circuit live...');
  // Force reload of track by switching to monza then silverstone, or page reload
  // Since files were modified on disk, let's reload the page to pick up the updated JS modules!
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 2500));

  // Now switch to Silverstone
  const switchRes = await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.switchTrack('silverstone');
      return {
        trackId: window.game.currentTrackId,
        lengthMeters: window.game.track.trackLength,
        sampleCount: window.game.track.sampledPoints.length,
        carPos: {
          x: window.game.playerVehicle.chassisBody.position.x,
          y: window.game.playerVehicle.chassisBody.position.y,
          z: window.game.playerVehicle.chassisBody.position.z
        }
      };
    })()`,
    returnByValue: true
  });
  console.log('Switch result:', switchRes.result.value);

  // Wait a moment for scene render
  await new Promise(r => setTimeout(r, 1000));

  // Capture clean starting grid screenshot
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'silverstone_after_grid.png'), Buffer.from(shot1.data, 'base64'));
  console.log('Saved silverstone_after_grid.png');

  ws.close();
}
main().catch(console.error);
