import http from 'node:http';

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

  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const track = g.track;
      const trackHalfW = track.trackWidth / 2;
      const Vector3 = track.curve.points[0].constructor;
      const up = new Vector3(0, 1, 0);

      // Sample track spline at 1000 points
      const sampled = [];
      for (let i = 0; i <= 1000; i++) {
        const t = i / 1000;
        sampled.push({ t, pt: track.curve.getPointAt(t) });
      }

      function testSpec(spec) {
        const pt = track.curve.getPointAt(spec.t);
        const tgt = track.curve.getTangentAt(spec.t).normalize();
        const normal = new Vector3().crossVectors(tgt, up).normalize();
        const outward = new Vector3().copy(normal).multiplyScalar(spec.side).normalize();
        const xBasis = new Vector3().crossVectors(up, outward).normalize();
        const gsPos = new Vector3().copy(pt).addScaledVector(outward, spec.dist);

        const checkPoints = [];
        for (let lx = -spec.length/2 - 3; lx <= spec.length/2 + 3; lx += 3) {
          for (let lz = -2; lz <= spec.depth + 6; lz += 2) {
            const worldP = new Vector3().copy(gsPos)
              .addScaledVector(xBasis, lx)
              .addScaledVector(outward, lz);
            checkPoints.push(worldP);
          }
        }

        let minTrackDist = Infinity;
        let closestT = -1;
        for (const cp of checkPoints) {
          for (const s of sampled) {
            const d = Math.hypot(cp.x - s.pt.x, cp.z - s.pt.z);
            if (d < minTrackDist) {
              minTrackDist = d;
              closestT = s.t;
            }
          }
        }
        return {
          t: spec.t,
          side: spec.side,
          dist: spec.dist,
          length: spec.length,
          minTrackDist: Number(minTrackDist.toFixed(2)),
          closestT: Number(closestT.toFixed(3)),
          clearanceToTrackEdge: Number((minTrackDist - trackHalfW).toFixed(2)),
          isSafe: (minTrackDist >= trackHalfW + 4.0)
        };
      }

      const candidates = [
        { t: 0.42, side: -1, dist: track.barrierDistance + 15.0, length: 75, depth: 14 },
        { t: 0.40, side: -1, dist: track.barrierDistance + 15.0, length: 75, depth: 14 },
        { t: 0.38, side: -1, dist: track.barrierDistance + 15.0, length: 75, depth: 14 },
        { t: 0.44, side: -1, dist: track.barrierDistance + 15.0, length: 75, depth: 14 }
      ];

      return candidates.map(c => testSpec(c));
    })()`,
    returnByValue: true
  });

  console.log('CANDIDATES TEST REPORT:');
  console.log(JSON.stringify(evalRes.result?.value, null, 2));
  ws.close();
}

run().catch(console.error);
