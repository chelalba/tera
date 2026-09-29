/* ===============================================================
   Tera Home Bakery, server.

   Serves the pages and answers the /api calls. No framework and no
   packages: everything used here is built into Node.

   Run it with:  npm start        (or: node server.js)
   =============================================================== */

'use strict';

/* SQLite is built into Node, but versions 22 and 23 keep it behind a
   flag. If it is not there, start ourselves again with the flag on
   rather than making anyone remember it. */
try {
  require('node:sqlite');
} catch (err) {
  if (process.env.TERA_RESPAWNED) {
    console.error('\nThis needs Node 22 or newer. You have ' + process.version + '.\n');
    process.exit(1);
  }
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(
    process.execPath,
    ['--experimental-sqlite', __filename].concat(process.argv.slice(2)),
    { stdio: 'inherit', env: Object.assign({}, process.env, { TERA_RESPAWNED: '1' }) }
  );
  process.exit(result.status === null ? 1 : result.status);
}

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const db = require('./db.js');

/* A host such as Railway tells us which port to use. Locally nobody
   does, and then we are free to hunt for one that is not taken. */
const GIVEN_PORT = Number(process.env.PORT) || 0;
const PORT = GIVEN_PORT || 5500;
const HOST = process.env.HOST || '0.0.0.0';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || '';
const ROOT = path.join(__dirname, '..');

/* ---------------------------------------------------------------
   The seed. data.js stays the one place the starting menu and the
   shop settings are written, so the browser and the database agree.
---------------------------------------------------------------- */

function readSeed() {
  const source = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'data.js'), 'utf8');
  const load = new Function(source + '\n; return { SHOP, CATEGORIES, MENU };');
  return load();
}

const seed = readSeed();

if (db.isEmpty()) {
  db.seedItems(seed.MENU);
  console.log('Set up the menu with the ' + seed.MENU.length + ' items from data.js');
}

/* ---------------------------------------------------------------
   Small helpers
---------------------------------------------------------------- */

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store'
  });
  res.end(text);
}

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

function deviceOf(req) {
  const raw = String(req.headers['x-device'] || '').trim();
  return /^[A-Za-z0-9._-]{4,64}$/.test(raw) ? raw : '';
}

/* Owner access.
   With no OWNER_PASSWORD set, only somebody sitting at this machine
   can change the menu. That makes local use need no setup at all.
   Once the site is on the internet, set OWNER_PASSWORD and the owner
   page asks for it. */
