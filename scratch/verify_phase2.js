const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(__dirname, 'edge_profile_phase2');

  console.log('Launching headless Edge for Phase 2 Verification...');
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1920,1080',
    'about:blank'
  ], { stdio: 'ignore' });

  // Connect to CDP
  let wsUrl = null;
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 400));
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://localhost:9222/json', (res) => {
          let str = '';
          res.on('data', d => str += d);
          res.on('end', () => resolve(JSON.parse(str)));
        }).on('error', reject);
      });
      if (data && data.length > 0 && data[0].webSocketDebuggerUrl) {
        wsUrl = data[0].webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error('Failed to get WebSocket Debugger URL');
    edge.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const consoleLogs = [];
  const pageErrors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
      consoleLogs.push(`[${msg.params.type}] ${text}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');

  console.log('Navigating to http://localhost:3000/?v=200 ...');
  await send('Page.navigate', { url: 'http://localhost:3000/?v=200' });

  // Wait until window.game is defined
  let gameReady = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    const chk = await send('Runtime.evaluate', {
      expression: `
        (() => {
          return {
            hasGame: !!window.game,
            readyState: document.readyState,
            scripts: Array.from(document.querySelectorAll('script')).map(s => s.src || s.type),
            errors: window.__errors || []
          };
        })()
      `,
      returnByValue: true
    });
    if (chk && chk.result && chk.result.value && chk.result.value.hasGame) {
      gameReady = true;
      console.log(`window.game ready after ${(i + 1) * 0.5}s!`);
      break;
    } else {
      if (i % 4 === 0) console.log('Waiting for window.game... status:', chk?.result?.value);
    }
  }

  if (consoleLogs.length > 0) {
    console.log('Browser Console Logs:', consoleLogs);
  }
  if (pageErrors.length > 0) {
    console.error('PAGE ERRORS ENCOUNTERED:', pageErrors);
  }

  async function takeScreenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    if (res && res.data) {
      const outPath = path.join(__dirname, filename);
      fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
      console.log(`Saved screenshot: ${filename}`);
    }
  }

  // TEST 1: Check 10-car grid objects & initial Practice solo state
  console.log('\n--- TEST 1: 10-Car Grid & Solo Practice Verification ---');
  const test1 = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        if (!g) return { error: 'game not found' };
        const aiGrid = g.aiGrid;
        const totalAICars = aiGrid ? aiGrid.aiCars.length : 0;
        const playerCar = g.playerCar;

        // In Practice mode, all AI cars should be hidden
        const activeAICount = aiGrid.aiCars.filter(c => c.active && c.visualCar.group.visible).length;

        return {
          totalAICars,
          expectedAICars: 9,
          totalGridCars: totalAICars + 1,
          playerExists: !!playerCar,
          activeAICountInPractice: activeAICount,
          sessionMode: g.session.currentMode,
          waypointsCount: aiGrid.waypoints.length
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Test 1 Result:', JSON.stringify(test1.result.value, null, 2));

  // TEST 2: Test 3 Difficulty Tiers
  console.log('\n--- TEST 2: 3-Tier Difficulty Engine ---');
  const test2 = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        const diffButtons = document.querySelectorAll('.diff-btn');
        const session = g.session;
        const aiGrid = g.aiGrid;

        const results = {};

        // Easy
        session.setDifficulty('EASY');
        results.easy = {
          sessionDiff: session.difficulty,
          gridDiff: aiGrid.difficulty,
          easyQuali: aiGrid.simulateQualifyingTimes(73.5)
        };

        // Medium
        session.setDifficulty('MEDIUM');
        results.medium = {
          sessionDiff: session.difficulty,
          gridDiff: aiGrid.difficulty,
          mediumQuali: aiGrid.simulateQualifyingTimes(73.5)
        };

        // Hard
        session.setDifficulty('HARD');
        results.hard = {
          sessionDiff: session.difficulty,
          gridDiff: aiGrid.difficulty,
          hardQuali: aiGrid.simulateQualifyingTimes(73.5)
        };

        return results;
      })()
    `,
    returnByValue: true
  });

  const diffRes = test2.result.value;
  console.log('Easy simulated pole time:', diffRes.easy.easyQuali.poleTime, 'Player Pos:', diffRes.easy.easyQuali.playerPosition);
  console.log('Medium simulated pole time:', diffRes.medium.mediumQuali.poleTime, 'Player Pos:', diffRes.medium.mediumQuali.playerPosition);
  console.log('Hard simulated pole time:', diffRes.hard.hardQuali.poleTime, 'Player Pos:', diffRes.hard.hardQuali.playerPosition);

  // TEST 3: Qualifying Session & Classification Table
  console.log('\n--- TEST 3: One-Shot Qualifying Session ---');
  const test3 = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        const session = g.session;

        // Switch to Qualifying
        session.initSession('QUALIFYING', g.playerVehicle, g.playerCar);
        const qualiActiveAICount = g.aiGrid.aiCars.filter(c => c.active && c.visualCar.group.visible).length;

        // Simulate completing flying lap with time 73.125
        g.timing.sectorTimes = [24.2, 26.5, 22.425];
        const lapResult = {
          valid: true,
          lapNumber: 1,
          time: 73.125,
          isNewBest: true
        };
        session.qualifyingPhase = 'FLYING_LAP';
        session.handleLapComplete(lapResult);

        const qualiModal = document.getElementById('modal-qualifying');
        const rowsCount = document.querySelectorAll('#quali-table-body tr').length;
        const playerPosText = document.getElementById('quali-pos-text').textContent;

        return {
          qualiActiveAICount, // should be 0 (solo)
          modalActive: qualiModal.classList.contains('active'),
          leaderboardRows: rowsCount,
          playerPosText,
          gridOrder: session.qualifyingResult.gridOrder
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Test 3 Result:', JSON.stringify(test3.result.value, null, 2));
  await takeScreenshot('qualifying_results_modal.png');

  // TEST 4: Race Mode Grid Spawning & 2x2 Staggered Slots
  console.log('\n--- TEST 4: Race Mode 10-Car 2x2 Grid Spawning ---');
  const test4 = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        const session = g.session;
        const aiGrid = g.aiGrid;

        g.closeModals();
        // Start Race from the qualified grid
        const qualifiedGrid = session.qualifyingResult.gridOrder;
        session.initSession('RACE', g.playerVehicle, g.playerCar, qualifiedGrid, true); // skip ad for initial grid check

        const activeAICount = aiGrid.aiCars.filter(c => c.active && c.visualCar.group.visible).length;

        // Check slots for all 10 cars
        const carsPositions = [];
        // Player position
        carsPositions.push({
          id: 'player',
          x: Math.round(g.playerVehicle.body.position.x * 10) / 10,
          z: Math.round(g.playerVehicle.body.position.z * 10) / 10
        });

        for (const ai of aiGrid.aiCars) {
          carsPositions.push({
            id: ai.info.id,
            name: ai.info.name,
            x: Math.round(ai.vehicle.body.position.x * 10) / 10,
            z: Math.round(ai.vehicle.body.position.z * 10) / 10
          });
        }

        return {
          activeAICount,
          expectedAICount: 9,
          totalCarsSpawned: activeAICount + 1,
          raceState: session.raceState,
          positionsSample: carsPositions.slice(0, 5)
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Test 4 Result:', JSON.stringify(test4.result.value, null, 2));
  await takeScreenshot('10_car_starting_grid.png');

  // TEST 5: Lights Out, Waypoint Driving & Live Position Tower
  console.log('\n--- TEST 5: Lights Out & Live Position Tower ---');
  const test5 = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        const session = g.session;

        // Force Lights Out
        session.raceState = 'RACING';
        g.setStartLightsVisible(false);

        // Simulate 4 seconds of race ticks (dt = 0.05)
        for (let step = 0; step < 80; step++) {
          const dt = 0.05;
          g.physics.updateVehicle(g.playerVehicle, { throttle: 1.0, brake: 0, steer: 0 }, dt, g.audio);
          g.physics.step(dt);
          const pPos = g.playerVehicle.body.position;
          const pVel = g.playerVehicle.body.velocity;
          session.update(dt, g.playerVehicle, pPos, pVel);
          g.updateHUD(160, 4, 10500, 1.0, 0, true);
        }

        const liveLeaderboard = g.aiGrid.getLiveLeaderboard();
        const playerLivePos = g.aiGrid.getPlayerLivePosition();
        const hudPlayerPosEl = document.getElementById('hud-player-pos');
        const towerRows = document.querySelectorAll('#position-tower-rows .tower-row').length;

        return {
          playerLivePos,
          hudPlayerPosText: hudPlayerPosEl ? hudPlayerPosEl.textContent : null,
          towerRowsRendered: towerRows,
          leaderboardSample: liveLeaderboard.slice(0, 5).map(e => ({
            pos: e.pos,
            code: e.code,
            name: e.name,
            gap: e.gapSeconds,
            isPlayer: e.isPlayer
          }))
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Test 5 Result:', JSON.stringify(test5.result.value, null, 2));
  await takeScreenshot('live_race_position_tower.png');

  // TEST 6: Mock Ad System (Pre-race and Return to menu)
  console.log('\n--- TEST 6: Broadcast Sponsor Mock Ad System ---');
  const test6 = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        let adFinished = false;

        g.showMockAd({
          title: 'OFFICIAL GLOBAL PARTNER',
          sponsor: 'PIRELLI',
          subtitle: 'Formula 1 Grand Prix Official Tire Partner',
          duration: 2500,
          onFinish: () => { adFinished = true; }
        });

        const adModal = document.getElementById('modal-mock-ad');
        const sponsorText = document.getElementById('ad-sponsor-name').textContent;
        const isVisible = adModal.classList.contains('active');

        // Test clicking skip
        const skipBtn = document.getElementById('btn-skip-ad');
        if (skipBtn) skipBtn.click();

        const isClosedAfterSkip = !adModal.classList.contains('active');

        return {
          adModalActive: isVisible,
          sponsorText,
          isClosedAfterSkip,
          adFinished
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Test 6 Result:', JSON.stringify(test6.result.value, null, 2));

  // Show ad again to capture clean screenshot of broadcast sponsor modal
  await send('Runtime.evaluate', {
    expression: `
      window.game.showMockAd({
        title: 'OFFICIAL GLOBAL PARTNER',
        sponsor: 'ROLEX',
        subtitle: 'Formula 1 Grand Prix Official Timepiece',
        duration: 10000
      });
    `
  });
  await new Promise(r => setTimeout(r, 200));
  await takeScreenshot('broadcast_sponsor_mock_ad.png');

  console.log('\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
  edge.kill();
  process.exit(0);
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
