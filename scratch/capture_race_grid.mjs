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
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let step = 0;

    const sendCmd = (method, params = {}) => {
      step++;
      ws.send(JSON.stringify({ id: step, method, params }));
      return step;
    };

    ws.onopen = async () => {
      // Click Skip to Starting Grid button if open or trigger Race with skipAd
      sendCmd('Runtime.evaluate', {
        expression: `(() => {
          const skipBtn = document.getElementById('ad-btn-skip');
          if (skipBtn && skipBtn.offsetParent !== null) {
            skipBtn.click();
            return 'skipped_ad';
          }
          window.game.session.initSession('RACE', window.game.playerVehicle, window.game.playerCar, null, true);
          return 'inited_race_direct';
        })()`,
        returnByValue: true
      });

      // Wait 1.5s for starting grid and lights sequence
      setTimeout(() => {
        const shotCmd = sendCmd('Page.captureScreenshot', { format: 'png' });
        ws.addEventListener('message', function onShot(ev) {
          const m = JSON.parse(ev.data);
          if (m.id === shotCmd) {
            fs.writeFileSync(path.join(ARTIFACTS_DIR, 'race_grid_10cars_start.png'), Buffer.from(m.result.data, 'base64'));
            console.log('Saved race_grid_10cars_start.png');

            // Evaluate state
            sendCmd('Runtime.evaluate', {
              expression: `(() => {
                const g = window.game;
                return {
                  mode: g.session.currentMode,
                  state: g.session.raceState,
                  cars: g.aiGrid ? g.aiGrid.cars.length + 1 : 1,
                  badge: document.getElementById('session-badge-text')?.textContent,
                  activeButton: document.querySelector('.session-btn.active')?.textContent.trim()
                };
              })()`,
              returnByValue: true
            });
          } else if (m.result && m.result.result && m.result.result.value) {
            console.log('Game State on Grid:', m.result.result.value);
            process.exit(0);
          }
        });
      }, 1800);
    };
  });
});
