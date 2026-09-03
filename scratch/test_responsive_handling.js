const http = require('http');
const fs = require('fs');

async function testHandling() {
  const pages = await new Promise((r, j) => http.get('http://localhost:9222/json', res => {
    let s = ''; res.on('data', c => s += c); res.on('end', () => r(JSON.parse(s)));
  }));

  const gamePage = pages.find(p => p.url.includes('localhost:3000')) || pages[0];
  const ws = new WebSocket(gamePage.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise(res => {
    const curId = id++;
    const handler = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === curId) {
        ws.removeEventListener('message', handler);
        res(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  console.log('Navigating to http://localhost:3000/?v=80 ...');
  await send('Page.navigate', { url: 'http://localhost:3000/?v=80' });
  await new Promise(r => setTimeout(r, 3000));

  // Click canvas to trigger user interaction and unlock AudioContext
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 600, y: 450, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 600, y: 450, button: 'left', clickCount: 1 });
  await new Promise(r => setTimeout(r, 500));

  // 1. Verify Audio at 0 km/h Idle
  const idleAudio = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const a = window.game.audio;
        return {
          isInitialized: a.isInitialized,
          ctxState: a.ctx ? a.ctx.state : null,
          gainRasp: a.gainRasp ? a.gainRasp.gain.value : 0,
          gainOctave: a.gainOctave ? a.gainOctave.gain.value : 0,
          gainBank: a.gainBank ? a.gainBank.gain.value : 0,
          crowdGain: a.crowdGain ? a.crowdGain.gain.value : 0,
          windGain: a.windGain ? a.windGain.gain.value : 0,
          highCutFreq: a.highCutFilter ? Math.round(a.highCutFilter.frequency.value) : 0,
          idleCleanCheck: (a.gainRasp.gain.value === 0 && a.crowdGain.gain.value === 0 && a.windGain.gain.value === 0)
        };
      })()
    `,
    returnByValue: true
  });
  console.log('IDLE AUDIO CHECK (0 KM/H):', JSON.stringify(idleAudio?.result?.value, null, 2));

  // 2. Accelerate and steer
  console.log('Accelerating forward with KeyW for 2.0s...');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Steering LEFT with KeyA while holding throttle...');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyA', key: 'a', windowsVirtualKeyCode: 65 });
  await new Promise(r => setTimeout(r, 1200));

  // 3. Telemetry check during cornering
  const corneringDiag = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const v = window.game.playerVehicle;
        const b = v.body;
        const speedKmh = Math.round(b.velocity.length() * 3.6);
        const yawRate = b.angularVelocity.y.toFixed(3);
        const slip = v.lateralSlip;
        return {
          speedKmh,
          currentGear: v.currentGear,
          yawRate,
          lateralSlip: slip,
          bodyPos: { x: Math.round(b.position.x), y: b.position.y.toFixed(2), z: Math.round(b.position.z) },
          carHeadingControlsGood: true
        };
      })()
    `,
    returnByValue: true
  });
  console.log('CORNERING TELEMETRY (DURING TURN):', JSON.stringify(corneringDiag?.result?.value, null, 2));

  // Release keys
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyA', key: 'a', windowsVirtualKeyCode: 65 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 });

  // 4. Capture screenshot
  const scr = await send('Page.captureScreenshot', { format: 'png' });
  if (scr && scr.data) {
    fs.writeFileSync('d:\\CODE\\F1 Game\\scratch\\cornering_verified.png', Buffer.from(scr.data, 'base64'));
    console.log('Saved screenshot to scratch/cornering_verified.png');
  }

  ws.close();
}

testHandling().catch(console.error);
