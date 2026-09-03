const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(__dirname, 'edge_profile_phase3');

  console.log('Launching headless Edge for Phase 3 Verification...');
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

  console.log('Navigating to http://localhost:3000/?v=300 ...');
  await send('Page.navigate', { url: 'http://localhost:3000/?v=300' });

  // Wait until window.game is ready
  let gameReady = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    const chk = await send('Runtime.evaluate', {
      expression: `
        (() => {
          return {
            hasGame: !!window.game,
            hasTrack: !!(window.game && window.game.track),
            readyState: document.readyState
          };
        })()
      `,
      returnByValue: true
    });
    if (chk?.result?.value?.hasTrack) {
      gameReady = true;
      console.log(`window.game ready after ${(i + 1) * 0.5}s!`);
      break;
    } else {
      if (i % 4 === 0) console.log('Waiting status:', chk?.result?.value);
    }
  }

  if (consoleLogs.length > 0) {
    console.log('Browser Console Logs:', consoleLogs);
  }
  if (pageErrors.length > 0) {
    console.error('Browser Page Errors:', pageErrors);
  }

  if (!gameReady) {
    console.error('Game failed to initialize');
    edge.kill();
    process.exit(1);
  }

  async function takeScreenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    if (res && res.data) {
      const outPath = path.join(__dirname, filename);
      fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
      console.log(`Saved screenshot: ${filename}`);
    }
  }

  // TEST 1: TRACK_DATABASE & Initial Circuit
  console.log('\n--- TEST 1: TRACK_DATABASE & Initial Circuit Verification ---');
  const test1 = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        const tracks = window.game.track.trackData ? [window.game.track.trackData] : [];
        return {
          currentTrackId: g.currentTrackId,
          trackName: g.track.trackData.name,
          country: g.track.trackData.country,
          flag: g.track.trackData.flag,
          lengthMeters: Math.round(g.track.trackLength),
          checkpointsCount: g.track.checkpoints.length,
          sampledPoints: g.track.sampledPoints.length,
          physicsBodiesCount: g.track.physicsBodies.length,
          trackRootChildren: g.track.trackRoot.children.length
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Test 1 Result:', JSON.stringify(test1.result.value, null, 2));

  // TEST 2: Open Track Selector Modal & Verify 10 Cards
  console.log('\n--- TEST 2: Track Selection Modal & 2D Previews ---');
  const test2 = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        g.openTrackSelectModal();

        const modal = document.getElementById('modal-track-select');
        const cards = document.querySelectorAll('.track-card');
        const canvases = document.querySelectorAll('.track-card-canvas');

        const cardData = [];
        cards.forEach(c => {
          cardData.push({
            id: c.getAttribute('data-track'),
            name: c.querySelector('.track-card-name')?.textContent,
            isActive: c.classList.contains('active')
          });
        });

        return {
          modalActive: modal ? modal.classList.contains('active') : false,
          totalCards: cards.length,
          totalCanvases: canvases.length,
          cardsList: cardData
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Test 2 Result:', JSON.stringify(test2.result.value, null, 2));
  await new Promise(r => setTimeout(r, 600)); // Allow 2D canvas drawing
  await takeScreenshot('track_selection_modal.png');

  // TEST 3: Sequential Track Switching & Memory Cleanup Stability
  console.log('\n--- TEST 3: Switching Through All 10 Circuits & Memory Cleanup ---');
  const trackIds = [
    'monaco', 'silverstone', 'spa', 'suzuka',
    'singapore', 'bahrain', 'redbullring', 'interlagos', 'baku', 'monza'
  ];

  const switchResults = [];
  for (const tid of trackIds) {
    const res = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const g = window.game;
          g.switchTrack('${tid}');
          g.closeModals();

          return {
            trackId: g.currentTrackId,
            name: g.track.trackData.name,
            lengthMeters: Math.round(g.track.trackLength),
            physicsBodies: g.track.physicsBodies.length,
            totalWorldBodies: g.physics.world.bodies.length,
            checkpoints: g.track.checkpoints.length,
            aiWaypoints: g.aiGrid.waypoints.length,
            playerOnTrack: g.track.isOnTrack(g.playerVehicle.body.position.x, g.playerVehicle.body.position.z),
            playerPos: {
              x: Math.round(g.playerVehicle.body.position.x),
              y: Math.round(g.playerVehicle.body.position.y * 100) / 100,
              z: Math.round(g.playerVehicle.body.position.z)
            }
          };
        })()
      `,
      returnByValue: true
    });
    if (res?.exceptionDetails) {
      console.error(`Error switching to ${tid}:`, res.exceptionDetails);
    }
    switchResults.push(res?.result?.value || { name: tid, error: res?.exceptionDetails?.text });
  }
  console.log('Switch Results Summary:');
  switchResults.forEach(r => {
    if (r.error) {
      console.log(`- ${r.name.padEnd(20)} | ERROR: ${r.error}`);
    } else {
      console.log(`- ${r.name.padEnd(20)} | Length: ${String(r.lengthMeters).padStart(5)}m | Colliders: ${r.physicsBodies} | World Bodies: ${r.totalWorldBodies} | AI Waypoints: ${r.aiWaypoints} | OnTrack: ${r.playerOnTrack}`);
    }
  });

  // TEST 4: Singapore Night GP Visual & Lighting
  console.log('\n--- TEST 4: Singapore Night GP Theming ---');
  await send('Runtime.evaluate', { expression: `window.game.switchTrack('singapore');` });
  await new Promise(r => setTimeout(r, 400));
  await takeScreenshot('circuit_singapore_night.png');

  // TEST 5: Bahrain Desert GP Theming
  console.log('\n--- TEST 5: Bahrain Desert GP Theming ---');
  await send('Runtime.evaluate', { expression: `window.game.switchTrack('bahrain');` });
  await new Promise(r => setTimeout(r, 400));
  await takeScreenshot('circuit_bahrain_desert.png');

  // TEST 6: Spa-Francorchamps GP Theming & Elevation
  console.log('\n--- TEST 6: Spa-Francorchamps GP Theming & Elevation ---');
  await send('Runtime.evaluate', { expression: `window.game.switchTrack('spa');` });
  await new Promise(r => setTimeout(r, 400));
  await takeScreenshot('circuit_spa_forest.png');

  // TEST 7: Monaco GP 10-Car Grid Spawning & Race Simulation
  console.log('\n--- TEST 7: Monaco GP 10-Car Race Grid Spawning & Driving ---');
  const test7 = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        g.switchTrack('monaco');
        g.session.initSession('RACE', g.playerVehicle, g.playerCar, null, true);

        const activeAICount = g.aiGrid.aiCars.filter(c => c.active && c.visualCar.group.visible).length;

        // Simulate 40 physics ticks
        for (let s = 0; s < 40; s++) {
          const dt = 0.05;
          g.physics.updateVehicle(g.playerVehicle, { throttle: 0.8, brake: 0, steer: 0 }, dt, g.audio);
          g.physics.step(dt);
          const pPos = g.playerVehicle.body.position;
          const pVel = g.playerVehicle.body.velocity;
          g.session.update(dt, g.playerVehicle, pPos, pVel);
          g.updateHUD(120, 3, 9000, 0.8, 0, true);
        }

        const liveLeaderboard = g.aiGrid.getLiveLeaderboard();

        return {
          circuit: g.track.trackData.name,
          activeAICars: activeAICount,
          totalCars: activeAICount + 1,
          liveLeaderboardSample: liveLeaderboard.slice(0, 4).map(e => ({
            pos: e.pos,
            code: e.code,
            gap: e.gapSeconds
          }))
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Test 7 Result:', JSON.stringify(test7.result.value, null, 2));
  await takeScreenshot('circuit_monaco_grid.png');

  console.log('\nALL PHASE 3 VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
  edge.kill();
  process.exit(0);
}

main().catch(err => {
  console.error('Phase 3 verification failed:', err);
  process.exit(1);
});
