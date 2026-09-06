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
      const pts = g.track.sampledPoints;
      const bad = [];
      const halfW = g.track.trackWidth / 2;

      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        const tgt = g.track.sampledTangents[i];
        const norm = { x: -tgt.z, z: tgt.x };

        // Test across road width: offsets from -halfW-3.5 to +halfW+3.5
        for (let off = -halfW - 3.5; off <= halfW + 3.5; off += 1.5) {
          const testX = pt.x + norm.x * off;
          const testZ = pt.z + norm.z * off;
          const th = g.track.getTerrainHeight(testX, testZ);
          if (th > pt.y - 0.05) {
            bad.push({
              i,
              t: i / pts.length,
              off,
              ptX: pt.x,
              ptY: pt.y,
              ptZ: pt.z,
              testX,
              testZ,
              th,
              diff: th - pt.y
            });
          }
        }
      }
      return bad;
    })()`,
    returnByValue: true
  });

  console.log('Bad points count:', res.result.value.length);
  console.log('Sample bad points:', JSON.stringify(res.result.value.slice(0, 10), null, 2));
  ws.close();
}

main().catch(console.error);
