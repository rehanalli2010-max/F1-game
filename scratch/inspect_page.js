const { spawn } = require('child_process');
const http = require('http');

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = 'd:\\CODE\\F1 Game\\scratch\\edge_profile';
  
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], { stdio: 'ignore' });

  console.log('Spawned Edge headless process...');

  // Wait for remote debugging port to be ready
  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
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
    console.error('Failed to get WebSocket Debugger URL from Edge');
    edge.kill();
    process.exit(1);
  }

  console.log('Connected to CDP at:', wsUrl);
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

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      console.log(`[BROWSER CONSOLE ${msg.params.type.toUpperCase()}]:`, ...msg.params.args.map(a => a.value || a.description));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]:', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.url);
    }
  };

  await new Promise(r => ws.onopen = r);
  console.log('WebSocket connection opened. Enabling CDP domains...');

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Console.enable');

  console.log('Navigating to http://localhost:3000/?v=32 ...');
  await send('Page.navigate', { url: 'http://localhost:3000/?v=32' });

  // Wait 4 seconds for all modules and scripts to load & execute
  await new Promise(r => setTimeout(r, 4000));

  // Evaluate window.game and any DOM elements
  const evalResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        if (!g) return { hasGame: false };
        const p = g.playerCar?.group?.position;
        const c = g.camera?.position;
        const info = g.renderer?.info;
        return {
          hasGame: true,
          carPos: p ? { x: p.x, y: p.y, z: p.z } : null,
          camPos: c ? { x: c.x, y: c.y, z: c.z } : null,
          camTarget: g.cameraTargetPos ? { x: g.cameraTargetPos.x, y: g.cameraTargetPos.y, z: g.cameraTargetPos.z } : null,
          camMode: g.cameraMode,
          sceneChildren: g.scene?.children?.length,
          renderInfo: info ? {
            calls: info.render.calls,
            triangles: info.render.triangles,
            lines: info.render.lines
          } : null,
          speedKmh: document.getElementById('hud-speed')?.textContent,
          canvasSize: { w: g.renderer?.domElement?.width, h: g.renderer?.domElement?.height },
          isCarVisible: g.playerCar?.group?.visible
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Page Evaluation Result:', JSON.stringify(evalResult?.result?.value, null, 2));

  // Capture screenshot as base64 and save to scratch
  const scr = await send('Page.captureScreenshot', { format: 'png' });
  if (scr && scr.data) {
    const fs = require('fs');
    fs.writeFileSync('d:\\CODE\\F1 Game\\scratch\\live_game_capture.png', Buffer.from(scr.data, 'base64'));
    console.log('Captured screenshot to scratch/live_game_capture.png (bytes: ' + scr.data.length + ')');
  }

  ws.close();
  edge.kill();
  console.log('Diagnosis completed successfully.');
}

main().catch(console.error);
