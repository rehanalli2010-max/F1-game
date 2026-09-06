import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

async function getWsUrl() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const targets = JSON.parse(data);
        const t = targets.find(x => x.url && x.url.includes('3000')) || targets[0];
        resolve(t.webSocketDebuggerUrl);
      });
    });
  });
}

const SHOT_CONFIGS = [
  // 1. Monaco
  { track: 'monaco', team: 'ferrari', mode: 'EASY', t: 0.18, file: 'monaco_race_easy.png', name: 'Monaco Easy - Beau Rivage' },
  { track: 'monaco', team: 'redbull', mode: 'MEDIUM', t: 0.52, file: 'monaco_race_medium.png', name: 'Monaco Medium - Fairmont Hairpin' },
  { track: 'monaco', team: 'mercedes', mode: 'HARD', t: 0.88, file: 'monaco_race_hard.png', name: 'Monaco Hard - Rascasse Exit' },
  // 2. Monza
  { track: 'monza', team: 'ferrari', mode: 'EASY', t: 0.15, file: 'monza_race_easy.png', name: 'Monza Easy - Variante del Rettifilo' },
  { track: 'monza', team: 'redbull', mode: 'MEDIUM', t: 0.68, file: 'monza_race_medium.png', name: 'Monza Medium - Variante Ascari' },
  { track: 'monza', team: 'mercedes', mode: 'HARD', t: 0.92, file: 'monza_race_hard.png', name: 'Monza Hard - Curva Parabolica' },
  // 3. Silverstone
  { track: 'silverstone', team: 'ferrari', mode: 'EASY', t: 0.28, file: 'silverstone_race_easy.png', name: 'Silverstone Easy - Wellington Straight' },
  { track: 'silverstone', team: 'redbull', mode: 'MEDIUM', t: 0.62, file: 'silverstone_race_medium.png', name: 'Silverstone Medium - Maggotts & Becketts' },
  { track: 'silverstone', team: 'mercedes', mode: 'HARD', t: 0.78, file: 'silverstone_race_hard.png', name: 'Silverstone Hard - Hangar Straight' }
];

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

  // Reload page to get clean state
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 1200));

  for (const cfg of SHOT_CONFIGS) {
    console.log(`Setting up ${cfg.name}...`);
    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        g.closeModals();
        g.switchTrack('${cfg.track}');
        g.switchCar('${cfg.team}');
        g.session.setRaceLapsTotal(3);
        g.session.setDifficulty('${cfg.mode}');
        g.session.initSession('RACE', g.playerVehicle, g.playerCar, null, true);

        // Fast-forward countdown lights
        g.session.clearAllTimers();
        g.session.raceState = 'RACING';
        g.session.raceStartTime = performance.now();
        g.setStartLightsVisible(false);
        g.closeModals();

        // Position player vehicle along the circuit at specified progress t
        const trackLen = g.track.trackLength || 1850;
        const pt = g.track.curve.getPointAt(${cfg.t});
        const tgt = g.track.curve.getTangentAt(${cfg.t}).normalize();
        const yaw = Math.atan2(tgt.x, tgt.z);
        const speedKmh = 195;
        const speedMps = speedKmh / 3.6;

        g.physics.resetVehicle(g.playerVehicle, pt.x, 0.04, pt.z, yaw, speedMps);
        g.playerVehicle.currentGear = 6;
        g.playerVehicle.rpm = 11200;
        g.controls.throttle = 1.0;
        g.controls.brake = 0.0;
        g.resetCamera();

        // Step AI cars forward near the player so they appear in racing formation
        const dt = 0.05;
        for (let i = 0; i < 40; i++) {
          const pPos = g.playerVehicle.body.position;
          const pVel = g.playerVehicle.body.velocity;
          g.aiGrid.update(dt, pPos, pVel, 2, i * dt, 3, g.audio);
        }

        g.closeModals();
        g.resetCamera();
      })()`
    });

    await new Promise(r => setTimeout(r, 800));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, cfg.file), Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${cfg.file}`);
  }

  ws.close();
  console.log('All action screenshots captured successfully!');
}

main().catch(console.error);
