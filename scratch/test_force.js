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

  const res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        try {
          const g = window.game;
          const b = g.playerVehicle.body;
          const v = g.playerVehicle;

          const steps = [];
          for (let step = 0; step < 10; step++) {
            g.controls.throttle = 1.0;
            const dt = 1 / 60;
            const preVel = { x: b.velocity.x, y: b.velocity.y, z: b.velocity.z, len: b.velocity.length() };
            g.physics.updateVehicle(v, g.controls, dt, null);
            const appliedForce = { x: b.force.x, y: b.force.y, z: b.force.z, len: b.force.length() };
            g.physics.step(dt);
            const postVel = { x: b.velocity.x, y: b.velocity.y, z: b.velocity.z, len: b.velocity.length() };
            steps.push({
              step,
              preVel,
              appliedForce,
              postVel,
              pos: { x: b.position.x, y: b.position.y, z: b.position.z },
              gear: v.currentGear,
              throttle: g.controls.throttle
            });
          }
          return steps;
        } catch (err) {
          return { error: err.message, stack: err.stack };
        }
      })()
    `,
    returnByValue: true
  });

  console.log('Force integration test:');
  console.log(JSON.stringify(res.result.value, null, 2));
  process.exit(0);
}
main().catch(console.error);
