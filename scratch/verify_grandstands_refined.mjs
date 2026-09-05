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

      const grandstandSpecs = [
        // 1. Hamilton Straight Main Grandstand (Overlooking starting grid)
        { name: 'Hamilton Straight Grandstand', t: 0.975, side: -1, dist: barrierDist + 14.0, length: 90, depth: 14, height: 10.5, rows: 10, sponsor: 'FORMULA 1', roofColor: 0xe10600 },
        // 2. Abbey Grandstand (Turn 1 sweeper)
        { name: 'Abbey Grandstand', t: 0.05, side: -1, dist: barrierDist + 15.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'PIRELLI', roofColor: 0x111827 },
        // 3. Wellington Straight Grandstand (DRS zone overtaking)
        { name: 'Wellington Grandstand', t: 0.25, side: 1, dist: barrierDist + 15.0, length: 80, depth: 14, height: 10.5, rows: 10, sponsor: 'ROLEX', roofColor: 0x00594f },
        // 4. Luffield Complex Grandstand (Outside of the carousel)
        { name: 'Luffield Grandstand', t: 0.38, side: -1, dist: barrierDist + 15.0, length: 80, depth: 14, height: 10.5, rows: 10, sponsor: 'BRITISH GP', roofColor: 0x1e3a8a },
        // 5. Copse Corner Grandstand
        { name: 'Copse Grandstand', t: 0.505, side: -1, dist: barrierDist + 16.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'ARAMCO', roofColor: 0x008080 },
        // 6. Becketts Stadium Grandstand
        { name: 'Becketts Grandstand', t: 0.61, side: 1, dist: barrierDist + 16.0, length: 80, depth: 14, height: 10.5, rows: 10, sponsor: 'QATAR AIRWAYS', roofColor: 0x5c0632 },
        // 7. Stowe Corner Grandstand
        { name: 'Stowe Grandstand', t: 0.825, side: 1, dist: barrierDist + 16.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'DHL', roofColor: 0xffcc00 }
      ];

      // Sample track ribbon at 1000 points
      const trackPoints = [];
      for (let i = 0; i <= 1000; i++) {
        trackPoints.push(curve.getPointAt(i / 1000));
      }

      const clearanceReports = [];
      for (const gs of grandstandSpecs) {
        const pt = curve.getPointAt(gs.t);
        const tgt = curve.getTangentAt(gs.t).normalize();
        const normal = new V3().crossVectors(tgt, up).normalize();
        const outward = new V3().copy(normal).multiplyScalar(gs.side).normalize();
        const gsCenter = new V3().copy(pt).addScaledVector(outward, gs.dist + gs.depth / 2);

        let minTrackDist = Infinity;
        for (let i = 0; i < trackPoints.length; i++) {
          const d = gsCenter.distanceTo(trackPoints[i]);
          if (d < minTrackDist) minTrackDist = d;
        }

        const frontDist = minTrackDist - (gs.depth / 2);
        clearanceReports.push({
          name: gs.name,
          t: gs.t,
          side: gs.side,
          gsCenter: [Number(gsCenter.x.toFixed(1)), Number(gsCenter.z.toFixed(1))],
          minTrackSplineDist: Number(minTrackDist.toFixed(1)),
          clearanceFromTrackEdge: Number((frontDist - trackHalfWidth).toFixed(1)),
          isCompletelySafe: (frontDist - trackHalfWidth) > 10.0
        });
      }

      // Also check Pit Complex clearance
      const pitT = 0.015;
      const pitPt = curve.getPointAt(pitT);
      const pitTgt = curve.getTangentAt(pitT).normalize();
      const pitNorm = new V3().crossVectors(pitTgt, up).normalize();
      const pitDist = barrierDist + 4.0;
      const pitOutward = new V3().copy(pitNorm).multiplyScalar(1).normalize();
      const pitCenter = new V3().copy(pitPt).addScaledVector(pitOutward, pitDist + 8.0);
      let minPitTrackDist = Infinity;
      for (let i = 0; i < trackPoints.length; i++) {
        const d = pitCenter.distanceTo(trackPoints[i]);
        if (d < minPitTrackDist) minPitTrackDist = d;
      }

      return {
        grandstands: clearanceReports,
        pitComplex: {
          t: pitT,
          center: [Number(pitCenter.x.toFixed(1)), Number(pitCenter.z.toFixed(1))],
          minTrackSplineDist: Number(minPitTrackDist.toFixed(1)),
          isCompletelySafe: minPitTrackDist > 20.0
        }
      };
    })()`,
    returnByValue: true
  });

  console.log(JSON.stringify(res.result.value, null, 2));
  ws.close();
}
main();
