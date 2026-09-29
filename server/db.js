/* ===============================================================
   The database.

   One SQLite database, reached through the libSQL client. Where it
   actually lives depends on where this is running:

     TURSO_URL set    ->  the hosted copy at Turso
     nothing set      ->  data/tera.db beside the project

   Same SQL either way, so local and live behave the same.

   Everything that touches SQL lives in this file. Every function is
   async, because a database over the network cannot be otherwise.
   =============================================================== */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@libsql/client');

const DATA_DIR = path.join(__dirname, '..', 'data');

function openDatabase() {
  if (process.env.TURSO_URL) {
    return createClient({
      url: process.env.TURSO_URL,
      authToken: process.env.TURSO_TOKEN
    });
  }
  /* local file, created on first use */
  const file = process.env.TERA_DB || path.join(DATA_DIR, 'tera.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return createClient({ url: 'file:' + file });
}

const db = openDatabase();
const hosted = Boolean(process.env.TURSO_URL);

/* ---------------------------------------------------------------
   Small helpers over the client
---------------------------------------------------------------- */

const now = () => Date.now();

function run(sql, args) {
  return db.execute({ sql, args: args || [] });
}

async function all(sql, args) {
  const result = await run(sql, args);
  return result.rows;
}

async function one(sql, args) {
  const rows = await all(sql, args);
  return rows.length ? rows[0] : null;
}

/* ---------------------------------------------------------------
   Schema and first run

   There is no startup on a serverless host: a request can arrive on
   a cold machine at any moment. So the setup runs on demand and is
   remembered, which means it happens once per machine rather than
   once per request.
---------------------------------------------------------------- */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS items (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    category   TEXT NOT NULL,
    price      INTEGER NOT NULL DEFAULT 0,
    serves     TEXT NOT NULL DEFAULT '',
    descr      TEXT NOT NULL DEFAULT '',
    illo       TEXT NOT NULL DEFAULT 'cake',
    tint       TEXT NOT NULL DEFAULT '#f0dcc2',
    photo      TEXT NOT NULL DEFAULT '',
    position   INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    name_ar    TEXT NOT NULL DEFAULT '',
    serves_ar  TEXT NOT NULL DEFAULT '',
    descr_ar   TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS ratings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id    TEXT NOT NULL,
    device     TEXT NOT NULL,
    value      INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
    created_at INTEGER NOT NULL,
    UNIQUE (item_id, device)
  )`,
  `CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    body       TEXT NOT NULL,
    device     TEXT NOT NULL DEFAULT '',
    hidden     INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ref        TEXT NOT NULL UNIQUE,
    cust_name  TEXT NOT NULL DEFAULT '',
    cust_phone TEXT NOT NULL DEFAULT '',
    mode       TEXT NOT NULL DEFAULT '',
    wanted_for TEXT NOT NULL DEFAULT '',
    note       TEXT NOT NULL DEFAULT '',
    total      INTEGER NOT NULL DEFAULT 0,
    status     TEXT NOT NULL DEFAULT 'sent',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS order_lines (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    item_id  TEXT NOT NULL DEFAULT '',
    name     TEXT NOT NULL,
    price    INTEGER NOT NULL DEFAULT 0,
    qty      INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS ix_ratings_item ON ratings (item_id)`,
  `CREATE INDEX IF NOT EXISTS ix_lines_order  ON order_lines (order_id)`
];

/* databases made before Arabic existed are missing three columns */
async function addMissingColumns() {
  const info = await all('PRAGMA table_info(items)');
  const have = info.map(c => c.name);
  for (const col of ['name_ar', 'serves_ar', 'descr_ar']) {
    if (have.indexOf(col) === -1) {
      await run(`ALTER TABLE items ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`);
    }
  }
}

let readyPromise = null;

function ready(seedMenu) {
  if (!readyPromise) {
    readyPromise = (async () => {
      for (const statement of SCHEMA) await run(statement);
      await addMissingColumns();
      if (seedMenu && seedMenu.length && await isEmpty()) {
        await seedItems(seedMenu);
      }
    })().catch(err => {
      readyPromise = null;      /* let the next request try again */
      throw err;
    });
  }
  return readyPromise;
}

/* ---------------------------------------------------------------
   Menu version, so an open shop page can notice a change cheaply
---------------------------------------------------------------- */

async function menuVersion() {
  const row = await one("SELECT value FROM meta WHERE key = 'menu_version'");
  return row ? Number(row.value) : 0;
}

async function bumpMenuVersion() {
  await run(
    `INSERT INTO meta (key, value) VALUES ('menu_version', '1')
     ON CONFLICT (key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)`
  );
  return menuVersion();
}

/* ---------------------------------------------------------------
   Menu
---------------------------------------------------------------- */

/* the browser calls the description "desc", SQL keeps "descr"
   because desc is a reserved word */
function rowToItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    serves: row.serves,
    desc: row.descr,
    name_ar: row.name_ar || '',
    serves_ar: row.serves_ar || '',
    desc_ar: row.descr_ar || '',
    illo: row.illo,
    tint: row.tint,
    photo: row.photo
  };
}

async function listItems() {
  const rows = await all('SELECT * FROM items ORDER BY position, created_at');
  return rows.map(rowToItem);
}

async function getItem(id) {
  const row = await one('SELECT * FROM items WHERE id = ?', [id]);
  return row ? rowToItem(row) : null;
}

async function nextPosition() {
  const row = await one('SELECT COALESCE(MAX(position), -1) + 1 AS n FROM items');
  return Number(row.n);
}

function slug(text) {
  return String(text || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item';
}

async function freeId(base) {
  let id = base, n = 2;
  while (await one('SELECT 1 AS x FROM items WHERE id = ?', [id])) {
    id = base + '-' + n;
    n++;
  }
  return id;
}

async function createItem(input) {
  const id = await freeId(slug(input.name));
  await run(
    `INSERT INTO items
      (id, name, category, price, serves, descr, illo, tint, photo, position, created_at,
       name_ar, serves_ar, descr_ar)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.category, input.price, input.serves, input.desc,
     input.illo, input.tint, input.photo, await nextPosition(), now(),
     input.name_ar || '', input.serves_ar || '', input.desc_ar || '']
  );
  await bumpMenuVersion();
  return getItem(id);
}

