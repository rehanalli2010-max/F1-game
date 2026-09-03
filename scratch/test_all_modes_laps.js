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

  console.log('Reloading page...');
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 2000));

  const res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const g = window.game;
        const track = g.track;
        const t = g.timing;
        const session = g.session;
        const hudLapEl = document.getElementById('hud-lap-counter');

        function simulateLapDrive() {
          // Drive sequentially through checkpoints from 0.0 to 0.999
          const steps = 100;
          for (let i = 0; i <= steps; i++) {
            const prog = (i / steps) % 1.0;
            const pt = track.curve.getPointAt(prog);
            const tgt = track.curve.getTangentAt(prog);
            const vel = { x: tgt.x * 60, y: 0, z: tgt.z * 60 };
            t.update(pt, vel);
            g.updateHUD(120, 3, 9000, 1, 0, false);
          }
        }

        // ==========================================
        // 1. PRACTICE MODE (TEST 10 AND 20 LAPS)
        // ==========================================
        session.initSession('PRACTICE', g.playerVehicle, g.playerCar);
        g.updateHUD(0, 1, 4000, 0, 0, false);
        const practiceInitial = hudLapEl.textContent;

        const practiceLaps = [];
        for (let lap = 1; lap <= 20; lap++) {
          simulateLapDrive();
          practiceLaps.push({
            completedLap: lap,
            timingCurrentLap: t.currentLap,
            hudLap: hudLapEl.textContent
          });
        }

        // ==========================================
        // 2. QUALIFYING MODE
        // ==========================================
        session.initSession('QUALIFYING', g.playerVehicle, g.playerCar);
        g.updateHUD(180, 5, 11000, 1, 0, false);
        const qualOutLapText = hudLapEl.textContent;

        // Drive across start line to trigger Flying lap
        const startPt = track.curve.getPointAt(0.01);
        const startTgt = track.curve.getTangentAt(0.01);
        session.update(0.016, g.playerVehicle, startPt, startTgt);
        g.updateHUD(220, 6, 12000, 1, 0, true);
        const qualFlyingLapText = hudLapEl.textContent;

        // Complete the hot lap
        simulateLapDrive();
        g.updateHUD(0, 1, 4000, 0, 1, false);
        const qualFinishedText = hudLapEl.textContent;

        // ==========================================
        // 3. RACE MODE (2 LAPS)
        // ==========================================
        session.initSession('RACE', g.playerVehicle, g.playerCar);
        session.raceState = 'RACING';
        t.start();
        g.updateHUD(0, 1, 4000, 0, 0, false);
        const raceLap1Text = hudLapEl.textContent;

        // Complete Lap 1
        simulateLapDrive();
        const raceLap2Text = hudLapEl.textContent;

        // Complete Lap 2
        simulateLapDrive();
        const raceFinishedText = hudLapEl.textContent;

        return {
          practice: {
            initial: practiceInitial,
            lap1: practiceLaps[0],
            lap5: practiceLaps[4],
            lap10: practiceLaps[9],
            lap15: practiceLaps[14],
            lap20: practiceLaps[19]
          },
          qualifying: {
            outLap: qualOutLapText,
            flyingLap: qualFlyingLapText,
            finished: qualFinishedText
          },
          race: {
            start: raceLap1Text,
            afterLap1: raceLap2Text,
            finished: raceFinishedText
          }
        };
      })()
    `,
    returnByValue: true
  });

  console.log('All Modes Lap Counter Test Result:');
  console.log(JSON.stringify(res.result.value, null, 2));
  process.exit(0);
}
main().catch(console.error);
