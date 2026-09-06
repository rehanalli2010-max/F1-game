import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

async function getWsUrl() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const targets = JSON.parse(d);
        const t = targets.find(x => x.type === 'page' && x.url && x.url.includes('3000')) || targets[0];
        resolve(t.webSocketDebuggerUrl);
      });
    });
  });
}

async function main() {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();

  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id).resolve(d.result);
      pending.delete(d.id);
    }
  };

  const send = (method, params = {}) => new Promise(resolve => {
    const reqId = id++;
    pending.set(reqId, { resolve });
    ws.send(JSON.stringify({ id: reqId, method, params }));
  });

  await new Promise(r => ws.onopen = r);
  console.log('Connected to live browser. Switching to Spa-Francorchamps to inspect the issue...');

  const info = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.closeModals();
      g.switchTrack('spa');
      g.resetCamera();

      // Find the track elevation extremes
      const pts = g.track.sampledPoints;
      let minY = Infinity, maxY = -Infinity;
      let minPt = null, maxPt = null;
      let minT = 0, maxT = 0;

      pts.forEach((p, idx) => {
        if (p.y < minY) { minY = p.y; minPt = p; minT = idx / pts.length; }
        if (p.y > maxY) { maxY = p.y; maxPt = p; maxT = idx / pts.length; }
      });

      // Find ground mesh in trackRoot
      let groundMesh = null;
      g.track.trackRoot.traverse(child => {
        if (child.isMesh && child.geometry && child.geometry.type === 'PlaneGeometry' && child.position.y < 0.1 && child.geometry.parameters.width > 1000) {
          groundMesh = {
            positionY: child.position.y,
            width: child.geometry.parameters.width,
            height: child.geometry.parameters.height
          };
        }
      });

      return {
        trackName: g.track.trackData.name,
        trackId: g.track.trackData.id,
        minY,
        maxY,
        minT,
        maxT,
        minPt,
        maxPt,
        groundMesh,
        pointsBelowZero: pts.filter(p => p.y < -0.05).length,
        totalPoints: pts.length
      };
    })()`,
    returnByValue: true
  });

  console.log('Spa Circuit Diagnostics:', JSON.stringify(info.result.value, null, 2));

  // View 1: Chase camera behind player driving down into Eau Rouge
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.15; // Downhill approach to Eau Rouge
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t);
      const yaw = Math.atan2(tgt.x, tgt.z);

      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 55.0);
      g.playerCar.setPositionAndRotation(g.playerVehicle.body.position, g.playerVehicle.body.quaternion);

      // Camera behind car looking down track into Eau Rouge
      const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
      g.camera.position.set(pt.x - fwd.x * 12.0, pt.y + 4.5, pt.z - fwd.z * 12.0);
      g.camera.lookAt(pt.x + fwd.x * 20.0, pt.y - 2.0, pt.z + fwd.z * 20.0);
    })()`
  });

  await new Promise(r => setTimeout(r, 400));
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_bug_eau_rouge_approach.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved spa_bug_eau_rouge_approach.png');

  // View 2: Side overview showing the green plane slicing right through the track at Eau Rouge
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      // High vantage point showing the ground plane clipping through the track
      g.camera.position.set(90, 8, 40);
      g.camera.lookAt(20, -10, 110);
    })()`
  });

  await new Promise(r => setTimeout(r, 400));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_bug_side_clipping.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved spa_bug_side_clipping.png');

  // View 3: At the valley floor of Eau Rouge (t = 0.20) where track is at y = -12m
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.20;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t);
      const yaw = Math.atan2(tgt.x, tgt.z);

      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 60.0);
      g.playerCar.setPositionAndRotation(g.playerVehicle.body.position, g.playerVehicle.body.quaternion);

      const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
      g.camera.position.set(pt.x - fwd.x * 14.0, pt.y + 5.0, pt.z - fwd.z * 14.0);
      g.camera.lookAt(pt.x + fwd.x * 15.0, pt.y + 8.0, pt.z + fwd.z * 15.0);
    })()`
  });

  await new Promise(r => setTimeout(r, 400));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_bug_eau_rouge_valley.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved spa_bug_eau_rouge_valley.png');

  ws.close();
}

main().catch(console.error);
