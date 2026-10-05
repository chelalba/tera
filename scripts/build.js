/* ===============================================================
   Gathers the public site into dist/.

     npm run build

   Cloudflare Pages serves its output directory exactly as it finds
   it, so whatever goes in here is a real address on the live site.
   Pointing it at the project root would publish server/, docs/,
   design/ and, worst of all, .env.

   So the rule is the other way round: nothing is published unless it
   is named below. A file that is not on this list cannot leak by
   being forgotten, only by being added on purpose.

   The functions are not copied. Cloudflare picks those up from
   functions/ at the project root, which is outside this folder and
   never served as files.
   =============================================================== */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist');

/* the whole public site, and nothing else */
const PUBLISH = ['index.html', 'robots.txt', 'assets', 'pages'];

function copy(from, to) {
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) {
      copy(path.join(from, name), path.join(to, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function measure(dir) {
  let files = 0, bytes = 0;
  (function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else { files += 1; bytes += stat.size; }
    }
  })(dir);
  return { files, bytes };
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const name of PUBLISH) {
  const from = path.join(ROOT, name);
  if (!fs.existsSync(from)) {
    console.error('  missing: ' + name);
    process.exit(1);
  }
  copy(from, path.join(OUT, name));
}

/* A last look, in case something private ever ends up on the list. */
const FORBIDDEN = [/(^|[\\/])\.env/, /(^|[\\/])server[\\/]/, /(^|[\\/])docs[\\/]/,
                   /(^|[\\/])design[\\/]/, /(^|[\\/])node_modules[\\/]/];
const leaks = [];
(function walk(d) {
  for (const name of fs.readdirSync(d)) {
    const full = path.join(d, name);
    if (fs.statSync(full).isDirectory()) { walk(full); continue; }
    const rel = path.relative(OUT, full);
    if (FORBIDDEN.some(re => re.test(rel))) leaks.push(rel);
  }
})(OUT);

if (leaks.length) {
  console.error('  REFUSING TO BUILD. These are private:');
  leaks.forEach(f => console.error('    ' + f));
  process.exit(1);
}

const { files, bytes } = measure(OUT);
console.log('  dist/  ' + files + ' files, ' + Math.round(bytes / 1024) + ' KB');
console.log('  ' + PUBLISH.join(', '));
