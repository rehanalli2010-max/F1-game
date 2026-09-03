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

  const res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        if (!g) return 'No game';
        const beforeCalls = g.renderer.info.render.calls;
        let renderError = null;
        try {
          g.renderer.render(g.scene, g.camera);
        } catch (e) {
          renderError = e.stack;
        }
        return {
          renderError,
          beforeCalls,
          afterCalls: g.renderer.info.render.calls,
          triangles: g.renderer.info.render.triangles,
          camPos: { x: g.camera.position.x, y: g.camera.position.y, z: g.camera.position.z },
          camTarget: g.cameraTargetPos ? { x: g.cameraTargetPos.x, y: g.cameraTargetPos.y, z: g.cameraTargetPos.z } : null,
          camLookTarget: g.cameraLookTarget ? { x: g.cameraLookTarget.x, y: g.cameraLookTarget.y, z: g.cameraLookTarget.z } : null,
          carGroupPos: { x: g.playerCar.group.position.x, y: g.playerCar.group.position.y, z: g.playerCar.group.position.z },
          bodyPos: { x: g.playerVehicle.body.position.x, y: g.playerVehicle.body.position.y, z: g.playerVehicle.body.position.z }
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Result:', JSON.stringify(res, null, 2));
  ws.close();
}
check().catch(console.error);
