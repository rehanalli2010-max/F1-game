const http = require('http');
const fs = require('fs');

async function testSmoothHandling() {
  const pages = await new Promise((r, j) => http.get('http://localhost:9222/json', res => {
    let s = ''; res.on('data', c => s += c); res.on('end', () => r(JSON.parse(s)));
  }));

  const gamePage = pages.find(p => p.url.includes('localhost:3000'));
  if (!gamePage) {
    console.error('No game page found');
    process.exit(1);
  }

  const ws = new WebSocket(gamePage.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    }
  };

  await new Promise(r => ws.onopen = r);

  console.log('Reloading to http://localhost:3000/?v=110 ...');
  await send('Page.navigate', { url: 'http://localhost:3000/?v=110' });
  await new Promise(r => setTimeout(r, 2500));

  // Accelerate to ~140 km/h
  console.log('Accelerating forward...');
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 });
  await new Promise(r => setTimeout(r, 2200));

  // Sample cornering progression during Left Turn
  console.log('Steering LEFT smoothly...');
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'KeyA', key: 'a', windowsVirtualKeyCode: 65 });

  const telemetrySamples = [];
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 150));
    const sample = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const v = window.game.playerVehicle;
          const b = v.body;
          return {
            speedKmh: Math.round(b.velocity.length() * 3.6),
            steerInput: window.game.controls.steer.toFixed(3),
            yawRate: b.angularVelocity.y.toFixed(3),
            posX: Math.round(b.position.x),
            posZ: Math.round(b.position.z),
            cameraLookSmooth: !!window.game.smoothLookAt
          };
        })()
      `,
      returnByValue: true
    });
    telemetrySamples.push(sample?.result?.value);
  }

  console.log('CORNERING PROGRESSION SAMPLES:\n', JSON.stringify(telemetrySamples, null, 2));

  // Capture screenshot mid-turn
  const scr = await send('Page.captureScreenshot', { format: 'png' });
  if (scr && scr.data) {
    fs.writeFileSync('d:\\CODE\\F1 Game\\scratch\\aaa_smooth_cornering.png', Buffer.from(scr.data, 'base64'));
    console.log('Saved screenshot to scratch/aaa_smooth_cornering.png');
  }

  // Release keys
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyA', key: 'a', windowsVirtualKeyCode: 65 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 });

  // Check centering speed after key release
  await new Promise(r => setTimeout(r, 120));
  const centeringCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        return {
          steerAfter120ms: window.game.controls.steer.toFixed(3),
          isCenteredFast: Math.abs(window.game.controls.steer) < 0.15
        };
      })()
    `,
    returnByValue: true
  });
  console.log('CENTERING CHECK (ZERO LAG):', JSON.stringify(centeringCheck?.result?.value, null, 2));

  ws.close();
}

testSmoothHandling().catch(console.error);
