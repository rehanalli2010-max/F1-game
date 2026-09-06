import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

http.get('http://127.0.0.1:9222/json', async (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const tabs = JSON.parse(data);
    const tab = tabs.find(t => t.url.includes('localhost:3000') || t.title.includes('Formula 1'));
    if (!tab) {
      console.error('Target tab not found!');
      process.exit(1);
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    let msgId = 1;
    const pending = new Map();

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg.result);
        pending.delete(msg.id);
      }
    };

    const send = (method, params = {}) => new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

    ws.onopen = async () => {
      console.log('Connected to CDP!');

      // Reload page cleanly to pick up fresh JS
      console.log('Reloading page...');
      await send('Page.reload', { ignoreCache: true });
      await new Promise(r => setTimeout(r, 3000));

      const evaluate = async (expr) => {
        const res = await send('Runtime.evaluate', {
          expression: expr,
          returnByValue: true
        });
        return res?.result?.value;
      };

      const captureScreenshot = async (name) => {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        const filePath = path.join(ARTIFACTS_DIR, name);
        fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
        console.log(`Saved screenshot: ${name}`);
        return filePath;
      };

      const tracksToTest = [
        { id: 'silverstone', name: 'Silverstone GP' },
        { id: 'monza', name: 'Monza (Italian GP circuit)' },
        { id: 'monaco', name: 'Monaco GP' }
      ];

      const results = {};

      for (const t of tracksToTest) {
        console.log(`\n========================================`);
        console.log(`Testing Circuit: ${t.name} (${t.id})`);
        console.log(`========================================`);

        // 1. Switch to track
        await evaluate(`window.game.switchTrack('${t.id}')`);
        await new Promise(r => setTimeout(r, 2000));

        // 2. Check initial standstill state
        const initialStatus = await evaluate(`(() => {
          const g = window.game;
          return {
            track: g.currentTrackId,
            speedKmh: Math.round(g.playerVehicle.body.velocity.length() * 3.6),
            throttle: g.controls.throttle,
            brake: g.controls.brake,
            keyW: !!g.keys['KeyW'],
            keyUp: !!g.keys['ArrowUp'],
            touchThrottle: g.touchThrottle
          };
        })()`);
        console.log('Standstill State:', initialStatus);

        // Wait 1.5 seconds without pressing any keys to confirm ZERO forward movement
        await new Promise(r => setTimeout(r, 1500));
        const afterWaitStatus = await evaluate(`(() => {
          const g = window.game;
          return {
            speedKmh: Math.round(g.playerVehicle.body.velocity.length() * 3.6),
            throttle: g.controls.throttle,
            posX: g.playerVehicle.body.position.x,
            posZ: g.playerVehicle.body.position.z
          };
        })()`);
        console.log('After 1.5s idle check (must be 0 km/h):', afterWaitStatus);

        await captureScreenshot(`${t.id}_standstill_verified.png`);

        // 3. Press 'KeyW' to accelerate manually for 3 seconds
        console.log('Applying manual throttle (KeyW)...');
        await evaluate(`window.game.keys['KeyW'] = true;`);
        
        // Wait 2.5 seconds under active acceleration
        await new Promise(r => setTimeout(r, 2500));

        const drivingStatus = await evaluate(`(() => {
          const g = window.game;
          return {
            speedKmh: Math.round(g.playerVehicle.body.velocity.length() * 3.6),
            throttle: g.controls.throttle,
            rpm: Math.round(g.playerVehicle.rpm),
            gear: g.playerVehicle.currentGear
          };
        })()`);
        console.log('Active Driving State (KeyW pressed):', drivingStatus);

        await captureScreenshot(`${t.id}_manual_driving_verified.png`);

        // 4. Release 'KeyW' to verify throttle zeroes and car decelerates
        console.log('Releasing manual throttle (KeyW = false)...');
        await evaluate(`window.game.keys['KeyW'] = false;`);

        await new Promise(r => setTimeout(r, 1000));

        const decelStatus = await evaluate(`(() => {
          const g = window.game;
          return {
            speedKmh: Math.round(g.playerVehicle.body.velocity.length() * 3.6),
            throttle: g.controls.throttle,
            isDecelerating: g.controls.throttle === 0
          };
        })()`);
        console.log('Deceleration State (KeyW released):', decelStatus);

        // 5. Apply brake (KeyS) to halt
        console.log('Applying brake (KeyS)...');
        await evaluate(`window.game.keys['KeyS'] = true;`);
        await new Promise(r => setTimeout(r, 1500));
        await evaluate(`window.game.keys['KeyS'] = false;`);

        const stoppedStatus = await evaluate(`(() => {
          const g = window.game;
          return {
            speedKmh: Math.round(g.playerVehicle.body.velocity.length() * 3.6),
            throttle: g.controls.throttle,
            brake: g.controls.brake
          };
        })()`);
        console.log('Stopped State:', stoppedStatus);

        results[t.id] = {
          initialSpeed: initialStatus.speedKmh,
          initialThrottle: initialStatus.throttle,
          idleSpeed: afterWaitStatus.speedKmh,
          acceleratedSpeed: drivingStatus.speedKmh,
          decelThrottle: decelStatus.throttle,
          stoppedSpeed: stoppedStatus.speedKmh,
          autoDriveBugPresent: initialStatus.speedKmh > 0 || initialStatus.throttle > 0 || afterWaitStatus.speedKmh > 0
        };
      }

      console.log('\n========================================');
      console.log('FINAL TEST RESULTS SUMMARY:');
      console.log(JSON.stringify(results, null, 2));
      console.log('========================================');

      process.exit(0);
    };
  });
});
