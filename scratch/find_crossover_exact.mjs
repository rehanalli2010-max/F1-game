import http from 'node:http';

async function getWsUrl() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const targets = JSON.parse(d);
        const t = targets.find(x => x.type === 'page' && x.url && x.url.includes('3000'));
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
      const banners = [];
      window.game.track.trackRoot.traverse(c => {
        if (c.isMesh && c.geometry?.type === 'PlaneGeometry' && c.geometry?.parameters?.width > 15) {
          banners.push({
            pos: { x: Number(c.position.x.toFixed(2)), y: Number(c.position.y.toFixed(2)), z: Number(c.position.z.toFixed(2)) },
            params: c.geometry.parameters
          });
        }
      });
      return banners;
    })()`,
    returnByValue: true
  });

  const val = res.result ? res.result.value : res.value;
  console.log('BANNERS:', JSON.stringify(val, null, 2));
  ws.close();
}

run().catch(console.error);
