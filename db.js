/* ===============================================================
   The database.

   One SQLite file at data/tera.db. Nothing to install and nothing
   to configure: SQLite ships inside Node itself.

   Everything that touches SQL lives in this file. If you ever move
   the data to a hosted SQLite (Turso, Cloudflare D1), this is the
   only file that changes. The rest of the server does not know or
   care where the rows come from.
   =============================================================== */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = process.env.TERA_DB || path.join(DATA_DIR, 'tera.db');

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

/* ---------------------------------------------------------------
   Schema
---------------------------------------------------------------- */

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
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
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id    TEXT NOT NULL,
    device     TEXT NOT NULL,
    value      INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
    created_at INTEGER NOT NULL,
    UNIQUE (item_id, device)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    body       TEXT NOT NULL,
    device     TEXT NOT NULL DEFAULT '',
    hidden     INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
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
  );

  CREATE TABLE IF NOT EXISTS order_lines (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_id  TEXT NOT NULL DEFAULT '',
    name     TEXT NOT NULL,
    price    INTEGER NOT NULL DEFAULT 0,
    qty      INTEGER NOT NULL DEFAULT 1
  );

  CREATE INDEX IF NOT EXISTS ix_ratings_item ON ratings (item_id);
  CREATE INDEX IF NOT EXISTS ix_lines_order  ON order_lines (order_id);
`);

const now = () => Date.now();

/* ---------------------------------------------------------------
   Menu
---------------------------------------------------------------- */

/* the browser knows the description as "desc", SQL keeps it as
   "descr" because desc is a reserved word */
function rowToItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    serves: row.serves,
    desc: row.descr,
    illo: row.illo,
    tint: row.tint,
    photo: row.photo
  };
}

function listItems() {
  return db.prepare('SELECT * FROM items ORDER BY position, created_at')
    .all().map(rowToItem);
}

function getItem(id) {
  const row = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  return row ? rowToItem(row) : null;
}

function nextPosition() {
  const row = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS n FROM items').get();
  return row.n;
}

function slug(text) {
  return String(text || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item';
}

function freeId(base) {
  let id = base, n = 2;
  while (db.prepare('SELECT 1 FROM items WHERE id = ?').get(id)) { id = base + '-' + n; n++; }
  return id;
}

function createItem(input) {
  const id = freeId(slug(input.name));
  db.prepare(`INSERT INTO items
      (id, name, category, price, serves, descr, illo, tint, photo, position, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, input.name, input.category, input.price, input.serves, input.desc,
         input.illo, input.tint, input.photo, nextPosition(), now());
  return getItem(id);
}

function updateItem(id, input) {
  const found = db.prepare('SELECT 1 FROM items WHERE id = ?').get(id);
  if (!found) return null;
  db.prepare(`UPDATE items SET
      name = ?, category = ?, price = ?, serves = ?, descr = ?,
      illo = ?, tint = ?, photo = ?
      WHERE id = ?`)
    .run(input.name, input.category, input.price, input.serves, input.desc,
         input.illo, input.tint, input.photo, id);
  return getItem(id);
}

/* Ratings are kept. An item that comes back under the same id keeps
   the stars it already earned, which is why deleting is a real
   decision rather than a tidy-up. */
function deleteItem(id) {
  const info = db.prepare('DELETE FROM items WHERE id = ?').run(id);
  db.prepare('DELETE FROM ratings WHERE item_id = ?').run(id);
  return info.changes > 0;
}

