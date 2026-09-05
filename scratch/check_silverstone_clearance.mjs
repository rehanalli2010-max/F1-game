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
      const barrierDist = 12.0;
      const trackHalfWidth = 16.5 / 2;

      const grandstandSpecs = [
        // 1. Hamilton Straight Main Grandstand (Overlooking starting grid)
        { name: 'Hamilton Straight Grandstand', t: 0.02, side: -1, dist: barrierDist + 14.0, length: 90, depth: 14, height: 10.5, rows: 10, sponsor: 'FORMULA 1', roofColor: 0xe10600 },
        // 2. Abbey Grandstand (Turn 1 sweeper)
        { name: 'Abbey Grandstand', t: 0.11, side: -1, dist: barrierDist + 15.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'PIRELLI', roofColor: 0x111827 },
        // 3. Brooklands Stadium
        { name: 'Brooklands Grandstand', t: 0.38, side: -1, dist: barrierDist + 15.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'ROLEX', roofColor: 0x00594f },
        // 4. Luffield Complex Grandstand
        { name: 'Luffield Grandstand', t: 0.44, side: -1, dist: barrierDist + 15.0, length: 80, depth: 14, height: 10.5, rows: 10, sponsor: 'BRITISH GP', roofColor: 0x1e3a8a },
        // 5. Copse Corner Grandstand
        { name: 'Copse Grandstand', t: 0.56, side: -1, dist: barrierDist + 16.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'ARAMCO', roofColor: 0x008080 },
        // 6. Becketts Stadium Grandstand
        { name: 'Becketts Grandstand', t: 0.67, side: 1, dist: barrierDist + 16.0, length: 80, depth: 14, height: 10.5, rows: 10, sponsor: 'QATAR AIRWAYS', roofColor: 0x5c0632 },
        // 7. Stowe Corner Grandstand
        { name: 'Stowe Grandstand', t: 0.88, side: 1, dist: barrierDist + 16.0, length: 75, depth: 14, height: 10.5, rows: 10, sponsor: 'DHL', roofColor: 0xffcc00 }
      ];

      // Sample track ribbon at 1000 points
      const trackPoints = [];
      for (let i = 0; i <= 1000; i++) {
        trackPoints.push(curve.getPointAt(i / 1000));
      }

      // Check each grandstand against the entire track ribbon
      const clearanceReports = [];
      const up = new V3(0, 1, 0);

      for (const gs of grandstandSpecs) {
        const pt = curve.getPointAt(gs.t);
        const tgt = curve.getTangentAt(gs.t).normalize();
        const normal = new V3().crossVectors(tgt, up).normalize();
        const outward = new V3().copy(normal).multiplyScalar(gs.side).normalize();
        const gsCenter = new V3().copy(pt).addScaledVector(outward, gs.dist + gs.depth / 2);

        // Find minimum distance from gsCenter to ANY point on track spline
        let minTrackDist = Infinity;
        let minTrackIdx = -1;
        for (let i = 0; i < trackPoints.length; i++) {
          const d = gsCenter.distanceTo(trackPoints[i]);
          if (d < minTrackDist) {
            minTrackDist = d;
            minTrackIdx = i;
          }
        }

        // Distance from front edge of grandstand to nearest track point
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

      return {
        trackLength: Number(curve.getLength().toFixed(1)),
        clearanceReports
      };
    })()`,
    returnByValue: true
  });

  console.log(JSON.stringify(res.result?.value, null, 2));
  ws.close();
}

main().catch(console.error);
