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

  console.log('Connecting to Monaco and capturing driving views of all 5 grandstands...');

  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.closeModals();
      g.switchTrack('monaco');
    })()`
  });

  await new Promise(r => setTimeout(r, 1500));

  // We can position the car at each grandstand t by overriding the player body in game loop
  const targets = [
    { name: 'monaco_fixed_gs_a_sainte_devote', t: 0.08, desc: 'Approaching Sainte-Devote Grandstand A' },
    { name: 'monaco_fixed_gs_b_casino_square', t: 0.42, desc: 'Entering Casino Square Grandstand B' },
    { name: 'monaco_fixed_gs_k_harbor_quay', t: 0.80, desc: 'Racing along Harbor Quay Grandstand K' },
    { name: 'monaco_fixed_gs_l_swimming_pool', t: 0.88, desc: 'Approaching Swimming Pool Grandstand L' },
    { name: 'monaco_fixed_gs_t_pit_straight', t: 0.96, desc: 'Rounding Rascasse towards Pit Grandstand T' }
  ];

  for (const tg of targets) {
    console.log(`Driving to: ${tg.desc}...`);
    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const track = g.track;
        const curve = track.curve;
        const Vector3 = curve.points[0].constructor;
        
        const pt = curve.getPointAt(${tg.t});
        const tgt = curve.getTangentAt(${tg.t}).normalize();
        
        const pBody = g.playerVehicle.body;
        pBody.position.set(pt.x, pt.y + 0.05, pt.z);
        pBody.interpolatedPosition.set(pt.x, pt.y + 0.05, pt.z);
        pBody.velocity.set(tgt.x * 25, 0, tgt.z * 25);
        pBody.angularVelocity.set(0, 0, 0);
        
        const yaw = Math.atan2(-tgt.x, -tgt.z);
        pBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
        pBody.interpolatedQuaternion.copy(pBody.quaternion);
        
        g.playerVehicle.currentSpeed = 90;
        g.resetCamera();
      })()`
    });

    // Wait a couple frames for camera to align with car velocity
    await new Promise(r => setTimeout(r, 600));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const pth = `C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3/${tg.name}.png`;
    fs.writeFileSync(pth, Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${pth}`);
  }

  ws.close();
}

main().catch(console.error);
