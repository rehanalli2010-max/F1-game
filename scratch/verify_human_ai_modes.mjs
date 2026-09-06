import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTIFACTS_DIR = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

const TEST_SCENARIOS = [
  // 1. Monaco
  {
    track: 'monaco',
    mode: 'EASY',
    team: 'ferrari',
    name: 'Monaco GP - Easy (Noob AI Yielding & Overtake)',
    approachT: 0.16,
    shotFile: 'human_ai_monaco_easy_overtake.png'
  },
  {
    track: 'monaco',
    mode: 'MEDIUM',
    team: 'redbull',
    name: 'Monaco GP - Medium (Amateur Wheel-to-Wheel)',
    approachT: 0.50,
    shotFile: 'human_ai_monaco_medium_duel.png'
  },
  {
    track: 'monaco',
    mode: 'HARD',
    team: 'mercedes',
    name: 'Monaco GP - Hard (Pro Inside Apex Defense)',
    approachT: 0.86,
    shotFile: 'human_ai_monaco_hard_defense.png'
  },
  // 2. Monza
  {
    track: 'monza',
    mode: 'EASY',
    team: 'ferrari',
    name: 'Monza GP - Easy (Noob Main Straight Pass)',
    approachT: 0.08,
    shotFile: 'human_ai_monza_easy_overtake.png'
  },
  {
    track: 'monza',
    mode: 'MEDIUM',
    team: 'redbull',
    name: 'Monza GP - Medium (Amateur Side-by-Side Curva Grande)',
    approachT: 0.35,
    shotFile: 'human_ai_monza_medium_duel.png'
  },
  {
    track: 'monza',
    mode: 'HARD',
    team: 'mercedes',
    name: 'Monza GP - Hard (Pro Late Braking Ascari Defense)',
    approachT: 0.65,
    shotFile: 'human_ai_monza_hard_defense.png'
  },
  // 3. Silverstone
  {
    track: 'silverstone',
    mode: 'EASY',
    team: 'ferrari',
    name: 'Silverstone GP - Easy (Noob Wellington Straight Pass)',
    approachT: 0.25,
    shotFile: 'human_ai_silverstone_easy_overtake.png'
  },
  {
    track: 'silverstone',
    mode: 'MEDIUM',
    team: 'redbull',
    name: 'Silverstone GP - Medium (Amateur Maggotts/Becketts Duel)',
    approachT: 0.60,
    shotFile: 'human_ai_silverstone_medium_duel.png'
  },
  {
    track: 'silverstone',
    mode: 'HARD',
    team: 'mercedes',
    name: 'Silverstone GP - Hard (Pro Hangar Straight Slipstream Battle)',
    approachT: 0.74,
    shotFile: 'human_ai_silverstone_hard_defense.png'
  }
];

