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
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  const cleanUrl = req.url.split('?')[0];
  let filePath = path.join(__dirname, (cleanUrl === '/' || cleanUrl === '') ? 'index.html' : cleanUrl);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

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
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`F1 Game Server running at http://localhost:${PORT}/ (Port ${PORT} in use)`);
    if (process.argv.includes('--open')) {
      exec(`start http://localhost:${PORT}/`);
    }
    // Keep process alive so VS Code preLaunchTask doesn't report exit code 0
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
