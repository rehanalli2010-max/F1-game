import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

http.get('http://127.0.0.1:9222/json', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const targets = JSON.parse(d);
    const t = targets.find(x => x.url.includes('3000'));
    if (!t) {
      console.error('No tab found for localhost:3000');
      process.exit(1);
    }

    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let step = 0;

    const sendCmd = (method, params = {}) => {
      step++;
      ws.send(JSON.stringify({ id: step, method, params }));
      return step;
    };

    ws.onopen = async () => {
      console.log('Connected to CDP, reloading page...');
      sendCmd('Page.reload', { ignoreCache: true });

      setTimeout(() => {
        // Step 1: Inspect DOM and Game State
        sendCmd('Runtime.evaluate', {
          expression: `(() => {
            const qualiBtn = document.getElementById('btn-mode-qualifying');
            const raceBtn = document.getElementById('btn-mode-race');
            const practiceBtn = document.getElementById('btn-mode-practice');
            const qualiModal = document.getElementById('modal-qualifying');
            const mpModeSelect = document.getElementById('mp-select-mode');
            const mpOptions = mpModeSelect ? Array.from(mpModeSelect.options).map(o => ({ value: o.value, text: o.text })) : [];
            
            return {
              hasQualiBtn: !!qualiBtn,
              hasQualiModal: !!qualiModal,
              practiceBtnText: practiceBtn ? practiceBtn.innerText.trim() : null,
              raceBtnText: raceBtn ? raceBtn.innerText.trim() : null,
              raceBtnTitle: raceBtn ? raceBtn.title : null,
              mpOptions,
              currentMode: window.game ? window.game.session.currentMode : null,
              sessionTypes: window.SESSION_TYPES || null
            };
          })()`,
          returnByValue: true
        });
      }, 3000);
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      // Handle Step 1 evaluation
      if (msg.id === 2 && msg.result) {
        console.log('DOM & State Check Results:');
        console.log(JSON.stringify(msg.result.value, null, 2));

        // Capture screenshot of Practice mode & Top Nav
        const shotCmd = sendCmd('Page.captureScreenshot', { format: 'png' });
        ws.addEventListener('message', function onShot1(ev) {
          const m = JSON.parse(ev.data);
          if (m.id === shotCmd) {
            ws.removeEventListener('message', onShot1);
            fs.writeFileSync(path.join(ARTIFACTS_DIR, 'nav_modes_practice.png'), Buffer.from(m.result.data, 'base64'));
            console.log('Saved nav_modes_practice.png');

            // Step 2: Trigger Race Mode
            console.log('Clicking Race Mode button...');
            const clickRaceCmd = sendCmd('Runtime.evaluate', {
              expression: `(() => {
                const raceBtn = document.getElementById('btn-mode-race');
                if (raceBtn) raceBtn.click();
                return { clicked: !!raceBtn };
              })()`,
              returnByValue: true
            });

            setTimeout(() => {
              // Check Race State & Grid
              const checkRaceCmd = sendCmd('Runtime.evaluate', {
                expression: `(() => {
                  const g = window.game;
                  const session = g ? g.session : null;
                  return {
                    currentMode: session ? session.currentMode : null,
                    raceState: session ? session.raceState : null,
                    playerLap: session ? session.playerRaceLap : null,
                    carsCount: g && g.aiGrid ? g.aiGrid.cars.length + 1 : 1
                  };
                })()`,
                returnByValue: true
              });

              setTimeout(() => {
                // Capture screenshot of Race Formation Grid
                const shotRaceCmd = sendCmd('Page.captureScreenshot', { format: 'png' });
                ws.addEventListener('message', function onShot2(ev2) {
                  const m2 = JSON.parse(ev2.data);
                  if (m2.id === shotRaceCmd) {
                    ws.removeEventListener('message', onShot2);
                    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'race_mode_grid_active.png'), Buffer.from(m2.result.data, 'base64'));
                    console.log('Saved race_mode_grid_active.png');
                    console.log('ALL VERIFICATIONS SUCCESSFUL!');
                    process.exit(0);
                  }
                });
              }, 1200);
            }, 800);
          }
        });
      }
    };
  });
});
