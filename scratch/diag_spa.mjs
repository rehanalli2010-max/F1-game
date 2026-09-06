import http from 'node:http';
import fs from 'node:fs';

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
  console.log('WS URL:', wsUrl);
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

  const evalCode = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.result && r.result.exceptionDetails) {
      console.error('JS EXCEPTION:', r.result.exceptionDetails);
    }
    return r.result ? r.result.result : null;
  };

  // Switch to Spa
  await evalCode(`(() => {
    window.game.switchTrack('spa');
    window.game.resetCamera();
  })()`);

  await new Promise(r => setTimeout(r, 1000));

  // Find grandstands on Spa
  const gsRes = await evalCode(`(() => {
    const g = window.game;
    const track = g.track;
    const gsList = [];
    track.trackRoot.traverse(obj => {
      if (obj.isMesh && obj.geometry && obj.geometry.type === 'BoxGeometry') {
        const p = obj.geometry.parameters;
        if (p.height === 1.2 && p.width > 30) {
          const wPos = obj.position.clone();
          obj.getWorldPosition(wPos);
          const gh = track.getTerrainHeight(wPos.x, wPos.z);
          const ctp = track.getClosestTrackPoint(wPos.x, wPos.z);
          gsList.push({
            pos: { x: wPos.x.toFixed(1), y: wPos.y.toFixed(2), z: wPos.z.toFixed(1) },
            groundHeight: gh.toFixed(2),
            yDiff: (wPos.y - gh).toFixed(2),
            trackY: ctp.point.y.toFixed(2),
            distToTrack: ctp.distance.toFixed(1)
          });
        }
      }
    });
    return gsList;
  })()`);
  console.log('Grandstands on Spa:', JSON.stringify(gsRes.value, null, 2));

  // Now test driving and track height across 40 points
  const driveRes = await evalCode(`(() => {
    const g = window.game;
    const track = g.track;
    const results = [];

    for (let t = 0; t <= 1.0; t += 0.025) {
      const pt = track.curve.getPointAt(t);
      const tgt = track.curve.getTangentAt(t).normalize();
      // up is (0, 1, 0). cross tgt x (0,1,0):
      // nx = tgt.z * 1 - 0 = tgt.z, ny = 0, nz = -tgt.x
      const normLen = Math.hypot(tgt.z, -tgt.x) || 1;
      const nx = tgt.z / normLen;
      const nz = -tgt.x / normLen;

      const halfW = track.trackWidth / 2;

      const checkPt = (dist, name) => {
        const px = pt.x + nx * dist;
        const pz = pt.z + nz * dist;
        const c = track.getClosestTrackPoint(px, pz);
        let carY = c.point.y + 0.04;
        if (typeof track.getTerrainHeight === 'function' && c.distance > (track.trackWidth / 2)) {
          carY = track.getTerrainHeight(px, pz) + 0.04;
        }
        const surfaceY = pt.y + 0.02;
        const diff = carY - surfaceY;
        return {
          name,
          dist: dist.toFixed(1),
          diff: diff.toFixed(3),
          carY: carY.toFixed(3),
          surfaceY: surfaceY.toFixed(3),
          ctpDist: c.distance.toFixed(2)
        };
      };

      results.push({
        t: t.toFixed(3),
        ptY: pt.y.toFixed(2),
        center: checkPt(0, 'center'),
        leftMid: checkPt(-halfW * 0.5, 'leftMid'),
        rightMid: checkPt(halfW * 0.5, 'rightMid'),
        leftEdge: checkPt(-halfW, 'leftEdge'),
        rightEdge: checkPt(halfW, 'rightEdge'),
        leftCurb: checkPt(-(halfW + 1.2), 'leftCurb'),
        rightCurb: checkPt((halfW + 1.2), 'rightCurb'),
        leftApron: checkPt(-(halfW + 3.0), 'leftApron'),
        rightApron: checkPt((halfW + 3.0), 'rightApron')
      });
    }
    return results;
  })()`);

  console.log('Height check summary:');
  const items = driveRes ? driveRes.value : [];
  const issues = [];
  for (const it of items) {
    for (const k of ['center', 'leftMid', 'rightMid', 'leftEdge', 'rightEdge', 'leftCurb', 'rightCurb', 'leftApron', 'rightApron']) {
      if (parseFloat(it[k].diff) < -0.01) {
        issues.push({ t: it.t, ptY: it.ptY, point: it[k] });
      }
    }
  }
  console.log(`Total sinking points found: ${issues.length}`);
  if (issues.length > 0) {
    console.log('Worst 10 sinking points:', issues.sort((a,b) => parseFloat(a.point.diff) - parseFloat(b.point.diff)).slice(0, 10));
  }

  // Also check dynamic driving in live practice mode
  console.log('Now testing dynamic driving at 16 sectors around Spa...');
  const driveCheck = await evalCode(`(() => {
    const g = window.game;
    const track = g.track;
    const sectors = [];

    // Let's run the car through 16 sectors
    for (let t = 0; t < 1.0; t += 0.0625) {
      const pt = track.curve.getPointAt(t);
      const tgt = track.curve.getTangentAt(t).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      
      // Position car at pt
      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 30);
      g.playerVehicle.currentGear = 3;
      g.controls.throttle = 1.0;
      
      // Force one frame of update
      g.update(0.016);

      const pPos = g.playerVehicle.body.position;
      const ctp = track.getClosestTrackPoint(pPos.x, pPos.z);
      const visualY = g.playerCar.group.position.y;
      const roadY = ctp.point.y + 0.02;
      const diff = visualY - roadY;

      sectors.push({
        t: t.toFixed(3),
        trackY: ctp.point.y.toFixed(2),
        bodyY: pPos.y.toFixed(2),
        visualY: visualY.toFixed(2),
        diff: diff.toFixed(3),
        isInside: diff < -0.01
      });
    }
    return sectors;
  })()`);

  console.log('Dynamic driving results:', JSON.stringify(driveCheck.value, null, 2));

  ws.close();
}

main().catch(console.error);
