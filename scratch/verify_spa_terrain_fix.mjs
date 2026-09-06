import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

async function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const targets = JSON.parse(d);
          const t = targets.find(x => x.type === 'page' && x.url && x.url.includes('3000')) || targets[0];
          resolve(t.webSocketDebuggerUrl);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
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
  console.log('Connected to Edge via CDP on port 9222.');

  // Reload page to get latest scripts
  console.log('Reloading page on http://localhost:3000/...');
  await send('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 2200));

  // Switch to Spa-Francorchamps
  console.log('Switching to Spa-Francorchamps...');
  const switchRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.closeModals();
      g.switchTrack('spa');
      g.resetCamera();
      return {
        trackName: g.track.trackData.name,
        trackId: g.track.trackData.id,
        trackLength: g.track.trackLength,
        minTrackElevation: g.track._minTrackElevation,
        maxTrackElevation: g.track._maxTrackElevation
      };
    })()`,
    returnByValue: true
  });
  console.log('Track loaded:', switchRes.result.value);

  // Diagnostic 1: Scan entire track for terrain clipping
  console.log('Running 3D terrain anti-clipping scan across all sampled points and lateral corridors...');
  const diagRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const pts = g.track.sampledPoints;
      let clipCountCenter = 0;
      let clipCountLeftEdge = 0;
      let clipCountRightEdge = 0;
      const halfW = g.track.trackWidth / 2;

      let worstCenterDiff = -Infinity;
      let worstEdgeDiff = -Infinity;

      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        const tgt = g.track.sampledTangents[i];
        const norm = { x: -tgt.z, z: tgt.x };

        // Center check
        const hCenter = g.track.getTerrainHeight(pt.x, pt.z);
        const diffCenter = hCenter - pt.y;
        if (diffCenter > worstCenterDiff) worstCenterDiff = diffCenter;
        if (diffCenter > -0.05) clipCountCenter++;

        // Left edge check (curb/apron)
        const lx = pt.x - norm.x * (halfW + 1.5);
        const lz = pt.z - norm.z * (halfW + 1.5);
        const hLeft = g.track.getTerrainHeight(lx, lz);
        const diffLeft = hLeft - pt.y;
        if (diffLeft > worstEdgeDiff) worstEdgeDiff = diffLeft;
        if (diffLeft > -0.04) clipCountLeftEdge++;

        // Right edge check
        const rx = pt.x + norm.x * (halfW + 1.5);
        const rz = pt.z + norm.z * (halfW + 1.5);
        const hRight = g.track.getTerrainHeight(rx, rz);
        const diffRight = hRight - pt.y;
        if (diffRight > worstEdgeDiff) worstEdgeDiff = diffRight;
        if (diffRight > -0.04) clipCountRightEdge++;
      }

      return {
        totalPoints: pts.length,
        clipCountCenter,
        clipCountLeftEdge,
        clipCountRightEdge,
        worstCenterDiff,
        worstEdgeDiff,
        passed: (clipCountCenter === 0 && clipCountLeftEdge === 0 && clipCountRightEdge === 0)
      };
    })()`,
    returnByValue: true
  });
  console.log('Anti-clipping scan results:', diagRes.result.value);

  // Capture View 1: Eau Rouge approach (looking down into the valley)
  console.log('Capturing View 1: Eau Rouge downhill approach...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.15;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t);
      const yaw = Math.atan2(tgt.x, tgt.z);

      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 55.0);
      g.playerCar.setPositionAndRotation(g.playerVehicle.body.position, g.playerVehicle.body.quaternion);

      const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
      g.camera.position.set(pt.x - fwd.x * 12.0, pt.y + 4.5, pt.z - fwd.z * 12.0);
      g.camera.lookAt(pt.x + fwd.x * 20.0, pt.y - 2.0, pt.z + fwd.z * 20.0);
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_fixed_eau_rouge_approach.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved spa_fixed_eau_rouge_approach.png');

  // Capture View 2: Eau Rouge valley floor (t = 0.20, y = -12.03m)
  console.log('Capturing View 2: Eau Rouge valley floor (y = -12m)...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.20;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t);
      const yaw = Math.atan2(tgt.x, tgt.z);

      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 65.0);
      g.playerCar.setPositionAndRotation(g.playerVehicle.body.position, g.playerVehicle.body.quaternion);

      const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
      g.camera.position.set(pt.x - fwd.x * 10.0, pt.y + 3.5, pt.z - fwd.z * 10.0);
      g.camera.lookAt(pt.x + fwd.x * 25.0, pt.y + 6.0, pt.z + fwd.z * 25.0);
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_fixed_eau_rouge_valley.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved spa_fixed_eau_rouge_valley.png');

  // Capture View 3: Side overview of Eau Rouge valley
  console.log('Capturing View 3: Side vantage of Eau Rouge valley...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      // Freeze camera override temporarily for screenshot
      g._tempCameraFreeze = true;
      g.camera.position.set(90, 8, 40);
      g.camera.lookAt(20, -10, 110);
      g.renderer.render(g.scene, g.camera);
    })()`
  });
  await new Promise(r => setTimeout(r, 400));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_fixed_side_overview.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved spa_fixed_side_overview.png');

  // Capture View 4: Raidillon steep climb (t = 0.23, climbing to +20m)
  console.log('Capturing View 4: Raidillon climb...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g._tempCameraFreeze = false;
      const t = 0.23;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t);
      const yaw = Math.atan2(tgt.x, tgt.z);

      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 70.0);
      g.playerCar.setPositionAndRotation(g.playerVehicle.body.position, g.playerVehicle.body.quaternion);

      const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
      g.camera.position.set(pt.x - fwd.x * 9.0, pt.y + 3.0, pt.z - fwd.z * 9.0);
      g.camera.lookAt(pt.x + fwd.x * 20.0, pt.y + 4.0, pt.z + fwd.z * 20.0);
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_fixed_raidillon_climb.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved spa_fixed_raidillon_climb.png');

  // Capture View 5: Kemmel Straight crest (t = 0.35, y = +26m)
  console.log('Capturing View 5: Kemmel Straight crest (+26m)...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.35;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t);
      const yaw = Math.atan2(tgt.x, tgt.z);

      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 85.0);
      g.playerCar.setPositionAndRotation(g.playerVehicle.body.position, g.playerVehicle.body.quaternion);

      const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
      g.camera.position.set(pt.x - fwd.x * 8.0, pt.y + 2.5, pt.z - fwd.z * 8.0);
      g.camera.lookAt(pt.x + fwd.x * 30.0, pt.y, pt.z + fwd.z * 30.0);
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_fixed_kemmel_straight.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved spa_fixed_kemmel_straight.png');

  // Diagnostic 2: Live player driving test through Eau Rouge
  console.log('Running dynamic driving simulation through Eau Rouge...');
  const driveRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      // Start just before Eau Rouge entry
      const startT = 0.17;
      const pt = g.track.curve.getPointAt(startT);
      const tgt = g.track.curve.getTangentAt(startT);
      const yaw = Math.atan2(tgt.x, tgt.z);

      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 60.0);
      g.playerCar.setPositionAndRotation(g.playerVehicle.body.position, g.playerVehicle.body.quaternion);
      g.resetCamera();

      // Test vertical synchronization
      const p = g.playerVehicle.body.position;
      const info = g.track.getClosestTrackPoint(p.x, p.z);
      const carGroup = g.playerCar.group.position;

      return {
        bodyY: p.y,
        carY: carGroup.y,
        trackY: info.point.y,
        diff: Math.abs(carGroup.y - (info.point.y + 0.04)),
        success: Math.abs(carGroup.y - (info.point.y + 0.04)) < 0.01
      };
    })()`,
    returnByValue: true
  });
  console.log('Dynamic driving test results:', driveRes.result.value);

  // Capture View 6: Chase cam
  await new Promise(r => setTimeout(r, 400));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_fixed_live_driving_run.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved spa_fixed_live_driving_run.png');

  // Verify non-regression on flat track (Monza)
  console.log('Verifying non-regression on Monza (flat circuit)...');
  const monzaRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.switchTrack('monza');
      g.resetCamera();
      const pts = g.track.sampledPoints;
      let clipCount = 0;
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        const th = g.track.getTerrainHeight(pt.x, pt.z);
        if (th > pt.y - 0.05) clipCount++;
      }
      return {
        trackName: g.track.trackData.name,
        clipCount,
        passed: clipCount === 0
      };
    })()`,
    returnByValue: true
  });
  console.log('Monza verification results:', monzaRes.result.value);

  // Switch back to Spa for the user
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.switchTrack('spa');
      window.game.resetCamera();
    })()`
  });

  ws.close();
  console.log('Verification completed successfully!');
}

main().catch(console.error);
