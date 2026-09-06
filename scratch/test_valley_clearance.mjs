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

  const testRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const pts = g.track.sampledPoints;
      const count = pts.length;
      const halfW = g.track.trackWidth / 2;
      const corridor = halfW + 4.5;

      // Find all points near Eau Rouge valley floor (t ~ 0.17 to 0.23)
      const valleyPts = [];
      for (let i = 100; i <= 140; i++) {
        valleyPts.push({
          i,
          t: i / count,
          pt: pts[i]
        });
      }

      return {
        valleyPtsCount: valleyPts.length,
        minValleyY: Math.min(...valleyPts.map(v => v.pt.y)),
        maxValleyY: Math.max(...valleyPts.map(v => v.pt.y)),
        sampleValleyPts: valleyPts.filter((_, idx) => idx % 5 === 0)
      };
    })()`,
    returnByValue: true
  });

  console.log('Valley points:', JSON.stringify(testRes.result.value, null, 2));
  ws.close();
}

main().catch(console.error);
