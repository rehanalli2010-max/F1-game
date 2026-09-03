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

  console.log('Reloading page...');
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 2500));

  console.log('Testing full throttle run for 3.5 seconds...');
  const res = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        const g = window.game;
        if (!g) return { err: 'no game' };

        g.keys['KeyW'] = true;
        const log = [];
        for (let i = 0; i < 35; i++) {
          await new Promise(r => setTimeout(r, 100));
          const b = g.playerVehicle.body;
          const speedKmh = Math.round(b.velocity.length() * 3.6);
          log.push({
            t: (i + 1) * 100,
            speedKmh,
            x: b.position.x.toFixed(2),
            z: b.position.z.toFixed(2),
            gear: g.playerVehicle.currentGear,
            rpm: Math.round(g.playerVehicle.rpm)
          });
        }
        g.keys['KeyW'] = false;
        return log;
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Full throttle acceleration log:');
  const samples = res.result.value;
  if (Array.isArray(samples)) {
    // Print every 300ms
    for (let i = 0; i < samples.length; i += 3) {
      const s = samples[i];
      console.log('Time: ' + s.t + 'ms | Speed: ' + s.speedKmh + ' km/h | Gear: ' + s.gear + ' | RPM: ' + s.rpm + ' | Pos: (' + s.x + ', ' + s.z + ')');
    }
    const last = samples[samples.length - 1];
    console.log('Final: ' + last.t + 'ms | Speed: ' + last.speedKmh + ' km/h | Gear: ' + last.gear + ' | RPM: ' + last.rpm + ' | Pos: (' + last.x + ', ' + last.z + ')');
  } else {
    console.log(samples);
  }
  process.exit(0);
}
main().catch(console.error);
