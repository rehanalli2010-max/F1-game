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
        const w = window.game.physics.world;
        const b = window.game.playerVehicle.body;
        
        // Find ground plane body
        const ground = w.bodies.find(bo => bo.shapes[0]?.constructor.name === 'Plane');
        let groundRemoved = false;
        if (ground) {
          w.removeBody(ground);
          groundRemoved = true;
        }

        b.velocity.set(0, 0, 0);
        b.force.set(0, 0, 0);
        b.applyForce(new b.force.constructor(0, 0, 40000));
        
        w.step(1 / 60);
        
        const vAfter = { x: b.velocity.x, y: b.velocity.y, z: b.velocity.z, len: b.velocity.length() };

        return {
          groundRemoved,
          vAfter
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Without ground plane:');
  console.log(JSON.stringify(res.result.value, null, 2));
  process.exit(0);
}
main().catch(console.error);
