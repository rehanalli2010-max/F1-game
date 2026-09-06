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

  const test = await send('Runtime.evaluate', {
    expression: `(() => {
      try {
        const g = window.game;
        g.switchTrack('monaco');
        g.switchCar('ferrari');
        g.session.setRaceLapsTotal(3);
        g.session.setDifficulty('EASY');
        g.session.initSession('RACE', g.playerVehicle, g.playerCar, null, true);
        g.session.clearAllTimers();
        g.session.raceState = 'RACING';
        g.session.raceStartTime = performance.now();
        g.setStartLightsVisible(false);

        const trackLen = g.track.trackLength || 1850;
        const targetLaps = 3;
        const dt = 0.05;
        let simTime = 0;
        let playerT = 0.0;
        let playerLap = 1;

        let lastStep = 0;
        for (let step = 0; step < 1800; step++) {
          lastStep = step;
          simTime += dt;
          const playerSpeedMps = 48.0;
          playerT = (playerT + (playerSpeedMps * dt) / trackLen);
          if (playerT >= 1.0) {
            playerT -= 1.0;
            playerLap++;
          }
          const pt = g.track.curve.getPointAt(playerT % 1.0);
          const tgt = g.track.curve.getTangentAt(playerT % 1.0).normalize();
          const yaw = Math.atan2(tgt.x, tgt.z);
          g.physics.resetVehicle(g.playerVehicle, pt.x, 0.04, pt.z, yaw, playerSpeedMps);

          const pPos = g.playerVehicle.body.position;
          const pVel = g.playerVehicle.body.velocity;
          g.aiGrid.update(dt, pPos, pVel, playerLap, simTime, targetLaps, g.audio);

          const finishedCount = g.aiGrid.aiCars.filter(c => c.finished).length;
          if (finishedCount >= 5 && playerLap > targetLaps) {
            break;
          }
        }

        const aiStatus = g.aiGrid.aiCars.map(ai => ({
          name: ai.info.name,
          active: ai.active,
          speedKmh: Math.round(ai.currentSpeed * 3.6),
          dist: Math.round(ai.raceDistance),
          lap: ai.currentLap,
          finished: ai.finished,
          t: Number(ai.trackProgress.toFixed(3))
        }));

        return { 
          success: true, 
          lastStep, 
          trackLen,
          playerLap, 
          aiStatus
        };
      } catch (err) {
        return { success: false, error: err.message, stack: err.stack };
      }
    })()`,
    returnByValue: true
  });

  console.log('Result:', test.result.value);
  ws.close();
}

main().catch(console.error);
