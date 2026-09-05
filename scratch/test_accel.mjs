import http from 'node:http';

async function getWsUrl() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)[0].webSocketDebuggerUrl));
    });
  });
}

async function main() {
  const ws = new WebSocket(await getWsUrl());
  let msgId = 1;
  const pending = new Map();
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id).resolve(d.result);
      pending.delete(d.id);
    }
  };
  const send = (m, p = {}) => new Promise(resolve => {
    const id = msgId++;
    pending.set(id, { resolve });
    ws.send(JSON.stringify({ id, method: m, params: p }));
  });
  await new Promise(r => ws.onopen = r);

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      g.playerVehicle.isReversing = false;
      g.controls.brake = 0;
      g.keys['KeyW'] = true;
      g.touchThrottle = 1.0;
      g.controls.throttle = 1.0;
      return {
        controls: g.controls,
        gear: g.playerVehicle.currentGear,
        isReversing: g.playerVehicle.isReversing
      };
    })()`,
    returnByValue: true
  });
  console.log('Applied throttle:', res.result.value);

  await new Promise(r => setTimeout(r, 1500));

  const after = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      return {
        pos: g.playerVehicle.body.position,
        vel: g.playerVehicle.body.velocity,
        speedKmh: Math.hypot(g.playerVehicle.body.velocity.x, g.playerVehicle.body.velocity.z) * 3.6,
        rpm: g.playerVehicle.rpm,
        gear: g.playerVehicle.currentGear
      };
    })()`,
    returnByValue: true
  });
  console.log('After 1.5s:', after.result.value);
  ws.close();
}
main();
