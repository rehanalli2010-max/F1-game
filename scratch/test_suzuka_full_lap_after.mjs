import http from 'node:http';
import fs from 'node:fs';

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

  console.log('1. Reloading live page to ensure fresh session...');
  await send('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 2500));

  console.log('2. Initializing Suzuka Circuit session...');
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

  await new Promise(r => setTimeout(r, 1500));

  console.log('3. Running After-Fix Comprehensive Full Lap Audit...');
  const auditRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const track = g.track;
      const timing = g.timing;
      const halfW = track.trackWidth / 2;
      const report = {
        trackId: track.trackData.id,
        trackName: track.trackData.name,
        trackLength: Number(track.trackLength.toFixed(1)),
        halfW: Number(halfW.toFixed(2)),
        grandstandsInTrack: [],
        grandstandSpecsCount: track.grandstandSpecs ? track.grandstandSpecs.length : 0,
        allGrandstandsSummary: [],
        totalTreesFound: 0,
        treesInTrack: [],
        wrongWayTriggers: [],
        crossoverClearance: null,
        lapEvents: {
          sector1Passed: false,
          sector1Time: null,
          sector2Passed: false,
          sector2Time: null,
          sector3Passed: false,
          lapCompleted: false,
          finalLapTime: null,
          lapValid: false
        }
      };

      // 1. Audit Grandstands
      const specs = track.grandstandSpecs || [];
      const Vector3 = track.curve.points[0].constructor;
      const up = new Vector3(0, 1, 0);

      const trackPoints = [];
      for (let i = 0; i <= 1000; i++) {
        const t = i / 1000;
        trackPoints.push({ t, pt: track.curve.getPointAt(t), tgt: track.curve.getTangentAt(t) });
      }

      for (let sIdx = 0; sIdx < specs.length; sIdx++) {
        const spec = specs[sIdx];
        const pt = track.curve.getPointAt(spec.t);
        const tgt = track.curve.getTangentAt(spec.t).normalize();
        const normal = new Vector3().crossVectors(tgt, up).normalize();
        const outward = new Vector3().copy(normal).multiplyScalar(spec.side).normalize();
        const xBasis = new Vector3().crossVectors(up, outward).normalize();
        const gsPos = new Vector3().copy(pt).addScaledVector(outward, spec.dist);

        let minTrackDist = Infinity;
        let worstT = -1;
        for (let lx = -spec.length/2 - 2; lx <= spec.length/2 + 2; lx += 4) {
          for (let lz = -2; lz <= spec.depth + 4; lz += 2) {
            const wp = new Vector3().copy(gsPos)
              .addScaledVector(xBasis, lx)
              .addScaledVector(outward, lz);
            for (const tp of trackPoints) {
              const d = Math.hypot(wp.x - tp.pt.x, wp.z - tp.pt.z);
              if (d < minTrackDist) {
                minTrackDist = d;
                worstT = tp.t;
              }
            }
          }
        }

        const info = {
          idx: sIdx,
          sponsor: spec.sponsor,
          t: spec.t,
          side: spec.side,
          dist: spec.dist,
          minTrackDist: Number(minTrackDist.toFixed(2)),
          clearanceFromTrackEdge: Number((minTrackDist - halfW).toFixed(2))
        };
        report.allGrandstandsSummary.push(info);

        if (minTrackDist < halfW + 1.0) {
          report.grandstandsInTrack.push(info);
        }
      }

      // 2. Audit all Trees in trackRoot (distinct from brake marker boards)
      track.trackRoot.traverse(child => {
        if (child.isGroup && child.children.length === 2) {
          const c0 = child.children[0].geometry?.type;
          const c1 = child.children[1].geometry?.type;
          if (c0 === 'CylinderGeometry' && (c1 === 'DodecahedronGeometry' || c1 === 'ConeGeometry')) {
            report.totalTreesFound++;
            const wx = child.position.x;
            const wz = child.position.z;
            const wy = child.position.y;

            // 3D distance to track
            const snap = track.getClosestTrackPoint(wx, wz, wy);
            if (snap.distance < halfW + 2.0) {
              report.treesInTrack.push({
                pos: { x: Number(wx.toFixed(1)), y: Number(wy.toFixed(1)), z: Number(wz.toFixed(1)) },
                distToCenter: Number(snap.distance.toFixed(2)),
                closestT: Number(snap.t.toFixed(3)),
                inAsphalt: snap.distance <= halfW
              });
            }
          }
        }
      });

      // 3. Measure Crossover Clearance
      const underPt = track.curve.getPointAt(0.412);
      const overPt = track.curve.getPointAt(0.633);
      report.crossoverClearance = {
        underpassPoint: { x: Number(underPt.x.toFixed(1)), y: Number(underPt.y.toFixed(2)), z: Number(underPt.z.toFixed(1)) },
        overpassPoint: { x: Number(overPt.x.toFixed(1)), y: Number(overPt.y.toFixed(2)), z: Number(overPt.z.toFixed(1)) },
        horizontalSeparation: Number(Math.hypot(underPt.x - overPt.x, underPt.z - overPt.z).toFixed(2)),
        verticalClearanceMeters: Number((overPt.y - underPt.y).toFixed(2))
      };

      // 4. Drive a Complete 100% Full Lap Step-by-Step
      timing.reset();
      timing.timerRunning = true;
      timing.lapStartTime = performance.now() - 75000; // Simulated lap time ~75 seconds

      // Listen for lap complete
      timing.onLapCompleteCallback = (res) => {
        report.lapEvents.lapCompleted = true;
        report.lapEvents.finalLapTime = res.time;
        report.lapEvents.lapValid = res.valid;
      };

      const lapSteps = 160;
      for (let s = 0; s < lapSteps; s++) {
        const t = s / lapSteps;
        const pt = track.curve.getPointAt(t);
        const tgt = track.curve.getTangentAt(t).normalize();
        const yaw = Math.atan2(tgt.x, tgt.z);
        const speed = 55; // 198 km/h
        const vel = { x: tgt.x * speed, y: tgt.y * speed, z: tgt.z * speed };

        g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, speed);
        timing.update({ x: pt.x, y: pt.y, z: pt.z }, vel);

        if (timing.sector1Reached && !report.lapEvents.sector1Passed) {
          report.lapEvents.sector1Passed = true;
          report.lapEvents.sector1Time = timing.sectorTimes[0];
        }
        if (timing.sector2Reached && !report.lapEvents.sector2Passed) {
          report.lapEvents.sector2Passed = true;
          report.lapEvents.sector2Time = timing.sectorTimes[1];
        }
        if (timing.sector3Reached) {
          report.lapEvents.sector3Passed = true;
        }

        const snap = track.getClosestTrackPoint(pt.x, pt.z, pt.y, timing.prevProgress);

        if (timing.isDrivingWrongWay) {
          report.wrongWayTriggers.push({
            step: s,
            t: Number(t.toFixed(3)),
            snappedT: Number(snap.t.toFixed(3)),
            dot: Number((tgt.x * snap.tangent.x + tgt.z * snap.tangent.z).toFixed(2)),
            pos: { x: Number(pt.x.toFixed(1)), y: Number(pt.y.toFixed(1)), z: Number(pt.z.toFixed(1)) }
          });
        }
      }

      // Finish line wrap crossing
      const finishPt = track.curve.getPointAt(0.005);
      const finishTgt = track.curve.getTangentAt(0.005).normalize();
      const finishYaw = Math.atan2(finishTgt.x, finishTgt.z);
      g.physics.resetVehicle(g.playerVehicle, finishPt.x, finishPt.y + 0.04, finishPt.z, finishYaw, 55);
      timing.update({ x: finishPt.x, y: finishPt.y, z: finishPt.z }, { x: finishTgt.x * 55, y: finishTgt.y * 55, z: finishTgt.z * 55 });

      return report;
    })()`,
    returnByValue: true
  });

  const report = auditRes.result?.value;
  console.log('==============================================');
  console.log('SUZUKA POST-FIX FULL AUDIT REPORT:');
  console.log('==============================================');
  console.log(JSON.stringify(report, null, 2));

  fs.writeFileSync('scratch/suzuka_after_audit.json', JSON.stringify(report, null, 2));

  console.log('\nCapturing post-fix screenshots...');
  const brainDir = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

  // 1. Crossover Underpass Entrance with bridge high above
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.402;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 0);
      g.playerCar.setPositionAndRotation(
        { x: pt.x, y: pt.y + 0.04, z: pt.z },
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
      );
      g.camera.position.set(pt.x - tgt.x * 14, pt.y + 2.8, pt.z - tgt.z * 14);
      g.camera.lookAt(pt.x + tgt.x * 22, pt.y + 5.2, pt.z + tgt.z * 22);
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${brainDir}/suzuka_fixed_crossover.png`, Buffer.from(shot.data, 'base64'));
  console.log('Saved suzuka_fixed_crossover.png');

  // 2. S-Curves clear of trees
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.16;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 0);
      g.playerCar.setPositionAndRotation(
        { x: pt.x, y: pt.y + 0.04, z: pt.z },
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
      );
      g.camera.position.set(pt.x - tgt.x * 18, pt.y + 6.5, pt.z - tgt.z * 18);
      g.camera.lookAt(pt.x + tgt.x * 35, pt.y + 1.2, pt.z + tgt.z * 35);
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${brainDir}/suzuka_fixed_trees_clear.png`, Buffer.from(shot.data, 'base64'));
  console.log('Saved suzuka_fixed_trees_clear.png');

  // 3. Hairpin grandstands safely set back
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.52;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 0);
      g.playerCar.setPositionAndRotation(
        { x: pt.x, y: pt.y + 0.04, z: pt.z },
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
      );
      g.camera.position.set(pt.x - tgt.x * 20, pt.y + 8.0, pt.z - tgt.z * 20);
      g.camera.lookAt(pt.x + tgt.x * 40, pt.y + 2.0, pt.z + tgt.z * 40);
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${brainDir}/suzuka_fixed_grandstands_clear.png`, Buffer.from(shot.data, 'base64'));
  console.log('Saved suzuka_fixed_grandstands_clear.png');

  // 4. Start/Finish Straight Full Lap Complete
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.02;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 0);
      g.playerCar.setPositionAndRotation(
        { x: pt.x, y: pt.y + 0.04, z: pt.z },
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
      );
      g.camera.position.set(pt.x - tgt.x * 12, pt.y + 3.0, pt.z - tgt.z * 12);
      g.camera.lookAt(pt.x + tgt.x * 30, pt.y + 1.0, pt.z + tgt.z * 30);
    })()`
  });
  await new Promise(r => setTimeout(r, 600));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${brainDir}/suzuka_fixed_full_lap_completed.png`, Buffer.from(shot.data, 'base64'));
  console.log('Saved suzuka_fixed_full_lap_completed.png');

  ws.close();
}

run().catch(console.error);
