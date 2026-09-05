import http from 'node:http';

http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const t = targets.find(x => x.url.includes('3000'));
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const g = window.game;
            const wps = g.aiGrid.waypoints;
            return JSON.stringify({
              count: wps.length,
              wp290: { t: wps[290].t, speed: wps[290].targetSpeed, curv: wps[290].curvature },
              wp295: { t: wps[295].t, speed: wps[295].targetSpeed, curv: wps[295].curvature },
              wp298: { t: wps[298].t, speed: wps[298].targetSpeed, curv: wps[298].curvature },
              wp0: { t: wps[0].t, speed: wps[0].targetSpeed, curv: wps[0].curvature },
              wp5: { t: wps[5].t, speed: wps[5].targetSpeed, curv: wps[5].curvature },
              wp10: { t: wps[10].t, speed: wps[10].targetSpeed, curv: wps[10].curvature },
              wp20: { t: wps[20].t, speed: wps[20].targetSpeed, curv: wps[20].curvature }
            });
          })()`,
          returnByValue: true
        }
      }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      console.log('WAYPOINTS SPEEDS:', msg.result.result.value);
      process.exit(0);
    };
  });
});
