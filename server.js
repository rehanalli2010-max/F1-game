const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

// In-memory buffer cache for vendor scripts and 3D models (superfast response)
const _memoryCache = new Map();

const server = http.createServer((req, res) => {
  const cleanUrl = req.url.split('?')[0];
  let filePath = path.join(__dirname, (cleanUrl === '/' || cleanUrl === '') ? 'index.html' : cleanUrl);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const isImmutable = cleanUrl.startsWith('/js/vendor/') || ext === '.woff2';
  const cacheControl = isImmutable
    ? 'public, max-age=86400, immutable'
    : 'no-cache, must-revalidate';

  if (_memoryCache.has(filePath)) {
    const cached = _memoryCache.get(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': cacheControl
    });
    res.end(cached);
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      if (isImmutable) {
        _memoryCache.set(filePath, content);
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': cacheControl
      });
      res.end(content);
    }
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`F1 Game Server running at http://localhost:${PORT}/ (Port ${PORT} in use)`);
    if (process.argv.includes('--open')) {
      exec(`start http://localhost:${PORT}/`);
    }
    // Keep alive for VS Code preLaunchTask problem matcher
    setInterval(() => {}, 1000 * 60 * 60);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

console.log('Starting F1 Game Server...');
server.listen(PORT, () => {
  console.log(`F1 Game Server running at http://localhost:${PORT}/`);
  if (process.argv.includes('--open')) {
    exec(`start http://localhost:${PORT}/`);
  }
});