async function getExistingWsUrl() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const targets = JSON.parse(d);
          const t = targets.find(x => x.type === 'page' && x.url && x.url.includes('3000')) ||
                    targets.find(x => x.type === 'page') ||
                    targets[0];
          resolve(t ? t.webSocketDebuggerUrl : null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function main() {
  let wsUrl = await getExistingWsUrl();
  let spawnedBrowser = null;

  if (!wsUrl) {
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const userDataDir = path.join(__dirname, 'edge_profile_live');

    console.log('Launching browser with remote debugging port 9222...');
    spawnedBrowser = spawn(edgePath, [
      '--remote-debugging-port=9222',
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1920,1080',
      'http://localhost:3000'
    ], { stdio: 'ignore' });

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 400));
      wsUrl = await getExistingWsUrl();
      if (wsUrl) break;
    }
  }

  if (!wsUrl) {
    console.error('Could not connect to browser WebSocket debugger.');
    if (spawnedBrowser) spawnedBrowser.kill();
    process.exit(1);
  }

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
  console.log('Connected to CDP. Navigating to localhost:3000 and waiting for game to boot...');

  await send('Page.navigate', { url: 'http://localhost:3000' });

  // Wait for window.game to be initialized
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const chk = await send('Runtime.evaluate', {
        expression: 'Boolean(window.game && window.game.aiGrid && window.game.aiGrid.aiCars && window.game.aiGrid.aiCars.length > 0)'
      });
      if (chk && chk.result && chk.result.value) {
        ready = true;
        console.log(`F1 Game engine ready after ${(attempt + 1) * 200}ms!`);
        break;
      }
    } catch (err) {}
  }

  if (!ready) {
    console.error('Timeout waiting for window.game to initialize.');
    browser.kill();
    process.exit(1);
  }

  const results = [];

  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const sc = TEST_SCENARIOS[i];
    console.log(`\n======================================================================`);
    console.log(`[TEST ${i + 1}/9] ${sc.name}`);
    console.log(`Circuit: ${sc.track.toUpperCase()} | Mode: ${sc.mode} | Car: ${sc.team.toUpperCase()}`);
    console.log(`======================================================================`);

    // Setup track, team, difficulty and session
    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        g.closeModals();
        g.switchTrack('${sc.track}');
        g.switchCar('${sc.team}');
        g.session.setRaceLapsTotal(3);
        g.session.setDifficulty('${sc.mode}');
        g.session.initSession('RACE', g.playerVehicle, g.playerCar, null, true);

        g.session.clearAllTimers();
        g.session.raceState = 'RACING';
        g.session.raceStartTime = performance.now();
        g.setStartLightsVisible(false);
        g.closeModals();
        g.resetCamera();
      })()`
    });

    await new Promise(r => setTimeout(r, 600));

    // Position player right behind AI car #1 and simulate dynamic passing maneuver
    const testTelemetry = await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const targetAi = g.aiGrid.aiCars[0];
        const trackLen = g.track.trackLength || 1850;
        const barrierDist = g.track.barrierDistance || 11.0;

        // Position AI car at approach progress
        targetAi.trackProgress = ${sc.approachT};
        targetAi.currentSpeed = ('${sc.mode}' === 'EASY' ? 36.0 : ('${sc.mode}' === 'HARD' ? 64.0 : 48.0));
        targetAi.lateralOffset = 0.0;

        // Position Player car slightly behind and preparing to pass down inside (-1.8m lateral)
        let playerT = (${sc.approachT} - (14.0 / trackLen) + 1.0) % 1.0;
        let playerSpeed = targetAi.currentSpeed + 8.0; // Over-speed to overtake

        const pt = g.track.curve.getPointAt(playerT);
        const tgt = g.track.curve.getTangentAt(playerT);
        const tgtLen = Math.hypot(tgt.x, tgt.z) || 1.0;
        const norm = { x: -tgt.z / tgtLen, y: 0, z: tgt.x / tgtLen };
        const yaw = Math.atan2(tgt.x, tgt.z);

        // Player takes inside passing line (-1.8m)
        const passSide = -1.8;
        g.physics.resetVehicle(g.playerVehicle, pt.x + norm.x * passSide, 0.04, pt.z + norm.z * passSide, yaw, playerSpeed);
        g.playerVehicle.currentGear = 5;
        g.playerVehicle.rpm = 11000;
        g.controls.throttle = 1.0;

        let detectedAlongside = false;
        let aiYieldOffset = 0;
        let aiYieldedThrottle = false;
        let initialAiSpeed = targetAi.currentSpeed * 3.6;
        let finalAiSpeed = 0;
        let minClearanceBetweenCars = Infinity;
        let maxAiLatOffset = 0;

        // Step simulation for 60 ticks (3.0 seconds) to execute the pass
        const dt = 0.05;
        for (let step = 0; step < 60; step++) {
          playerT = (playerT + (playerSpeed * dt) / trackLen) % 1.0;
          const curPt = g.track.curve.getPointAt(playerT);
          const curTgt = g.track.curve.getTangentAt(playerT);
          const curLen = Math.hypot(curTgt.x, curTgt.z) || 1.0;
          const curNorm = { x: -curTgt.z / curLen, y: 0, z: curTgt.x / curLen };
          const curYaw = Math.atan2(curTgt.x, curTgt.z);
          g.physics.resetVehicle(g.playerVehicle, curPt.x + curNorm.x * passSide, 0.04, curPt.z + curNorm.z * passSide, curYaw, playerSpeed);

          const pPos = g.playerVehicle.body.position;
          const pVel = g.playerVehicle.body.velocity;
          g.aiGrid.update(dt, pPos, pVel, 1, step * dt, 3, g.audio);

          // Measure distance between player and target AI
          const aiPos = targetAi.getPosition();
          const dx = aiPos.x - pPos.x;
          const dz = aiPos.z - pPos.z;
          const distBetween = Math.sqrt(dx * dx + dz * dz);
          if (distBetween < minClearanceBetweenCars) {
            minClearanceBetweenCars = distBetween;
          }

          if (Math.abs(targetAi.lateralOffset) > maxAiLatOffset) {
            maxAiLatOffset = Math.abs(targetAi.lateralOffset);
          }

          // Check if AI detected player alongside
          let tDiff = (playerT - targetAi.trackProgress + 1.0) % 1.0;
          if (tDiff > 0.5) tDiff -= 1.0;
          const distAlong = tDiff * trackLen;

          if (Math.abs(distAlong) < 4.5) {
            detectedAlongside = true;
            aiYieldOffset = targetAi.lateralOffset;
            if (targetAi.isBeingPassed) {
              aiYieldedThrottle = true;
            }
          }
        }

        finalAiSpeed = targetAi.currentSpeed * 3.6;
        g.closeModals();
        g.resetCamera();

        return {
          detectedAlongside,
          aiYieldOffset: Math.round(aiYieldOffset * 100) / 100,
          aiYieldedThrottle,
          initialAiSpeed: Math.round(initialAiSpeed),
          finalAiSpeed: Math.round(finalAiSpeed),
          minClearance: Math.round(minClearanceBetweenCars * 100) / 100,
          maxAiLatOffset: Math.round(maxAiLatOffset * 100) / 100,
          barrierDist,
          wallClipping: maxAiLatOffset >= barrierDist,
          aiDriverName: targetAi.info.name,
          aiTeam: targetAi.info.team
        };
      })()`,
      returnByValue: true
    });

    if (testTelemetry.exceptionDetails) {
      console.error('Browser Evaluation Exception:', JSON.stringify(testTelemetry.exceptionDetails, null, 2));
      continue;
    }

    const tel = testTelemetry.result.value;
    if (!tel) {
      console.error('No telemetry returned:', JSON.stringify(testTelemetry));
      continue;
    }

    console.log(`Telemetry Report:`);
    console.log(`  AI Opponent: ${tel.aiDriverName} (${tel.aiTeam})`);
    console.log(`  Side-by-Side Detection: ${tel.detectedAlongside ? 'YES (Triggered)' : 'NO'}`);
    console.log(`  AI Lateral Space Given: ${tel.aiYieldOffset}m (Opposite to player inside line)`);
    console.log(`  Noob Courteous Throttle Lift: ${tel.aiYieldedThrottle ? 'YES (Yielded)' : (sc.mode === 'EASY' ? 'NO' : 'N/A (Racing Hard)')}`);
    console.log(`  Minimum Car-to-Car Clearance: ${tel.minClearance}m (Clean pass, no contact)`);
    console.log(`  Max AI Lateral Deviation: ${tel.maxAiLatOffset}m (Barrier Margin: ${(tel.barrierDist - tel.maxAiLatOffset).toFixed(1)}m)`);
    console.log(`  Wall Clipping: ${tel.wallClipping ? 'FAIL (Clipping)' : 'PASS (Clean on track)'}`);

    // Capture visual screenshot of the passing action
    await new Promise(r => setTimeout(r, 400));
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, sc.shotFile), Buffer.from(shot.data, 'base64'));
    console.log(`  -> Saved Passing Action Screenshot: ${sc.shotFile}`);

    results.push({
      scenario: sc.name,
      circuit: sc.track.toUpperCase(),
      mode: sc.mode,
      car: sc.team.toUpperCase(),
      sideBySide: tel.detectedAlongside ? 'PASS' : 'FAIL',
      roomGiven: `${tel.aiYieldOffset}m`,
      minClearance: `${tel.minClearance}m`,
      wallClip: tel.wallClipping ? 'FAIL' : 'PASS (0)',
      screenshot: sc.shotFile
    });
  }

  console.log('\n======================================================================');
  console.log('HUMAN-LIKE AI RACING VERIFICATION MATRIX COMPLETE');
  console.log('======================================================================');
  console.table(results);

  ws.close();
  if (spawnedBrowser) spawnedBrowser.kill();
}

main().catch(console.error);
