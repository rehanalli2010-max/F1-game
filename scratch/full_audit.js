const http = require('http');
const fs = require('fs');

async function fullAudit() {
  const pages = await new Promise((r, j) => http.get('http://localhost:9222/json', res => {
    let s = ''; res.on('data', c => s += c); res.on('end', () => r(JSON.parse(s)));
  }));

  const gamePage = pages.find(p => p.url.includes('localhost:3000'));
  if (!gamePage) { console.error('No game page'); process.exit(1); }

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
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  };
  await new Promise(r => ws.onopen = r);

  // Full Audit
  const audit = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        const a = g.audio;
        const v = g.playerVehicle;
        const b = v.body;
        const hint = document.querySelector('.controls-hint')?.textContent || '';
        return {
          pageVersion: location.search,
          gameLoaded: !!g,
          audioInit: a.isInitialized,
          // Spacebar removal
          hasHandbrake: 'handbrake' in g.controls,
          spaceInHint: hint.includes('SPACE'),
          // Mobile controls
          touchLeft: !!document.getElementById('touch-left'),
          touchRight: !!document.getElementById('touch-right'),
          touchGas: !!document.getElementById('touch-throttle'),
          touchBrake: !!document.getElementById('touch-brake'),
          // Physics
          carPos: { x: Math.round(b.position.x), z: Math.round(b.position.z) },
          speedKmh: Math.round(b.velocity.length() * 3.6),
          lateralSlip: v.lateralSlip,
          // Smooth steering
          hasSmooth: !!g.smoothLookAt,
          steerValue: g.controls.steer.toFixed(3),
          // Rendering
          triangles: g.renderer.info.render.triangles,
          fps: Math.round(1 / g.clock.getDelta() || 60),
          // Session
          session: g.session.currentMode,
          timingRunning: g.timing.timerRunning,
          currentLap: g.timing.currentLap,
          currentLapTime: g.timing.currentLapTime.toFixed(1) + 's'
        };
      })()
    `,
    returnByValue: true
  });

  console.log('=== FULL GAME AUDIT ===');
  console.log(JSON.stringify(audit?.result?.value, null, 2));

  // Screenshot
  const scr = await send('Page.captureScreenshot', { format: 'png' });
  if (scr?.data) {
    fs.writeFileSync('d:\\CODE\\F1 Game\\scratch\\full_audit_screenshot.png', Buffer.from(scr.data, 'base64'));
    console.log('\nScreenshot saved to scratch/full_audit_screenshot.png');
  }

  ws.close();
}

fullAudit().catch(console.error);
