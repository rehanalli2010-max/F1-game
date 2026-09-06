import http from 'node:http';
import fs from 'node:fs';

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

async function main() {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();

  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id).resolve(d.result);
      pending.delete(d.id);
    }
  };

  const send = (method, params = {}) => new Promise(resolve => {
    const reqId = id++;
    pending.set(reqId, { resolve });
    ws.send(JSON.stringify({ id: reqId, method, params }));
  });

  await new Promise(r => ws.onopen = r);

  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.closeModals();
      g.switchTrack('monaco');
    })()`
  });

  await new Promise(r => setTimeout(r, 1200));

  // Capture Grandstand B at Casino Square (t = 0.44)
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const track = g.track;
      const spec = track.grandstandSpecs[1]; // Casino Square
      const curve = track.curve;
      const Vector3 = curve.points[0].constructor;
      
      const pt = curve.getPointAt(spec.t);
      const tgt = curve.getTangentAt(spec.t).normalize();
      const up = new Vector3(0, 1, 0);
      const normal = new Vector3().crossVectors(tgt, up).normalize();
      const outward = new Vector3().copy(normal).multiplyScalar(spec.side).normalize();
      
      const gsPos = new Vector3().copy(pt).addScaledVector(outward, spec.dist);
      
      // Place car on opposite edge of track facing grandstand B
      const carPos = new Vector3().copy(pt).addScaledVector(outward, -2.0);
      const carY = track.getTerrainHeight(carPos.x, carPos.z) + 0.04;
      
      const pBody = g.playerVehicle.body;
      pBody.position.set(carPos.x, carY, carPos.z);
      pBody.interpolatedPosition.set(carPos.x, carY, carPos.z);
      pBody.velocity.set(0, 0, 0);
      pBody.angularVelocity.set(0, 0, 0);
      
      const dir = new Vector3().subVectors(gsPos, carPos).normalize();
      const yaw = Math.atan2(dir.x, dir.z);
      pBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
      pBody.interpolatedQuaternion.copy(pBody.quaternion);
      
      g.playerVehicle.currentSpeed = 0;
      g.resetCamera();
    })()`
  });

  await new Promise(r => setTimeout(r, 1000));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3/monaco_fixed_gs_casino_square_close.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved close-up screenshot of Casino Square grandstand!');

  ws.close();
}

main().catch(console.error);
