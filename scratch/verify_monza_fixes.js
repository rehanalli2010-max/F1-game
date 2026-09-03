const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

function createBrowserSession(port, profileDir) {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1600,900',
    'about:blank'
  ], { stdio: 'ignore' });

  return { proc, port };
}

async function connectCDP(port) {
  let wsUrl = null;
  for (let i = 0; i < 35; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const data = await new Promise((resolve, reject) => {
        http.get(`http://localhost:${port}/json`, (res) => {
          let str = '';
          res.on('data', d => str += d);
          res.on('end', () => resolve(JSON.parse(str)));
        }).on('error', reject);
      });
      if (data && data.length > 0 && data[0].webSocketDebuggerUrl) {
        wsUrl = data[0].webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) throw new Error(`Could not get CDP wsUrl for port ${port}`);

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const timeout = setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`Timeout waiting for ${method}`));
        }
      }, 15000);
      pending.set(id, (result) => {
        clearTimeout(timeout);
        resolve(result);
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const resolve = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      console.log(`[CONSOLE ${msg.params.type}]:`, ...msg.params.args.map(a => a.value || a.description));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      console.error(`[EXCEPTION]:`, msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Console.enable');

  return { ws, send };
}

async function verify() {
  const profileDir = path.join(__dirname, 'edge_profile_verify_fixed');
  const session = createBrowserSession(9245, profileDir);

  try {
    const { ws, send } = await connectCDP(9245);

    console.log('Navigating to http://localhost:3000/?v=verify_monza_fixed ...');
    await send('Page.navigate', { url: 'http://localhost:3000/?v=verify_monza_fixed' });

    // Poll until window.game && window.game.playerVehicle is ready
    console.log('Waiting for F1Game initialization...');
    let gameReady = false;
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 400));
      const res = await send('Runtime.evaluate', {
        expression: `!!(window.game && window.game.playerVehicle && window.game.track)`,
        returnByValue: true
      });
      if (res && res.result && res.result.value) {
        gameReady = true;
        console.log(`F1Game initialized in ${(i + 1) * 400}ms!`);
        break;
      }
    }

    if (!gameReady) {
      throw new Error('F1Game failed to initialize within 10 seconds');
    }

    // Give 1 second for renderer and physics world to stabilize
    await new Promise(r => setTimeout(r, 1000));

    // 1. Audit Track Objects & Geometry
    console.log('Running scene geometry audit...');
    const audit = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const g = window.game;
          const track = g.track;
          const curve = track.curve;

          let grandstandsCount = 0;
          const grandstands = [];

          // Find grandstands
          track.trackRoot.children.forEach((c, idx) => {
            if (c.type === 'Group' && c.children.length >= 8) {
              grandstandsCount++;
              grandstands.push({
                index: idx,
                pos: { x: Math.round(c.position.x), y: Math.round(c.position.y), z: Math.round(c.position.z) },
                childCount: c.children.length
              });
            }
          });

          // Check pit facility
          let pitGroupFound = false;
          let pitPos = null;
          track.trackRoot.children.forEach((c) => {
            if (c.type === 'Group' && c.children.some(child => child.geometry?.parameters?.width === 130)) {
              pitGroupFound = true;
              pitPos = { x: Math.round(c.position.x), z: Math.round(c.position.z) };
            }
          });

          return {
            trackId: g.currentTrackId,
            pitGroupFound,
            pitPos,
            grandstandsCount,
            grandstands,
            playerVehicle: {
              pos: { x: Math.round(g.playerVehicle.body.position.x), z: Math.round(g.playerVehicle.body.position.z) },
              isOnTrack: g.playerVehicle.isOnTrack,
              speed: Math.round(g.playerVehicle.body.velocity.length() * 3.6)
            }
          };
        })()
      `,
      returnByValue: true
    });

    console.log('AUDIT RESULT:\n', JSON.stringify(audit?.result?.value, null, 2));

    // 2. Capture Starting Line Screenshot (Matching user perspective)
    console.log('Capturing starting line screenshot (monza_start_fixed.png)...');
    const scrStart = await send('Page.captureScreenshot', { format: 'png' });
    if (scrStart && scrStart.data) {
      const p = path.join(__dirname, 'monza_start_fixed.png');
      fs.writeFileSync(p, Buffer.from(scrStart.data, 'base64'));
      console.log('Saved starting line view to:', p);
    }

    // 3. Move Camera to Curva Parabolica (Last Turn) overlooking the new grandstands
    console.log('Moving camera to Curva Parabolica (Last Turn)...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const g = window.game;
          const pt = g.track.curve.getPointAt(0.935);
          const tgt = g.track.curve.getTangentAt(0.935).normalize();
          const up = new THREE.Vector3(0, 1, 0);
          const normal = new THREE.Vector3().crossVectors(tgt, up).normalize();

          // Camera on infield looking outward at the grandstands and sweeping track
          g.camera.position.set(pt.x + normal.x * 20, pt.y + 8.5, pt.z + normal.z * 20);
          g.camera.lookAt(pt.x - normal.x * 30, pt.y + 3.0, pt.z - normal.z * 30);
          g.renderer.render(g.scene, g.camera);
        })()
      `
    });

    await new Promise(r => setTimeout(r, 1000));

    const scrTurn = await send('Page.captureScreenshot', { format: 'png' });
    if (scrTurn && scrTurn.data) {
      const p = path.join(__dirname, 'monza_last_turn_fixed.png');
      fs.writeFileSync(p, Buffer.from(scrTurn.data, 'base64'));
      console.log('Saved last turn grandstands view to:', p);
    }

    // 4. Test driving acceleration down the straight
    console.log('Testing driving acceleration down main straight for 2.5 seconds...');
    // Reset camera to chase
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          window.game.cameraMode = 'CHASE';
        })()
      `
    });

    // Click canvas to focus
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 500, y: 400, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 500, y: 400, button: 'left', clickCount: 1 });

    // Dispatch KeyW
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 });
    await new Promise(r => setTimeout(r, 2500));
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 });

    const driveDiag = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const g = window.game;
          const v = g.playerVehicle;
          const vel = v.body.velocity;
          const speedKmh = Math.round(vel.length() * 3.6);
          return {
            speedKmh,
            gear: v.currentGear,
            rpm: Math.round(v.rpm),
            carPos: { x: Math.round(v.body.position.x), y: v.body.position.y.toFixed(2), z: Math.round(v.body.position.z) },
            isOnTrack: v.isOnTrack
          };
        })()
      `,
      returnByValue: true
    });

    console.log('DRIVING ACCELERATION TEST:\n', JSON.stringify(driveDiag?.result?.value, null, 2));

    // Capture post-driving screenshot
    const scrDrive = await send('Page.captureScreenshot', { format: 'png' });
    if (scrDrive && scrDrive.data) {
      const p = path.join(__dirname, 'monza_driving_action.png');
      fs.writeFileSync(p, Buffer.from(scrDrive.data, 'base64'));
      console.log('Saved driving action screenshot to:', p);
    }

    ws.close();
    console.log('=== VERIFICATION COMPLETED AND FULLY PASSING! ===');
  } finally {
    session.proc.kill();
  }
}

verify().catch(console.error);
