import http from 'node:http';

async function getWsUrl() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const targets = JSON.parse(data);
        const t = targets.find(x => x.url && x.url.includes('3000')) || targets[0];
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

  console.log('Connected to game via CDP.');

  // Reload page to get fresh v=635 state
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 1500));

  const state = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      return {
        ready: !!g,
        track: g.currentTrackId,
        team: g.currentTeamId,
        mode: g.session ? g.session.currentMode : null,
        aiCarsCount: g.aiGrid ? g.aiGrid.aiCars.length : 0,
        waypointsCount: g.aiGrid ? g.aiGrid.waypoints.length : 0
      };
    })()`,
    returnByValue: true
  });

  console.log('Game state:', state.result.value);
  ws.close();
}

run().catch(console.error);
