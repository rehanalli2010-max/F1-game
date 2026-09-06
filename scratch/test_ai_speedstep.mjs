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

  console.log('Testing accelerated stepping for Race Mode...');

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.switchTrack('monza');
      g.switchCar('ferrari');
      g.session.setDifficulty('MEDIUM');
      g.session.initSession('RACE', g.playerVehicle, g.playerCar, null, true);
      
      // Fast-forward countdown lights directly to RACING
      g.session.clearAllTimers();
      g.session.raceState = 'RACING';
      g.session.raceStartTime = performance.now();
      g.setStartLightsVisible(false);
      
      // Step simulation for 100 ticks (5 seconds of race time)
      const dt = 0.05;
      for (let step = 0; step < 100; step++) {
        const pPos = g.playerVehicle.body.position;
        const pVel = g.playerVehicle.body.velocity;
        const currentRaceTime = (performance.now() - g.session.raceStartTime) / 1000 + (step * dt);
        g.aiGrid.update(dt, pPos, pVel, g.session.playerRaceLap, currentRaceTime, g.session.raceLapsTotal, g.audio);
      }

      const p1 = g.aiGrid.aiCars[0];
      const p2 = g.aiGrid.aiCars[1];
      return {
        ai1_speedKmh: Math.round(p1.currentSpeed * 3.6),
        ai1_progress: p1.trackProgress.toFixed(3),
        ai1_dist: Math.round(p1.raceDistance),
        ai1_lap: p1.currentLap,
        ai2_speedKmh: Math.round(p2.currentSpeed * 3.6),
        ai2_progress: p2.trackProgress.toFixed(3),
        ai2_dist: Math.round(p2.raceDistance),
        ai2_lap: p2.currentLap,
        barrierDistance: g.track.barrierDistance
      };
    })()`,
    returnByValue: true
  });

  console.log('Step result:', res.result.value);
  ws.close();
}

run().catch(console.error);
