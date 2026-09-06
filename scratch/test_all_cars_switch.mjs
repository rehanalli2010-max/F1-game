import http from 'node:http';

http.get('http://127.0.0.1:9222/json', async (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const tabs = JSON.parse(data);
    const tab = tabs.find(t => t.url.includes('localhost:3000') || t.title.includes('Formula 1'));
    if (!tab) {
      console.error('Target tab not found!');
      process.exit(1);
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    let msgId = 1;
    const pending = new Map();

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg.result);
        pending.delete(msg.id);
      }
    };

    const send = (method, params = {}) => new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

    ws.onopen = async () => {
      const evaluate = async (expr) => {
        const res = await send('Runtime.evaluate', {
          expression: expr,
          returnByValue: true
        });
        return res?.result?.value;
      };

      console.log('Testing switchCar on all 10 teams...');
      const teams = ['ferrari', 'redbull', 'mercedes', 'mclaren', 'astonmartin', 'alpine', 'williams', 'racingbulls', 'sauber', 'haas'];
      for (const t of teams) {
        const res = await evaluate(`(() => {
          try {
            window.game.switchCar('${t}');
            return {
              ok: true,
              team: window.game.currentTeamId,
              meshCount: window.game.playerCar.visualBody.children.length
            };
          } catch (e) {
            return { ok: false, error: e.message };
          }
        })()`);
        console.log(`Team: ${t.padEnd(12)} ->`, res);
      }

      // Switch back to Red Bull / Orion Racing
      await evaluate(`window.game.switchCar('redbull')`);
      process.exit(0);
    };
  });
});
