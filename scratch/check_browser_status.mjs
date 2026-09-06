import http from 'node:http';

async function main() {
  const data = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });

  const target = data.find(x => x.type === 'page' && x.url && x.url.includes('3000')) || data.find(x => x.type === 'page');
  if (!target) {
    console.log('No page target found');
    return;
  }
  console.log('Connecting to target:', target.url);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          return {
            title: document.title,
            hasGame: typeof window.game !== 'undefined',
            gameState: window.game ? {
              hasTrack: !!window.game.track,
              hasPhysics: !!window.game.physics,
              hasAiGrid: !!window.game.aiGrid,
              aiCarsCount: window.game.aiGrid ? window.game.aiGrid.aiCars.length : 0
            } : null
          };
        })()`,
        returnByValue: true
      }
    }));
  };

  ws.onmessage = (e) => {
    console.log('RESULT:', JSON.stringify(JSON.parse(e.data), null, 2));
    ws.close();
  };
}

main().catch(console.error);
