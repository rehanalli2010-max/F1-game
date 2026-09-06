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

  console.log('1. Loading Suzuka in live engine for BEFORE lap...');
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

  await new Promise(r => setTimeout(r, 1200));

  console.log('2. Auditing Suzuka trees, grandstands, and wrong-way triggers along a full lap...');
  const auditRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const track = g.track;
      const timing = g.timing;
      const halfW = track.trackWidth / 2;
      const report = {
        trackId: track.trackData.id,
        trackLength: track.trackLength,
        halfW,
        grandstandsInTrack: [],
        treesInTrack: [],
        wrongWayTriggers: [],
        lapProgressCheck: []
      };

      // 1. Audit all Grandstands for Suzuka
      const specs = track.grandstandSpecs || [];
      const Vector3 = track.curve.points[0].constructor;
      const up = new Vector3(0, 1, 0);

      // Sample 1000 track points
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

        // Check bounding volume of grandstand against all track points
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

        if (minTrackDist < halfW + 1.0) {
          report.grandstandsInTrack.push({
            idx: sIdx,
            sponsor: spec.sponsor,
            t: spec.t,
            side: spec.side,
            dist: spec.dist,
            minTrackDist: Number(minTrackDist.toFixed(2)),
            worstT: Number(worstT.toFixed(3)),
            encroachment: Number((halfW - minTrackDist).toFixed(2))
          });
        }
      }

      // 2. Audit all trees in trackRoot
      track.trackRoot.traverse(child => {
        if (child.isGroup && child.children.length === 2 && child.children[0].geometry?.type === 'CylinderGeometry') {
          // This is a tree!
          const wx = child.position.x;
          const wz = child.position.z;
          const wy = child.position.y;

          // Find closest track point
          let minD = Infinity;
          let closestPt = null;
          let closestT = -1;
          for (const tp of trackPoints) {
            const d = Math.hypot(wx - tp.pt.x, wz - tp.pt.z);
            if (d < minD) {
              minD = d;
              closestPt = tp.pt;
              closestT = tp.t;
            }
          }

          // If within road corridor (halfW) or paved apron (halfW + 3)
          if (minD < halfW + 2.0) {
            report.treesInTrack.push({
              pos: { x: Number(wx.toFixed(1)), y: Number(wy.toFixed(1)), z: Number(wz.toFixed(1)) },
              distToTrack: Number(minD.toFixed(2)),
              closestT: Number(closestT.toFixed(3)),
              halfW,
              inAsphalt: minD <= halfW
            });
          }
        }
      });

      // 3. Simulate driving a complete lap across 80 sequential points
      const steps = 80;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const pt = track.curve.getPointAt(t);
        const tgt = track.curve.getTangentAt(t).normalize();
        const yaw = Math.atan2(tgt.x, tgt.z);
        const speed = 50; // m/s (~180 km/h)
        const vel = { x: tgt.x * speed, y: 0, z: tgt.z * speed };

        g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, speed);
        
        // Update timing system to evaluate closest point and wrong-way check
        timing.update({ x: pt.x, y: pt.y, z: pt.z }, vel);

        const snapInfo = track.getClosestTrackPoint(pt.x, pt.z);
        const progressDiff = Math.abs(snapInfo.t - t);

        if (timing.isDrivingWrongWay) {
          report.wrongWayTriggers.push({
            step: s,
            t: Number(t.toFixed(3)),
            snappedT: Number(snapInfo.t.toFixed(3)),
            dot: Number((tgt.x * snapInfo.tangent.x + tgt.z * snapInfo.tangent.z).toFixed(2)),
            pos: { x: Number(pt.x.toFixed(1)), y: Number(pt.y.toFixed(1)), z: Number(pt.z.toFixed(1)) },
            snappedPt: { x: Number(snapInfo.point.x.toFixed(1)), y: Number(snapInfo.point.y.toFixed(1)), z: Number(snapInfo.point.z.toFixed(1)) }
          });
        }
      }

      return report;
    })()`,
    returnByValue: true
  });

  const report = auditRes.result?.value;
  console.log('SUZUKA BEFORE-FIX AUDIT REPORT:');
  console.log(JSON.stringify(report, null, 2));

  fs.writeFileSync('scratch/suzuka_before_audit.json', JSON.stringify(report, null, 2));

  // Capture representative screenshots of the bugs found
  // Capture start straight
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3/suzuka_before_lap_start.png', Buffer.from(shot.data, 'base64'));

  // If wrong way triggers found, capture the first one
  if (report?.wrongWayTriggers?.length > 0) {
    const ww = report.wrongWayTriggers[0];
    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const pt = g.track.curve.getPointAt(${ww.t});
        const tgt = g.track.curve.getTangentAt(${ww.t}).normalize();
        const yaw = Math.atan2(tgt.x, tgt.z);
        g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 30);
        g.timing.update({ x: pt.x, y: pt.y, z: pt.z }, { x: tgt.x * 30, y: 0, z: tgt.z * 30 });
      })()`
    });
    await new Promise(r => setTimeout(r, 600));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3/suzuka_before_wrong_way_bug.png', Buffer.from(shot.data, 'base64'));
    console.log('Captured suzuka_before_wrong_way_bug.png');
  }

  // If trees in track found, capture first one
  if (report?.treesInTrack?.length > 0) {
    const tr = report.treesInTrack[0];
    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const pt = g.track.curve.getPointAt(${tr.closestT});
        const tgt = g.track.curve.getTangentAt(${tr.closestT}).normalize();
        const yaw = Math.atan2(tgt.x, tgt.z);
        g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 25);
      })()`
    });
    await new Promise(r => setTimeout(r, 600));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3/suzuka_before_tree_in_track.png', Buffer.from(shot.data, 'base64'));
    console.log('Captured suzuka_before_tree_in_track.png');
  }

  // If grandstands in track found, capture first one
  if (report?.grandstandsInTrack?.length > 0) {
    const gs = report.grandstandsInTrack[0];
    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const pt = g.track.curve.getPointAt(${gs.worstT});
        const tgt = g.track.curve.getTangentAt(${gs.worstT}).normalize();
        const yaw = Math.atan2(tgt.x, tgt.z);
        g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 25);
      })()`
    });
    await new Promise(r => setTimeout(r, 600));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3/suzuka_before_grandstand_in_track.png', Buffer.from(shot.data, 'base64'));
    console.log('Captured suzuka_before_grandstand_in_track.png');
  }

  ws.close();
}

run().catch(console.error);
