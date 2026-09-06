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

async function run() {
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

  // 1. Same position as bug screenshot: approaching t=0.435 down Malmedy
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.closeModals();
      g.switchTrack('spa');
      g.switchCar('ferrari');
      
      const track = g.track;
      const playerT = 0.435;
      const pt = track.curve.getPointAt(playerT);
      const tgt = track.curve.getTangentAt(playerT);
      const yaw = Math.atan2(tgt.x, tgt.z);
      
      g.physics.resetVehicle(g.playerVehicle, pt.x, (pt.y || 0) + 0.04, pt.z, yaw, 35);
    })()`
  });

  await new Promise(r => setTimeout(r, 800));

  let shot = await send('Page.captureScreenshot', { format: 'png' });
  let outPath = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3/spa_fixed_grandstand_clear_of_track.png';
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('Saved spa_fixed_grandstand_clear_of_track.png');

  // 2. View of the fixed Pirelli Grandstand at t=0.41 on Kemmel Straight
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const track = g.track;
      const playerT = 0.405;
      const pt = track.curve.getPointAt(playerT);
      const tgt = track.curve.getTangentAt(playerT);
      const yaw = Math.atan2(tgt.x, tgt.z);
      
      g.physics.resetVehicle(g.playerVehicle, pt.x, (pt.y || 0) + 0.04, pt.z, yaw, 55);
    })()`
  });

  await new Promise(r => setTimeout(r, 800));

  shot = await send('Page.captureScreenshot', { format: 'png' });
  outPath = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3/spa_fixed_kemmel_outside_grandstand.png';
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log('Saved spa_fixed_kemmel_outside_grandstand.png');

  ws.close();
}

run().catch(console.error);
