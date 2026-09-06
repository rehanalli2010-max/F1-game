import http from 'node:http';

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

  const evalCode = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.result && r.result.exceptionDetails) {
      console.error('JS EXCEPTION:', r.result.exceptionDetails);
    }
    return r.result ? r.result.result : null;
  };

  // Let's test player driving through all 20 corners of Spa along the racing line
  // (out-in-out racing line with apex curb clipping of 2.0 to 5.0m from edge)
  const racingLineTest = await evalCode(`(() => {
    const g = window.game;
    const track = g.track;
    const sinkIncidents = [];

    // Drive 500 steps around the track
    for (let t = 0; t <= 1.0; t += 0.002) {
      const pt = track.curve.getPointAt(t);
      const tgt = track.curve.getTangentAt(t).normalize();
      const normLen = Math.hypot(tgt.z, -tgt.x) || 1;
      const nx = tgt.z / normLen;
      const nz = -tgt.x / normLen;
      const halfW = track.trackWidth / 2;

      // Realistic driver offsets: on straights (-1m to +1m), in corners sweeping out to 7.0m..9.0m (curbs)
      // Let's check offsets at 0m, 4m, 7m, 8.5m (on curb), 9.5m (outer curb edge)
      const testOffsets = [0, 4.0, 7.5, 8.5, 9.5];
      for (const off of testOffsets) {
        for (const sign of [-1, 1]) {
          const lat = off * sign;
          const px = pt.x + nx * lat;
          const pz = pt.z + nz * lat;

          const ctp = track.getClosestTrackPoint(px, pz);
          let carY = ctp.point.y + 0.04;
          if (typeof track.getTerrainHeight === 'function' && ctp.distance > (track.trackWidth / 2)) {
            carY = track.getTerrainHeight(px, pz) + 0.04;
          }

          // Expected road/curb surface:
          const surfaceY = pt.y + 0.02;
          const drop = surfaceY - carY;
          if (drop > 0.05) {
            sinkIncidents.push({
              t: t.toFixed(3),
              lat: lat.toFixed(1),
              ptY: pt.y.toFixed(2),
              carY: carY.toFixed(2),
              drop: drop.toFixed(2),
              distFromCenter: ctp.distance.toFixed(1)
            });
          }
        }
      }
    }

    return {
      totalChecks: 500 * 9,
      sinkIncidentsCount: sinkIncidents.length,
      worstDrops: sinkIncidents.sort((a,b) => parseFloat(b.drop) - parseFloat(a.drop)).slice(0, 15)
    };
  })()`);

  console.log('Racing Line Test Result:', JSON.stringify(racingLineTest.value, null, 2));

  ws.close();
}

main().catch(console.error);
