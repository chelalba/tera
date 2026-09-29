/* ===============================================================
   TiraMood, the local server.

   Serves the pages and answers /api on your own computer. On Vercel
   neither job is done here: Vercel serves the files itself and runs
   api/[...path].js for the rest. Both call the same routes, so what
   you see locally is what customers get.

   Run it with:  npm start
   =============================================================== */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const { handle, corsHeadersFor, seed } = require('./routes.js');

/* A host tells us which port to use. Nobody does locally, and then we
   are free to hunt for one that is not taken. */
const GIVEN_PORT = Number(process.env.PORT) || 0;
const PORT = GIVEN_PORT || 5500;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.join(__dirname, '..');

/* ---------------------------------------------------------------
   Reading a request
---------------------------------------------------------------- */

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 256 * 1024) { reject(new Error('too big')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (err) { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}

function isLocal(req) {
  const ip = req.socket.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store'
  });
  res.end(text);
}

/* ---------------------------------------------------------------
   Static files
---------------------------------------------------------------- */

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

/* only these may be read over http, so the database, the server
   source and the original photographs stay private */
const PUBLIC = ['assets', 'pages', 'index.html', 'robots.txt'];

function serveFile(req, res, url) {
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (rel === '') rel = 'index.html';

  const full = path.resolve(ROOT, rel);
  const top = path.relative(ROOT, full).split(path.sep)[0];

  if (!full.startsWith(ROOT) || !PUBLIC.includes(top)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end('Not found');
  }

  fs.stat(full, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('Not found');
    }
    const ext = path.extname(full).toLowerCase();
    const stamp = stat.mtime.toUTCString();

    /* no-cache means ask first, not do not cache. The browser keeps
       the file and we answer 304 when it has not moved, so pages stay
       quick but an edit shows up on the next reload. */
    const headers = {
      'content-type': TYPES[ext] || 'application/octet-stream',
      'cache-control': 'no-cache',
      'last-modified': stamp
    };

    if (req.headers['if-modified-since'] === stamp) {
      res.writeHead(304, headers);
      return res.end();
    }

    headers['content-length'] = stat.size;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(full).pipe(res);
  });
}

/* ---------------------------------------------------------------
   Go
---------------------------------------------------------------- */

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

  if (url.pathname.startsWith('/api')) {
    const cors = corsHeadersFor(req.headers.origin);
    if (cors) Object.keys(cors).forEach(k => res.setHeader(k, cors[k]));

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    readBody(req)
      .then(body => handle({
        route: url.pathname.replace(/^\/api/, '') || '/',
        method: req.method,
        body,
        headers: req.headers,
        local: isLocal(req)
      }))
      .then(result => sendJson(res, result.status, result.body))
      .catch(err => {
        console.error(err);
        sendJson(res, 400, { error: err.message || 'something went wrong' });
      });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'content-type': 'text/plain' });
    return res.end('Method not allowed');
  }

  serveFile(req, res, url);
});

function listen(port, triesLeft) {
  server.once('error', err => {
    /* When the port was handed to us, moving off it would leave the
       site unreachable with nothing to explain why. Better to stop. */
    if (err.code !== 'EADDRINUSE' || triesLeft <= 0 || GIVEN_PORT) {
      console.error('\n  Could not start: ' + err.message + '\n');
      process.exit(1);
    }
    console.log('  Port ' + port + ' is taken, trying ' + (port + 1));
    listen(port + 1, triesLeft - 1);
  });

  server.listen(port, HOST);
}

server.once('listening', () => {
  const where = 'http://localhost:' + server.address().port;
  console.log('');
  console.log('  ' + seed.SHOP.name + ' is running');
  console.log('  Shop      ' + where + '/');
  console.log('  Manager   ' + where + '/pages/owner.html');
  console.log('  Database  ' + (process.env.TURSO_URL ? 'Turso, ' + process.env.TURSO_URL : 'data/tera.db'));
  console.log('');
  if (process.env.OWNER_PASSWORD) {
    console.log('  The menu manager asks for the OWNER_PASSWORD you set.');
  } else {
    console.log('  No OWNER_PASSWORD set, so the menu can only be changed from');
    console.log('  this computer. Set one before putting the site online.');
  }
  console.log('');
  console.log('  Leave this window open while you use the site. Ctrl+C stops it.');
  console.log('');
});

listen(PORT, 15);
