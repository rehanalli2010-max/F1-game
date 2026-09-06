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
      const evaluate = async (expr) => {
        const res = await send('Runtime.evaluate', {
          expression: expr,
          returnByValue: true
        });
        return res?.result?.value;
      };

      console.log('--- TEST: Auditing i18n in live browser ---');
      const i18nAudit = await evaluate(`(() => {
        const i18n = window.game.i18n;
        const languages = ['en', 'it', 'es', 'fr', 'de', 'pt', 'ja'];
        const enKeys = Object.keys(i18n.translations['en'] || {});
        const missingByLang = {};

        languages.forEach(lang => {
          const dict = i18n.translations[lang] || {};
          const missing = enKeys.filter(k => dict[k] === undefined);
          if (missing.length > 0) {
            missingByLang[lang] = missing;
          }
        });

        // Test live DOM update when switching to Italian and back to English
        i18n.setLanguage('it');
        const itHudDriver = document.getElementById('hud-driver-name')?.textContent;
        i18n.setLanguage('en');
        const enHudDriver = document.getElementById('hud-driver-name')?.textContent;

        return {
          totalEnKeys: enKeys.length,
          missingByLang,
          itHudDriver,
          enHudDriver
        };
      })()`);

      console.log('i18n Audit Result:', i18nAudit);

      process.exit(0);
    };
  });
});
