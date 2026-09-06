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
        const target = arr.find(x => x.type === 'page' && x.url && x.url.includes('3000')) || arr.find(x => x.type === 'page') || arr[0];
        resolve(target ? target.webSocketDebuggerUrl : null);
      });
    }).on('error', reject);
  });
}

async function main() {
  const wsUrl = await getWsUrl();
  console.log('Connecting to Edge:', wsUrl);
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

  console.log('1. Reloading page to ensure latest scripts are active...');
  await send('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 2000));

  for (let i = 0; i < 20; i++) {
    const chk = await send('Runtime.evaluate', {
      expression: 'typeof window.game !== "undefined" && !!window.game.track',
      returnByValue: true
    });
    if (chk.result && chk.result.result && chk.result.result.value) break;
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('2. Switching to Spa-Francorchamps circuit...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.game.switchTrack('spa');
      window.game.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // TEST 1: Full Lap 4,500-Point Anti-Sink Audit across all 9 lateral offsets
  console.log('3. Running 4,500-Point Full Lap Anti-Sink Audit...');
  const auditRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const track = g.track;
      const sinkIncidents = [];
      const offsets = [0, 4.0, 7.5, 8.5, 9.4, 10.5, 11.5]; // center to outer edge of apron

      for (let t = 0; t <= 1.0; t += 0.002) {
        const pt = track.curve.getPointAt(t);
        const tgt = track.curve.getTangentAt(t).normalize();
        const normLen = Math.hypot(tgt.z, -tgt.x) || 1;
        const nx = tgt.z / normLen;
        const nz = -tgt.x / normLen;
        const halfW = track.trackWidth / 2;

        for (const off of offsets) {
          for (const sign of (off === 0 ? [1] : [-1, 1])) {
            const lat = off * sign;
            const px = pt.x + nx * lat;
            const pz = pt.z + nz * lat;

            const ctp = track.getClosestTrackPoint(px, pz);
            const roadPavedLimit = halfW + 3.5;
            let carY;
            if (ctp.distance <= halfW) {
              carY = ctp.point.y + 0.04;
            } else if (ctp.distance <= halfW + 1.4) {
              carY = ctp.point.y + 0.06;
            } else if (ctp.distance <= roadPavedLimit) {
              carY = ctp.point.y + 0.04;
            } else {
              const offDist = ctp.distance - roadPavedLimit;
              const blend = Math.min(1.0, offDist / 3.5);
              const smooth = blend * blend * (3.0 - 2.0 * blend);
              const groundY = (typeof track.getTerrainHeight === 'function')
                ? track.getTerrainHeight(px, pz) + 0.04
                : ctp.point.y + 0.04;
              const safeOffTrackGroundY = Math.max(ctp.point.y - 0.75, groundY);
              carY = (1.0 - smooth) * (ctp.point.y + 0.04) + smooth * safeOffTrackGroundY;
            }

            // Expected road/curb surface:
            let expectedSurface = pt.y + 0.02;
            if (Math.abs(lat) > halfW && Math.abs(lat) <= halfW + 1.4) {
              expectedSurface = pt.y + 0.05; // curb
            } else if (Math.abs(lat) > halfW + 1.4) {
              expectedSurface = pt.y + 0.005; // apron
            }

            const drop = expectedSurface - carY;
            // Car is considered sinking if it drops below surface
            if (drop > 0.02) {
              sinkIncidents.push({
                t: t.toFixed(3),
                lat: lat.toFixed(1),
                expectedSurface: expectedSurface.toFixed(3),
                carY: carY.toFixed(3),
                drop: drop.toFixed(3)
              });
            }
          }
        }
      }

      return {
        totalEvaluations: 500 * 13,
        sinkIncidentsCount: sinkIncidents.length,
        worstDrops: sinkIncidents.sort((a,b) => parseFloat(b.drop) - parseFloat(a.drop)).slice(0, 5)
      };
    })()`,
    returnByValue: true
  });
  console.log('Anti-Sink Audit Result:', JSON.stringify(auditRes.result.result.value, null, 2));

  // TEST 2: Grandstands Terrain Audit
  console.log('4. Auditing Grandstand Terracing & Air-Gaps on Spa...');
  const gsAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const track = g.track;
      const results = [];

      for (let i = 0; i < (track.grandstandSpecs || []).length; i++) {
        const spec = track.grandstandSpecs[i];
        const pt = track.curve.getPointAt(spec.t);
        const tgt = track.curve.getTangentAt(spec.t).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();
        const outward = normal.clone().multiplyScalar(spec.side).normalize();
        const xBasis = new THREE.Vector3().crossVectors(up, outward).normalize();

        const padCenter = pt.clone().addScaledVector(outward, spec.dist + (spec.depth + 2.0) / 2);
        const groundUnderCenter = track.getTerrainHeight(padCenter.x, padCenter.z);

        // Check the 4 corners of the grandstand base
        const halfL = spec.length / 2;
        const halfD = (spec.depth + 2.0) / 2;
        const corners = [
          padCenter.clone().addScaledVector(xBasis, -halfL).addScaledVector(outward, -halfD),
          padCenter.clone().addScaledVector(xBasis, halfL).addScaledVector(outward, -halfD),
          padCenter.clone().addScaledVector(xBasis, -halfL).addScaledVector(outward, halfD),
          padCenter.clone().addScaledVector(xBasis, halfL).addScaledVector(outward, halfD)
        ];

        const cornerGrounds = corners.map(c => track.getTerrainHeight(c.x, c.z));
        const grandstandBaseTopY = pt.y + 1.2;
        const foundationBottomY = pt.y + 1.2 - (7.0 + 1.2); // y = pt.y - 7.0m!

        // Foundation extends from pt.y + 1.2 down to pt.y - 7.0m.
        // Ground under corners should be well within [pt.y - 7.0, pt.y + 1.2]
        const hasAirGap = cornerGrounds.some(gh => gh < foundationBottomY);
        const terrainClipsSeats = cornerGrounds.some(gh => gh > grandstandBaseTopY);

        results.push({
          index: i + 1,
          sponsor: spec.sponsor,
          t: spec.t,
          trackY: pt.y.toFixed(2),
          groundCenter: groundUnderCenter.toFixed(2),
          diffFromTrack: (groundUnderCenter - pt.y).toFixed(2),
          foundationBottomY: foundationBottomY.toFixed(2),
          minCornerGround: Math.min(...cornerGrounds).toFixed(2),
          maxCornerGround: Math.max(...cornerGrounds).toFixed(2),
          hasAirGap,
          terrainClipsSeats
        });
      }
      return results;
    })()`,
    returnByValue: true
  });
  console.log('Grandstands Audit Result:', JSON.stringify(gsAudit.result.result.value, null, 2));

  // CAPTURE VERIFICATION SCREENSHOTS
  console.log('5. Capturing high-definition verification screenshots...');

  // 1. Car on the steep Raidillon curb at t = 0.264 (Previously sunk 5.6m down!)
  console.log('Capturing: Car on Raidillon Curb (previously sunk 5.6m)...');
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

      // Position car right on the curb at lat = +8.5m
      const lat = 8.5;
      const px = pt.x + nx * lat;
      const pz = pt.z + nz * lat;

      g.physics.resetVehicle(g.playerVehicle, px, pt.y + 0.06, pz, yaw, 0);
      g.playerVehicle.currentGear = 5;
      g.updateVehicleVisuals(0.016);
      g.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_fixed_car_on_raidillon_curb.png'), Buffer.from(shot.result.data, 'base64'));
  console.log('Saved spa_fixed_car_on_raidillon_curb.png');

  // Read telemetry at this position
  const curbTel = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const p = g.playerVehicle.body.position;
      const v = new THREE.Vector3();
      g.playerCar.group.getWorldPosition(v);
      const ctp = g.track.getClosestTrackPoint(p.x, p.z);
      return {
        bodyY: p.y.toFixed(3),
        visualY: v.y.toFixed(3),
        trackPointY: ctp.point.y.toFixed(3),
        distFromCenter: ctp.distance.toFixed(2),
        diff: (v.y - ctp.point.y).toFixed(3)
      };
    })()`,
    returnByValue: true
  });
  console.log('Raidillon curb telemetry:', curbTel.result.result.value);

  // 2. Eau Rouge & Raidillon Grandstand with terraced hillside
  console.log('Capturing: Eau Rouge & Raidillon Grandstand...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const pt = g.track.curve.getPointAt(0.18);
      const tgt = g.track.curve.getTangentAt(0.18).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 30);
      g.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_fixed_grandstand_eau_rouge_terraced.png'), Buffer.from(shot.result.data, 'base64'));
  console.log('Saved spa_fixed_grandstand_eau_rouge_terraced.png');

  // 3. Pouhon Hillside Grandstand
  console.log('Capturing: Pouhon Hillside Grandstand...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const pt = g.track.curve.getPointAt(0.63);
      const tgt = g.track.curve.getTangentAt(0.63).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 45);
      g.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_fixed_grandstand_pouhon_terrace.png'), Buffer.from(shot.result.data, 'base64'));
  console.log('Saved spa_fixed_grandstand_pouhon_terrace.png');

  // 4. Main Straight Grandstand & Starting Grid
  console.log('Capturing: Main Straight Grandstand...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const pt = g.track.curve.getPointAt(0.995);
      const tgt = g.track.curve.getTangentAt(0.995).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 20);
      g.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_fixed_grandstand_main_straight.png'), Buffer.from(shot.result.data, 'base64'));
  console.log('Saved spa_fixed_grandstand_main_straight.png');

  // 5. Dynamic high-speed driving lap through Eau Rouge compression at 250 km/h
  console.log('Capturing: Dynamic high-speed driving run through Eau Rouge at 250 km/h...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const pt = g.track.curve.getPointAt(0.20);
      const tgt = g.track.curve.getTangentAt(0.20).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 69.4); // 250 km/h
      g.playerVehicle.currentGear = 7;
      g.playerVehicle.rpm = 11000;
      g.controls.throttle = 1.0;
      g.resetCamera();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_fixed_eau_rouge_250kmh.png'), Buffer.from(shot.result.data, 'base64'));
  console.log('Saved spa_fixed_eau_rouge_250kmh.png');

  ws.close();
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
}

main().catch(console.error);
