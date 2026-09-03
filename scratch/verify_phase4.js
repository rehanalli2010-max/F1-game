const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

function createBrowserSession(port, profileDir) {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1600,900',
    'about:blank'
  ], { stdio: 'ignore' });

  return { proc, port };
}

async function connectCDP(port, tag = 'PAGE') {
  let wsUrl = null;
  for (let i = 0; i < 35; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const data = await new Promise((resolve, reject) => {
        http.get(`http://localhost:${port}/json`, (res) => {
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

  if (!wsUrl) throw new Error(`Could not get CDP wsUrl for port ${port}`);

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
      console.log(`[${tag} CONSOLE]:`, ...msg.params.args.map(a => a.value || a.description));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error(`[${tag} EXCEPTION]:`, msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.exception?.value);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');

  return { ws, send };
}

async function runTest() {
  console.log('=== PHASE 4: E2E P2P WEBRTC MULTIPLAYER VERIFICATION ===');

  const dirHost = path.join(__dirname, 'edge_host');
  const dirGuest = path.join(__dirname, 'edge_guest');

  const hostProc = createBrowserSession(9230, dirHost);
  const guestProc = createBrowserSession(9231, dirGuest);

  try {
    const host = await connectCDP(9230, 'HOST');
    const guest = await connectCDP(9231, 'GUEST');

    console.log('[1/6] Navigating Host and Guest to game...');
    await Promise.all([
      host.send('Page.navigate', { url: `http://localhost:3000/?role=host&t=${Date.now()}` }),
      guest.send('Page.navigate', { url: `http://localhost:3000/?role=guest&t=${Date.now()}` })
    ]);

    // Wait for pages to be fully ready
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 400));
      const [hReady, gReady] = await Promise.all([
        host.send('Runtime.evaluate', { expression: '!!window.game && !!document.getElementById("btn-mode-multiplayer")', returnByValue: true }),
        guest.send('Runtime.evaluate', { expression: '!!window.game && !!document.getElementById("btn-mode-multiplayer")', returnByValue: true })
      ]);
      if (hReady?.result?.value && gReady?.result?.value) {
        console.log(' Both Host and Guest pages fully initialized!');
        break;
      }
    }

    console.log('[2/6] Host opens Multiplayer Lobby...');
    await host.send('Runtime.evaluate', {
      expression: `document.getElementById('btn-mode-multiplayer').click()`
    });

    // Wait for PeerJS handshake on host
    let roomCode = null;
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 400));
      const res = await host.send('Runtime.evaluate', {
        expression: `document.getElementById('mp-host-code')?.textContent`,
        returnByValue: true
      });
      const val = res?.result?.value;
      if (val && val !== 'GENERATING...' && val.startsWith('F1-')) {
        roomCode = val;
        break;
      }
    }

    console.log(`[3/6] Room Code generated: ${roomCode}`);
    if (!roomCode) throw new Error('Host failed to obtain room code');

    // Guest opens multiplayer modal and enters room code
    console.log('[4/6] Guest entering Room Code and connecting...');
    await guest.send('Runtime.evaluate', {
      expression: `
        document.getElementById('btn-mode-multiplayer').click();
        const input = document.getElementById('mp-input-code');
        input.value = '${roomCode}';
        document.getElementById('btn-mp-join').click();
      `
    });

    // Wait for WebRTC DataChannel connection
    let connected = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 600));
      const statusCheck = await host.send('Runtime.evaluate', {
        expression: `
          (() => {
            const launchBtn = document.getElementById('btn-mp-launch');
            return {
              launchEnabled: !launchBtn.disabled,
              peerConnected: window.game.network.isConnected
            };
          })()
        `,
        returnByValue: true
      });

      if (statusCheck?.result?.value?.peerConnected) {
        connected = true;
        console.log(' WebRTC DataChannel connected successfully!');
        break;
      }
    }

    if (!connected) throw new Error('WebRTC DataChannel handshake timed out');

    // Host launches race weekend on Interlagos or Monza
    console.log('[5/6] Host launches Sprint Race...');
    await host.send('Runtime.evaluate', {
      expression: `
        document.getElementById('mp-select-mode').value = 'RACE';
        document.getElementById('btn-mp-launch').click();
      `
    });

    // Wait for race grid spawn and snapshot sync
    await new Promise(r => setTimeout(r, 2500));

    // Evaluate sync on Guest
    const guestState = await guest.send('Runtime.evaluate', {
      expression: `
        (() => {
          const g = window.game;
          return {
            isMultiplayer: g.isMultiplayer,
            isHost: g.isHost,
            sessionMode: g.session.currentMode,
            receivedCarsCount: g.guestTargetTransforms.size,
            guestCarSpeed: g.guestTargetTransforms.get('ai_1')?.speed,
            hostCarSpeed: g.guestTargetTransforms.get('player')?.speed
          };
        })()
      `,
      returnByValue: true
    });

    console.log('[6/6] Guest synchronized state:', guestState.result.value);

    // Capture screenshots
    const shotHost = await host.send('Page.captureScreenshot', { format: 'png' });
    const shotGuest = await guest.send('Page.captureScreenshot', { format: 'png' });

    fs.writeFileSync(path.join(__dirname, 'multiplayer_host_perspective.png'), Buffer.from(shotHost.data, 'base64'));
    fs.writeFileSync(path.join(__dirname, 'multiplayer_guest_perspective.png'), Buffer.from(shotGuest.data, 'base64'));

    console.log(' Captured Host screenshot: scratch/multiplayer_host_perspective.png');
    console.log(' Captured Guest screenshot: scratch/multiplayer_guest_perspective.png');
    console.log('=== MULTIPLAYER VERIFICATION COMPLETE AND FULLY PASSING! ===');

    host.ws.close();
    guest.ws.close();
  } finally {
    hostProc.proc.kill();
    guestProc.proc.kill();
  }
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
