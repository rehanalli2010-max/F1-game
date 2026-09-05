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
      // Start/Finish line is at index 0: (140, 0, 0)
      const pts = [
        new V3(140, 0, 0),       // 0. Start/Finish Line & Gantry (Hamilton Straight)
        new V3(140, 0, 60),      // 1. Hamilton Straight Acceleration
        new V3(155, 0, 120),     // 2. Abbey (Turn 1) - Fast right
        new V3(135, 0, 180),     // 3. Farm Curve (Turn 2) - Left sweep
        new V3(85, 0, 220),      // 4. Village (Turn 3) - Right hander
        new V3(30, 0, 210),      // 5. The Loop (Turn 4) - Infield hairpin entry
        new V3(15, 0, 165),      // 6. The Loop - Hairpin apex
        new V3(35, 0, 115),      // 7. Aintree (Turn 5) - Acceleration corner
        new V3(-20, 0, 50),      // 8. Wellington Straight - Full Throttle
        new V3(-85, 0, -25),     // 9. Wellington Straight - DRS Zone
        new V3(-150, 0, -100),   // 10. Wellington Straight - Braking Point
        new V3(-200, 0, -145),   // 11. Brooklands (Turn 6) - Left sweeper
        new V3(-245, 0, -105),   // 12. Luffield (Turn 7) - Carousel entry
        new V3(-235, 0, -35),    // 13. Luffield - Carousel exit
        new V3(-195, 0, 40),     // 14. Woodcote (Turn 8) - Fast right
        new V3(-145, 0, 115),    // 15. National Straight
        new V3(-85, 0, 190),     // 16. Copse (Turn 9) - 290 km/h blind right
        new V3(-15, 0, 245),     // 17. Copse Exit to Maggotts
        new V3(55, 0, 275),      // 18. Maggotts (Turn 10) - Fast left flick
        new V3(115, 0, 270),     // 19. Becketts (Turns 11-12) - High-speed chicane
        new V3(170, 0, 230),     // 20. Chapel Curve (Turn 13) - Exit to Hangar
        new V3(230, 0, 150),     // 21. Hangar Straight - Full throttle
        new V3(275, 0, 50),      // 22. Hangar Straight - 330 km/h DRS
        new V3(290, 0, -65),     // 23. Hangar Straight - Stowe braking
        new V3(270, 0, -165),    // 24. Stowe (Turn 15) - Fast right
        new V3(215, 0, -225),    // 25. Vale Entry
        new V3(165, 0, -240),    // 26. Vale Chicane (Turns 16-17)
        new V3(125, 0, -205),    // 27. Club Corner (Turn 18) - Apex
        new V3(138, 0, -150),    // 28. Club Exit onto Hamilton Straight
        new V3(140, 0, -80)      // 29. Hamilton Straight Grid Approach
      ];

      const curve = new g.track.curve.constructor(pts, true, 'catmullrom', 0.2);
      const totalLen = curve.getLength();

      // Check non-adjacent distance
      const N = 600;
      const samples = [];
      for (let i = 0; i <= N; i++) samples.push(curve.getPointAt(i / N));
      let minDist = Infinity;
      for (let i = 0; i < N; i++) {
        for (let j = i + 35; j < N - 35; j++) {
          const d = samples[i].distanceTo(samples[j]);
          if (d < minDist) minDist = d;
        }
      }

      const slots = [];
      for (let s = 1; s <= 10; s++) {
        const t = (1.0 - (s * 0.0065)) % 1.0;
        const p = curve.getPointAt(t);
        const tgt = curve.getTangentAt(t);
        slots.push({
          slot: s,
          t: Number(t.toFixed(4)),
          x: Number(p.x.toFixed(1)),
          z: Number(p.z.toFixed(1)),
          tanX: Number(tgt.x.toFixed(2)),
          tanZ: Number(tgt.z.toFixed(2))
        });
      }

      return {
        totalLen: Number(totalLen.toFixed(1)),
        minDist: Number(minDist.toFixed(1)),
        slots
      };
    })()`,
    returnByValue: true
  });

  console.log(JSON.stringify(res.result.value, null, 2));
  ws.close();
}
main();
