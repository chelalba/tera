/* ===============================================================
   Sends seed.sql to the database.

     npm run seed

   Makes seed.sql fresh from assets/js/data.js, then runs it against
   whichever database .env points at: Turso if TURSO_URL is filled in,
   otherwise data/tera.db on this computer. The banner says which one
   before anything is written, so there is no guessing.

   Safe to run again. The tables are only made if missing, and each
   item is written with INSERT OR REPLACE, so an item already there is
   brought back in line with data.js rather than duplicated. Ratings,
   comments and orders are never touched.

   What it does NOT do is remove an item. Something added from the
   menu manager and not in data.js stays where it is. Delete it from
   the manager if you want it gone.
   =============================================================== */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

require('../server/env.js')();

const { createClient } = require('@libsql/client');

const ROOT = path.join(__dirname, '..');
const SQL_FILE = path.join(ROOT, 'seed.sql');

/* ---------------------------------------------------------------
   Which database
   --------------------------------------------------------------- */

const onTurso = Boolean(process.env.TURSO_URL);
let client;
let where;

if (onTurso) {
  if (!process.env.TURSO_TOKEN) {
    console.error('TURSO_URL is set but TURSO_TOKEN is empty. Get one with:');
    console.error('  turso db tokens create <database-name>');
    process.exit(1);
  }
  where = process.env.TURSO_URL.replace(/^libsql:\/\//, '') + '   (live)';
  client = createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_TOKEN
  });
} else {
  const file = process.env.TERA_DB || path.join(ROOT, 'data', 'tera.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  where = path.relative(ROOT, file) + '   (this computer only)';
  client = createClient({ url: 'file:' + file });
}

/* ---------------------------------------------------------------
   Cut the file into statements.

   Comment lines go first, whole lines only, so a -- inside a value
   is left alone. Then split on ; which is enough here because the
   generator never writes one inside a value: quoting is its job and
   the only quote it emits is doubled.
   --------------------------------------------------------------- */

function statementsIn(sql) {
  return sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
}

/* ---------------------------------------------------------------- */

(async () => {
  console.log('');
  console.log('  Making seed.sql from assets/js/data.js');
  execFileSync(process.execPath, [path.join(__dirname, 'make-seed-sql.js')],
    { stdio: 'ignore' });

  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  const statements = statementsIn(sql);

  console.log('  Writing to  ' + where);
  console.log('');

  let done = 0;
  for (const statement of statements) {
    try {
      await client.execute(statement);
      done += 1;
    } catch (err) {
      console.error('  Stopped on statement ' + (done + 1) + ' of ' +
                    statements.length + ':');
      console.error('  ' + statement.slice(0, 120).replace(/\s+/g, ' '));
      console.error('  ' + err.message);
      process.exit(1);
    }
  }

  const items = await client.execute('SELECT COUNT(*) AS n FROM items');
  const version = await client.execute(
    "SELECT value FROM meta WHERE key = 'menu_version'");

  console.log('  ' + done + ' statements ran');
  console.log('  ' + Number(items.rows[0].n) + ' items on the menu');
  console.log('  menu_version now ' + (version.rows[0] || {}).value);
  console.log('');
  console.log('  Done.');
  console.log('');
})().catch(err => {
  console.error('');
  console.error('  Failed: ' + err.message);
  if (/UNAUTHORIZED|401/i.test(err.message)) {
    console.error('');
    console.error('  That is the token. Make a new one with:');
    console.error('    turso db tokens create <database-name>');
    console.error('  and put it in .env as TURSO_TOKEN.');
  }
  console.error('');
  process.exit(1);
});
