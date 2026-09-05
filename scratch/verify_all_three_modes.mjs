import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', async () => {
    const targets = JSON.parse(d);
    const t = targets.find(x => x.url.includes('3000'));
    const ws = new WebSocket(t.webSocketDebuggerUrl);

    let id = 0;
    const send = (method, params = {}) => new Promise((resolve) => {
      const curId = ++id;
      const handler = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id === curId) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    const evalExp = async (expression) => {
      const res = await send('Runtime.evaluate', { expression, returnByValue: true });
      return res?.result?.value ?? res?.value;
    };

    ws.onopen = async () => {
      console.log('Connected to CDP, reloading page to test clean state...');
      await send('Page.reload', { ignoreCache: true });
      await new Promise(r => setTimeout(r, 3000));

      const difficulties = ['EASY', 'MEDIUM', 'HARD'];
      const testResults = {};

      for (const diff of difficulties) {
        console.log(`\n======================================================`);
        console.log(`TESTING DIFFICULTY MODE: ${diff}`);
        console.log(`======================================================`);

        // 1. Set difficulty and launch Race directly
        const initVal = await evalExp(`(() => {
          const g = window.game;
          // Set difficulty
          g.session.setDifficulty('${diff}');
          document.querySelectorAll('.diff-btn').forEach(b => {
            if (b.getAttribute('data-diff') === '${diff}') b.classList.add('active');
            else b.classList.remove('active');
          });
          // Init race directly without ad
          g.session.initSession('RACE', g.playerVehicle, g.playerCar, null, true);
          return {
            diff: g.session.difficulty,
            mode: g.session.currentMode,
            state: g.session.raceState
          };
        })()`);

        console.log(`Initial Session Init:`, initVal);

        // 2. Test during LIGHTS_COUNTDOWN: Simulate holding W (throttle)
        console.log(`Simulating aggressive player throttle (W) during 5-red-lights countdown...`);
        let countdownChecks = [];
        for (let check = 0; check < 5; check++) {
          await new Promise(r => setTimeout(r, 400));
          const cdVal = await evalExp(`(() => {
            const g = window.game;
            // Hold W key
            g.keys['KeyW'] = true;
            g.keys['w'] = true;

            const pPos = g.playerVehicle.position;
            const pVel = g.playerVehicle.body.velocity.length();
            const spawnPos = g.aiGrid ? g.aiGrid.playerSpawnGridPos : null;
            const distFromSpawn = spawnPos ? Math.sqrt((pPos.x - spawnPos.x)**2 + (pPos.z - spawnPos.z)**2) : 0;

            const aiSpeeds = g.aiGrid ? g.aiGrid.aiCars.map(c => c.currentSpeed) : [];

            return {
              state: g.session.raceState,
              gantryStep: g.session.gantryStep,
              pVel,
              distFromSpawn,
              aiMaxSpeed: Math.max(...aiSpeeds, 0)
            };
          })()`);

          if (cdVal) {
            countdownChecks.push(cdVal);
            console.log(`  [Countdown Step ${cdVal.gantryStep}/5] Player Vel: ${cdVal.pVel.toFixed(4)} m/s, Dist from Spawn: ${cdVal.distFromSpawn.toFixed(4)}m, AI Max Speed: ${cdVal.aiMaxSpeed.toFixed(4)} m/s`);
          }
        }

        // Release W key
        await evalExp(`(() => {
          window.game.keys['KeyW'] = false;
          window.game.keys['w'] = false;
        })()`);

        // 3. Wait for LIGHTS OUT and away we go!
        console.log(`Waiting for LIGHTS OUT (countdown completion)...`);
        let raceStarted = false;
        for (let wait = 0; wait < 30; wait++) {
          await new Promise(r => setTimeout(r, 300));
          const stateVal = await evalExp(`window.game.session.raceState`);
          if (stateVal === 'RACING') {
            raceStarted = true;
            console.log(`LIGHTS OUT! Race is active!`);
            break;
          }
        }

        if (!raceStarted) {
          console.error(`ERROR: Race failed to enter RACING state in ${diff} mode!`);
          process.exit(1);
        }

        // 4. Test AI Cars movement 2.5 seconds into the race
        console.log(`Monitoring AI cars acceleration into Turn 1 (waiting 2.5s)...`);
        await new Promise(r => setTimeout(r, 2500));

        const rData = await evalExp(`(() => {
          const g = window.game;
          const aiData = g.aiGrid.aiCars.map(c => ({
            id: c.info.id,
            name: c.info.name,
            active: c.active,
            speedKmh: (c.currentSpeed * 3.6).toFixed(1),
            speedMps: c.currentSpeed.toFixed(2),
            dist: c.totalDistance.toFixed(1),
            pos: { x: c.getPosition().x.toFixed(1), z: c.getPosition().z.toFixed(1) }
          }));
          return {
            difficulty: g.aiGrid.difficulty,
            raceState: g.session.raceState,
            carsMovingCount: aiData.filter(c => parseFloat(c.speedMps) > 1.0).length,
            aiData
          };
        })()`);

        console.log(`AI Grid in ${diff} Mode (2.5s after launch):`);
        console.log(`  Active & Moving Cars: ${rData.carsMovingCount} / 9`);
        rData.aiData.forEach(c => {
          console.log(`  - ${c.name} (${c.id}): Speed: ${c.speedKmh} km/h (${c.speedMps} m/s), Dist: ${c.dist}m`);
        });

        // Capture screenshot of race in action
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        const shotPath = path.join(ARTIFACTS_DIR, `race_launch_${diff.toLowerCase()}.png`);
        fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
        console.log(`Saved screenshot to ${shotPath}`);

        testResults[diff] = {
          countdownLocked: countdownChecks.every(c => c.pVel < 0.001 && c.distFromSpawn < 0.001 && c.aiMaxSpeed < 0.001),
          aiAllMoving: rData.carsMovingCount === 9,
          averageSpeedKmh: (rData.aiData.reduce((acc, c) => acc + parseFloat(c.speedKmh), 0) / 9).toFixed(1)
        };
      }

      console.log(`\n======================================================`);
      console.log(`FINAL MULTI-MODE TEST SUMMARY:`);
      console.log(`======================================================`);
      console.log(JSON.stringify(testResults, null, 2));

      const allPassed = Object.values(testResults).every(r => r.countdownLocked && r.aiAllMoving);
      if (allPassed) {
        console.log(`\n>>> SUCCESS: BOTH BUGS ARE COMPLETELY FIXED IN EASY, MEDIUM, AND HARD MODES! <<<`);
        process.exit(0);
      } else {
        console.error(`\n>>> FAILURE DETECTED IN ONE OR MORE MODES <<<`);
        process.exit(1);
      }
    };
  });
});
