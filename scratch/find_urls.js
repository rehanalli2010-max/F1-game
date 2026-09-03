const fs = require('fs');

const raw = fs.readFileSync('scratch/next_data.json', 'utf8');
const data = JSON.parse(raw);

function searchKeys(obj, path = '') {
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    const curPath = path ? `${path}.${k}` : k;
    if (typeof obj[k] === 'string' && (obj[k].includes('build') || obj[k].includes('http') || obj[k].includes('.json') || obj[k].includes('unity') || obj[k].includes('crazy'))) {
      console.log(curPath, ':', obj[k].slice(0, 120));
    }
    searchKeys(obj[k], curPath);
  }
}

searchKeys(data?.props?.pageProps);
