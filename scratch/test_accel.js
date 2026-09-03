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
  console.log('Targeting page:', page.title, page.url);
  const wsUrl = page.webSocketDebuggerUrl;
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

  // Evaluate telemetry before and during acceleration
  const res = await send('Runtime.evaluate', {
    expression: `
      (async () => {
        const g = window.game;
        if (!g) return { error: 'no game' };

        // Press 'w'
        g.keys['KeyW'] = true;

        const samples = [];
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 100));
          const b = g.playerVehicle.body;
          const pos = { x: b.position.x.toFixed(3), y: b.position.y.toFixed(3), z: b.position.z.toFixed(3) };
          const vel = { x: b.velocity.x.toFixed(3), y: b.velocity.y.toFixed(3), z: b.velocity.z.toFixed(3), len: b.velocity.length().toFixed(2) };
          const gear = g.playerVehicle.currentGear;
          const rpm = Math.round(g.playerVehicle.rpm);
          const throttle = g.controls.throttle.toFixed(2);
          const pitch = g.playerCar.currentPitch.toFixed(4);
          const roll = g.playerCar.currentRoll.toFixed(4);
          samples.push({ t: i * 100, pos, vel, gear, rpm, throttle, pitch, roll });
        }

        g.keys['KeyW'] = false;
        return samples;
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Telemetry samples:');
  console.log(JSON.stringify(res.result.value, null, 2));
  process.exit(0);
}

main().catch(console.error);
