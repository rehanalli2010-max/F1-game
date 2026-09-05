const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(__dirname, 'edge_profile_trace');

  console.log('Launching Edge for freeze stack trace...');
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], { stdio: 'ignore' });

  // Connect to CDP
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
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

  if (!wsUrl) {
    console.error('No wsUrl');
    edge.kill();
    return;
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
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      console.log(`[CONSOLE ${msg.params.type}]:`, msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[EXCEPTION]:', msg.params.exceptionDetails);
    } else if (msg.method === 'Network.requestWillBeSent') {
      console.log('[NET REQ]:', msg.params.request.url);
    } else if (msg.method === 'Network.loadingFailed') {
      console.error('[NET FAIL]:', msg.params.errorText, msg.params.request?.url);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  console.log('Navigating to http://localhost:3000/?trace=' + Date.now());
  await send('Page.navigate', { url: `http://localhost:3000/?trace=${Date.now()}` });

  await new Promise(r => setTimeout(r, 4000));
  const res = await send('Runtime.evaluate', {
    expression: 'Boolean(window.game)',
    returnByValue: true
  });
  console.log('window.game exists?', res?.result?.value);

  ws.close();
  edge.kill();
  process.exit(0);
}

main().catch(console.error);
