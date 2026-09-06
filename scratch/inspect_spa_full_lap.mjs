import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ARTIFACTS_DIR = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

async function getWsUrl() {
  try {
    return await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9222/json', (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const arr = JSON.parse(data);
            const target = arr.find(x => x.type === 'page') || arr[0];
            resolve(target ? target.webSocketDebuggerUrl : null);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  } catch {
    return null;
  }
}

async function ensureBrowser() {
  let wsUrl = await getWsUrl();
  if (wsUrl) return { wsUrl, edgeProc: null };

  console.log('Spawning Edge headless with remote debugging port 9222...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = 'd:\\CODE\\F1 Game\\scratch\\edge_profile_diag';

  const edgeProc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1920,1080',
    'http://localhost:3000'
  ], { stdio: 'ignore' });

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 400));
    wsUrl = await getWsUrl();
    if (wsUrl) break;
  }

  if (!wsUrl) throw new Error('Could not connect to Edge on port 9222');
  return { wsUrl, edgeProc };
}

async function main() {
  const { wsUrl, edgeProc } = await ensureBrowser();
  const ws = new WebSocket(wsUrl);
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

  console.log('1. Waiting for game to be ready and loading Spa...');
  for (let i = 0; i < 20; i++) {
    const res = await send('Runtime.evaluate', {
      expression: 'typeof window.game !== "undefined" && !!window.game.track',
      returnByValue: true
    });
    if (res.result.value) break;
    await new Promise(r => setTimeout(r, 500));
  }

  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.switchTrack('spa');
      window.game.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  console.log('2. Inspecting grandstands on Spa...');
  const gsInfo = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const track = g.track;
      // Find grandstands in scene and inspect their world position vs ground height
      const gsReport = [];
      track.trackRoot.traverse(obj => {
        // If an object has children and looks like a grandstand group (contains crowdMesh or baseMesh)
        if (obj.isGroup && obj.children.length > 5) {
          const wPos = new THREE.Vector3();
          obj.getWorldPosition(wPos);
          const gh = track.getTerrainHeight(wPos.x, wPos.z);
          // Check closest track point
          const ctp = track.getClosestTrackPoint(wPos.x, wPos.z);
          gsReport.push({
            pos: { x: wPos.x.toFixed(1), y: wPos.y.toFixed(2), z: wPos.z.toFixed(1) },
            terrainHeight: gh.toFixed(2),
            diffFromTerrain: (wPos.y - gh).toFixed(2),
            closestTrackY: ctp.point.y.toFixed(2),
            distToTrack: ctp.distance.toFixed(1)
          });
        }
      });
      return {
        trackId: track.trackData.id,
        trackWidth: track.trackWidth,
        barrierDistance: track.barrierDistance,
        grandstands: gsReport
      };
    })()`,
    returnByValue: true
  });
  console.log('Grandstands Info:', JSON.stringify(gsInfo.result.value, null, 2));

  console.log('3. Scanning 100 sample points along the Spa spline...');
  const lapScan = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const tck = g.track;
      const issues = [];

      for (let t = 0; t <= 1.0; t += 0.01) {
        const pt = tck.curve.getPointAt(t);
        const tgt = tck.curve.getTangentAt(t).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();
        const halfW = tck.trackWidth / 2;

        // Check various lateral offsets
        const offsets = [
          { name: 'center', dist: 0 },
          { name: 'leftMid', dist: -halfW * 0.5 },
          { name: 'rightMid', dist: halfW * 0.5 },
          { name: 'leftEdge', dist: -halfW },
          { name: 'rightEdge', dist: halfW },
          { name: 'leftCurb', dist: -(halfW + 1.0) },
          { name: 'rightCurb', dist: (halfW + 1.0) },
          { name: 'leftApron', dist: -(halfW + 3.0) },
          { name: 'rightApron', dist: (halfW + 3.0) }
        ];

        for (const off of offsets) {
          const pos = new THREE.Vector3().copy(pt).addScaledVector(normal, off.dist);
          const ctp = tck.getClosestTrackPoint(pos.x, pos.z);
          
          let carY = ctp.point.y + 0.04;
          if (typeof tck.getTerrainHeight === 'function' && ctp.distance > (tck.trackWidth / 2)) {
            carY = tck.getTerrainHeight(pos.x, pos.z) + 0.04;
          }

          // Compute road/curb geometry height at this exact (pos.x, pos.z)
          // Asphalt road is pt.y + 0.02
          // Curb is pt.y + 0.035..0.065
          // Apron is pt.y + 0.005
          let surfaceY = pt.y + 0.02;
          if (Math.abs(off.dist) > halfW && Math.abs(off.dist) <= halfW + 1.4) {
            surfaceY = pt.y + 0.05; // curb
          } else if (Math.abs(off.dist) > halfW + 1.4) {
            surfaceY = pt.y + 0.005; // apron
          }

          const clearance = carY - surfaceY;
          // If car is LOWER than surface, car is going inside the track!
          if (clearance < -0.01) {
            issues.push({
              t: t.toFixed(2),
              offset: off.name,
              dist: off.dist.toFixed(1),
              carY: carY.toFixed(3),
              surfaceY: surfaceY.toFixed(3),
              clearance: clearance.toFixed(3),
              ptY: pt.y.toFixed(3),
              ctpY: ctp.point.y.toFixed(3),
              terrainY: tck.getTerrainHeight(pos.x, pos.z).toFixed(3)
            });
          }
        }
      }

      return {
        totalIssues: issues.length,
        issueCountByOffset: issues.reduce((acc, x) => { acc[x.offset] = (acc[x.offset] || 0) + 1; return acc; }, {}),
        worstIssues: issues.sort((a, b) => parseFloat(a.clearance) - parseFloat(b.clearance)).slice(0, 10)
      };
    })()`,
    returnByValue: true
  });

  console.log('Lap Scan Result:', JSON.stringify(lapScan.result.value, null, 2));

  // 4. Test actual dynamic driving across the entire circuit!
  console.log('4. Driving dynamically through Spa at 20 checkpoints to check telemetry...');
  const drivingResults = [];
  for (let t = 0.0; t < 1.0; t += 0.05) {
    const driveInfo = await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const pt = g.track.curve.getPointAt(${t});
        const tgt = g.track.curve.getTangentAt(${t}).normalize();
        const yaw = Math.atan2(tgt.x, tgt.z);
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

        // Let's test with slight lateral drift (-2m to +2m)
        const latOffset = (Math.sin(${t} * 20.0) * 3.5);
        const spawnPos = new THREE.Vector3().copy(pt).addScaledVector(normal, latOffset);

        g.physics.resetVehicle(g.playerVehicle, spawnPos.x, pt.y + 0.04, spawnPos.z, yaw, 50);
        g.playerVehicle.currentGear = 5;
        g.playerVehicle.rpm = 10000;
        g.controls.throttle = 1.0;
        g.controls.steer = 0.0;
      })()`
    });

    await new Promise(r => setTimeout(r, 400));

    const curState = await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const p = g.playerVehicle.body.position;
        const ctp = g.track.getClosestTrackPoint(p.x, p.z);
        const visualPos = new THREE.Vector3();
        g.playerCar.group.getWorldPosition(visualPos);
        const roadSurfaceY = ctp.point.y + 0.02;
        const diff = visualPos.y - roadSurfaceY;
        return {
          t: ${t.toFixed(2)},
          posX: p.x.toFixed(1),
          posZ: p.z.toFixed(1),
          bodyY: p.y.toFixed(3),
          visualY: visualPos.y.toFixed(3),
          roadSurfaceY: roadSurfaceY.toFixed(3),
          diff: diff.toFixed(3),
          distToCenter: ctp.distance.toFixed(2),
          isInsideTrack: diff < -0.02
        };
      })()`,
      returnByValue: true
    });
    drivingResults.push(curState.result.value);
  }

  const insideIssues = drivingResults.filter(x => x.isInsideTrack);
  console.log(`Driving test: ${insideIssues.length} / ${drivingResults.length} points went inside track!`);
  if (insideIssues.length > 0) {
    console.log('Points where car went inside track:', insideIssues);
  }

  ws.close();
  if (edgeProc) edgeProc.kill();
}

main().catch(console.error);
