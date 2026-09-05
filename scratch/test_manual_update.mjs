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
            const dt = 1/60;
            const pPos = g.playerVehicle.body.position;
            const pVel = g.playerVehicle.body.velocity;
            
            const beforePos = { x: g.aiGrid.aiCars[0].getPosition().x, z: g.aiGrid.aiCars[0].getPosition().z };
            // Run 60 ticks of session.update (1 second of simulation)
            for (let i = 0; i < 60; i++) {
              g.session.update(dt, g.playerVehicle, pPos, pVel);
            }
            const afterPos = { x: g.aiGrid.aiCars[0].getPosition().x, z: g.aiGrid.aiCars[0].getPosition().z };

            return JSON.stringify({
              beforePos,
              afterPos,
              ai1_speed: g.aiGrid.aiCars[0].currentSpeed,
              ai2_speed: g.aiGrid.aiCars[1].currentSpeed
            });
          })()`,
          returnByValue: true
        }
      }));
    };
    ws.onmessage = (e) => {
      console.log('MANUAL SESSION UPDATE RESULT:', JSON.parse(e.data).result.result.value);
      process.exit(0);
    };
  });
});
