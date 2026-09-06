import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

async function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const arr = JSON.parse(data);
        const target = arr.find(x => x.type === 'page') || arr[0];
        resolve(target ? target.webSocketDebuggerUrl : null);
      });
    }).on('error', reject);
  });
}

async function main() {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id).resolve(d);
      pending.delete(d.id);
    }
  };
  const send = (m, p = {}) => new Promise(resolve => {
    const id = msgId++;
    pending.set(id, { resolve });
    ws.send(JSON.stringify({ id, method: m, params: p }));
  });
  await new Promise(r => ws.onopen = r);

  const evalCode = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return r.result ? r.result.result : null;
  };

  // Grandstand 1: t = 0.14 (near Eau Rouge / downhill entry)
  // Grandstand 2: t = 0.50 (near Pouhon)
  // Grandstand 3: t = 0.75 (near Stavelot)
  const views = [
    { name: 'eau_rouge_entry', t: 0.13, file: 'spa_grandstand_eau_rouge.png' },
    { name: 'pouhon_hill', t: 0.49, file: 'spa_grandstand_pouhon.png' },
    { name: 'stavelot_sweeper', t: 0.74, file: 'spa_grandstand_stavelot.png' }
  ];

  for (const v of views) {
    await evalCode(`(() => {
      const g = window.game;
      const pt = g.track.curve.getPointAt(${v.t});
      const tgt = g.track.curve.getTangentAt(${v.t}).normalize();
      const yaw = Math.atan2(tgt.x, tgt.z);
      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 15);
      g.resetCamera();
    })()`);
    await new Promise(r => setTimeout(r, 600));
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, v.file), Buffer.from(shot.result.data, 'base64'));
    console.log(`Saved ${v.file}`);
  }

  ws.close();
}

main().catch(console.error);
