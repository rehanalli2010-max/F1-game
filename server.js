const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const zlib = require('zlib');

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

// Compressible MIME types
const COMPRESSIBLE_TYPES = new Set([
  'text/html',
  'text/css',
  'application/javascript',
  'application/json',
  'image/svg+xml',
  'model/gltf+json'
]);

// In-memory buffer cache for vendor scripts and 3D models (superfast response)
const _memoryCache = new Map();

// Preload critical immutable vendor assets into memory at startup
const PRELOAD_ASSETS = [
  '/js/vendor/three.module.min.js',
  '/js/vendor/cannon-es.js',
  '/js/vendor/peerjs.min.js',
  '/assets/models/ferrari.glb',
  '/assets/models/redbull.glb'
];

const ROOT_DIR = path.resolve(__dirname);

function setSecurityHeaders(res, extraHeaders = {}) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...extraHeaders
  };
  return headers;
}

function shouldCompress(req, contentType) {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  return COMPRESSIBLE_TYPES.has(contentType) && acceptEncoding.includes('gzip');
}

function compressContent(content, encoding) {
  if (encoding === 'gzip') {
    return zlib.gzipSync(content);
  }
  return content;
}

// Preload critical assets at startup
function preloadAssets() {
  console.log('Preloading critical assets into memory...');
  for (const asset of PRELOAD_ASSETS) {
    const filePath = path.resolve(ROOT_DIR, '.' + path.sep + path.normalize(asset));
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      _memoryCache.set(filePath, content);
      console.log(`  Preloaded: ${asset} (${(content.length / 1024).toFixed(1)} KB)`);
    }
  }
  console.log(`Preload complete. ${_memoryCache.size} assets in memory cache.`);
}

const server = http.createServer((req, res) => {
  let cleanUrl = req.url.split('?')[0];
  try {
    cleanUrl = decodeURIComponent(cleanUrl);
  } catch (e) {
    res.writeHead(400, setSecurityHeaders(res, { 'Content-Type': 'text/plain' }));
    res.end('400 Bad Request');
    return;
  }

  // Reject any explicit directory traversal attempts
  if (cleanUrl.includes('..')) {
    res.writeHead(403, setSecurityHeaders(res, { 'Content-Type': 'text/plain' }));
    res.end('403 Forbidden: Traversal Denied');
    return;
  }

  const relativePath = (cleanUrl === '/' || cleanUrl === '') ? 'index.html' : cleanUrl;
  const filePath = path.resolve(ROOT_DIR, '.' + path.sep + path.normalize(relativePath));

  // Verify the target path stays strictly inside root directory
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, setSecurityHeaders(res, { 'Content-Type': 'text/plain' }));
    res.end('403 Forbidden: Out of Bounds');
    return;
  }

  // Deny access to hidden dotfiles (.git, .env, etc.)
  if (path.basename(filePath).startsWith('.') && path.basename(filePath) !== '.') {
    res.writeHead(403, setSecurityHeaders(res, { 'Content-Type': 'text/plain' }));
    res.end('403 Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const isImmutable = cleanUrl.startsWith('/js/vendor/') || ext === '.woff2' || ext === '.glb';
  const cacheControl = isImmutable
    ? 'public, max-age=86400, immutable'
    : 'no-cache, must-revalidate';

  // Check memory cache first
  if (_memoryCache.has(filePath)) {
    const cached = _memoryCache.get(filePath);
    const headers = setSecurityHeaders(res, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl
    });

    if (shouldCompress(req, contentType)) {
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
      res.writeHead(200, headers);
      res.end(zlib.gzipSync(cached));
    } else {
      res.writeHead(200, headers);
      res.end(cached);
    }
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT' || err.code === 'EISDIR') {
        res.writeHead(404, setSecurityHeaders(res, { 'Content-Type': 'text/plain' }));
        res.end('404 Not Found');
      } else {
        res.writeHead(500, setSecurityHeaders(res, { 'Content-Type': 'text/plain' }));
        res.end('Server Error: ' + err.code);
      }
    } else {
      // Cache immutable assets
      if (isImmutable) {
        _memoryCache.set(filePath, content);
      }

      const headers = setSecurityHeaders(res, {
        'Content-Type': contentType,
        'Cache-Control': cacheControl
      });

      if (shouldCompress(req, contentType)) {
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);
        res.end(zlib.gzipSync(content));
      } else {
        res.writeHead(200, headers);
        res.end(content);
      }
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
preloadAssets();
server.listen(PORT, () => {
  console.log(`F1 Game Server running at http://localhost:${PORT}/`);
  if (process.argv.includes('--open')) {
    exec(`start http://localhost:${PORT}/`);
  }
});