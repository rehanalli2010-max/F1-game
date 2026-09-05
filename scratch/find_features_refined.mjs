import http from 'node:http';

async function getWsUrl() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)[0].webSocketDebuggerUrl));
    });
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
      const barrierDist = 12.0;
      const trackHalfWidth = 16.5 / 2;
      const up = new V3(0, 1, 0);

      // Pit Complex at t = 0.015 or 0.98 (parallel to straight)
      // At t = 0.0, pt is (140, 0, 0). Tangent is (0, 0, 1). Normal is (-1, 0, 0).
      // Pit complex on right side (pitSide = 1) -> +normal -> (-1, 0, 0)
      // Wait, let's verify what normal is:
      // tgt = (0, 0, 1), up = (0, 1, 0).
      // cross(tgt, up) = (tgt.y*up.z - tgt.z*up.y, tgt.z*up.x - tgt.x*up.z, tgt.x*up.y - tgt.y*up.x)
      // = (0 - 1, 0 - 0, 0 - 0) = (-1, 0, 0).
      // So normal points to -X!
      // Infield of Silverstone is to the left (-X direction)!
      // Outfield is to the right (+X direction)!
      // That means pitSide = 1 (along normal) points towards -X (infield), which is exactly where the Silverstone Wing and paddock sit!

      // Check key sections for grandstand t:
      const sections = [
        { name: 'Grid / Hamilton Straight', p: new V3(140, 0, -70) },
        { name: 'Abbey (Turn 1)', p: new V3(155, 0, 120) },
        { name: 'Brooklands (Turn 6)', p: new V3(-200, 0, -145) },
        { name: 'Luffield (Turn 7)', p: new V3(-245, 0, -105) },
        { name: 'Copse (Turn 9)', p: new V3(-85, 0, 190) },
        { name: 'Maggotts/Becketts', p: new V3(115, 0, 270) },
        { name: 'Stowe (Turn 15)', p: new V3(270, 0, -165) }
      ];

      const res = [];
      for (const s of sections) {
        let bestT = 0, bestDist = Infinity;
        for (let i = 0; i <= 2000; i++) {
          const t = i / 2000;
          const d = curve.getPointAt(t).distanceTo(s.p);
          if (d < bestDist) {
            bestDist = d;
            bestT = t;
          }
        }
        res.push({ name: s.name, t: Number(bestT.toFixed(3)), pos: curve.getPointAt(bestT) });
      }

      return res;
    })()`,
    returnByValue: true
  });

  console.log(JSON.stringify(res.result.value, null, 2));
  ws.close();
}
main();