function reorderItems(ids) {
  const set = db.prepare('UPDATE items SET position = ? WHERE id = ?');
  db.exec('BEGIN');
  try {
    ids.forEach((id, i) => set.run(i, id));
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return listItems();
}

/* ---------------------------------------------------------------
   Ratings
---------------------------------------------------------------- */

function rateItem(itemId, device, value) {
  db.prepare(`INSERT INTO ratings (item_id, device, value, created_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT (item_id, device)
              DO UPDATE SET value = excluded.value, created_at = excluded.created_at`)
    .run(itemId, device, value, now());
  return ratingSummaries();
}

function ratingSummaries() {
  const rows = db.prepare(`SELECT item_id, AVG(value) AS average, COUNT(*) AS count
                           FROM ratings GROUP BY item_id`).all();
  const out = {};
  rows.forEach(r => { out[r.item_id] = { average: r.average, count: r.count }; });
  return out;
}

function ratingsByDevice(device) {
  const rows = db.prepare('SELECT item_id, value FROM ratings WHERE device = ?').all(device);
  const out = {};
  rows.forEach(r => { out[r.item_id] = r.value; });
  return out;
}

/* ---------------------------------------------------------------
   Comments
---------------------------------------------------------------- */

function listComments(includeHidden) {
  const sql = includeHidden
    ? 'SELECT * FROM comments ORDER BY created_at DESC'
    : 'SELECT * FROM comments WHERE hidden = 0 ORDER BY created_at DESC';
  return db.prepare(sql).all().map(r => ({
    id: r.id, name: r.name, text: r.body, ts: r.created_at, hidden: !!r.hidden
  }));
}

function addComment(name, text, device) {
  const info = db.prepare(`INSERT INTO comments (name, body, device, created_at)
                           VALUES (?, ?, ?, ?)`)
    .run(String(name).slice(0, 40), String(text).slice(0, 600), device || '', now());
  const r = db.prepare('SELECT * FROM comments WHERE id = ?').get(info.lastInsertRowid);
  return { id: r.id, name: r.name, text: r.body, ts: r.created_at, hidden: !!r.hidden };
}

function hideComment(id, hidden) {
  db.prepare('UPDATE comments SET hidden = ? WHERE id = ?').run(hidden ? 1 : 0, id);
  return true;
}

/* ---------------------------------------------------------------
   Orders
---------------------------------------------------------------- */

function addOrder(order) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM orders').get().n;
  const ref = 'T' + String(count + 1).padStart(3, '0');
  const c = order.customer || {};

  db.exec('BEGIN');
  try {
    const info = db.prepare(`INSERT INTO orders
        (ref, cust_name, cust_phone, mode, wanted_for, note, total, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?)`)
      .run(ref, c.name || '', c.phone || '', c.mode || '', c.date || '',
           c.note || '', order.total || 0, now());

    const line = db.prepare(`INSERT INTO order_lines (order_id, item_id, name, price, qty)
                             VALUES (?, ?, ?, ?, ?)`);
    (order.items || []).forEach(it => {
      line.run(info.lastInsertRowid, it.id || '', it.name, it.price || 0, it.qty || 1);
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { ref };
}

function listOrders(limit) {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?')
    .all(limit || 100);
  const lines = db.prepare('SELECT * FROM order_lines WHERE order_id = ?');
  return orders.map(o => ({
    ref: o.ref,
    ts: o.created_at,
    total: o.total,
    status: o.status,
    customer: { name: o.cust_name, phone: o.cust_phone, mode: o.mode, date: o.wanted_for, note: o.note },
    items: lines.all(o.id).map(l => ({ id: l.item_id, name: l.name, price: l.price, qty: l.qty }))
  }));
}

/* ---------------------------------------------------------------
   First run
---------------------------------------------------------------- */

function isEmpty() {
  return db.prepare('SELECT COUNT(*) AS n FROM items').get().n === 0;
}

function seedItems(menu) {
  const insert = db.prepare(`INSERT INTO items
      (id, name, category, price, serves, descr, illo, tint, photo, position, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  db.exec('BEGIN');
  try {
    menu.forEach((m, i) => {
      insert.run(m.id, m.name, m.category, m.price, m.serves || '', m.desc || '',
                 m.illo || 'cake', m.tint || '#f0dcc2', m.photo || '', i, now());
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return listItems();
}

/* wipes the menu and puts the data.js list back, ratings included */
function resetToSeed(menu) {
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM items');
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return seedItems(menu);
}

module.exports = {
  file: DB_FILE,
  listItems, getItem, createItem, updateItem, deleteItem, reorderItems,
  rateItem, ratingSummaries, ratingsByDevice,
  listComments, addComment, hideComment,
  addOrder, listOrders,
  isEmpty, seedItems, resetToSeed
};
