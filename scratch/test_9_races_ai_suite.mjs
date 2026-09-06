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

const TEST_MATRIX = [
  // 1. Monaco
  { track: 'monaco', mode: 'EASY', team: 'ferrari', name: 'Monaco GP - Easy (Ferrari)' },
  { track: 'monaco', mode: 'MEDIUM', team: 'redbull', name: 'Monaco GP - Medium (Orion Racing)' },
  { track: 'monaco', mode: 'HARD', team: 'mercedes', name: 'Monaco GP - Hard (Mercedes-AMG)' },
  // 2. Monza
  { track: 'monza', mode: 'EASY', team: 'ferrari', name: 'Monza GP - Easy (Ferrari)' },
  { track: 'monza', mode: 'MEDIUM', team: 'redbull', name: 'Monza GP - Medium (Orion Racing)' },
  { track: 'monza', mode: 'HARD', team: 'mercedes', name: 'Monza GP - Hard (Mercedes-AMG)' },
  // 3. Silverstone
  { track: 'silverstone', mode: 'EASY', team: 'ferrari', name: 'Silverstone GP - Easy (Ferrari)' },
  { track: 'silverstone', mode: 'MEDIUM', team: 'redbull', name: 'Silverstone GP - Medium (Orion Racing)' },
  { track: 'silverstone', mode: 'HARD', team: 'mercedes', name: 'Silverstone GP - Hard (Mercedes-AMG)' }
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
  console.log('======================================================================');
  console.log('STARTING 9-RACE AI VERIFICATION SUITE (Monaco, Monza, Silverstone x Easy, Med, Hard)');
  console.log('======================================================================');

  const allRaceResults = [];

  for (let raceIdx = 0; raceIdx < TEST_MATRIX.length; raceIdx++) {
    const spec = TEST_MATRIX[raceIdx];
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`[RACE ${raceIdx + 1}/9] ${spec.name}`);
    console.log(`Track: ${spec.track.toUpperCase()} | Difficulty: ${spec.mode} | Car: ${spec.team.toUpperCase()} | Laps: 3`);
    console.log(`----------------------------------------------------------------------`);

    // 1. Initialize track, constructor, difficulty, and race session
    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        g.switchTrack('${spec.track}');
        g.switchCar('${spec.team}');
        g.session.setRaceLapsTotal(3);
        g.session.setDifficulty('${spec.mode}');
        g.session.initSession('RACE', g.playerVehicle, g.playerCar, null, true);

        // Fast-forward countdown lights directly to RACING
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

    // 2. Batched simulation loop until 3 laps are complete
    let raceDone = false;
    let batchCount = 0;
    let maxBatches = 40;
    let capturedScreenshot = false;
    const shotFilename = `${spec.track}_race_${spec.mode.toLowerCase()}.png`;

    while (!raceDone && batchCount < maxBatches) {
      batchCount++;
      const stepRes = await send('Runtime.evaluate', {
        expression: `(() => {
          const g = window.game;
          const s = window.__raceSim;
          const trackLen = g.track.trackLength || 1850;
          const barrierDist = g.track.barrierDistance || 11.0;
          const targetLaps = 3;
          const totalDist = targetLaps * trackLen;

          // Step 120 ticks (6.0s of simulated race time)
          for (let i = 0; i < 120; i++) {
            s.simTime += s.dt;
            const playerSpeedMps = ('${spec.mode}' === 'EASY' ? 44.0 : ('${spec.mode}' === 'HARD' ? 62.0 : 52.0));
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

            // Sample AI telemetry
            for (const ai of g.aiGrid.aiCars) {
              const spdKmh = ai.currentSpeed * 3.6;
              const latOff = Math.abs(ai.lateralOffset);
              if (latOff > s.maxLateralOffsetObserved) {
                s.maxLateralOffsetObserved = latOff;
              }
              if (latOff >= barrierDist) {
                s.wallClippingDetected = true;
              }
              if (s.simTime > 4.0 && spdKmh < 8.0 && !ai.finished) {
                s.stallsDetected = true;
              }
              if (s.simTime > 3.0 && spdKmh < s.minSpeedObserved && !ai.finished) {
                s.minSpeedObserved = spdKmh;
              }
              if (spdKmh > s.maxSpeedObserved) {
                s.maxSpeedObserved = spdKmh;
              }
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
            raceDone: (finishedCars >= 5 && s.playerLap > targetLaps)
          };
        })()`,
        returnByValue: true
      });

      const val = stepRes.result.value;
      if (batchCount % 3 === 0 || val.raceDone) {
        console.log(`  [Batch ${batchCount}] Time: ${val.simTime}s | Leader: ${val.leaderDist}m / ${val.totalDistToFinish}m (Lap ${val.leaderLap}) | Finished: ${val.finishedCars}/9 AI | MaxLat: ${val.maxLatOffset}m (Barrier: ${val.barrierDist}m)`);
      }

      // Capture screenshot around Lap 2 when cars are in close racing action
      if (!capturedScreenshot && (val.leaderLap >= 2 || val.simTime > 30)) {
        capturedScreenshot = true;
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACTS_DIR, shotFilename), Buffer.from(shot.data, 'base64'));
        console.log(`  -> Captured action screenshot: ${shotFilename}`);
      }

      if (val.raceDone) {
        raceDone = true;
      }
    }

    // Read final classification
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
          classification: classif.map(c => ({
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
    console.log(`Race Finished in ${rep.simTime}s. Wall Clip: ${rep.wallClip ? 'FAIL' : 'PASS (0)'} | Stalls: ${rep.stalls ? 'FAIL' : 'PASS (0)'}`);
    console.log(`Speed Range: ${rep.minSpeed} km/h (corners) to ${rep.maxSpeed} km/h (straights) | Max Lateral Offset: ${rep.maxLatOffset}m (Barrier Margin: ${(rep.barrierDist - rep.maxLatOffset).toFixed(1)}m safe clearance)`);
    console.log(`Top 3 Finishers:`);
    rep.classification.slice(0, 3).forEach(c => {
      console.log(`  P${c.pos}: ${c.name} (${c.team}) - ${c.finishTime} [Lap ${c.lap}]`);
    });

    allRaceResults.push({
      spec,
      rep,
      screenshot: shotFilename
    });
  }

  // Summary Matrix
  console.log('\n======================================================================');
  console.log('COMPLETE 9-RACE VERIFICATION SUMMARY MATRIX');
  console.log('======================================================================');
  console.table(allRaceResults.map(r => ({
    Circuit: r.spec.track.toUpperCase(),
    Difficulty: r.spec.mode,
    PlayerCar: r.spec.team.toUpperCase(),
    Laps: 3,
    RaceTime: r.rep.simTime + 's',
    WallClip: r.rep.wallClip ? 'FAIL' : 'PASS (0)',
    Stalls: r.rep.stalls ? 'FAIL' : 'PASS (0)',
    SpeedRange: `${r.rep.minSpeed}-${r.rep.maxSpeed} km/h`,
    Winner: `${r.rep.classification[0]?.name} (${r.rep.classification[0]?.finishTime})`,
    Screenshot: r.screenshot
  })));

  ws.close();
}

main().catch(console.error);
