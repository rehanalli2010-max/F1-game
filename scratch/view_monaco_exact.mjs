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

  console.log('Connecting to Monaco...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.closeModals();
      g.switchTrack('monaco');
    })()`
  });

  await new Promise(r => setTimeout(r, 1200));

  const gsListRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const track = g.track;
      const Vector3 = g.camera.position.constructor;
      const res = [];
      track.grandstandSpecs.forEach((s, idx) => {
        const pt = track.curve.getPointAt(s.t);
        const tgt = track.curve.getTangentAt(s.t).normalize();
        const up = new Vector3(0, 1, 0);
        const normal = new Vector3().crossVectors(tgt, up).normalize();
        const outward = new Vector3().copy(normal).multiplyScalar(s.side).normalize();
        const gsPos = new Vector3().copy(pt).addScaledVector(outward, s.dist);
        res.push({
          idx,
          sponsor: s.sponsor,
          t: s.t,
          trackPt: { x: pt.x, y: pt.y, z: pt.z },
          gsPos: { x: gsPos.x, y: gsPos.y, z: gsPos.z }
        });
      });
      return res;
    })()`,
    returnByValue: true
  });

  const gsList = gsListRes.result?.value;
  console.log('Grandstands to photograph:', gsList);

  for (const gs of gsList) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const Vector3 = g.camera.position.constructor;
        
        // Put player car directly in front of the grandstand looking at it!
        const gsPos = new Vector3(${gs.gsPos.x}, ${gs.gsPos.y}, ${gs.gsPos.z});
        const trackPt = new Vector3(${gs.trackPt.x}, ${gs.trackPt.y}, ${gs.trackPt.z});
        
        // Vector from track to grandstand
        const dir = new Vector3().subVectors(gsPos, trackPt).normalize();
        
        // Place car on the edge of the track facing the grandstand
        const carPos = new Vector3().copy(trackPt).addScaledVector(dir, 4.0);
        carPos.y = g.track.getTerrainHeight(carPos.x, carPos.z) + 0.1;
        
        const pBody = g.playerVehicle.body;
        pBody.position.set(carPos.x, carPos.y, carPos.z);
        pBody.interpolatedPosition.set(carPos.x, carPos.y, carPos.z);
        pBody.velocity.set(0, 0, 0);
        pBody.angularVelocity.set(0, 0, 0);
        
        // Aim car facing the grandstand
        const lookAngle = Math.atan2(dir.x, dir.z);
        pBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), lookAngle);
        pBody.interpolatedQuaternion.copy(pBody.quaternion);
        
        g.playerVehicle.currentSpeed = 0;
        g.resetCamera();
      })()`
    });

    await new Promise(r => setTimeout(r, 1000));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const pth = `C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3/monaco_car_facing_gs${gs.idx}_${gs.sponsor.replace(/\\s+/g, '_')}.png`;
    fs.writeFileSync(pth, Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${pth}`);
  }

  ws.close();
}

main().catch(console.error);
