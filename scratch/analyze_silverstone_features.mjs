import http from 'node:http';

async function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const targets = JSON.parse(data);
          const t = targets.find(item => item.url && item.url.includes('3000')) || targets[0];
          resolve(t.webSocketDebuggerUrl);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);

  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

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

      const curve = new g.track.curve.constructor(pts, true, 'catmullrom', 0.5);
      const totalLen = curve.getLength();

      const keyPoints = [
        { name: 'Hamilton Straight (Grid)', p: new V3(140, 0, -140) },
        { name: 'Hamilton Straight (DRS)', p: new V3(140, 0, -30) },
        { name: 'Abbey (Turn 1)', p: new V3(155, 0, 115) },
        { name: 'Village / Loop', p: new V3(30, 0, 210) },
        { name: 'Wellington Straight', p: new V3(-85, 0, -25) },
        { name: 'Brooklands / Luffield', p: new V3(-245, 0, -105) },
        { name: 'Copse (Turn 9)', p: new V3(-85, 0, 190) },
        { name: 'Maggotts / Becketts', p: new V3(115, 0, 270) },
        { name: 'Hangar Straight', p: new V3(275, 0, 50) },
        { name: 'Stowe (Turn 15)', p: new V3(270, 0, -165) },
        { name: 'Club Corner Exit', p: new V3(120, 0, -200) }
      ];

      const results = [];
      for (const kp of keyPoints) {
        let bestT = 0, bestDist = Infinity;
        for (let i = 0; i <= 2000; i++) {
          const t = i / 2000;
          const pt = curve.getPointAt(t);
          const d = pt.distanceTo(kp.p);
          if (d < bestDist) {
            bestDist = d;
            bestT = t;
          }
        }
        const pt = curve.getPointAt(bestT);
        const tan = curve.getTangentAt(bestT);
        const norm = new V3(-tan.z, 0, tan.x).normalize();
        results.push({
          name: kp.name,
          t: Number(bestT.toFixed(3)),
          pos: [Number(pt.x.toFixed(1)), Number(pt.z.toFixed(1))],
          tan: [Number(tan.x.toFixed(2)), Number(tan.z.toFixed(2))],
          norm: [Number(norm.x.toFixed(2)), Number(norm.z.toFixed(2))]
        });
      }

      return { totalLen, results };
    })()`,
    returnByValue: true
  });

  console.log(JSON.stringify(res.result?.value, null, 2));
  ws.close();
}

main().catch(console.error);
