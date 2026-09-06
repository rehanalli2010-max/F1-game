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

  const tracks = ['monaco', 'spa', 'monza', 'silverstone'];
  const results = {};

  for (const trk of tracks) {
    console.log(`\n=== INSPECTING TRACK: ${trk.toUpperCase()} ===`);
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        g.closeModals();
        g.switchTrack('${trk}');
        
        const track = g.track;
        const specs = track.grandstandSpecs || [];
        const pads = track.grandstandPads || [];
        const Vector3 = track.curve.points[0].constructor;
        
        const gsData = [];

        for (let i = 0; i < specs.length; i++) {
          const s = specs[i];
          const pad = pads[i];
          const pt = track.curve.getPointAt(s.t);
          const tgt = track.curve.getTangentAt(s.t).normalize();
          const up = new Vector3(0, 1, 0);
          const normal = new Vector3().crossVectors(tgt, up).normalize();
          const outward = new Vector3().copy(normal).multiplyScalar(s.side).normalize();
          const xBasis = new Vector3().crossVectors(up, outward).normalize();
          
          const gsPos = new Vector3().copy(pt).addScaledVector(outward, s.dist);
          
          // Check ground height under center and 4 corners of the grandstand base
          const corners = [
            { name: 'center', x: 0, z: (s.depth + 2)/2 },
            { name: 'front-left', x: -s.length/2, z: 0 },
            { name: 'front-right', x: s.length/2, z: 0 },
            { name: 'back-left', x: -s.length/2, z: s.depth + 2 },
            { name: 'back-right', x: s.length/2, z: s.depth + 2 }
          ];
          
          const cornerHeights = corners.map(c => {
            const worldPos = new Vector3().copy(gsPos)
              .addScaledVector(xBasis, c.x)
              .addScaledVector(outward, c.z);
            const terrY = track.getTerrainHeight(worldPos.x, worldPos.z);
            const gsBaseY = gsPos.y; // Grandstand base position
            const gap = gsBaseY - terrY;
            return {
              corner: c.name,
              worldX: worldPos.x.toFixed(1),
              worldZ: worldPos.z.toFixed(1),
              gsBaseY: gsBaseY.toFixed(2),
              terrY: terrY.toFixed(2),
              gap: gap.toFixed(2)
            };
          });
          
          gsData.push({
            index: i,
            sponsor: s.sponsor,
            t: s.t,
            side: s.side,
            dist: s.dist,
            length: s.length,
            depth: s.depth,
            trackY: pt.y.toFixed(2),
            gsBaseY: gsPos.y.toFixed(2),
            corners: cornerHeights
          });
        }
        
        return {
          trackId: track.trackData.id,
          theme: track.trackData.theme.groundType,
          groundColor: track.trackData.theme.groundColor,
          trackElevationRange: {
            min: track._minTrackElevation,
            max: track._maxTrackElevation
          },
          grandstands: gsData
        };
      })()`,
      returnByValue: true
    });

    const val = res.result?.value || res.value || res;
    results[trk] = val;
    console.log(`\n=== SUMMARY FOR ${trk.toUpperCase()} ===`);
    if (val.grandstands) {
      val.grandstands.forEach(gs => {
        console.log(`[#${gs.index}] ${gs.sponsor} (t=${gs.t}, dist=${gs.dist}, trackY=${gs.trackY}, gsBaseY=${gs.gsBaseY})`);
        gs.corners.forEach(c => {
          console.log(`   ${c.corner.padEnd(12)}: X=${c.worldX.padStart(6)}, Z=${c.worldZ.padStart(6)}, baseY=${c.gsBaseY}, terrY=${c.terrY}, GAP=${c.gap}m`);
        });
      });
    }
  }

  import('node:fs').then(fs => {
    fs.writeFileSync('scratch/grandstand_diagnostics.json', JSON.stringify(results, null, 2));
    console.log('\nWrote full details to scratch/grandstand_diagnostics.json');
  });

  ws.close();
}

main().catch(console.error);
