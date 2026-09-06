const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(__dirname, 'edge_profile_diag');

  console.log('Launching headless Edge for launch diagnostic...');
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1920,1080',
    'about:blank'
  ], { stdio: 'ignore' });

  // Connect to CDP
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://localhost:9224/json', (res) => {
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

  const errors = [];
  const logs = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const line = `[CONSOLE ${msg.params.type.toUpperCase()}]: ` + msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      console.log(line);
      logs.push(line);
      if (msg.params.type === 'error') {
        errors.push(line);
      }
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const details = msg.params.exceptionDetails;
      const err = `[EXCEPTION]: ${details.text} at ${details.url}:${details.lineNumber}:${details.columnNumber} - ${details.exception?.description || details.exception?.value || ''}`;
      console.error(err);
      errors.push(err);
    } else if (msg.method === 'Log.entryAdded') {
      const entry = msg.params.entry;
      const line = `[LOG ${entry.level.toUpperCase()}]: ${entry.text} (${entry.url}:${entry.lineNumber})`;
      console.log(line);
      if (entry.level === 'error') errors.push(line);
    } else if (msg.method === 'Network.loadingFailed') {
      const line = `[NET FAIL]: ${msg.params.errorText} for request ${msg.params.requestId}`;
      console.error(line);
      errors.push(line);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');

  console.log('Navigating to http://localhost:3000/?t=' + Date.now());
  await send('Page.navigate', { url: `http://localhost:3000/?t=${Date.now()}` });

  await new Promise(r => setTimeout(r, 4000));

  const state = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        if (!g) return { hasGame: false };
        return {
          hasGame: true,
          track: g.track ? g.track.trackData.name : null,
          playerCarMeshVisible: g.playerCar ? g.playerCar.group.visible : null,
          triangles: g.renderer ? g.renderer.info.render.triangles : null,
          calls: g.renderer ? g.renderer.info.render.calls : null,
          isMultiplayer: g.isMultiplayer,
          sessionMode: g.session ? g.session.currentMode : null,
          cameraPos: g.camera ? { x: Math.round(g.camera.position.x), y: Math.round(g.camera.position.y), z: Math.round(g.camera.position.z) } : null
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Game evaluation state:', JSON.stringify(state.result.value, null, 2));

  // Capture screenshot
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  if (screenshot && screenshot.data) {
    const shotPath = path.join(__dirname, 'launch_diagnosed.png');
    fs.writeFileSync(shotPath, Buffer.from(screenshot.data, 'base64'));
    console.log('Screenshot saved to:', shotPath);
  }

  ws.close();
  edge.kill();

  console.log('--- SUMMARY ---');
  console.log('Total errors:', errors.length);
  if (errors.length > 0) {
    console.log('Errors:', errors);
  }
}

main().catch(err => {
  console.error('Fatal diagnostic error:', err);
  process.exit(1);
});
