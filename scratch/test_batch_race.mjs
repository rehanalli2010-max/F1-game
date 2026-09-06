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

  console.log('Initializing Race on Monaco...');
  await send('Runtime.evaluate', {
    expression: `(() => {
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

      window.__raceSim = {
        simTime: 0,
        playerT: 0.0,
        playerLap: 1,
        dt: 0.05
      };
    })()`
  });

  console.log('Running batched race simulation until 3 laps complete...');
  let raceComplete = false;
  let batchCount = 0;

  while (!raceComplete && batchCount < 30) {
    batchCount++;
    const stepRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const s = window.__raceSim;
        const trackLen = g.track.trackLength || 1850;
        const targetLaps = 3;
        const totalDist = targetLaps * trackLen;

        // Step 150 ticks (7.5s of race time per batch)
        for (let i = 0; i < 150; i++) {
          s.simTime += s.dt;
          const playerSpeedMps = 46.0;
          s.playerT += (playerSpeedMps * s.dt) / trackLen;
          if (s.playerT >= 1.0) {
            s.playerT -= 1.0;
            s.playerLap++;
          }
          const pt = g.track.curve.getPointAt(s.playerT % 1.0);
          const tgt = g.track.curve.getTangentAt(s.playerT % 1.0).normalize();
          const yaw = Math.atan2(tgt.x, tgt.z);
          g.physics.resetVehicle(g.playerVehicle, pt.x, 0.04, pt.z, yaw, playerSpeedMps);

          const pPos = g.playerVehicle.body.position;
          const pVel = g.playerVehicle.body.velocity;
          g.aiGrid.update(s.dt, pPos, pVel, s.playerLap, s.simTime, targetLaps, g.audio);
        }

        const finishedCars = g.aiGrid.aiCars.filter(c => c.finished).length;
        const leader = g.aiGrid.aiCars[0];
        const lastCar = g.aiGrid.aiCars[8];

        return {
          simTime: Math.round(s.simTime * 10) / 10,
          playerLap: s.playerLap,
          leaderDist: Math.round(leader.raceDistance),
          leaderLap: leader.currentLap,
          leaderSpeed: Math.round(leader.currentSpeed * 3.6),
          finishedCars,
          totalDistToFinish: Math.round(totalDist),
          raceDone: (finishedCars >= 5 && s.playerLap > targetLaps)
        };
      })()`,
      returnByValue: true
    });

    const val = stepRes.result.value;
    console.log(`Batch ${batchCount}: SimTime=${val.simTime}s | LeaderDist=${val.leaderDist}m / ${val.totalDistToFinish}m | LeaderLap=${val.leaderLap} | FinishedCars=${val.finishedCars}`);
    if (val.raceDone) {
      raceComplete = true;
    }
  }

  console.log('Race finished successfully!');
  const finalReport = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const s = window.__raceSim;
      const classif = g.aiGrid.getFinalClassification(3, s.simTime, s.playerLap);
      return classif.slice(0, 5).map(c => ({
        pos: c.pos,
        name: c.name,
        team: c.team,
        lap: c.lap,
        finished: c.finished,
        finishTime: c.finishTime ? c.finishTime.toFixed(1) + 's' : 'RACING'
      }));
    })()`,
    returnByValue: true
  });

  console.log('Top 5 Classification:', finalReport.result.value);
  ws.close();
}

main().catch(console.error);
