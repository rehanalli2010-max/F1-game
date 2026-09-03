const http = require('http');

async function check() {
  const pages = await new Promise((r, j) => http.get('http://localhost:9222/json', res => {
    let s = ''; res.on('data', c => s += c); res.on('end', () => r(JSON.parse(s)));
  }));
  const p = pages.find(p => p.url.includes('localhost:3000')) || pages[0];
  const ws = new WebSocket(p.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  
  let id = 1;
  const send = (method, params = {}) => new Promise(res => {
    const curId = id++;
    const handler = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === curId) {
        ws.removeEventListener('message', handler);
        res(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  // Reset the vehicle and step through line by line
  const res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        const v = g.playerVehicle;
        const body = v.body;

        // Reset to clean values
        g.physics.resetVehicle(v, 120, 0.35, -150, 0, 0);

        const checkPoint = (label) => {
          return {
            label,
            pos: { x: body.position.x, y: body.position.y, z: body.position.z },
            vel: { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z },
            quat: { x: body.quaternion.x, y: body.quaternion.y, z: body.quaternion.z, w: body.quaternion.w }
          };
        };

        const trace = [];
        trace.push(checkPoint('After resetVehicle'));

        g.updateControls(0.016);
        trace.push(checkPoint('After updateControls'));

        g.physics.updateVehicle(v, g.controls, 0.016, g.audio);
        trace.push(checkPoint('After updateVehicle'));

        g.physics.step(0.016);
        trace.push(checkPoint('After physics.step'));

        return trace;
      })()
    `,
    returnByValue: true
  });

  console.log('TRACE RESULT:\n', JSON.stringify(res?.result?.value, null, 2));
  ws.close();
}

check().catch(console.error);
