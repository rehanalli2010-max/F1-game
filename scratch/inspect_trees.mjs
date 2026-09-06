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
  const send = (method, params = {}) => new Promise(resolve => {
    const reqId = id++;
    const handler = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === reqId) {
        ws.removeEventListener('message', handler);
        resolve(d.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: reqId, method, params }));
  });
  await new Promise(r => ws.onopen = r);

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      let actualTreeCount = 0;
      const encroachingTrees = [];
      const brakeMarkers = [];
      g.track.trackRoot.traverse(c => {
        if (c.isGroup && c.children.length === 2) {
          const c0 = c.children[0].geometry?.type;
          const c1 = c.children[1].geometry?.type;
          if (c0 === 'CylinderGeometry' && (c1 === 'DodecahedronGeometry' || c1 === 'ConeGeometry')) {
            actualTreeCount++;
            const d = g.track.getClosestTrackPoint(c.position.x, c.position.z, c.position.y).distance;
            if (d < g.track.trackWidth / 2 + 3.0) {
              encroachingTrees.push({ pos: c.position, d });
            }
          } else if (c0 === 'CylinderGeometry' && c1 === 'PlaneGeometry') {
            const d = g.track.getClosestTrackPoint(c.position.x, c.position.z, c.position.y).distance;
            brakeMarkers.push({ pos: c.position, d });
          }
        }
      });
      return { actualTreeCount, encroachingTrees, brakeMarkerCount: brakeMarkers.length };
    })()`,
    returnByValue: true
  });

  console.log('ACTUAL TREES VS BRAKE MARKERS AUDIT:', res.result?.value);
  ws.close();
}

run().catch(console.error);
