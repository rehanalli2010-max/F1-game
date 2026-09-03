const http = require('http');

async function main() {
  const pages = await new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let str = '';
      res.on('data', d => str += d);
      res.on('end', () => resolve(JSON.parse(str)));
    }).on('error', reject);
  });

  const page = pages.find(p => p.url.includes('localhost:3000')) || pages[0];
  if (!page) {
    console.log('No page found on 9222');
    process.exit(1);
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise(res => {
      const curId = id++;
      pending.set(curId, res);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  const logs = [];
  const errors = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      logs.push(msg.params.args.map(a => a.value || a.description || '').join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails);
    }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.reload');

  await new Promise(r => setTimeout(r, 2000));

  console.log('Console Logs:', logs);
  console.log('Exceptions:', JSON.stringify(errors, null, 2));

  const state = await send('Runtime.evaluate', {
    expression: `
      (() => {
        return {
          hasGame: !!window.game,
          scripts: Array.from(document.querySelectorAll('script')).map(s => s.src || s.type),
          readyState: document.readyState
        };
      })()
    `,
    returnByValue: true
  });
  console.log('State:', state?.result?.value);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
