const http = require('http');

async function main() {
  const pages = await new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let str = '';
      res.on('data', d => str += d);
      res.on('end', () => resolve(JSON.parse(str)));
    }).on('error', reject);
  });

  const page = pages.find(p => p.url.includes('3000')) || pages[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let msgId = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  };
  await new Promise(r => ws.onopen = r);

  console.log('Testing 8-second high-speed run...');
  const res = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        const g = window.game;
        g.keys['KeyW'] = true;
        const log = [];
        for (let i = 0; i < 80; i++) {
          await new Promise(r => setTimeout(r, 100));
          const b = g.playerVehicle.body;
          const speedKmh = Math.round(b.velocity.length() * 3.6);
          log.push({
            t: (i + 1) * 100,
            speedKmh,
            x: b.position.x.toFixed(2),
            z: b.position.z.toFixed(2),
            gear: g.playerVehicle.currentGear,
            rpm: Math.round(g.playerVehicle.rpm),
            drs: g.playerVehicle.drsActive
          });
        }
        g.keys['KeyW'] = false;
        return log;
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  const samples = res.result.value;
  if (Array.isArray(samples)) {
    for (let i = 0; i < samples.length; i += 5) {
      const s = samples[i];
      console.log('Time: ' + s.t + 'ms | Speed: ' + s.speedKmh + ' km/h | Gear: ' + s.gear + ' | RPM: ' + s.rpm + ' | DRS: ' + s.drs + ' | Pos: (' + s.x + ', ' + s.z + ')');
    }
    const last = samples[samples.length - 1];
    console.log('Final: ' + last.t + 'ms | Speed: ' + last.speedKmh + ' km/h | Gear: ' + last.gear + ' | RPM: ' + last.rpm + ' | DRS: ' + last.drs + ' | Pos: (' + last.x + ', ' + last.z + ')');
  }
  process.exit(0);
}
main().catch(console.error);
