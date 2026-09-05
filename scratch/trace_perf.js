const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(__dirname, 'edge_profile_perf');

  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9226',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://localhost:9226/json', (res) => {
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
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      console.log(`[CONSOLE ${msg.params.type}]:`, msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[EXCEPTION]:', msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Profiler.enable');
  await send('Profiler.start');

  const navStart = Date.now();
  await send('Page.navigate', { url: `http://localhost:3000/?perf=${Date.now()}` });

  // Wait for game to be initialized
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    const check = await send('Runtime.evaluate', {
      expression: 'Boolean(window.game && window.game.playerCar)',
      returnByValue: true
    });
    if (check?.result?.value) {
      console.log(`Game ready after ${Date.now() - navStart} ms!`);
      break;
    }
  }

  const profile = await send('Profiler.stop');
  
  // Find top time-consuming functions
  const samples = profile.profile.samples;
  const timeDeltas = profile.profile.timeDeltas;
  const nodes = profile.profile.nodes;
  const nodeMap = new Map();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const totalTimePerNode = new Map();
  let totalTime = 0;
  for (let i = 0; i < samples.length; i++) {
    const nodeId = samples[i];
    const dt = timeDeltas[i]; // in microseconds
    totalTime += dt;
    totalTimePerNode.set(nodeId, (totalTimePerNode.get(nodeId) || 0) + dt);
  }

  const sorted = Array.from(totalTimePerNode.entries())
    .map(([nodeId, timeUs]) => {
      const node = nodeMap.get(nodeId);
      const fn = node?.callFrame?.functionName || '(anonymous)';
      const url = path.basename(node?.callFrame?.url || '');
      const line = node?.callFrame?.lineNumber;
      return { fn, url, line, timeMs: Math.round(timeUs / 1000) };
    })
    .filter(x => x.timeMs > 20)
    .sort((a, b) => b.timeMs - a.timeMs);

  console.log('Top CPU-consuming functions during startup:');
  console.table(sorted.slice(0, 20));

  ws.close();
  edge.kill();
  process.exit(0);
}

main().catch(console.error);
