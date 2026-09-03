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
        
        return {
          bodies: w.bodies.map(bo => ({
            id: bo.id,
            mass: bo.mass,
            type: bo.type,
            pos: bo.position,
            shapes: bo.shapes.map(s => ({ type: s.constructor.name, boundingSphereRadius: s.boundingSphereRadius }))
          })),
          constraints: w.constraints.map(c => ({
            type: c.constructor.name,
            bodyA: c.bodyA.id,
            bodyB: c.bodyB.id
          })),
          contactmaterials: w.contactmaterials.length
        };
      })()
    `,
    returnByValue: true
  });

  console.log('World structure:');
  console.log(JSON.stringify(res.result.value, null, 2));
  process.exit(0);
}
main().catch(console.error);
