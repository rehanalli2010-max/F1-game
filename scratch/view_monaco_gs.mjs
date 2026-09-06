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

  console.log('Teleporting player car near each grandstand in Monaco...');

  const gsTests = [
    { name: 'monaco_gs2_monte_carlo', t: 0.38 },
    { name: 'monaco_gs0_rolex', t: 0.88 },
    { name: 'monaco_gs1_tag_heuer', t: 0.985 }
  ];

  for (const test of gsTests) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        g.closeModals();
        g.switchTrack('monaco');
        
        const pt = g.track.curve.getPointAt(${test.t});
        const tgt = g.track.curve.getTangentAt(${test.t}).normalize();
        
        // Position player vehicle just before the grandstand on track
        const pBody = g.playerVehicle.body;
        pBody.position.set(pt.x, pt.y + 0.04, pt.z);
        pBody.interpolatedPosition.set(pt.x, pt.y + 0.04, pt.z);
        pBody.velocity.set(0, 0, 0);
        pBody.angularVelocity.set(0, 0, 0);
        
        const yaw = Math.atan2(-tgt.x, -tgt.z);
        pBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
        pBody.interpolatedQuaternion.copy(pBody.quaternion);
        
        g.playerVehicle.currentSpeed = 0;
        g.resetCamera();
      })()`
    });

    await new Promise(r => setTimeout(r, 1000));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const pth = `C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3/${test.name}.png`;
    fs.writeFileSync(pth, Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${pth}`);
  }

  ws.close();
}

main().catch(console.error);
