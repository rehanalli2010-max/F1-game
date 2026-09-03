const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(__dirname, 'edge_profile_mp_ui');

  console.log('Testing Multiplayer Modal UI...');
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1920,1080',
    'about:blank'
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://localhost:9225/json', (res) => {
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
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');

  await send('Page.navigate', { url: `http://localhost:3000/?t=${Date.now()}` });

  // Wait for document ready
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const r = await send('Runtime.evaluate', {
      expression: `document.readyState === 'complete' && !!document.getElementById('btn-mode-multiplayer')`,
      returnByValue: true
    });
    if (r?.result?.value === true) {
      console.log('Page ready and btn-mode-multiplayer found!');
      break;
    }
  }

  // Click on #btn-mode-multiplayer
  console.log('Opening Multiplayer Modal...');
  const clickResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.getElementById('btn-mode-multiplayer');
        if (!btn) return { error: 'btn-mode-multiplayer not found' };
        btn.click();
        const modal = document.getElementById('modal-multiplayer');
        const code = document.getElementById('mp-host-code')?.textContent;
        const trackOptions = document.getElementById('mp-select-track')?.options.length;
        return {
          modalActive: modal?.classList.contains('active'),
          hostCode: code,
          trackCount: trackOptions
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Multiplayer Modal State:', clickResult.result.value);

  await new Promise(r => setTimeout(r, 1200));

  // Check code again
  const codeCheck = await send('Runtime.evaluate', {
    expression: `document.getElementById('mp-host-code')?.textContent`,
    returnByValue: true
  });
  console.log('Host Room Code:', codeCheck.result.value);

  // Capture screenshot
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  if (screenshot && screenshot.data) {
    const shotPath = path.join(__dirname, 'multiplayer_modal.png');
    fs.writeFileSync(shotPath, Buffer.from(screenshot.data, 'base64'));
    console.log('Multiplayer modal screenshot saved to:', shotPath);
  }

  ws.close();
  edge.kill();
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
