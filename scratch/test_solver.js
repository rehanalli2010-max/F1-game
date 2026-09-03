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

  const res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        try {
          const g = window.game;
          const w = g.physics.world;
          const b = g.playerVehicle.body;

          // Check contact and friction equations in solver
          const solver = w.solver;
          const eqInfo = solver.equations.map(eq => {
            return {
              type: eq.constructor.name,
              bi: eq.bi?.id,
              bj: eq.bj?.id,
              enabled: eq.enabled,
              minForce: eq.minForce,
              maxForce: eq.maxForce,
              multiplier: eq.multiplier,
              invMassi: eq.bi?.invMass,
              invMassj: eq.bj?.invMass
            };
          });

          // Check narrowphase contact pairs
          const contacts = [];
          if (w.narrowphase && w.narrowphase.contactEquations) {
            for (const c of w.narrowphase.contactEquations) {
              contacts.push({
                bi: c.bi.id,
                bj: c.bj.id,
                ni: c.ni,
                ri: c.ri,
                rj: c.rj,
                penetration: c.penetration
              });
            }
          }

          return {
            equationsCount: solver.equations.length,
            equations: eqInfo.slice(0, 10),
            contacts: contacts.slice(0, 5),
            gravity: w.gravity,
            damping: { linear: b.linearDamping, angular: b.angularDamping },
            linearFactor: b.linearFactor
          };
        } catch (err) {
          return { error: err.message, stack: err.stack };
        }
      })()
    `,
    returnByValue: true
  });

  console.log('Solver equations:');
  console.log(JSON.stringify(res.result.value, null, 2));
  process.exit(0);
}
main().catch(console.error);
