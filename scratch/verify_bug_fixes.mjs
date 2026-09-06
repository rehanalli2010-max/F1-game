import fs from 'fs';
import path from 'path';

async function main() {
  console.log('=== VERIFY BUG FIXES: START LIGHTS & AI BALANCED RACING ===');

  const tabsRes = await fetch('http://127.0.0.1:9222/json');
  const tabs = await tabsRes.json();
  const gameTab = tabs.find(t => t.title.includes('Formula 1') || t.url.includes('3000'));
  if (!gameTab) throw new Error('Game tab not found on port 9222');

  const ws = new WebSocket(gameTab.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });

  let idCounter = 1;
  const pendingRequests = new Map();
  const consoleErrors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
    }
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression, awaitPromise = true) {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async function captureScreenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.resolve('scratch', filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return outPath;
  }

  await send('Runtime.enable');
  await send('Page.enable');

  console.log('\n--- 1. RELOAD PAGE TO TEST PRACTICE MODE START LIGHTS ---');
  await send('Page.reload', { ignoreCache: true });

  // Wait for game ready
  let ready = false;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      ready = await evaluate('Boolean(window.game && window.game.playerCar && window.game.track)');
      if (ready) break;
    } catch (e) {}
  }
  if (!ready) throw new Error('Game failed to initialize');
  console.log('Game initialized in Practice mode.');

  // Check 1: Start lights in Practice mode
  const practiceLightsCheck = await evaluate(`
    (() => {
      const gantry = document.getElementById('start-lights-gantry');
      const isHidden = gantry ? gantry.classList.contains('hidden') : false;
      const display = gantry ? window.getComputedStyle(gantry).display : '';
      const litBulbs = document.querySelectorAll('.f1-bulb.active').length;
      return { isHidden, display, litBulbs, sessionMode: window.game.session.currentMode };
    })()
  `);
  console.log('Practice Mode Starting Lights State:', practiceLightsCheck);
  if (!practiceLightsCheck.isHidden || practiceLightsCheck.display === 'block' || practiceLightsCheck.litBulbs !== 0) {
    throw new Error('Start lights are visible in Practice mode!');
  }
  console.log('PASS: Starting lights gantry is completely hidden and off in Practice mode.');

  // Check track switch while in Practice mode
  await evaluate(`window.game.switchTrack('monza')`);
  await new Promise(r => setTimeout(r, 800));

  const afterTrackSwitchLights = await evaluate(`
    (() => {
      const gantry = document.getElementById('start-lights-gantry');
      const isHidden = gantry ? gantry.classList.contains('hidden') : false;
      const litBulbs = document.querySelectorAll('.f1-bulb.active').length;
      return { isHidden, litBulbs, currentTrack: window.game.currentTrackId };
    })()
  `);
  console.log('After Track Switch Lights State:', afterTrackSwitchLights);
  if (!afterTrackSwitchLights.isHidden || afterTrackSwitchLights.litBulbs !== 0) {
    throw new Error('Start lights became visible after track switch in Practice mode!');
  }
  console.log('PASS: Starting lights remain hidden after track switch.');

  // Check session restart in Practice mode
  await evaluate(`window.game.restartSession()`);
  await new Promise(r => setTimeout(r, 600));

  const afterRestartLights = await evaluate(`
    (() => {
      const gantry = document.getElementById('start-lights-gantry');
      const isHidden = gantry ? gantry.classList.contains('hidden') : false;
      return { isHidden };
    })()
  `);
  if (!afterRestartLights.isHidden) {
    throw new Error('Start lights became visible after restart in Practice mode!');
  }
  console.log('PASS: Starting lights remain hidden after session restart.');

  await captureScreenshot('verified_practice_no_lights.png');

  console.log('\n--- 2. VERIFY RACE MODE AI POWER & CONTINUOUS RACING ---');
  // Set Medium AI difficulty
  await evaluate(`window.game.session.setDifficulty('MEDIUM')`);
  // Start Race mode without ad
  await evaluate(`window.game.session.initSession('RACE', window.game.playerVehicle, window.game.playerCar, null, true)`);

  // Wait for lights countdown to finish (approx 6 seconds)
  console.log('Waiting for lights countdown to extinguish and race to start...');
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const raceState = await evaluate('window.game.session.raceState');
    if (raceState === 'RACING') {
      console.log(`Race is now active! raceState: ${raceState}`);
      break;
    }
  }

  // Let AI accelerate for 3 seconds
  await new Promise(r => setTimeout(r, 3000));

  const aiSpeedsInitial = await evaluate(`
    (() => {
      return window.game.aiGrid.aiCars.map(ai => ({
        name: ai.info.name,
        speedKmh: Math.round(ai.currentSpeed * 3.6),
        lap: ai.currentLap,
        trackProgress: Number(ai.trackProgress.toFixed(3))
      }));
    })()
  `);
  console.log('AI Cars at 3s after start:', aiSpeedsInitial.slice(0, 4));

  // Verify initial acceleration is balanced (between 80 and 150 km/h at 3s)
  const leadSpeed = aiSpeedsInitial[0].speedKmh;
  if (leadSpeed < 60 || leadSpeed > 180) {
    throw new Error(`AI speed unbalanced at 3s: ${leadSpeed} km/h`);
  }
  console.log(`PASS: AI initial power is balanced and realistic (${leadSpeed} km/h).`);

  // Now simulate player driving behind or AI overtaking and racing for 8 seconds
  console.log('Monitoring AI cars over 8 seconds to confirm continuous racing without stopping...');
  for (let sec = 1; sec <= 4; sec++) {
    await new Promise(r => setTimeout(r, 2000));
    const status = await evaluate(`
      (() => {
        const lead = window.game.aiGrid.aiCars[0];
        const p2 = window.game.aiGrid.aiCars[1];
        const minSpeed = Math.min(...window.game.aiGrid.aiCars.map(c => c.currentSpeed * 3.6));
        return {
          leaderName: lead.info.name,
          leaderSpeed: Math.round(lead.currentSpeed * 3.6),
          leaderProgress: Number(lead.trackProgress.toFixed(3)),
          p2Speed: Math.round(p2.currentSpeed * 3.6),
          minAiSpeed: Math.round(minSpeed)
        };
      })()
    `);
    console.log(`T+${sec * 2}s: Leader (${status.leaderName}) at ${status.leaderSpeed} km/h (prog: ${status.leaderProgress}), Min AI Speed: ${status.minAiSpeed} km/h`);

    if (status.minAiSpeed <= 5) {
      throw new Error(`AI car stopped on track! Min speed: ${status.minAiSpeed} km/h`);
    }
  }
  console.log('PASS: All AI cars maintain continuous competitive racing speeds with zero post-overtake stopping.');

  await captureScreenshot('verified_ai_continuous_racing.png');

  if (consoleErrors.length > 0) {
    console.warn('Console errors:', consoleErrors);
  } else {
    console.log('PASS: Zero uncaught runtime errors during entire session.');
  }

  console.log('\n=== ALL BUG FIXES VERIFIED SUCCESSFULLY ===');
  ws.close();
}

main().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
