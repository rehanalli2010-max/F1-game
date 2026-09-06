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

  const photoList = [
    // Monaco
    { track: 'monaco', name: 'monaco_fixed_gs_sainte_devote', gsIdx: 0, desc: 'Monaco Sainte-Devote Grandstand A' },
    { track: 'monaco', name: 'monaco_fixed_gs_casino_square', gsIdx: 1, desc: 'Monaco Casino Square Grandstand B' },
    { track: 'monaco', name: 'monaco_fixed_gs_harbor_quay', gsIdx: 2, desc: 'Monaco Port Hercule Harbor Quay Grandstand K' },
    { track: 'monaco', name: 'monaco_fixed_gs_swimming_pool', gsIdx: 3, desc: 'Monaco Swimming Pool Grandstand L' },
    { track: 'monaco', name: 'monaco_fixed_gs_pit_straight', gsIdx: 4, desc: 'Monaco Pit Straight Grandstand T' },
    // Spa
    { track: 'spa', name: 'spa_fixed_raidillon_plateau', gsIdx: 1, desc: 'Spa Raidillon Leveled Viewing Plateau' },
    { track: 'spa', name: 'spa_fixed_kemmel_arena', gsIdx: 2, desc: 'Spa Kemmel Straight Les Combes Arena' },
    // Monza
    { track: 'monza', name: 'monza_fixed_prima_variante', gsIdx: 1, desc: 'Monza Prima Variante Rettifilo Grandstand' },
    { track: 'monza', name: 'monza_fixed_parabolica', gsIdx: 4, desc: 'Monza Curva Parabolica Grandstand' },
    // Silverstone
    { track: 'silverstone', name: 'silverstone_fixed_hamilton_straight', gsIdx: 0, desc: 'Silverstone Hamilton Pit Straight Grandstand' },
    { track: 'silverstone', name: 'silverstone_fixed_maggotts_becketts', gsIdx: 5, desc: 'Silverstone Maggotts & Becketts Grandstand' }
  ];

  let currentTrack = '';

  for (const item of photoList) {
    if (currentTrack !== item.track) {
      currentTrack = item.track;
      console.log(`\nSwitching to track: ${currentTrack.toUpperCase()}`);
      await send('Runtime.evaluate', {
        expression: `(() => {
          const g = window.game;
          g.closeModals();
          g.switchTrack('${currentTrack}');
        })()`
      });
      await new Promise(r => setTimeout(r, 1200));
    }

    console.log(`Positioning camera for: ${item.desc}...`);
    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const track = g.track;
        const spec = track.grandstandSpecs[${item.gsIdx}];
        const curve = track.curve;
        const Vector3 = curve.points[0].constructor;
        
        const pt = curve.getPointAt(spec.t);
        const tgt = curve.getTangentAt(spec.t).normalize();
        const up = new Vector3(0, 1, 0);
        const normal = new Vector3().crossVectors(tgt, up).normalize();
        const outward = new Vector3().copy(normal).multiplyScalar(spec.side).normalize();
        const xBasis = new Vector3().crossVectors(up, outward).normalize();
        
        const gsPos = new Vector3().copy(pt).addScaledVector(outward, spec.dist);
        
        // Put player car right on the track adjacent to the grandstand, looking at it!
        // Place car at distance outward * (barrierDistance - 2m) facing the grandstand
        const carTrackPos = new Vector3().copy(pt).addScaledVector(outward, (track.barrierDistance - 3.5));
        const carY = track.getTerrainHeight(carTrackPos.x, carTrackPos.z) + 0.04;
        
        const pBody = g.playerVehicle.body;
        pBody.position.set(carTrackPos.x, carY, carTrackPos.z);
        pBody.interpolatedPosition.set(carTrackPos.x, carY, carTrackPos.z);
        pBody.velocity.set(0, 0, 0);
        pBody.angularVelocity.set(0, 0, 0);
        
        // Face the grandstand
        const dir = new Vector3().subVectors(gsPos, carTrackPos).normalize();
        const yaw = Math.atan2(dir.x, dir.z);
        pBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
        pBody.interpolatedQuaternion.copy(pBody.quaternion);
        
        g.playerVehicle.currentSpeed = 0;
        g.resetCamera();
      })()`
    });

    await new Promise(r => setTimeout(r, 1000));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const pth = `C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3/${item.name}.png`;
    fs.writeFileSync(pth, Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${pth}`);
  }

  ws.close();
}

main().catch(console.error);
