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
        
        // Find all bodies near playerVehicle
        const near = [];
        for (const bo of w.bodies) {
          if (bo.id === b.id) continue;
          const dx = bo.position.x - b.position.x;
          const dz = bo.position.z - b.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 15 || bo.shapes[0]?.constructor.name === 'Plane') {
            near.push({
              id: bo.id,
              type: bo.type,
              shape: bo.shapes[0]?.constructor.name,
              pos: bo.position,
              dist: dist.toFixed(2),
              collisionFilterGroup: bo.collisionFilterGroup,
              collisionFilterMask: bo.collisionFilterMask
            });
          }
        }
        return {
          playerBodyId: b.id,
          near
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Near bodies:');
  console.log(JSON.stringify(res.result.value, null, 2));
  process.exit(0);
}
main().catch(console.error);
