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
    const consoleLogs = [];

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        consoleLogs.push({
          type: msg.params.type,
          args: msg.params.args.map(a => a.value || a.description)
        });
      } else if (msg.method === 'Log.entryAdded') {
        consoleLogs.push({
          type: msg.params.entry.level,
          text: msg.params.entry.text
        });
      }
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
      await send('Console.enable');
      await send('Log.enable');
      await send('Runtime.enable');

      const evalResult = await send('Runtime.evaluate', {
        expression: `(() => {
          const g = window.game;
          return {
            hasGame: !!g,
            trackId: g?.currentTrackId,
            mode: g?.session?.currentMode,
            playerVehicleSpeed: g?.playerVehicle?.body?.velocity?.length(),
            activeCars: g?.aiGrid?.aiCars?.length,
            threeSceneChildren: g?.scene?.children?.length,
            rendererInfo: {
              geometries: g?.renderer?.info?.memory?.geometries,
              textures: g?.renderer?.info?.memory?.textures,
              calls: g?.renderer?.info?.render?.calls,
              triangles: g?.renderer?.info?.render?.triangles
            }
          };
        })()`,
        returnByValue: true
      });

      console.log('Runtime Status:', JSON.stringify(evalResult?.result?.value, null, 2));
      console.log('\nCollected Console Logs in last session:');
      consoleLogs.forEach(l => console.log(`[${l.type}]`, l.args || l.text));

      process.exit(0);
    };
  });
});
