import http from 'node:http';

async function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)[0].webSocketDebuggerUrl));
    }).on('error', reject);
  });
}

async function main() {
  const ws = new WebSocket(await getWsUrl());
  let msgId = 1;
  const pending = new Map();
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id).resolve(d.result);
      pending.delete(d.id);
    }
  };
  const send = (m, p = {}) => new Promise(resolve => {
    const id = msgId++;
    pending.set(id, { resolve });
    ws.send(JSON.stringify({ id, method: m, params: p }));
  });
  await new Promise(r => ws.onopen = r);

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const V3 = g.playerCar.group.position.constructor;
      const pts = [
        new V3(140, 0, -140),
        new V3(140, 0, -30),
        new V3(140, 0, 50),
        new V3(155, 0, 115),
        new V3(135, 0, 175),
        new V3(85, 0, 215),
        new V3(30, 0, 210),
        new V3(15, 0, 165),
        new V3(35, 0, 115),
        new V3(-20, 0, 50),
        new V3(-85, 0, -25),
        new V3(-150, 0, -100),
        new V3(-200, 0, -145),
        new V3(-245, 0, -105),
        new V3(-235, 0, -35),
        new V3(-195, 0, 40),
        new V3(-145, 0, 115),
        new V3(-85, 0, 190),
        new V3(-15, 0, 245),
        new V3(55, 0, 275),
        new V3(115, 0, 270),
        new V3(170, 0, 230),
        new V3(230, 0, 150),
        new V3(275, 0, 50),
        new V3(290, 0, -65),
        new V3(270, 0, -165),
        new V3(215, 0, -225),
        new V3(165, 0, -240),
        new V3(120, 0, -200)
      ];
      const curve = new g.track.curve.constructor(pts, true, 'catmullrom', 0.2);
      const slots = [];
      for (let s = 1; s <= 10; s++) {
        const t = (1.0 - (s * 0.0065)) % 1.0;
        const p = curve.getPointAt(t);
        const tgt = curve.getTangentAt(t);
        slots.push({ slot: s, t: Number(t.toFixed(4)), x: Number(p.x.toFixed(1)), z: Number(p.z.toFixed(1)), tanX: Number(tgt.x.toFixed(2)), tanZ: Number(tgt.z.toFixed(2)) });
      }
      return slots;
    })()`,
    returnByValue: true
  });
  console.log(JSON.stringify(res.result.value, null, 2));
  ws.close();
}
main();
