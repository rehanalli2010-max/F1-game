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
      const halfW = track.trackWidth / 2;
      const Vector3 = track.curve.points[0].constructor;
      const up = new Vector3(0, 1, 0);

      const trackPoints = [];
      for (let i = 0; i <= 1000; i++) {
        const t = i / 1000;
        trackPoints.push({ t, pt: track.curve.getPointAt(t) });
      }

      function testGrandstand(spec) {
        const pt = track.curve.getPointAt(spec.t);
        const tgt = track.curve.getTangentAt(spec.t).normalize();
        const normal = new Vector3().crossVectors(tgt, up).normalize();
        const outward = new Vector3().copy(normal).multiplyScalar(spec.side).normalize();
        const xBasis = new Vector3().crossVectors(up, outward).normalize();
        const gsPos = new Vector3().copy(pt).addScaledVector(outward, spec.dist);

        let minTrackDist = Infinity;
        let worstT = -1;

        for (let lx = -spec.length/2 - 2; lx <= spec.length/2 + 2; lx += 3) {
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

        return {
          sponsor: spec.sponsor,
          t: spec.t,
          side: spec.side,
          dist: spec.dist,
          length: spec.length,
          minTrackDist: Number(minTrackDist.toFixed(2)),
          worstT: Number(worstT.toFixed(3)),
          clearanceToEdge: Number((minTrackDist - halfW).toFixed(2)),
          isSafe: minTrackDist >= halfW + 4.0
        };
      }

      // Propose bespoke Suzuka Grandstands:
      // 1. Main Straight Grandstand V1 / V2 (opposite pit lane)
      // 2. Turn 1 / 2 First Corner Grandstand B (outside Turn 1-2)
      // 3. S-Curves Hillside Grandstand D (outside S-Curves)
      // 4. Hairpin Stadium Grandstand I (outside the hairpin loop)
      // 5. 130R / Casio Triangle Grandstand R (outside Casio Triangle)
      const proposed = [
        { t: 0.015, side: -1, dist: track.barrierDistance + 13.0, length: 85, depth: 14, height: 10.5, rows: 10, sponsor: 'FORMULA 1', roofColor: 0xe10600 },
        { t: 0.09, side: -1, dist: track.barrierDistance + 14.0, length: 80, depth: 14, height: 10.5, rows: 10, sponsor: 'HONDA', roofColor: 0xcc0000 },
        { t: 0.22, side: -1, dist: track.barrierDistance + 14.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'ROLEX', roofColor: 0x00594f },
        { t: 0.54, side: 1, dist: track.barrierDistance + 15.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'PIRELLI', roofColor: 0x111827 },
        { t: 0.88, side: -1, dist: track.barrierDistance + 14.0, length: 80, depth: 14, height: 10.5, rows: 10, sponsor: 'DHL', roofColor: 0xffcc00 },
        { t: 0.965, side: -1, dist: track.barrierDistance + 13.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'QATAR AIRWAYS', roofColor: 0x5c0632 }
      ];

      return proposed.map(testGrandstand);
    })()`,
    returnByValue: true
  });

  console.log('PROPOSED SUZUKA GRANDSTANDS CLEARANCE REPORT:');
  console.log(JSON.stringify(evalRes.result?.value, null, 2));
  ws.close();
}

run().catch(console.error);
