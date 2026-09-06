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

async function run() {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise(resolve => {
    const reqId = id++;
    const handler = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === reqId) {
        ws.removeEventListener('message', handler);
        resolve(d.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: reqId, method, params }));
  });
  await new Promise(r => ws.onopen = r);

  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.closeModals();
      g.switchTrack('suzuka');
      g.closeModals();
    })()`
  });

  await new Promise(r => setTimeout(r, 1200));

  const diag = await send('Runtime.evaluate', {
    expression: `(() => {
      try {
        const g = window.game;
        const track = g.track;
        const terrainClipping = [];
        const halfW = track.trackWidth / 2;

        for (let s = 0; s <= 400; s++) {
          const t = s / 400;
          const pt = track.curve.getPointAt(t);
          const tgt = track.curve.getTangentAt(t).normalize();
          const normX = -tgt.z;
          const normZ = tgt.x;

          for (const offset of [0, -halfW * 0.5, halfW * 0.5, -halfW, halfW, -(halfW + 2.5), halfW + 2.5]) {
            const checkX = pt.x + normX * offset;
            const checkZ = pt.z + normZ * offset;
            const groundY = track.getTerrainHeight(checkX, checkZ);
            if (groundY >= pt.y - 0.04) {
              terrainClipping.push({
                t: Number(t.toFixed(3)),
                offset: Number(offset.toFixed(1)),
                ptY: Number(pt.y.toFixed(2)),
                groundY: Number(groundY.toFixed(2)),
                penetration: Number((groundY - pt.y).toFixed(2))
              });
            }
          }
        }

        // Also check actual terrain mesh vertex penetration
        let meshClippingCount = 0;
        const worstMeshPoints = [];
        track.trackRoot.traverse(child => {
          if (child.isMesh && child.geometry?.type === 'PlaneGeometry' && child.geometry?.parameters?.width > 1000) {
            // This is the ground mesh
            const posAttr = child.geometry.attributes.position;
            const pArr = posAttr.array;
            for (let i = 0; i < posAttr.count; i++) {
              const vx = pArr[i * 3];
              const vy = pArr[i * 3 + 1];
              const vz = pArr[i * 3 + 2];
              const snap = track.getClosestTrackPoint(vx, vz, vy);
              if (snap.distance <= halfW + 3.0) {
                if (vy >= snap.point.y - 0.02) {
                  meshClippingCount++;
                  if (worstMeshPoints.length < 15) {
                    worstMeshPoints.push({
                      pos: { x: Number(vx.toFixed(1)), y: Number(vy.toFixed(2)), z: Number(vz.toFixed(1)) },
                      snapY: Number(snap.point.y.toFixed(2)),
                      snapT: Number(snap.t.toFixed(3)),
                      dist: Number(snap.distance.toFixed(2)),
                      penetration: Number((vy - snap.point.y).toFixed(2))
                    });
                  }
                }
              }
            }
          }
        });

        return {
          ok: true,
          curveCheckClippingCount: terrainClipping.length,
          worstCurveClipping: terrainClipping.slice(0, 10),
          meshClippingCount,
          worstMeshPoints
        };
      } catch (err) {
        return { ok: false, error: err.message, stack: err.stack };
      }
    })()`,
    returnByValue: true
  });

  console.log('DIAGNOSTIC REPORT:', JSON.stringify(diag.result?.value, null, 2));
  ws.close();
}

run().catch(console.error);
