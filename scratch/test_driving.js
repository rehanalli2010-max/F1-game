const http = require('http');

async function testDriving() {
  const pages = await new Promise((r, j) => http.get('http://localhost:9222/json', res => {
    let s = ''; res.on('data', c => s += c); res.on('end', () => r(JSON.parse(s)));
  }));
  const p = pages.find(p => p.url.includes('localhost:3000')) || pages[0];
  const ws = new WebSocket(p.webSocketDebuggerUrl);
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

  // Click canvas to trigger user interaction and AudioContext
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: 500,
    y: 400,
    button: 'left',
    clickCount: 1
  });
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: 500,
    y: 400,
    button: 'left',
    clickCount: 1
  });

  await new Promise(r => setTimeout(r, 600));

  // Check audio at 0 km/h idle
  const idleAudio = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const a = window.game.audio;
        return {
          isInitialized: a.isInitialized,
          ctxState: a.ctx ? a.ctx.state : null,
          gainRasp: a.gainRasp ? a.gainRasp.gain.value : null,
          gainOctave: a.gainOctave ? a.gainOctave.gain.value : null,
          crowdGain: a.crowdGain ? a.crowdGain.gain.value : null,
          windGain: a.windGain ? a.windGain.gain.value : null,
          highCutFreq: a.highCutFilter ? Math.round(a.highCutFilter.frequency.value) : null
        };
      })()
    `,
    returnByValue: true
  });
  console.log('IDLE AUDIO AT 0 KM/H:', JSON.stringify(idleAudio?.result?.value, null, 2));

  console.log('Sending KeyW (accelerate) for 2.5 seconds...');

  // Dispatch keydown KeyW
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    code: 'KeyW',
    key: 'w',
    windowsVirtualKeyCode: 87
  });

  // Wait 2.5 seconds while accelerating
  await new Promise(r => setTimeout(r, 2500));

  // Also steer slightly with KeyA
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    code: 'KeyA',
    key: 'a',
    windowsVirtualKeyCode: 65
  });

  await new Promise(r => setTimeout(r, 800));

  // Release keys
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyA', key: 'a', windowsVirtualKeyCode: 65 });

  // Get telemetry
  const diag = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        const v = g.playerVehicle;
        const vel = v.body.velocity;
        const speedKmh = Math.round(vel.length() * 3.6);
        return {
          speedKmh,
          currentGear: v.currentGear,
          rpm: Math.round(v.rpm),
          lateralSlip: v.lateralSlip.toFixed(3),
          isOnTrack: v.isOnTrack,
          pos: { x: Math.round(v.body.position.x), z: Math.round(v.body.position.z) }
        };
      })()
    `,
    returnByValue: true
  });

  console.log('DRIVING TELEMETRY:', JSON.stringify(diag?.result?.value, null, 2));

  // Capture driving screenshot
  const scr = await send('Page.captureScreenshot', { format: 'png' });
  if (scr && scr.data) {
    const fs = require('fs');
    fs.writeFileSync('d:\\CODE\\F1 Game\\scratch\\driving_action.png', Buffer.from(scr.data, 'base64'));
    console.log('Saved driving screenshot to scratch/driving_action.png');
  }

  ws.close();
}

testDriving().catch(console.error);
