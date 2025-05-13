// server/server.js
const http  = require('http');
const url   = require('url');
const fetch = require('node-fetch');
const admin = require('firebase-admin');

// 1) Initialise Firebase Admin
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'conciergeapp-513ca.firebasestorage.app'
  });
  console.log('✅ Firebase admin initialized');
} catch (e) {
  console.error('❌ Firebase init error:', e);
  process.exit(1);
}

const BUCKET = admin.storage().bucket();
const PORT   = process.env.PORT || 3000;

// Allowed origins for CORS
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
]);

const server = http.createServer(async (req, res) => {
  const { pathname, query } = url.parse(req.url, true);
  const origin = req.headers.origin;

  // Always send CORS headers back
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Handle pre-flight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.writeHead(204).end();
  }

  // Health check
  if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('🛥️  Image proxy is running');
  }

  // Image proxy
  if (req.method === 'GET' && pathname === '/image-proxy') {
    const imageUrl = query.url;
    if (!imageUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('Missing url query parameter');
    }

    console.log('Proxying:', imageUrl);

    try {
      // Extract the /o/<path>? token segment
      const marker = '/o/';
      const i = imageUrl.indexOf(marker);
      if (i === -1) throw new Error('Invalid Firebase URL');

      let p = imageUrl.slice(i + marker.length);
      const q = p.indexOf('?');
      if (q !== -1) p = p.slice(0, q);
      const filePath = decodeURIComponent(p);
      console.log('  filePath =', filePath);

      const file = BUCKET.file(filePath);
      const [exists] = await file.exists();
      if (!exists) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not found in storage');
      }

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000
      });
      console.log('  signedUrl obtained');

      const f = await fetch(signedUrl);
      if (!f.ok) throw new Error(`Fetch failed ${f.status}`);

      const buffer = await f.buffer();
      const contentType = f.headers.get('content-type') || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300'
      });
      return res.end(buffer);
    } catch (err) {
      console.error('Proxy error:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end(`Server error: ${err.message}`);
    }
  }

  // 404 for anything else
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  return res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`🚀 Proxy listening on http://localhost:${PORT}`);
});


