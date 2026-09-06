import http from 'node:http';
import fs from 'node:fs';

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

  console.log('Switching to Monaco and inspecting grandstands...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.closeModals();
      g.switchTrack('monaco');
    })()`
  });

  await new Promise(r => setTimeout(r, 1000));

  // Inspect each grandstand in Monaco by teleporting camera to look at it
  const grandstandViews = [
    { name: 'monaco_gs0_rolex_harbor', t: 0.88, camOffset: { x: 20, y: 15, z: 20 } },
    { name: 'monaco_gs1_tag_heuer_rascasse', t: 0.985, camOffset: { x: 20, y: 15, z: 20 } },
    { name: 'monaco_gs2_monte_carlo_hill', t: 0.38, camOffset: { x: -20, y: 15, z: -20 } }
  ];

  for (const v of grandstandViews) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        const track = g.track;
        const pt = track.curve.getPointAt(${v.t});
        const tgt = track.curve.getTangentAt(${v.t}).normalize();
        const Vector3 = track.curve.points[0].constructor;
        const up = new Vector3(0, 1, 0);
        const normal = new Vector3().crossVectors(tgt, up).normalize();
        
        // Find grandstand spec matching t
        const spec = track.grandstandSpecs.find(s => Math.abs(s.t - ${v.t}) < 0.01);
        const outward = new Vector3().copy(normal).multiplyScalar(spec ? spec.side : 1).normalize();
        const gsPos = new Vector3().copy(pt).addScaledVector(outward, spec ? spec.dist : 15);
        
        // Place camera looking at grandstand from side/front
        g.camera.position.set(gsPos.x + ${v.camOffset.x}, gsPos.y + ${v.camOffset.y}, gsPos.z + ${v.camOffset.z});
        g.camera.lookAt(gsPos.x, gsPos.y + 3, gsPos.z);
      })()`
    });

    await new Promise(r => setTimeout(r, 800));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const pth = `C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3/${v.name}.png`;
    fs.writeFileSync(pth, Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${pth}`);
  }

  ws.close();
}

main().catch(console.error);
