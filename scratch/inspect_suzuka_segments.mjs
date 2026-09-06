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
      const curve = track.curve;
      
      // Check all 22 control points
      const pts = track.trackData.controlPoints.map((p, i) => ({
        i,
        x: p.x,
        y: p.y,
        z: p.z
      }));

      // Find 2D intersections between track segments
      const sampled = [];
      for (let i = 0; i < 400; i++) {
        const t = i / 400;
        const pt = curve.getPointAt(t);
        const tgt = curve.getTangentAt(t).normalize();
        sampled.push({ t, pt, tgt });
      }

      const closeSegments = [];
      for (let i = 0; i < sampled.length; i++) {
        for (let j = i + 20; j < sampled.length; j++) {
          // If not near wrap-around
          if (i < 10 && j > sampled.length - 10) continue;
          const pi = sampled[i].pt;
          const pj = sampled[j].pt;
          const dist2D = Math.hypot(pi.x - pj.x, pi.z - pj.z);
          const dist3D = Math.hypot(pi.x - pj.x, pi.y - pj.y, pi.z - pj.z);
          if (dist2D < 25) {
            closeSegments.push({
              tA: Number(sampled[i].t.toFixed(3)),
              tB: Number(sampled[j].t.toFixed(3)),
              dist2D: Number(dist2D.toFixed(2)),
              dist3D: Number(dist3D.toFixed(2)),
              yA: Number(pi.y.toFixed(2)),
              yB: Number(pj.y.toFixed(2)),
              yDiff: Number(Math.abs(pi.y - pj.y).toFixed(2)),
              posA: { x: Number(pi.x.toFixed(1)), z: Number(pi.z.toFixed(1)) },
              posB: { x: Number(pj.x.toFixed(1)), z: Number(pj.z.toFixed(1)) }
            });
          }
        }
      }

      return {
        pts,
        closeSegments: closeSegments.filter((c, idx, arr) => {
          // Keep only local minima
          return true;
        }).slice(0, 20)
      };
    })()`,
    returnByValue: true
  });

  console.log(JSON.stringify(evalRes.result?.value, null, 2));
  ws.close();
}

run().catch(console.error);
