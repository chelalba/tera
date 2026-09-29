/* ===============================================================
   Writes seed.sql: the tables, and the menu from assets/js/data.js.

   Use it to fill a fresh Turso database by hand:

     node scripts/make-seed-sql.js
     turso db shell <name> < seed.sql

   Running it twice is safe. The tables are only made if missing, and
   the items are written with INSERT OR REPLACE, so an item already
   there is updated rather than duplicated. Ratings, notes and orders
   are never touched.
   =============================================================== */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const seed = require('../assets/js/data.js');

/* SQL quoting: double any single quote, and keep everything else as
   it is. The Arabic needs no special handling, the file is UTF-8. */
function q(value) {
  return "'" + String(value === undefined || value === null ? '' : value)
    .replace(/'/g, "''") + "'";
}

const out = [];

out.push('-- TiraMood seed');
out.push('-- generated ' + new Date().toISOString() + ' from assets/js/data.js');
out.push('-- safe to run more than once');
out.push('');

out.push(`CREATE TABLE IF NOT EXISTS items (
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
);`);

out.push(`CREATE TABLE IF NOT EXISTS ratings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id    TEXT NOT NULL,
  device     TEXT NOT NULL,
  value      INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
  created_at INTEGER NOT NULL,
  UNIQUE (item_id, device)
);`);

out.push(`CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  body       TEXT NOT NULL,
  device     TEXT NOT NULL DEFAULT '',
  hidden     INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);`);

out.push(`CREATE TABLE IF NOT EXISTS orders (
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
);`);

out.push(`CREATE TABLE IF NOT EXISTS order_lines (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  item_id  TEXT NOT NULL DEFAULT '',
  name     TEXT NOT NULL,
  price    INTEGER NOT NULL DEFAULT 0,
  qty      INTEGER NOT NULL DEFAULT 1
);`);

out.push(`CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);`);

out.push('CREATE INDEX IF NOT EXISTS ix_ratings_item ON ratings (item_id);');
out.push('CREATE INDEX IF NOT EXISTS ix_lines_order  ON order_lines (order_id);');
out.push('');
out.push('-- the menu, ' + seed.MENU.length + ' items');

const stamp = Date.now();

seed.MENU.forEach((m, i) => {
  out.push(
    'INSERT OR REPLACE INTO items\n' +
    '  (id, name, category, price, serves, descr, illo, tint, photo, position,\n' +
    '   created_at, name_ar, serves_ar, descr_ar)\n' +
    'VALUES (' + [
      q(m.id), q(m.name), q(m.category), Number(m.price) || 0,
      q(m.serves), q(m.desc), q(m.illo || 'cake'), q(m.tint || '#f0dcc2'),
      q(m.photo), i, stamp,
      q(m.name_ar), q(m.serves_ar), q(m.desc_ar)
    ].join(', ') + ');'
  );
});

out.push('');
out.push('-- tells an open shop page that the menu has moved');
out.push(
  "INSERT INTO meta (key, value) VALUES ('menu_version', '1')\n" +
  "  ON CONFLICT (key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT);"
);
out.push('');

const target = path.join(__dirname, '..', 'seed.sql');
fs.writeFileSync(target, out.join('\n'), 'utf8');

console.log('Wrote ' + target);
console.log(seed.MENU.length + ' items, ' + out.join('\n').length + ' characters.');
console.log('');
console.log('Load it with:  turso db shell <database-name> < seed.sql');
