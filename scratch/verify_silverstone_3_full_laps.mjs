import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

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

const SILVERSTONE_MODES = [
  { mode: 'EASY', team: 'ferrari', name: 'Silverstone GP - Easy (Ferrari)' },
  { mode: 'MEDIUM', team: 'redbull', name: 'Silverstone GP - Medium (Orion Racing)' },
  { mode: 'HARD', team: 'mercedes', name: 'Silverstone GP - Hard (Mercedes-AMG)' }
];

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
  console.log('Verifying complete 3-lap finishes for Silverstone across Easy, Medium, and Hard...');

  for (const spec of SILVERSTONE_MODES) {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`Starting ${spec.name} - Target: 3 FULL LAPS for all cars`);
    console.log(`----------------------------------------------------------------------`);

    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        g.switchTrack('silverstone');
        g.switchCar('${spec.team}');
        g.session.setRaceLapsTotal(3);
        g.session.setDifficulty('${spec.mode}');
        g.session.initSession('RACE', g.playerVehicle, g.playerCar, null, true);

        g.session.clearAllTimers();
        g.session.raceState = 'RACING';
        g.session.raceStartTime = performance.now();
        g.setStartLightsVisible(false);
        g.resetCamera();

        window.__raceSim = {
          simTime: 0,
          playerT: 0.0,
          playerLap: 1,
          dt: 0.05,
          maxLateralOffsetObserved: 0,
          minSpeedObserved: Infinity,
          maxSpeedObserved: 0,
          wallClippingDetected: false,
          stallsDetected: false
        };
      })()`
    });

    await new Promise(r => setTimeout(r, 600));

    let raceDone = false;
    let batchCount = 0;
    const maxBatches = 80; // Plenty of time for full 6834m

    while (!raceDone && batchCount < maxBatches) {
      batchCount++;
      const stepRes = await send('Runtime.evaluate', {
        expression: `(() => {
          const g = window.game;
          const s = window.__raceSim;
          const trackLen = g.track.trackLength || 2278;
          const barrierDist = g.track.barrierDistance || 12.0;
          const targetLaps = 3;
          const totalDist = targetLaps * trackLen;

          // Step 150 ticks (7.5s per batch)
          for (let i = 0; i < 150; i++) {
            s.simTime += s.dt;
            // Scale player pace to match AI pace in this difficulty
            const playerSpeedMps = ('${spec.mode}' === 'EASY' ? 38.0 : ('${spec.mode}' === 'HARD' ? 52.0 : 45.0));
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

            for (const ai of g.aiGrid.aiCars) {
              const spdKmh = ai.currentSpeed * 3.6;
              const latOff = Math.abs(ai.lateralOffset);
              if (latOff > s.maxLateralOffsetObserved) s.maxLateralOffsetObserved = latOff;
              if (latOff >= barrierDist) s.wallClippingDetected = true;
              if (s.simTime > 4.0 && spdKmh < 8.0 && !ai.finished) s.stallsDetected = true;
              if (s.simTime > 3.0 && spdKmh < s.minSpeedObserved && !ai.finished) s.minSpeedObserved = spdKmh;
              if (spdKmh > s.maxSpeedObserved) s.maxSpeedObserved = spdKmh;
            }
          }

          const finishedCars = g.aiGrid.aiCars.filter(c => c.finished).length;
          const leader = g.aiGrid.aiCars[0];

          return {
            simTime: Math.round(s.simTime * 10) / 10,
            playerLap: s.playerLap,
            leaderDist: Math.round(leader.raceDistance),
            leaderLap: leader.currentLap,
            leaderSpeed: Math.round(leader.currentSpeed * 3.6),
            finishedCars,
            barrierDist,
            maxLatOffset: Math.round(s.maxLateralOffsetObserved * 100) / 100,
            minSpeed: Math.round(s.minSpeedObserved),
            maxSpeed: Math.round(s.maxSpeedObserved),
            wallClip: s.wallClippingDetected,
            stalls: s.stallsDetected,
            totalDistToFinish: Math.round(totalDist),
            raceDone: (finishedCars >= 7)
          };
        })()`,
        returnByValue: true
      });

      const val = stepRes.result.value;
      if (batchCount % 6 === 0 || val.raceDone) {
        console.log(`  [Batch ${batchCount}] SimTime: ${val.simTime}s | Leader: ${val.leaderDist}m / ${val.totalDistToFinish}m (Lap ${val.leaderLap}) | Finished: ${val.finishedCars}/9 AI`);
      }

      if (val.raceDone) {
        raceDone = true;
      }
    }

    const finalReport = await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const s = window.__raceSim;
        const classif = g.aiGrid.getFinalClassification(3, s.simTime, s.playerLap);
        return {
          simTime: Math.round(s.simTime * 10) / 10,
          wallClip: s.wallClippingDetected,
          stalls: s.stallsDetected,
          maxLatOffset: Math.round(s.maxLateralOffsetObserved * 100) / 100,
          barrierDist: g.track.barrierDistance,
          minSpeed: Math.round(s.minSpeedObserved),
          maxSpeed: Math.round(s.maxSpeedObserved),
          finishedCars: g.aiGrid.aiCars.filter(c => c.finished).length,
          classification: classif.slice(0, 5).map(c => ({
            pos: c.pos,
            name: c.name,
            team: c.team,
            lap: c.lap,
            finished: c.finished,
            finishTime: c.finishTime ? c.finishTime.toFixed(1) + 's' : 'RACING',
            gap: c.gapSeconds
          }))
        };
      })()`,
      returnByValue: true
    });

    const rep = finalReport.result.value;
    console.log(`Completed ${spec.name} in ${rep.simTime}s. Finished AI cars: ${rep.finishedCars}/9.`);
    console.log(`Wall Clip: ${rep.wallClip ? 'FAIL' : 'PASS (0)'} | Stalls: ${rep.stalls ? 'FAIL' : 'PASS (0)'}`);
    console.log(`Top 5 Classification:`);
    rep.classification.forEach(c => {
      console.log(`  P${c.pos}: ${c.name.padEnd(16)} | ${c.team.padEnd(20)} | Finished: ${c.finished} | Time: ${c.finishTime} | Gap: ${c.gap}`);
    });

    const shotFilename = `silverstone_race_3laps_${spec.mode.toLowerCase()}.png`;
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, shotFilename), Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${shotFilename}`);
  }

  console.log('\nSilverstone 3 full lap verification finished!');
  ws.close();
}

main().catch(console.error);