async function updateItem(id, input) {
  const found = await one('SELECT 1 AS x FROM items WHERE id = ?', [id]);
  if (!found) return null;
  await run(
    `UPDATE items SET
       name = ?, category = ?, price = ?, serves = ?, descr = ?,
       illo = ?, tint = ?, photo = ?,
       name_ar = ?, serves_ar = ?, descr_ar = ?
     WHERE id = ?`,
    [input.name, input.category, input.price, input.serves, input.desc,
     input.illo, input.tint, input.photo,
     input.name_ar || '', input.serves_ar || '', input.desc_ar || '', id]
  );
  await bumpMenuVersion();
  return getItem(id);
}

/* An item coming back under the same id keeps the stars it earned,
   which is why deleting is a real decision rather than a tidy up. */
async function deleteItem(id) {
  const result = await run('DELETE FROM items WHERE id = ?', [id]);
  await run('DELETE FROM ratings WHERE item_id = ?', [id]);
  const gone = Number(result.rowsAffected) > 0;
  if (gone) await bumpMenuVersion();
  return gone;
}

async function reorderItems(ids) {
  await db.batch(
    ids.map((id, i) => ({
      sql: 'UPDATE items SET position = ? WHERE id = ?',
      args: [i, id]
    })),
    'write'
  );
  await bumpMenuVersion();
  return listItems();
}

/* ---------------------------------------------------------------
   Ratings
---------------------------------------------------------------- */

async function rateItem(itemId, device, value) {
  await run(
    `INSERT INTO ratings (item_id, device, value, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (item_id, device)
     DO UPDATE SET value = excluded.value, created_at = excluded.created_at`,
    [itemId, device, value, now()]
  );
  return ratingSummaries();
}

async function ratingSummaries() {
  const rows = await all(
    'SELECT item_id, AVG(value) AS average, COUNT(*) AS count FROM ratings GROUP BY item_id'
  );
  const out = {};
  rows.forEach(r => {
    out[r.item_id] = { average: Number(r.average), count: Number(r.count) };
  });
  return out;
}

async function ratingsByDevice(device) {
  const rows = await all('SELECT item_id, value FROM ratings WHERE device = ?', [device]);
  const out = {};
  rows.forEach(r => { out[r.item_id] = Number(r.value); });
  return out;
}

