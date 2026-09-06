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

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.closeModals();
      g.switchTrack('monaco');
      const track = g.track;
      const curve = track.curve;
      const samples = [];
      for (let t = 0.0; t <= 1.0; t += 0.02) {
        const pt = curve.getPointAt(t);
        const tgt = curve.getTangentAt(t);
        samples.push({
          t: Number(t.toFixed(3)),
          y: Number(pt.y.toFixed(2)),
          slopeY: Number(tgt.y.toFixed(3)),
          x: Number(pt.x.toFixed(1)),
          z: Number(pt.z.toFixed(1))
        });
      }
      return samples;
    })()`,
    returnByValue: true
  });

  console.log(JSON.stringify(res.result?.value, null, 2));
  ws.close();
}

main().catch(console.error);
