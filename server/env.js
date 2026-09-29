/* ===============================================================
   Reads the .env file beside the project into process.env.

   No library: it is thirty lines and one less thing to install.

   Call it before anything that reads process.env, so db.js and
   routes.js see the values. On Vercel there is no .env file, and
   there does not need to be: the dashboard sets the same names in
   the real environment, which always wins over this file.
   =============================================================== */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

module.exports = function loadEnvFile() {
  const file = path.join(__dirname, '..', '.env');
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (err) { return; }

  text.replace(/\r/g, '').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === '#') return;
    const at = trimmed.indexOf('=');
    if (at < 1) return;
    const key = trimmed.slice(0, at).trim();
    let value = trimmed.slice(at + 1).trim();
    /* quotes are optional, and a long token is easier to paste inside them */
    if (value.length > 1 &&
        ((value[0] === '"' && value.endsWith('"')) ||
         (value[0] === "'" && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    /* An empty value means "not set". Writing '' would both defeat the
       checks elsewhere, which read these as yes or no, and block a real
       value written further down the file. */
    if (value === '') return;

    /* anything already in the real environment wins */
    if (process.env[key] === undefined) process.env[key] = value;
  });
};
