const http = require('http');
const fs = require('fs');

async function evaluateLive() {
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

  // 1. Audit Spacebar Removal & Mobile Elements
  const audit = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const hint = document.querySelector('.controls-hint')?.textContent || '';
        const help = document.getElementById('modal-help')?.textContent || '';
        const g = window.game;
        const mc = document.getElementById('mobile-controls');
        return {
          spaceInControlsHint: hint.includes('SPACE') || hint.includes('Handbrake'),
          spaceInHelpDialog: help.includes('SPACE') || help.includes('Powerslide'),
          hasHandbrakeInControls: g && 'handbrake' in g.controls,
          mobileControlsPresent: !!mc,
          touchLeftBtn: !!document.getElementById('touch-left'),
          touchRightBtn: !!document.getElementById('touch-right'),
          touchGasBtn: !!document.getElementById('touch-throttle'),
          touchBrakeBtn: !!document.getElementById('touch-brake'),
          touchCamBtn: !!document.getElementById('touch-cam'),
          touchResetBtn: !!document.getElementById('touch-reset'),
          carPos: g ? { x: Math.round(g.playerVehicle.body.position.x), z: Math.round(g.playerVehicle.body.position.z) } : null,
          speedKmh: g ? Math.round(g.playerVehicle.body.velocity.length() * 3.6) : null
        };
      })()
    `,
    returnByValue: true
  });
  console.log('AUDIT REPORT:\n', JSON.stringify(audit?.result?.value, null, 2));

  // 2. Capture Desktop Screenshot
  const deskScr = await send('Page.captureScreenshot', { format: 'png' });
  if (deskScr && deskScr.data) {
    fs.writeFileSync('d:\\CODE\\F1 Game\\scratch\\final_desktop.png', Buffer.from(deskScr.data, 'base64'));
    console.log('Saved desktop screenshot to scratch/final_desktop.png');
  }

  // 3. Emulate Mobile Viewport (412 x 820 - Mobile Portrait)
  console.log('Emulating Mobile Portrait Viewport (412 x 820)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 412,
    height: 820,
    deviceScaleFactor: 2,
    mobile: true
  });

  await new Promise(r => setTimeout(r, 600));

  const mobScr = await send('Page.captureScreenshot', { format: 'png' });
  if (mobScr && mobScr.data) {
    fs.writeFileSync('d:\\CODE\\F1 Game\\scratch\\final_mobile_portrait.png', Buffer.from(mobScr.data, 'base64'));
    console.log('Saved mobile portrait screenshot to scratch/final_mobile_portrait.png');
  }

  // 4. Emulate Mobile Landscape (844 x 390 - Mobile Landscape)
  console.log('Emulating Mobile Landscape Viewport (844 x 390)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 844,
    height: 390,
    deviceScaleFactor: 2,
    mobile: true
  });

  await new Promise(r => setTimeout(r, 600));

  const mobLandScr = await send('Page.captureScreenshot', { format: 'png' });
  if (mobLandScr && mobLandScr.data) {
    fs.writeFileSync('d:\\CODE\\F1 Game\\scratch\\final_mobile_landscape.png', Buffer.from(mobLandScr.data, 'base64'));
    console.log('Saved mobile landscape screenshot to scratch/final_mobile_landscape.png');
  }

  // 5. Restore Desktop Viewport
  await send('Emulation.clearDeviceMetricsOverride');
  console.log('Restored desktop viewport.');

  ws.close();
}

evaluateLive().catch(console.error);
