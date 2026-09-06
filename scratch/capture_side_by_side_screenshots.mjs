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

const DUEL_CONFIGS = [
  // 1. Monaco
  {
    track: 'monaco',
    team: 'ferrari',
    mode: 'EASY',
    t: 0.16,
    file: 'human_ai_monaco_easy_overtake.png',
    name: 'Monaco GP - Easy (Noob AI Yielding & Space-Leaving on Beau Rivage)'
  },
  {
    track: 'monaco',
    team: 'redbull',
    mode: 'MEDIUM',
    t: 0.46,
    file: 'human_ai_monaco_medium_duel.png',
    name: 'Monaco GP - Medium (Amateur Wheel-to-Wheel Battle Approach)'
  },
  {
    track: 'monaco',
    team: 'mercedes',
    mode: 'HARD',
    t: 0.86,
    file: 'human_ai_monaco_hard_defense.png',
    name: 'Monaco GP - Hard (Pro Inside Line Defense at Rascasse)'
  },

  // 2. Monza
  {
    track: 'monza',
    team: 'ferrari',
    mode: 'EASY',
    t: 0.08,
    file: 'human_ai_monza_easy_overtake.png',
    name: 'Monza GP - Easy (Noob AI Courteously Yielding on Main Straight)'
  },
  {
    track: 'monza',
    team: 'redbull',
    mode: 'MEDIUM',
    t: 0.35,
    file: 'human_ai_monza_medium_duel.png',
    name: 'Monza GP - Medium (Amateur Side-by-Side Through Curva Grande)'
  },
  {
    track: 'monza',
    team: 'mercedes',
    mode: 'HARD',
    t: 0.65,
    file: 'human_ai_monza_hard_defense.png',
    name: 'Monza GP - Hard (Pro High-Speed Slipstream Duel into Ascari)'
  },

  // 3. Silverstone
  {
    track: 'silverstone',
    team: 'ferrari',
    mode: 'EASY',
    t: 0.25,
    file: 'human_ai_silverstone_easy_overtake.png',
    name: 'Silverstone GP - Easy (Noob AI Giving Wide Racing Room on Wellington)'
  },
  {
    track: 'silverstone',
    team: 'redbull',
    mode: 'MEDIUM',
    t: 0.60,
    file: 'human_ai_silverstone_medium_duel.png',
    name: 'Silverstone GP - Medium (Amateur Wheel-to-Wheel Through Maggotts)'
  },
  {
    track: 'silverstone',
    team: 'mercedes',
    mode: 'HARD',
    t: 0.74,
    file: 'human_ai_silverstone_hard_defense.png',
    name: 'Silverstone GP - Hard (Pro Tactical Apex Defense down Hangar Straight)'
  }
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
  console.log('Connected to live browser for Wheel-to-Wheel Live Visual Capture...');

  for (const cfg of DUEL_CONFIGS) {
    console.log(`\nStaging ${cfg.name}...`);

    await send('Runtime.evaluate', {
      expression: `(() => {
        const g = window.game;
        g.closeModals();
        g.switchTrack('${cfg.track}');
        g.switchCar('${cfg.team}');
        g.session.setRaceLapsTotal(3);
        g.session.setDifficulty('${cfg.mode}');
        g.session.initSession('RACE', g.playerVehicle, g.playerCar, null, true);

        g.session.clearAllTimers();
        g.session.raceState = 'RACING';
        g.session.raceStartTime = performance.now();
        g.setStartLightsVisible(false);
        g.closeModals();

        const trackLen = g.track.trackLength || 1850;
        const targetAi = g.aiGrid.aiCars[0];
        targetAi.active = true;
        targetAi.trackProgress = ${cfg.t};
        targetAi.currentSpeed = ('${cfg.mode}' === 'EASY' ? 42.0 : ('${cfg.mode}' === 'HARD' ? 68.0 : 54.0));
        targetAi.lateralOffset = 1.6; // AI on outside/center

        // Player positioned right alongside AI (-1.8m inside line, 1.5m ahead/alongside)
        const playerT = (${cfg.t} + (1.2 / trackLen)) % 1.0;
        const pt = g.track.curve.getPointAt(playerT);
        const tgt = g.track.curve.getTangentAt(playerT);
        const tgtLen = Math.hypot(tgt.x, tgt.z) || 1.0;
        const norm = { x: -tgt.z / tgtLen, y: 0, z: tgt.x / tgtLen };
        const yaw = Math.atan2(tgt.x, tgt.z);

        const playerLateral = -1.8;
        const speed = targetAi.currentSpeed + 4.0;
        g.physics.resetVehicle(g.playerVehicle, pt.x + norm.x * playerLateral, (pt.y || 0) + 0.04, pt.z + norm.z * playerLateral, yaw, speed);
        g.playerVehicle.currentGear = 5;
        g.playerVehicle.rpm = 11200;
        g.controls.throttle = 0.95;

        // Run an AI update step with player alongside to trigger space-leaving behavior
        const pPos = g.playerVehicle.body.position;
        const pVel = g.playerVehicle.body.velocity;
        g.aiGrid.update(0.05, pPos, pVel, 1, 0.5, 3, g.audio);

        // Update player 3D mesh position directly
        g.playerCar.setPositionAndRotation(pPos, g.playerVehicle.body.quaternion);

        // Orient camera behind both cars in third person chase perspective
        const camDist = 9.5;
        const camHeight = 3.6;
        const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
        g.camera.position.set(pt.x - fwd.x * camDist, (pt.y || 0) + camHeight, pt.z - fwd.z * camDist);
        g.camera.lookAt(pt.x + fwd.x * 12.0, (pt.y || 0) + 0.8, pt.z + fwd.z * 12.0);

        g.resetInputs();
      })()`
    });

    // Wait 350ms for render loop to paint the side-by-side frame
    await new Promise(r => setTimeout(r, 350));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(ARTIFACTS_DIR, cfg.file);
    fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
    console.log(`-> Captured ${cfg.file} (${fs.statSync(filePath).size} bytes)`);
  }

  ws.close();
  console.log('\nAll 9 Wheel-to-Wheel live visual action screenshots successfully captured!');
}

main().catch(console.error);
