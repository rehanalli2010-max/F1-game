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

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const ptUnder = g.track.curve.getPointAt(0.412);
      const ptOver = g.track.curve.getPointAt(0.635);
      
      const meshes = [];
      g.track.trackRoot.traverse(c => {
        if (c.isMesh) {
          const e = c.matrixWorld.elements;
          const px = e[12];
          const py = e[13];
          const pz = e[14];
          const dOver = Math.hypot(px - ptOver.x, pz - ptOver.z);
          const dUnder = Math.hypot(px - ptUnder.x, pz - ptUnder.z);
          if (dOver < 50 || dUnder < 50) {
            meshes.push({
              name: c.name || 'unnamed',
              geo: c.geometry?.type,
              count: c.geometry?.attributes?.position?.count,
              color: c.material?.color?.getHexString?.(),
              pos: { x: Number(px.toFixed(1)), y: Number(py.toFixed(1)), z: Number(pz.toFixed(1)) },
              dOver: Number(dOver.toFixed(1)),
              dUnder: Number(dUnder.toFixed(1))
            });
          }
        }
      });
      return { ptUnder, ptOver, meshesCount: meshes.length, meshes };
    })()`,
    returnByValue: true
  });

  console.log('FULL RES:', JSON.stringify(res, null, 2));
  ws.close();
}

run().catch(console.error);
