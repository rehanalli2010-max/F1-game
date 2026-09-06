import http from 'node:http';
import fs from 'node:fs';

async function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const targets = JSON.parse(d);
        console.log('Detected targets:', targets.map(t => ({ url: t.url, type: t.type })));
        const t = targets.find(x => x.type === 'page' && x.url && x.url.includes('3000'));
        if (t) return resolve(t.webSocketDebuggerUrl);
        // Fallback: find any regular http(s) page that is not an extension
        const fallback = targets.find(x => x.type === 'page' && !x.url.startsWith('chrome-extension://') && !x.url.startsWith('edge://'));
        if (fallback) return resolve(fallback.webSocketDebuggerUrl);
        reject(new Error('No suitable F1 game target found'));
      });
    });
  });
}

async function run() {
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

  await send('Page.bringToFront');

  console.log('1. Navigating to http://localhost:3000 ...');
  await send('Page.navigate', { url: 'http://localhost:3000' });
  
  // Wait for window.game to be ready
  let ready = false;
  for (let i = 0; i < 40; i++) {
    const chk = await send('Runtime.evaluate', {
      expression: '!!(window.game && window.game.track && window.game.track.curve)'
    });
    if (chk && chk.result?.value) {
      ready = true;
      break;
    }
    await new Promise(r => setTimeout(r, 250));
  }
  if (!ready) throw new Error('Timeout waiting for window.game readiness');

  console.log('2. Switching to Suzuka Circuit session...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.closeModals();
      g.switchTrack('suzuka');
      g.switchCar('ferrari');
      g.session.initSession('PRACTICE', g.playerVehicle, g.playerCar, null, true);
      g.closeModals();
    })()`
  });

  // Wait for track switch to complete
  for (let i = 0; i < 30; i++) {
    const chk = await send('Runtime.evaluate', {
      expression: 'window.game?.track?.trackData?.id === "suzuka"'
    });
    if (chk && chk.result?.value) break;
    await new Promise(r => setTimeout(r, 200));
  }

  await new Promise(r => setTimeout(r, 1000));

  console.log('3. Running Rigorous Terrain Clearance & Bridge Structural Audit...');
  const auditRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const track = g.track;
      const timing = g.timing;
      const halfW = track.trackWidth / 2;
      const report = {
        trackId: track.trackData.id,
        trackName: track.trackData.name,
        terrainPenetrations: [],
        meshPenetrations: 0,
        bridgeArchitecture: {
          bridgeMeshFound: false,
          bridgeMeshVertices: 0,
          girdersCount: 0,
          piersCount: 0,
          bannerFound: false
        },
        floatingObjectsNearBridge: [],
        fullLapResult: null
      };

      // 1. Terrain elevation vs track elevation across 500 samples
      for (let s = 0; s <= 500; s++) {
        const t = s / 500;
        const pt = track.curve.getPointAt(t);
        const tgt = track.curve.getTangentAt(t).normalize();
        const normX = -tgt.z;
        const normZ = tgt.x;

        // Check center, left road, right road, left curb, right curb, left apron, right apron
        for (const offset of [0, -halfW * 0.5, halfW * 0.5, -halfW, halfW, -(halfW + 3.0), halfW + 3.0]) {
          const cx = pt.x + normX * offset;
          const cz = pt.z + normZ * offset;
          const gy = track.getTerrainHeight(cx, cz);
          if (gy >= pt.y - 0.03) {
            report.terrainPenetrations.push({
              t: Number(t.toFixed(3)),
              offset: Number(offset.toFixed(1)),
              ptY: Number(pt.y.toFixed(2)),
              groundY: Number(gy.toFixed(2)),
              penetration: Number((gy - pt.y).toFixed(2))
            });
          }
        }
      }

      // 2. Terrain Mesh Vertex Penetration Check
      track.trackRoot.traverse(child => {
        if (child.isMesh && child.geometry?.type === 'PlaneGeometry' && child.geometry?.parameters?.width > 1000) {
          const pos = child.geometry.attributes.position;
          const arr = pos.array;
          for (let i = 0; i < pos.count; i++) {
            const vx = arr[i * 3];
            const vy = arr[i * 3 + 1];
            const vz = arr[i * 3 + 2];
            const snap = track.getClosestTrackPoint(vx, vz, vy);
            if (snap.distance <= halfW + 3.0) {
              if (vy >= snap.point.y - 0.02) {
                report.meshPenetrations++;
              }
            }
          }
        }
      });

      // 3. Inspect Bridge Meshes, Girders, Pillars, and Banner
      track.trackRoot.traverse(child => {
        if (child.isMesh) {
          // Check bridge mesh (BufferGeometry with 6-vert slices)
          if (child.geometry?.type === 'BufferGeometry' && child.geometry?.attributes?.position?.count >= 150) {
            const arr = child.geometry.attributes.position.array;
            if (arr[0] < -100 && arr[1] > 2.0) {
              report.bridgeArchitecture.bridgeMeshFound = true;
              report.bridgeArchitecture.bridgeMeshVertices = child.geometry.attributes.position.count;
            }
          }
          // Check girders
          if (child.geometry?.type === 'BoxGeometry' && child.geometry?.parameters?.height === 0.9) {
            report.bridgeArchitecture.girdersCount++;
          }
          // Check pier columns
          if (child.geometry?.type === 'CylinderGeometry' && child.geometry?.parameters?.height === 6.4) {
            report.bridgeArchitecture.piersCount++;
          }
          // Check overhead bridge banner
          if (child.geometry?.type === 'PlaneGeometry' && child.geometry?.parameters?.width === 24.0) {
            report.bridgeArchitecture.bannerFound = true;
          }
        }
      });

      // 4. Check for any floating objects in the sky near the crossover
      track.trackRoot.traverse(child => {
        if (child.position && child.parent?.name === 'track_root') {
          const dx = child.position.x - (-95);
          const dz = child.position.z - (10);
          if (Math.hypot(dx, dz) < 60 && child.position.y > 5.0) {
            // Check if this is an expected bridge element
            const isGirder = child.geometry?.type === 'BoxGeometry';
            const isBanner = child.geometry?.type === 'PlaneGeometry' && child.geometry?.parameters?.width === 24;
            const isPier = child.geometry?.type === 'CylinderGeometry' || child.geometry?.type === 'BoxGeometry';
            const isBridge = child.geometry?.attributes?.position?.count > 100;
            if (!isGirder && !isBanner && !isPier && !isBridge) {
              report.floatingObjectsNearBridge.push({
                type: child.geometry?.type || child.type,
                pos: { x: Number(child.position.x.toFixed(1)), y: Number(child.position.y.toFixed(2)), z: Number(child.position.z.toFixed(1)) }
              });
            }
          }
        }
      });

      // 5. Simulate Driving a Complete Lap
      timing.reset();
      timing.timerRunning = true;
      timing.lapStartTime = performance.now() - 75000;
      let wrongWayCount = 0;

      for (let s = 0; s < 120; s++) {
        const t = s / 120;
        const pt = track.curve.getPointAt(t);
        const tgt = track.curve.getTangentAt(t).normalize();
        const yaw = Math.atan2(tgt.x, tgt.z);
        const speed = 55;
        const vel = { x: tgt.x * speed, y: tgt.y * speed, z: tgt.z * speed };

        g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, speed);
        timing.update({ x: pt.x, y: pt.y, z: pt.z }, vel);

        if (timing.isDrivingWrongWay) {
          wrongWayCount++;
        }
      }

      // Finish line crossing
      const fPt = track.curve.getPointAt(0.005);
      const fTgt = track.curve.getTangentAt(0.005).normalize();
      const fYaw = Math.atan2(fTgt.x, fTgt.z);
      g.physics.resetVehicle(g.playerVehicle, fPt.x, fPt.y + 0.04, fPt.z, fYaw, 55);
      timing.update({ x: fPt.x, y: fPt.y, z: fPt.z }, { x: fTgt.x * 55, y: fTgt.y * 55, z: fTgt.z * 55 });

      report.fullLapResult = {
        wrongWayCount,
        sector1Passed: timing.sector1Reached,
        sector2Passed: timing.sector2Reached,
        lapCompleted: timing.currentLap > 1 || timing.lastLapTime > 0,
        finalLapTime: timing.lastLapTime || timing.currentLapTime
      };

      return report;
    })()`,
    returnByValue: true
  });

  if (auditRes.exceptionDetails) {
    console.error('EVAL EXCEPTION:', JSON.stringify(auditRes.exceptionDetails, null, 2));
  }
  const report = auditRes.result ? auditRes.result.value : auditRes?.value;
  console.log('==============================================');
  console.log('SUZUKA BRIDGE & TERRAIN AUDIT REPORT:');
  console.log('==============================================');
  console.log(JSON.stringify(report, null, 2));

  if (report) {
    fs.writeFileSync('scratch/suzuka_bridge_terrain_audit.json', JSON.stringify(report, null, 2));
  }

  console.log('\n4. Capturing High-Resolution Proof Screenshots...');
  const brainDir = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

  // Screenshot 1: Exact User Viewpoint (Underpass approach looking forward toward the bridge)
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.382;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      g.timing.prevProgress = t;
      g.timing.trackProgress = t;
      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 0);
      g.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${brainDir}/suzuka_fixed_user_view.png`, Buffer.from(shot.data, 'base64'));
  console.log('Saved suzuka_fixed_user_view.png');

  // Screenshot 2: Underpass Tunnel View (Looking through the illuminated bridge tunnel)
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.408;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      g.timing.prevProgress = t;
      g.timing.trackProgress = t;
      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 0);
      g.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${brainDir}/suzuka_fixed_underpass_tunnel.png`, Buffer.from(shot.data, 'base64'));
  console.log('Saved suzuka_fixed_underpass_tunnel.png');

  // Screenshot 3: Overpass Bridge Deck (Driving on top of the bridge across the viaduct)
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.635;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      g.timing.prevProgress = t;
      g.timing.trackProgress = t;
      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 0);
      g.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${brainDir}/suzuka_fixed_bridge_deck_driving.png`, Buffer.from(shot.data, 'base64'));
  console.log('Saved suzuka_fixed_bridge_deck_driving.png');

  ws.close();
}

run().catch(console.error);
