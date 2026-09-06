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
      return [0.36, 0.37, 0.38, 0.39, 0.40, 0.41, 0.42, 0.43].map(t => {
        const p = g.track.curve.getPointAt(t);
        const tg = g.track.curve.getTangentAt(t).normalize();
        return {
          t,
          p: { x: Number(p.x.toFixed(1)), y: Number(p.y.toFixed(1)), z: Number(p.z.toFixed(1)) },
          tg: { x: Number(tg.x.toFixed(2)), y: Number(tg.y.toFixed(2)), z: Number(tg.z.toFixed(2)) },
          yawDeg: Number((Math.atan2(tg.x, tg.z) * 180 / Math.PI).toFixed(1))
        };
      });
    })()`,
    returnByValue: true
  });

  console.log('RES IS:', res);
  ws.close();
}

run().catch(console.error);
