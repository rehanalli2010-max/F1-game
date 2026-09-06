import http from 'node:http';

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
    const failedRequests = [];
    const consoleErrors = [];

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.method === 'Network.responseReceived') {
        const { status, url } = msg.params.response;
        if (status >= 400) {
          failedRequests.push({ status, url });
        }
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
      }
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
      await send('Network.enable');
      await send('Runtime.enable');

      console.log('Reloading page and monitoring network & console...');
      await send('Page.reload', { ignoreCache: true });
      await new Promise(r => setTimeout(r, 3500));

      console.log('Failed Requests:', failedRequests);
      console.log('Console Errors:', consoleErrors);

      process.exit(0);
    };
  });
});
