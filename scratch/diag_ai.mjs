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
            const ai = g.aiGrid ? g.aiGrid.aiCars[0] : null;
            if (!ai) return JSON.stringify({ err: 'no ai' });
            
            // Check what happens when we calculate target speed and throttle
            const waypoints = g.aiGrid.waypoints;
            const pos = ai.vehicle.body.position;
            let closestWpIdx = 0;
            let minDistsq = Infinity;
            for (let i = 0; i < waypoints.length; i++) {
              const wp = waypoints[i];
              const dx = wp.position.x - pos.x;
              const dz = wp.position.z - pos.z;
              const dsq = dx * dx + dz * dz;
              if (dsq < minDistsq) {
                minDistsq = dsq;
                closestWpIdx = i;
              }
            }

            const currentWp = waypoints[closestWpIdx];
            const lookaheadMeters = Math.max(6.0, Math.min(26.0, ai.currentSpeed * 0.28));
            const stepCount = Math.max(2, Math.round(lookaheadMeters / 6.0));
            const targetWpIdx = (closestWpIdx + stepCount) % waypoints.length;
            const targetWp = waypoints[targetWpIdx];

            return JSON.stringify({
              aiActive: ai.active,
              hasTrack: !!ai.track,
              wpCount: waypoints.length,
              difficulty: g.aiGrid.difficulty,
              pos: { x: pos.x, y: pos.y, z: pos.z },
              closestWpIdx,
              closestWpDist: Math.sqrt(minDistsq),
              closestWpPos: currentWp ? currentWp.position : null,
              targetWpIdx,
              targetWpSpeed: targetWp ? targetWp.targetSpeed : null,
              currentSpeed: ai.currentSpeed
            });
          })()`,
          returnByValue: true
        }
      }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      console.log('DIAG RESULT:', msg.result.result.value);
      process.exit(0);
    };
  });
});
