const https = require('https');
const fs = require('fs');

https.get('https://www.crazygames.com/game/crazy-grand-prix', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('scratch/cg_page.html', data);
    console.log('Saved page, length:', data.length);
    
    // Look for JSON or build data
    const jsonMatches = data.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (jsonMatches) {
      fs.writeFileSync('scratch/next_data.json', jsonMatches[1]);
      console.log('Saved __NEXT_DATA__');
    }
  });
}).on('error', err => console.error(err));