/* ---------------------------------------------------------------
   Comments
---------------------------------------------------------------- */

function rowToComment(r) {
  return {
    id: Number(r.id),
    name: r.name,
    text: r.body,
    ts: Number(r.created_at),
    hidden: Boolean(Number(r.hidden))
  };
}

async function listComments(includeHidden) {
  const sql = includeHidden
    ? 'SELECT * FROM comments ORDER BY created_at DESC'
    : 'SELECT * FROM comments WHERE hidden = 0 ORDER BY created_at DESC';
  const rows = await all(sql);
  return rows.map(rowToComment);
}

async function addComment(name, text, device) {
  const result = await run(
    'INSERT INTO comments (name, body, device, created_at) VALUES (?, ?, ?, ?)',
    [String(name).slice(0, 40), String(text).slice(0, 600), device || '', now()]
  );
  const row = await one('SELECT * FROM comments WHERE id = ?', [Number(result.lastInsertRowid)]);
  return rowToComment(row);
}

async function hideComment(id, hidden) {
  await run('UPDATE comments SET hidden = ? WHERE id = ?', [hidden ? 1 : 0, id]);
  return true;
}

/* ---------------------------------------------------------------
   Orders
---------------------------------------------------------------- */

async function addOrder(order) {
  const countRow = await one('SELECT COUNT(*) AS n FROM orders');
  const ref = 'T' + String(Number(countRow.n) + 1).padStart(3, '0');
  const c = order.customer || {};

  const result = await run(
    `INSERT INTO orders
      (ref, cust_name, cust_phone, mode, wanted_for, note, total, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?)`,
    [ref, c.name || '', c.phone || '', c.mode || '', c.date || '',
     c.note || '', order.total || 0, now()]
  );

  const orderId = Number(result.lastInsertRowid);
  const lines = (order.items || []).map(it => ({
    sql: 'INSERT INTO order_lines (order_id, item_id, name, price, qty) VALUES (?, ?, ?, ?, ?)',
    args: [orderId, it.id || '', it.name, it.price || 0, it.qty || 1]
  }));
  if (lines.length) await db.batch(lines, 'write');

  return { ref };
}

async function listOrders(limit) {
  const orders = await all(
    'SELECT * FROM orders ORDER BY created_at DESC LIMIT ?', [limit || 100]
  );
  const out = [];
  for (const o of orders) {
    const lines = await all('SELECT * FROM order_lines WHERE order_id = ?', [o.id]);
    out.push({
      ref: o.ref,
      ts: Number(o.created_at),
      total: Number(o.total),
      status: o.status,
      customer: {
        name: o.cust_name, phone: o.cust_phone,
        mode: o.mode, date: o.wanted_for, note: o.note
      },
      items: lines.map(l => ({
        id: l.item_id, name: l.name, price: Number(l.price), qty: Number(l.qty)
      }))
    });
  }
  return out;
}

/* ---------------------------------------------------------------
   First run
---------------------------------------------------------------- */

async function isEmpty() {
  const row = await one('SELECT COUNT(*) AS n FROM items');
  return Number(row.n) === 0;
}

async function seedItems(menu) {
  await db.batch(
    menu.map((m, i) => ({
      sql: `INSERT INTO items
              (id, name, category, price, serves, descr, illo, tint, photo, position,
               created_at, name_ar, serves_ar, descr_ar)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [m.id, m.name, m.category, m.price, m.serves || '', m.desc || '',
             m.illo || 'cake', m.tint || '#f0dcc2', m.photo || '', i, now(),
             m.name_ar || '', m.serves_ar || '', m.desc_ar || '']
    })),
    'write'
  );
  await bumpMenuVersion();
  return listItems();
}

/* wipes the menu and puts the data.js list back. Ratings are left
   alone, so an item returning under the same id keeps its stars. */
async function resetToSeed(menu) {
  await run('DELETE FROM items');
  return seedItems(menu);
}

module.exports = {
  hosted,
  ready,
  listItems, getItem, createItem, updateItem, deleteItem, reorderItems,
  rateItem, ratingSummaries, ratingsByDevice,
  listComments, addComment, hideComment,
  addOrder, listOrders,
  isEmpty, seedItems, resetToSeed,
  menuVersion
};
