import http from 'node:http';

async function main() {
  const data = await new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
  });

  const t = data.find(x => x.url && x.url.includes('3000'));
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const g = window.game;
          const pt = g.track.curve.getPointAt(0.20);
          const pPos = g.playerVehicle.body.position;
          const carPos = g.playerCar.group.position;
          const groundMesh = g.track.trackRoot.children.find(c => c.geometry && c.geometry.type === 'PlaneGeometry' && c.geometry.parameters.width > 1000);

          return {
            trackPointAt0_20: { x: pt.x, y: pt.y, z: pt.z },
            playerVehicleBodyY: pPos.y,
            playerCarGroupY: carPos.y,
            groundPlaneY: groundMesh ? groundMesh.position.y : null
          };
        })()`,
        returnByValue: true
      }
    }));
  };

  ws.onmessage = (e) => {
    console.log('MSG:', e.data);
    ws.close();
  };
}

main().catch(console.error);
