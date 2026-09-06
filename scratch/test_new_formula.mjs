import http from 'node:http';

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

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const pts = g.track.sampledPoints;
      const count = pts.length;
      const halfW = g.track.trackWidth / 2;

      // Simulated new getTerrainHeight function
      function testGetTerrainHeight(x, z) {
        if (!pts || pts.length === 0) return -0.05;

        let minDistSq = Infinity;
        let bestIdx = 0;

        // Exact search over all 600 points (fast and 100% exact)
        for (let i = 0; i < count; i++) {
          const p = pts[i];
          const dx = p.x - x;
          const dz = p.z - z;
          const dSq = dx * dx + dz * dz;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            bestIdx = i;
          }
        }

        const dist = Math.sqrt(minDistSq);
        const pt = pts[bestIdx];
        const roadClearance = halfW + 4.5;

        const minTrackY = g.track._minTrackElevation !== undefined ? g.track._minTrackElevation : -0.05;
        const baseGroundLevel = Math.min(-0.05, minTrackY - 1.5);

        // Find minimum elevation in local neighborhood (span of +/- 8 track points ~ 18 meters)
        let minLocalY = pt.y;
        for (let j = -8; j <= 8; j++) {
          const nIdx = (bestIdx + j + count) % count;
          if (pts[nIdx].y < minLocalY) minLocalY = pts[nIdx].y;
        }

        const safeRoadY = Math.min(pt.y - 0.15, minLocalY - 0.10);

        if (dist <= roadClearance) {
          return safeRoadY;
        }

        const maxInfluenceDist = 140.0;
        if (dist >= maxInfluenceDist) {
          return baseGroundLevel;
        }

        const u = (dist - roadClearance) / (maxInfluenceDist - roadClearance);
        const blend = 0.5 * (1.0 + Math.cos(Math.PI * u));
        const rawY = blend * safeRoadY + (1.0 - blend) * baseGroundLevel;

        return Math.min(rawY, minLocalY - 0.08, pt.y - 0.08);
      }

      // Test across the ENTIRE circuit
      let badCount = 0;
      let worstDiff = -Infinity;
      for (let i = 0; i < count; i++) {
        const pt = pts[i];
        const tgt = g.track.sampledTangents[i];
        const norm = { x: -tgt.z, z: tgt.x };

        // Test at 11 lateral sample offsets across the road and aprons
        for (let off = -halfW - 3.5; off <= halfW + 3.5; off += 0.8) {
          const tx = pt.x + norm.x * off;
          const tz = pt.z + norm.z * off;
          const th = testGetTerrainHeight(tx, tz);
          const diff = th - pt.y;
          if (diff > worstDiff) worstDiff = diff;
          if (diff > -0.05) badCount++;
        }
      }

      return {
        totalTrackPoints: count,
        badCount,
        worstDiff,
        passed: badCount === 0 && worstDiff <= -0.05
      };
    })()`,
    returnByValue: true
  });

  console.log('Test results of new mathematical anti-clipping formula:', JSON.stringify(res.result.value, null, 2));
  ws.close();
}

main().catch(console.error);
