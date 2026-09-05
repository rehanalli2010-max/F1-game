const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(__dirname, 'edge_profile_verify_all');

  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9227',
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
        http.get('http://localhost:9227/json', (res) => {
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

  const errors = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      console.log(`[BROWSER ${msg.params.type}]:`, msg.params.args.map(a => a.value || a.description).join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
      errors.push(desc);
      console.error('[EXCEPTION]:', desc);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');

  console.log('Navigating to game...');
  const t0 = Date.now();
  await send('Page.navigate', { url: 'http://localhost:3000/' });

  // Wait for game ready
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 300));
    const chk = await send('Runtime.evaluate', {
      expression: 'Boolean(window.game && window.game.playerCar && window.game.track)',
      returnByValue: true
    });
    if (chk?.result?.value) {
      console.log(`Initial game launch ready in ${Date.now() - t0}ms!`);
      ready = true;
      break;
    }
  }

  if (!ready) {
    console.error('Game did not become ready!');
    ws.close();
    edge.kill();
    process.exit(1);
  }

  // Test Track Switch to Silverstone and Spa
  const tracksToTest = ['silverstone', 'spa', 'monaco'];
  for (const trackId of tracksToTest) {
    const switchStart = Date.now();
    const switchRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          window.game.switchTrack('${trackId}');
          return { current: window.game.track.trackData.name };
        })()
      `,
      returnByValue: true
    });
    const switchTime = Date.now() - switchStart;
    console.log(`Switched to track ${switchRes?.result?.value?.current} in ${switchTime}ms!`);
  }

  // Test Car Livery Switch
  const teamsToTest = ['redbull', 'mercedes', 'mclaren'];
  for (const teamId of teamsToTest) {
    const carStart = Date.now();
    const carRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          window.game.selectCar('${teamId}');
          return { currentTeam: window.game.currentTeamId };
        })()
      `,
      returnByValue: true
    });
    const carTime = Date.now() - carStart;
    console.log(`Switched to team ${carRes?.result?.value?.currentTeam} in ${carTime}ms!`);
  }

  // Final check
  const finalState = await send('Runtime.evaluate', {
    expression: `
      (() => {
        return {
          track: window.game.track.trackData.name,
          team: window.game.currentTeamId,
          triangles: window.game.renderer.info.render.triangles,
          errorsCount: ${errors.length}
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Final Verification State:', finalState?.result?.value);

  ws.close();
  edge.kill();

  if (errors.length > 0) {
    console.error('FAILED: Found errors:', errors);
    process.exit(1);
  } else {
    console.log('SUCCESS: All track and team switches succeeded with 0 errors!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
