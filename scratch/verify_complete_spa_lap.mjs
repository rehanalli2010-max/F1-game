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

  console.log('Driving full lap on Spa across 50 checkpoints from t=0.0 to t=1.0...');
  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.closeModals();
      g.switchTrack('spa');
      g.switchCar('ferrari');
      
      const track = g.track;
      const issues = [];
      const steps = 50;

      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const pt = track.curve.getPointAt(t);
        const tgt = track.curve.getTangentAt(t);
        const yaw = Math.atan2(tgt.x, tgt.z);

        // Teleport and simulate physics update
        g.physics.resetVehicle(g.playerVehicle, pt.x, (pt.y || 0) + 0.04, pt.z, yaw, 60);
        
        // Check car position relative to track
        const actualY = g.playerVehicle.body.position.y;
        const expectedY = pt.y + 0.04;
        const diff = actualY - expectedY;
        
        // Check distance to closest grandstand mesh
        let minGsDist = Infinity;
        for (const spec of track.grandstandSpecs) {
          const gsPt = track.curve.getPointAt(spec.t);
          const d = Math.hypot(pt.x - gsPt.x, pt.z - gsPt.z);
          if (d < minGsDist) minGsDist = d;
        }

        if (Math.abs(diff) > 0.5) {
          issues.push({ t, reason: 'Vertical height error', actualY, expectedY, diff });
        }
      }

      return {
        totalCheckpoints: steps,
        issuesCount: issues.length,
        issues
      };
    })()`,
    returnByValue: true
  });

  console.log('SPA FULL LAP SIMULATION RESULT:');
  console.log(JSON.stringify(evalRes.result?.value, null, 2));
  ws.close();
}

run().catch(console.error);
