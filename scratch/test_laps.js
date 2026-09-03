const http = require('http');

async function main() {
  const pages = await new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let str = '';
      res.on('data', d => str += d);
      res.on('end', () => resolve(JSON.parse(str)));
    }).on('error', reject);
  });

  const page = pages.find(p => p.url.includes('3000')) || pages[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let msgId = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  };
  await new Promise(r => ws.onopen = r);

  const res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        const t = g.timing;
        const track = g.track;
        const session = g.session;

        // Reset session to Practice
        session.initSession('PRACTICE', g.playerVehicle, g.playerCar);

        const events = [];
        // Simulate driving 3 full laps along the track spline
        const steps = 3000;
        for (let s = 0; s < steps; s++) {
          const progress = (s / 1000) % 1.0;
          const pt = track.curve.getPointAt(progress);
          const tgt = track.curve.getTangentAt(progress);
          const vel = { x: tgt.x * 50, y: 0, z: tgt.z * 50 };

          const lapBefore = t.currentLap;
          const chkBefore = t.nextExpectedCheckpoint;

          t.update(pt, vel);

          // Check if main loop would detect lap complete
          if (t.nextExpectedCheckpoint === 1 && t.lastLapTime !== null && g.lastCheckedLap !== t.currentLap) {
            g.lastCheckedLap = t.currentLap;
            session.handleLapComplete({
              valid: !t.lapInvalidated,
              time: t.lastLapTime,
              lapNumber: t.currentLap - 1
            });
            events.push({
              step: s,
              progress: progress.toFixed(3),
              lapNow: t.currentLap,
              hudLapText: document.getElementById('hud-lap-counter')?.textContent
            });
          }
        }

        return {
          totalEvents: events.length,
          events,
          finalTimingLap: t.currentLap,
          finalSessionLap: session.playerRaceLap,
          hudLapText: document.getElementById('hud-lap-counter')?.textContent
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Lap simulation result:');
  console.log(JSON.stringify(res.result.value, null, 2));
  process.exit(0);
}
main().catch(console.error);
