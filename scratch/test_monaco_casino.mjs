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

async function main() {
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

  // Test different t and dist for Grandstand B
  const candidates = [
    { t: 0.435, distOffset: 6.0, length: 32 },
    { t: 0.435, distOffset: 7.0, length: 30 },
    { t: 0.44, distOffset: 7.0, length: 32 }
  ];

  for (const c of candidates) {
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        g.closeModals();
        g.switchTrack('monaco');
        const track = g.track;
        const curve = track.curve;
        const Vector3 = curve.points[0].constructor;
        
        const pt = curve.getPointAt(${c.t});
        const tgt = curve.getTangentAt(${c.t}).normalize();
        const up = new Vector3(0, 1, 0);
        const normal = new Vector3().crossVectors(tgt, up).normalize();
        const outward = new Vector3().copy(normal).multiplyScalar(1).normalize();
        const xBasis = new Vector3().crossVectors(up, outward).normalize();
        
        const dist = track.barrierDistance + ${c.distOffset};
        const length = ${c.length};
        const depth = 8;
        
        const gsPos = new Vector3().copy(pt).addScaledVector(outward, dist);
        
        const corners = [
          { name: 'center', x: 0, z: (depth + 2)/2 },
          { name: 'front-left', x: -length/2, z: 0 },
          { name: 'front-right', x: length/2, z: 0 },
          { name: 'back-left', x: -length/2, z: depth + 2 },
          { name: 'back-right', x: length/2, z: depth + 2 }
        ];
        
        return corners.map(cr => {
          const wPos = new Vector3().copy(gsPos)
            .addScaledVector(xBasis, cr.x)
            .addScaledVector(outward, cr.z);
          const terrY = track.getTerrainHeight(wPos.x, wPos.z);
          const gap = gsPos.y - terrY;
          const roadDist = track.getClosestTrackPoint(wPos.x, wPos.z).distance;
          return {
            corner: cr.name,
            gsBaseY: Number(gsPos.y.toFixed(2)),
            terrY: Number(terrY.toFixed(2)),
            gap: Number(gap.toFixed(2)),
            roadDist: Number(roadDist.toFixed(2))
          };
        });
      })()`,
      returnByValue: true
    });

    console.log(`Candidate t=${c.t}, distOffset=${c.distOffset}, length=${c.length}:`);
    console.log(res.result?.value);
  }

  ws.close();
}

main().catch(console.error);
