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
      const spec = track.grandstandSpecs[2];
      const pt42 = curve.getPointAt(0.42);
      const pt448 = curve.getPointAt(0.448);
      const tgt42 = curve.getTangentAt(0.42);
      const tgt448 = curve.getTangentAt(0.448);
      
      const Vector3 = track.curve.points[0].constructor;
      const up = new Vector3(0, 1, 0);
      const normal = new Vector3().crossVectors(tgt42.normalize(), up).normalize();
      const outward = new Vector3().copy(normal).multiplyScalar(spec.side).normalize();
      const xBasis = new Vector3().crossVectors(up, outward).normalize();
      const gsPos = new Vector3().copy(pt42).addScaledVector(outward, spec.dist);
      
      const cFL = new Vector3().copy(gsPos).addScaledVector(xBasis, -spec.length/2);
      const cFR = new Vector3().copy(gsPos).addScaledVector(xBasis, spec.length/2);
      const cBL = new Vector3().copy(gsPos).addScaledVector(xBasis, -spec.length/2).addScaledVector(outward, spec.depth + 3);
      const cBR = new Vector3().copy(gsPos).addScaledVector(xBasis, spec.length/2).addScaledVector(outward, spec.depth + 3);

      return {
        spec,
        pt42: { x: pt42.x.toFixed(1), y: pt42.y.toFixed(1), z: pt42.z.toFixed(1) },
        pt448: { x: pt448.x.toFixed(1), y: pt448.y.toFixed(1), z: pt448.z.toFixed(1) },
        gsPos: { x: gsPos.x.toFixed(1), y: gsPos.y.toFixed(1), z: gsPos.z.toFixed(1) },
        cFL: { x: cFL.x.toFixed(1), z: cFL.z.toFixed(1) },
        cFR: { x: cFR.x.toFixed(1), z: cFR.z.toFixed(1) },
        dist_cFR_to_pt448: Math.hypot(cFR.x - pt448.x, cFR.z - pt448.z).toFixed(2),
        dist_cBR_to_pt448: Math.hypot(cBR.x - pt448.x, cBR.z - pt448.z).toFixed(2)
      };
    })()`,
    returnByValue: true
  });

  console.log(JSON.stringify(evalRes.result?.value, null, 2));
  ws.close();
}

run().catch(console.error);
