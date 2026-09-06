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

  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.closeModals();
      g.switchTrack('monaco');
    })()`
  });

  await new Promise(r => setTimeout(r, 1000));

  // Get exact grandstand details
  const gsList = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const track = g.track;
      const list = [];
      track.grandstandSpecs.forEach((s, idx) => {
        const pt = track.curve.getPointAt(s.t);
        const tgt = track.curve.getTangentAt(s.t).normalize();
        const Vector3 = track.curve.points[0].constructor;
        const up = new Vector3(0, 1, 0);
        const normal = new Vector3().crossVectors(tgt, up).normalize();
        const outward = new Vector3().copy(normal).multiplyScalar(s.side).normalize();
        const pos = new Vector3().copy(pt).addScaledVector(outward, s.dist);
        list.push({
          idx,
          sponsor: s.sponsor,
          t: s.t,
          side: s.side,
          dist: s.dist,
          length: s.length,
          depth: s.depth,
          height: s.height,
          pos: { x: pos.x, y: pos.y, z: pos.z },
          trackPt: { x: pt.x, y: pt.y, z: pt.z },
          terrY_at_pos: track.getTerrainHeight(pos.x, pos.z)
        });
      });
      return list;
    })()`,
    returnByValue: true
  });

  console.log('Monaco Grandstands:', JSON.stringify(gsList.result?.value, null, 2));

  // Now capture each grandstand by detaching chase cam and pointing camera directly at the grandstand
  for (const gs of gsList.result?.value) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        // Temporarily override updateCamera to prevent chase cam overriding
        g.customCamActive = true;
        
        // We want camera to stand in front of the grandstand looking at it
        const trackPt = new THREE.Vector3 ? new THREE.Vector3(${gs.trackPt.x}, ${gs.trackPt.y}, ${gs.trackPt.z}) : g.track.curve.points[0].constructor(${gs.trackPt.x}, ${gs.trackPt.y}, ${gs.trackPt.z});
        const Vector3 = g.track.curve.points[0].constructor;
        const tPt = new Vector3(${gs.trackPt.x}, ${gs.trackPt.y}, ${gs.trackPt.z});
        const gsPos = new Vector3(${gs.pos.x}, ${gs.pos.y}, ${gs.pos.z});
        
        // Stand near track looking outward towards grandstand
        const dir = new Vector3().subVectors(gsPos, tPt).normalize();
        const camPos = new Vector3().copy(tPt).addScaledVector(dir, 5.0);
        camPos.y += 2.0;
        
        g.camera.position.copy(camPos);
        g.camera.lookAt(gsPos.x, gsPos.y + 4.0, gsPos.z);
        
        // Also override render/camera in main loop if needed:
        if (!g._origUpdateCamera) {
          g._origUpdateCamera = g.updateCamera;
        }
        g.updateCamera = () => {
          // Keep looking at grandstand
          g.camera.position.copy(camPos);
          g.camera.lookAt(gsPos.x, gsPos.y + 4.0, gsPos.z);
        };
      })()`
    });

    await new Promise(r => setTimeout(r, 600));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const pth = `C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3/monaco_direct_gs${gs.idx}_${gs.sponsor.replace(/\\s+/g, '_')}.png`;
    fs.writeFileSync(pth, Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${pth}`);
  }

  // Restore camera
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      if (g._origUpdateCamera) {
        g.updateCamera = g._origUpdateCamera;
        g._origUpdateCamera = null;
      }
      g.resetCamera();
    })()`
  });

  ws.close();
}

main().catch(console.error);
