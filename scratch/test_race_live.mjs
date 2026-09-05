import http from 'node:http';

http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const t = targets.find(x => x.url.includes('3000'));
    const ws = new WebSocket(t.webSocketDebuggerUrl);

    let id = 0;
    const send = (method, params = {}) => ws.send(JSON.stringify({ id: ++id, method, params }));

    ws.onopen = () => {
      send('Console.enable');
      send('Runtime.enable');

      // Click Race button
      send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.getElementById('btn-mode-race');
          if (btn) btn.click();
          // Skip mock ad if open
          setTimeout(() => {
            const skip = document.getElementById('ad-btn-skip');
            if (skip) skip.click();
          }, 100);
          return 'race_initiated';
        })()`
      });

      // Monitor state every 500ms for 8 seconds
      let ticks = 0;
      const interval = setInterval(() => {
        ticks++;
        send('Runtime.evaluate', {
          expression: `(() => {
            const g = window.game;
            if (!g || !g.session) return null;
            const pSpeed = g.playerVehicle ? g.playerVehicle.body.velocity.length() : 0;
            const pPos = g.playerVehicle ? { x: g.playerVehicle.position.x.toFixed(2), z: g.playerVehicle.position.z.toFixed(2) } : null;
            const aiSpeeds = g.aiGrid ? g.aiGrid.aiCars.map(c => ({
              id: c.info.id,
              active: c.active,
              speed: c.currentSpeed.toFixed(2),
              bodyVel: c.vehicle.body.velocity.length().toFixed(2),
              pos: { x: c.getPosition().x.toFixed(2), z: c.getPosition().z.toFixed(2) },
              throttle: c.currentSpeed
            })) : [];
            return {
              raceState: g.session.raceState,
              pSpeed: pSpeed.toFixed(2),
              pPos,
              aiSpeeds
            };
          })()`,
          returnByValue: true
        });

        if (ticks >= 16) {
          clearInterval(interval);
          setTimeout(() => process.exit(0), 1000);
        }
      }, 500);
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.method === 'Console.messageAdded' || msg.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER CONSOLE]', msg.params.message || msg.params.args);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails);
      }
      if (msg.result && msg.result.result && msg.result.result.value) {
        const v = msg.result.result.value;
        if (v.raceState) {
          console.log(`[STATE ${v.raceState}] Player Speed: ${v.pSpeed} m/s, Pos: (${v.pPos.x}, ${v.pPos.z})`);
          if (v.aiSpeeds && v.aiSpeeds.length > 0) {
            console.log(`  AI Cars: active=${v.aiSpeeds.filter(a=>a.active).length}, speeds=${v.aiSpeeds.map(a => a.id + ':' + a.speed).join(', ')}`);
          }
        }
      }
    };
  });
});
