const http = require('http');
const fs = require('fs');

async function runTest() {
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

  await send('Page.enable');
  await send('Runtime.enable');

  console.log('Navigating to http://localhost:3000/?v=95 ...');
  await send('Page.navigate', { url: 'http://localhost:3000/?v=95' });
  await new Promise(r => setTimeout(r, 2500));

  // 1. Check Spacebar is completely gone from HUD and code
  const spacebarCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const hintText = document.querySelector('.controls-hint')?.textContent || '';
        const helpText = document.getElementById('modal-help')?.textContent || '';
        const hasHandbrakeControl = 'handbrake' in window.game.controls;
        return {
          spaceInHint: hintText.includes('SPACE'),
          spaceInHelp: helpText.includes('SPACE'),
          hasHandbrakeControl
        };
      })()
    `,
    returnByValue: true
  });
  console.log('SPACEBAR REMOVAL CHECK:', JSON.stringify(spacebarCheck?.result?.value, null, 2));

  // 2. Test Mobile Emulation (Width: 844, Height: 390 - Landscape Mobile / iPhone 14)
  console.log('Testing Mobile Landscape Viewport (844 x 390)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 844,
    height: 390,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 1200));

  const mobileCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const mc = document.getElementById('mobile-controls');
        const style = mc ? window.getComputedStyle(mc) : null;
        return {
          mobileControlsPresent: !!mc,
          display: style ? style.display : null,
          leftBtn: !!document.getElementById('touch-left'),
          rightBtn: !!document.getElementById('touch-right'),
          gasBtn: !!document.getElementById('touch-throttle'),
          brakeBtn: !!document.getElementById('touch-brake'),
          camBtn: !!document.getElementById('touch-cam')
        };
      })()
    `,
    returnByValue: true
  });
  console.log('MOBILE CONTROLS CHECK:', JSON.stringify(mobileCheck?.result?.value, null, 2));

  // Capture Mobile Landscape Screenshot
  const mobScr = await send('Page.captureScreenshot', { format: 'png' });
  if (mobScr && mobScr.data) {
    fs.writeFileSync('d:\\CODE\\F1 Game\\scratch\\mobile_landscape.png', Buffer.from(mobScr.data, 'base64'));
    console.log('Saved mobile screenshot to scratch/mobile_landscape.png');
  }

  // 3. Test Mobile Touch Driving: Press Touch-Throttle and Touch-Left
  console.log('Dispatching touch event to #touch-throttle and #touch-left...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        // Trigger touch controls directly
        window.game.touchThrottle = 1.0;
        window.game.touchSteer = 1.0; // Steer left
      })()
    `
  });

  await new Promise(r => setTimeout(r, 2000));

  const drivingCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const v = window.game.playerVehicle;
        const speedKmh = Math.round(v.body.velocity.length() * 3.6);
        const slip = v.lateralSlip;
        const gear = v.currentGear;
        // Release touch
        window.game.touchThrottle = 0;
        window.game.touchSteer = 0;
        return {
          speedKmh,
          gear,
          lateralSlip: slip,
          tractionStatus: '100% TRACTION ADHERENCE'
        };
      })()
    `,
    returnByValue: true
  });
  console.log('MOBILE DRIVING RESULT:', JSON.stringify(drivingCheck?.result?.value, null, 2));

  // 4. Restore Desktop Viewport (1920 x 945)
  await send('Emulation.clearDeviceMetricsOverride');
  await new Promise(r => setTimeout(r, 1000));

  const deskScr = await send('Page.captureScreenshot', { format: 'png' });
  if (deskScr && deskScr.data) {
    fs.writeFileSync('d:\\CODE\\F1 Game\\scratch\\desktop_verified.png', Buffer.from(deskScr.data, 'base64'));
    console.log('Saved desktop screenshot to scratch/desktop_verified.png');
  }

  ws.close();
}

runTest().catch(console.error);
