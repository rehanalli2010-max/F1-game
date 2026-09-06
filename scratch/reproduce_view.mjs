import http from 'node:http';

async function getWsUrl() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const targets = JSON.parse(d);
        const t = targets.find(x => x.type === 'page' && x.url && x.url.includes('3000')) || targets[0];
        resolve(t.webSocketDebuggerUrl);
      });
    });
  });
}

async function run() {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise(resolve => {
    const reqId = id++;
    const handler = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === reqId) {
        ws.removeEventListener('message', handler);
        resolve(d.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: reqId, method, params }));
  });
  await new Promise(r => ws.onopen = r);

  // Position the car and camera EXACTLY where the user took the screenshot!
  // In the user's screenshot, player is heading down Degner towards underpass
  const viewRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.395;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 0);
      g.playerCar.setPositionAndRotation(
        { x: pt.x, y: pt.y + 0.04, z: pt.z },
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
      );
      // Place chase camera
      g.camera.position.set(pt.x - tgt.x * 12, pt.y + 3.0, pt.z - tgt.z * 12);
      g.camera.lookAt(pt.x + tgt.x * 40, pt.y + 1.0, pt.z + tgt.z * 40);
      return { pt, tgt, yaw };
    })()`,
    returnByValue: true
  });

  console.log('Placed at t=0.395:', viewRes.result?.value);
  await new Promise(r => setTimeout(r, 600));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const brainDir = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';
  const fs = await import('node:fs');
  fs.writeFileSync(`${brainDir}/reproduce_user_view.png`, Buffer.from(shot.data, 'base64'));
  console.log('Saved reproduce_user_view.png');

  ws.close();
}

run().catch(console.error);
