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

  console.log('Reloading page to pick up updated code...');
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 2000));

  const tracks = ['monaco', 'spa', 'monza', 'silverstone'];
  const auditResults = {};
  let totalGrandstands = 0;
  let passedGrandstands = 0;
  let totalCorners = 0;
  let passedCorners = 0;

  for (const trk of tracks) {
    console.log(`\n======================================================`);
    console.log(` AUDITING TRACK: ${trk.toUpperCase()}`);
    console.log(`======================================================`);

    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        g.closeModals();
        g.switchTrack('${trk}');
        
        const track = g.track;
        const specs = track.grandstandSpecs || [];
        const Vector3 = track.curve.points[0].constructor;
        const list = [];

        for (let i = 0; i < specs.length; i++) {
          const s = specs[i];
          const pt = track.curve.getPointAt(s.t);
          const tgt = track.curve.getTangentAt(s.t).normalize();
          const up = new Vector3(0, 1, 0);
          const normal = new Vector3().crossVectors(tgt, up).normalize();
          const outward = new Vector3().copy(normal).multiplyScalar(s.side).normalize();
          const xBasis = new Vector3().crossVectors(up, outward).normalize();
          
          const gsPos = new Vector3().copy(pt).addScaledVector(outward, s.dist);
          
          const corners = [
            { name: 'center', x: 0, z: (s.depth + 2)/2 },
            { name: 'front-left', x: -s.length/2, z: 0 },
            { name: 'front-right', x: s.length/2, z: 0 },
            { name: 'back-left', x: -s.length/2, z: s.depth + 2 },
            { name: 'back-right', x: s.length/2, z: s.depth + 2 }
          ];
          
          let maxGap = -Infinity;
          let minGap = Infinity;
          
          const cornerHeights = corners.map(c => {
            const worldPos = new Vector3().copy(gsPos)
              .addScaledVector(xBasis, c.x)
              .addScaledVector(outward, c.z);
            const terrY = track.getTerrainHeight(worldPos.x, worldPos.z);
            const gsBaseY = gsPos.y;
            const gap = gsBaseY - terrY;
            if (gap > maxGap) maxGap = gap;
            if (gap < minGap) minGap = gap;
            return {
              corner: c.name,
              worldX: Number(worldPos.x.toFixed(1)),
              worldZ: Number(worldPos.z.toFixed(1)),
              gsBaseY: Number(gsBaseY.toFixed(2)),
              terrY: Number(terrY.toFixed(2)),
              gap: Number(gap.toFixed(2))
            };
          });
          
          list.push({
            idx: i,
            sponsor: s.sponsor,
            t: s.t,
            side: s.side,
            dist: s.dist,
            length: s.length,
            depth: s.depth,
            trackY: Number(pt.y.toFixed(2)),
            gsBaseY: Number(gsPos.y.toFixed(2)),
            maxGap: Number(maxGap.toFixed(2)),
            minGap: Number(minGap.toFixed(2)),
            corners: cornerHeights
          });
        }

        return {
          trackId: track.trackData.id,
          theme: track.trackData.theme.groundType,
          grandstands: list
        };
      })()`,
      returnByValue: true
    });

    const data = evalRes.result?.value;
    auditResults[trk] = data;

    if (data && data.grandstands) {
      data.grandstands.forEach(gs => {
        totalGrandstands++;
        const isGsPass = gs.maxGap <= 0.35 && gs.minGap >= -0.10;
        if (isGsPass) passedGrandstands++;

        console.log(`[#${gs.idx}] ${gs.sponsor.padEnd(16)} (t=${gs.t.toFixed(3)}, baseY=${gs.gsBaseY.toFixed(2)}m) -> Max Gap: ${gs.maxGap.toFixed(2)}m, Min Gap: ${gs.minGap.toFixed(2)}m [${isGsPass ? 'PASS' : 'FAIL'}]`);
        gs.corners.forEach(c => {
          totalCorners++;
          const cPass = c.gap <= 0.35 && c.gap >= -0.10;
          if (cPass) passedCorners++;
          console.log(`    ${c.corner.padEnd(12)}: terrY=${c.terrY.toFixed(2)}m, gap=${c.gap.toFixed(2)}m ${cPass ? '✓' : '✗'}`);
        });
      });
    }
  }

  console.log(`\n======================================================`);
  console.log(` MULTI-TRACK GRANDSTAND AUDIT SUMMARY`);
  console.log(`======================================================`);
  console.log(`Total Grandstands Audited: ${totalGrandstands}`);
  console.log(`Passed Grandstands (Gap <= 0.35m): ${passedGrandstands} / ${totalGrandstands} (${((passedGrandstands/totalGrandstands)*100).toFixed(1)}%)`);
  console.log(`Total Corners Audited: ${totalCorners}`);
  console.log(`Passed Corners (Gap <= 0.35m): ${passedCorners} / ${totalCorners} (${((passedCorners/totalCorners)*100).toFixed(1)}%)`);

  fs.writeFileSync('scratch/all_grandstands_audit_report.json', JSON.stringify(auditResults, null, 2));
  console.log('Full report saved to scratch/all_grandstands_audit_report.json');

  ws.close();
}

main().catch(console.error);