function isLocal(req) {
  const ip = req.socket.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function isOwner(req) {
  if (OWNER_PASSWORD) return req.headers['x-owner-key'] === OWNER_PASSWORD;
  return isLocal(req);
}

function cleanItem(input) {
  const categories = seed.CATEGORIES.map(c => c.id).filter(id => id !== 'all');
  const name = String(input.name || '').trim().slice(0, 80);
  const price = Math.max(0, Math.round(Number(input.price) || 0));
  return {
    name,
    category: categories.includes(input.category) ? input.category : categories[0],
    price,
    serves: String(input.serves || '').trim().slice(0, 40),
    desc: String(input.desc || '').trim().slice(0, 400),
    name_ar: String(input.name_ar || '').trim().slice(0, 80),
    serves_ar: String(input.serves_ar || '').trim().slice(0, 40),
    desc_ar: String(input.desc_ar || '').trim().slice(0, 400),
    illo: /^[a-z]{3,12}$/.test(input.illo || '') ? input.illo : 'cake',
    tint: /^#[0-9a-fA-F]{3,8}$/.test(input.tint || '') ? input.tint : '#f0dcc2',
    photo: String(input.photo || '').trim().slice(0, 200)
  };
}

/* ---------------------------------------------------------------
   The API
---------------------------------------------------------------- */

/* A page opened from another server on this machine, typically an
   editor's Live Server on a neighbouring port, is allowed to ask us
   questions. That is what lets such a page find the real shop and
   send the reader there. Only localhost is allowed, never the open
   internet. */
function allowLocalOrigin(req, res) {
  const origin = req.headers.origin;
  if (!origin) return;
  if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) return;
  res.setHeader('access-control-allow-origin', origin);
  res.setHeader('access-control-allow-headers', 'content-type, x-device, x-owner-key');
  res.setHeader('access-control-allow-methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('vary', 'origin');
}

async function api(req, res, url) {
  const route = url.pathname.replace(/^\/api/, '') || '/';
  const method = req.method;
  const device = deviceOf(req);
  const owner = isOwner(req);

  allowLocalOrigin(req, res);
  if (method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  /* what the page needs on load, in one round trip */
  /* One number, so a shop page left open can notice a changed menu
     without pulling the whole thing down every time it checks. */
  if (route === '/menu-version' && method === 'GET') {
    return sendJson(res, 200, { version: db.menuVersion() });
  }

  if (route === '/bootstrap' && method === 'GET') {
    return sendJson(res, 200, {
      menuVersion: db.menuVersion(),
      menu: db.listItems(),
      ratings: db.ratingSummaries(),
      yourRatings: device ? db.ratingsByDevice(device) : {},
      comments: db.listComments(false),
      owner,
      ownerNeedsKey: Boolean(OWNER_PASSWORD)
    });
  }

  if (route === '/ratings' && method === 'POST') {
    const body = await readBody(req);
    const value = Math.round(Number(body.value));
    if (!device) return sendJson(res, 400, { error: 'no device id' });
    if (!(value >= 1 && value <= 5)) return sendJson(res, 400, { error: 'rating must be 1 to 5' });
    if (!db.getItem(body.itemId)) return sendJson(res, 404, { error: 'no such item' });
    return sendJson(res, 200, { ratings: db.rateItem(body.itemId, device, value) });
  }

  if (route === '/comments' && method === 'GET') {
    return sendJson(res, 200, { comments: db.listComments(owner) });
  }

  if (route === '/comments' && method === 'POST') {
    const body = await readBody(req);
    const name = String(body.name || '').trim();
    const text = String(body.text || '').trim();
    if (!name) return sendJson(res, 400, { error: 'a name is needed' });
    if (text.length < 3) return sendJson(res, 400, { error: 'the note is too short' });
    return sendJson(res, 200, { comment: db.addComment(name, text, device) });
  }

  if (route === '/orders' && method === 'POST') {
    const body = await readBody(req);
    if (!Array.isArray(body.items) || !body.items.length) {
      return sendJson(res, 400, { error: 'the order is empty' });
    }
    return sendJson(res, 200, db.addOrder(body));
  }

  /* ----- owner only ----- */

  if (route.indexOf('/menu') === 0 || route === '/orders' || route === '/backup' ||
      route.indexOf('/comments/') === 0) {
    if (!owner) return sendJson(res, 401, { error: 'owner only' });
  }

  if (route === '/menu' && method === 'POST') {
    const body = cleanItem(await readBody(req));
    if (!body.name) return sendJson(res, 400, { error: 'the item needs a name' });
    return sendJson(res, 200, { item: db.createItem(body), menu: db.listItems() });
  }

  if (route.indexOf('/menu/') === 0 && method === 'PUT') {
    const id = decodeURIComponent(route.slice('/menu/'.length));
    const body = cleanItem(await readBody(req));
    if (!body.name) return sendJson(res, 400, { error: 'the item needs a name' });
    const item = db.updateItem(id, body);
    if (!item) return sendJson(res, 404, { error: 'no such item' });
    return sendJson(res, 200, { item, menu: db.listItems() });
  }

  if (route.indexOf('/menu/') === 0 && method === 'DELETE') {
    const id = decodeURIComponent(route.slice('/menu/'.length));
    if (!db.deleteItem(id)) return sendJson(res, 404, { error: 'no such item' });
    return sendJson(res, 200, { menu: db.listItems() });
  }

  if (route === '/menu/order' && method === 'POST') {
    const body = await readBody(req);
    if (!Array.isArray(body.ids)) return sendJson(res, 400, { error: 'ids must be a list' });
    return sendJson(res, 200, { menu: db.reorderItems(body.ids) });
  }

  if (route === '/menu/reset' && method === 'POST') {
    return sendJson(res, 200, { menu: db.resetToSeed(seed.MENU) });
  }

  if (route.indexOf('/comments/') === 0 && method === 'PATCH') {
    const id = Number(route.slice('/comments/'.length));
    const body = await readBody(req);
    db.hideComment(id, Boolean(body.hidden));
    return sendJson(res, 200, { comments: db.listComments(true) });
  }

  if (route === '/orders' && method === 'GET') {
    return sendJson(res, 200, { orders: db.listOrders(200) });
  }

  if (route === '/backup' && method === 'GET') {
    return sendJson(res, 200, {
      savedAt: new Date().toISOString(),
      menu: db.listItems(),
      ratings: db.ratingSummaries(),
      comments: db.listComments(true),
      orders: db.listOrders(1000)
    });
  }

  return sendJson(res, 404, { error: 'no such endpoint' });
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
   source and anything else in the folder stay private */
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

    /* no-cache does not mean do not cache, it means ask first. The
       browser keeps the file and we answer 304 when it has not moved,
       so pages stay fast but an edit to data.js or a script shows up
       on the next reload instead of hours later. */
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
    api(req, res, url).catch(err => {
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

/* Something else on the machine may already be sitting on the port,
   commonly an editor or another copy of this server. Rather than
   dying with a stack trace, move up to the next free one. */
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

/* announced once, from the port actually bound, not the one we asked for */
server.once('listening', () => {
  const where = 'http://localhost:' + server.address().port;
  console.log('');
  console.log('  ' + seed.SHOP.name + ' is running');
  console.log('  Shop      ' + where + '/');
  console.log('  Manager   ' + where + '/pages/owner.html');
  console.log('  Database  ' + db.file);
  console.log('');
  if (OWNER_PASSWORD) {
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
