import http from 'node:http';

async function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const arr = JSON.parse(data);
        const target = arr.find(x => x.type === 'page') || arr[0];
        resolve(target ? target.webSocketDebuggerUrl : null);
      });
    }).on('error', reject);
  });
}

async function main() {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id).resolve(d);
      pending.delete(d.id);
    }
  };
  const send = (m, p = {}) => new Promise(resolve => {
    const id = msgId++;
    pending.set(id, { resolve });
    ws.send(JSON.stringify({ id, method: m, params: p }));
  });
  await new Promise(r => ws.onopen = r);

  const evalCode = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.result && r.result.exceptionDetails) {
      console.error('JS EXCEPTION:', r.result.exceptionDetails);
    }
    return r.result ? r.result.result : null;
  };

  const centerScan = await evalCode(`(() => {
    const g = window.game;
    const track = g.track;
    const count = track.sampledPoints.length;
    const issues = [];

    for (let i = 0; i < count; i++) {
      const pt = track.sampledPoints[i];
      // Get closest point at pt
      const c = track.getClosestTrackPoint(pt.x, pt.z);
      const carY = c.point.y + 0.04;
      const roadY = pt.y + 0.02;
      const diff = carY - roadY;
      if (diff < -0.01) {
        issues.push({ idx: i, ptY: pt.y, ctpY: c.point.y, diff });
      }
    }
    return { count, centerIssues: issues.length, samples: issues.slice(0, 5) };
  })()`);

  console.log('Centerline scan:', JSON.stringify(centerScan.value, null, 2));

  // Now check spline interpolation vs sampled points
  const splineScan = await evalCode(`(() => {
    const g = window.game;
    const track = g.track;
    const issues = [];
    for (let t = 0; t <= 1.0; t += 0.002) {
      const pt = track.curve.getPointAt(t);
      const c = track.getClosestTrackPoint(pt.x, pt.z);
      const diff = c.point.y - pt.y;
      if (Math.abs(diff) > 0.05) {
        issues.push({ t: t.toFixed(4), ptY: pt.y.toFixed(3), ctpY: c.point.y.toFixed(3), diff: diff.toFixed(3) });
      }
    }
    return { splineIssues: issues.length, worst: issues.sort((a,b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 10) };
  })()`);

  console.log('Spline vs Sampled points:', JSON.stringify(splineScan.value, null, 2));

  ws.close();
}

main().catch(console.error);
