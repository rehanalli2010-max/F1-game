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

  console.log('Reloading browser to load updated circuit.js...');
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 2000));

  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      try {
        const g = window.game;
        g.closeModals();
        g.switchTrack('spa');
        const track = g.track;
        const specs = track.grandstandSpecs;
        const trackHalfW = track.trackWidth / 2;
        const report = [];

        // Sample track spline at 1000 points
        const sampled = [];
        for (let i = 0; i <= 1000; i++) {
          const t = i / 1000;
          sampled.push({ t, pt: track.curve.getPointAt(t) });
        }

        const Vector3 = window.THREE?.Vector3 || track.curve.points[0].constructor;

        for (let sIdx = 0; sIdx < specs.length; sIdx++) {
          const spec = specs[sIdx];
          const pt = track.curve.getPointAt(spec.t);
          const tgt = track.curve.getTangentAt(spec.t).normalize();
          const up = new Vector3(0, 1, 0);
          const normal = new Vector3().crossVectors(tgt, up).normalize();
          const outward = new Vector3().copy(normal).multiplyScalar(spec.side).normalize();
          const xBasis = new Vector3().crossVectors(up, outward).normalize();

          const gsPos = new Vector3().copy(pt).addScaledVector(outward, spec.dist);
          
          // Sample points along the entire grandstand structure (length, depth, height)
          const checkPoints = [];
          for (let lx = -spec.length/2; lx <= spec.length/2; lx += 4) {
            for (let lz = -1.8; lz <= spec.depth + 4; lz += 2) {
              const worldP = new Vector3().copy(gsPos)
                .addScaledVector(xBasis, lx)
                .addScaledVector(outward, lz);
              checkPoints.push({ lx, lz, worldP });
            }
          }

          // Find min distance to ANY point on the track
          let minTrackDist = Infinity;
          let worstCheck = null;
          let closestTrackPt = null;
          let closestT = -1;

          for (const cp of checkPoints) {
            for (const s of sampled) {
              const d = Math.hypot(cp.worldP.x - s.pt.x, cp.worldP.z - s.pt.z);
              if (d < minTrackDist) {
                minTrackDist = d;
                worstCheck = cp;
                closestTrackPt = s.pt;
                closestT = s.t;
              }
            }
          }

          report.push({
            idx: sIdx,
            sponsor: spec.sponsor,
            t: spec.t,
            side: spec.side,
            dist: spec.dist,
            length: spec.length,
            depth: spec.depth,
            minTrackDist: Number(minTrackDist.toFixed(2)),
            closestT: Number(closestT.toFixed(3)),
            trackHalfW,
            clearanceToTrackEdge: Number((minTrackDist - trackHalfW).toFixed(2)),
            encroachesTrack: (minTrackDist < trackHalfW)
          });
        }
        return report;
      } catch (err) {
        return { error: err.message, stack: err.stack };
      }
    })()`,
    returnByValue: true
  });

  console.log('SPA GRANDSTAND TRACK CLEARANCE REPORT:');
  console.log(JSON.stringify(evalRes, null, 2));
  ws.close();
}

run().catch(console.error);
