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
          if (!g) return { err: 'no game' };
          const b = g.playerVehicle.body;
          const v = g.playerVehicle;

          // Get forward from quaternion
          const q = b.quaternion;
          // rotate (0, 0, 1) by q
          const fx = 2 * (q.x * q.z + q.w * q.y);
          const fy = 2 * (q.y * q.z - q.w * q.x);
          const fz = 1 - 2 * (q.x * q.x + q.y * q.y);

          return {
            pos: { x: b.position.x, y: b.position.y, z: b.position.z },
            vel: { x: b.velocity.x, y: b.velocity.y, z: b.velocity.z },
            forward: { x: fx, y: fy, z: fz },
            force: { x: b.force.x, y: b.force.y, z: b.force.z },
            throttle: g.controls.throttle,
            gear: v.currentGear,
            reverseBlocked: v.reverseBlocked
          };
        } catch (err) {
          return { error: err.message, stack: err.stack };
        }
      })()
    `,
    returnByValue: true
  });

  console.log('Diagnostic result:');
  console.log(JSON.stringify(res.result.value, null, 2));
  process.exit(0);
}
main().catch(console.error);
