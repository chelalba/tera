# How TiraMood is built

Everything needed to put this back together from an empty folder: what the
pieces are, how they fit, what the design rules are, and which decisions were
paid for in mistakes and should not be made differently without a reason.

---

## What it is

A shop page and a menu manager for a home bakery. Customers read the menu,
rate items, fill a basket and send the order on WhatsApp. The owner opens the
same site, taps a star in the header, types a code, and edits the menu from a
phone. Changes are live for customers within seconds.

Two languages, English and Arabic, with the whole page flipping right to left.

**No framework, no build step, no bundler.** Plain HTML, CSS and JavaScript,
and one Node file for the server. You can open any file and read it. This was
deliberate: a small shop should not need a toolchain to change a price, and a
site with no build cannot break because a build broke.

Rough size: **3,600 lines of JavaScript**, **1,200 lines of CSS**, one
dependency.

---

## The shape of it

Three pieces, and the whole thing makes sense once you see them:

```
   the pages                the API                 the database
   ──────────               ───────                 ────────────
   index.html         ──▶   /api/bootstrap    ──▶   Turso (SQLite)
   pages/owner.html         /api/menu               items, ratings,
   assets/js/*              /api/orders             comments, orders,
   assets/css/*             /api/photo/<id>         photos, meta
```

**The pages hold no menu.** They arrive empty and ask the API for everything.
That one decision is what lets the owner change the menu from a phone without
anybody pushing code, and it is the thing to preserve above all else.

**The API is one set of functions, called by two different hosts.**
`server/routes.js` knows nothing about HTTP. It is handed a method, a path, a
body and some headers, and returns a status and a reply. The local server
calls it, and so does the Vercel function. That is why the two can never drift
apart.

**The database is the truth.** Not the files. `assets/js/data.js` is only the
*starting* menu, used once to fill an empty database and never read again.

---

## The folders

```
index.html              the shop. The only page in the root, on purpose.
robots.txt              keeps the manager out of search results
vercel.json             cache headers and the function's time limit
.vercelignore           what must never be served to the web
package.json            one dependency, two scripts
.env                    secrets, never committed
.env.example            the same names with no values, committed

assets/
  css/style.css         all of it. One file, 1,200 lines.
  js/
    data.js             SHOP settings, CATEGORIES, the starting MENU
    i18n.js             every word of the interface, English and Arabic
    sprite.js           30 drawings and icons as one inline SVG
    store.js            the only thing that talks to the API
    main.js             the shop page
    owner.js            the menu manager
  img/                  the logo, the icons, five real photographs

pages/
  owner.html            the menu manager
  privacy.html
  terms.html

server/
  index.js              the local server. Serves pages and API. Not used on Vercel.
  routes.js             every endpoint, as plain functions. Used by both hosts.
  db.js                 all the SQL. The only file that knows SQL exists.
  env.js                reads .env into the environment

api/
  [...path].js          the whole API as one Vercel function

scripts/
  make-seed-sql.js      turns data.js into seed.sql
  push-seed.js          sends data.js to whichever database .env points at

docs/                   these notes
design/                 original photographs and style references
```

**Why `index.html` is alone in the root.** Hosts serve the root as the home
page with no configuration. Everything else is one level down, and every path
in the code is root-absolute (`/assets/js/main.js`, never `assets/js/main.js`)
so that a page inside `pages/` resolves it the same way the home page does.
Getting this wrong was a real bug: relative paths from `/pages/owner.html`
asked for `/pages/assets/...` and every photograph 404'd.

---

## The design

### Colour

The whole palette, from `:root` in `style.css`. Warm, low contrast, no pure
black anywhere.

| Token | Value | Used for |
|---|---|---|
| `--paper` | `#ebddca` | the page behind everything |
| `--white` | `#ffffff` | cards, the basket |
| `--cream` | `#faf3e8` | quiet section backgrounds |
| `--cream-deep` | `#f4e7d5` | the second quiet background |
| `--tan` | `#e5cbb0` | the one strong band, section 02 |
| `--ink` | `#3a251a` | body text |
| `--brown` | `#5a3a28` | headings, icons |
| `--deep` | `#4a2e20` | primary buttons, the footer |
| `--muted` | `#8b7563` | hints, small print |
| `--line` | `#e8dccd` | every border |
| `--star` | `#c08a3e` | a filled rating star |
| `--ok` | `#4f7a52` | "you rated this" |

Rules worth keeping:

- **No pure black and no pure grey.** Every neutral is warmed towards brown.
- **Borders do the work, not shadows.** One shadow token exists and is used
  only on things that float (the basket, the editor drawer).
- **One accent.** `--star` gold. Nothing else competes.

### Type

Two faces for Latin, two for Arabic, loaded from Google Fonts:

```
Latin    Fraunces  (display, 400/600)   headings
         Jost      (body, 300/400/500)  everything else
Arabic   Cairo     (display, 400/600/700)
         Tajawal   (body, 300/400/500)
```

Arabic is **not** just the same page with different words. The rules that
exist for it:

- Swap both faces by redefining `--font-display` and `--font-body` under
  `:root[lang="ar"]`
- **Remove uppercase and letter-spacing.** They do nothing for Arabic and make
  it harder to read. Eyebrows, chips, labels and the sort control all have
  `text-transform: none; letter-spacing: 0` in Arabic.
- Line height goes up: `1.8` on the body, `1.35` on headings
- Headings get heavier (600, and 700 on the hero), because Cairo at 400 reads
  lighter than Fraunces at 400

### Right to left

`dir="rtl"` on `<html>` does most of it. The things it does not do, and which
are written out one by one in the CSS:

- the basket slides in from the **left** instead of the right
- the badge on the basket icon, the "serves" label on a card, the icon
  margins, the arrow on the sort control — all mirrored
- the coloured edge on notices moves to the other side
- **prices and the order reference stay left to right** inside Arabic text,
  with `direction: ltr; unicode-bidi: embed`. Without this `1 400 DA` comes
  out mangled.

### Shape and motion

```
--r       6px     most things
--r-lg    10px    cards, the basket
--ease    cubic-bezier(.32, .72, .38, 1)
```

Everything that moves uses that one easing curve. Transitions are short
(.12s–.3s). There is a `prefers-reduced-motion` block that turns them off.

### Layout

Breakpoints, all max-width, mobile checked at 375:

```
980px   the hero stops being two columns
860px
720px   the nav collapses
560px
460px
```

Plus two that are not about width:

```
(pointer: coarse)          bigger touch targets
(prefers-reduced-motion)   no animation
```

**The menu grid is two columns on a phone.** This matters more than it sounds:
a card is about half of a 375px screen, so anything inside a card has roughly
160px to live in. A change that looks harmless on a desktop can overflow the
page on a phone. Always re-measure at 375 after touching card internals.

### The drawings

`sprite.js` injects one `<svg>` containing 30 `<symbol>`s, used everywhere as
`<use href="#i-cake"/>`. Six are item illustrations:

```
cake  drip  pie  tart  cookie  cupcake
```

An item with no photograph draws one of these, tinted by its `tint` colour
from a palette of twelve. That is why the menu looks complete before a single
photograph has been taken — and it is worth keeping, because a new item added
from a phone at midnight still looks deliberate.

---

## The data

### `assets/js/data.js`

Three exports, and a CommonJS guard at the bottom so the server can `require`
the same file the browser loads as a script.

```js
SHOP        name, kind, kind_ar, whatsapp, currency, currency_ar,
            currencyBefore, phone, email, instagram, facebook,
            hours, hours_ar

CATEGORIES  [{ id, label, label_ar }]   the filter pills, 'all' first

MENU        [{ id, name, name_ar, category, price, serves, serves_ar,
               desc, desc_ar, illo, tint, photo }]
```

`SHOP` is read by the pages **directly**, every time. It is not in the
database, so changing a phone number is a code change and a push.

`MENU` is different. It is copied into the database the first time the
database is empty, and after that the database is the truth and `data.js` is
only history. **Editing `data.js` and pushing does not change a live menu.**
Use the manager, or `npm run seed` to push `data.js` over the top.

### The tables

Seven, all created on demand by `server/db.js`:

| Table | Holds |
|---|---|
| `items` | the menu. `photo` is a path or `/api/photo/<id>`, never bytes |
| `ratings` | one row per item per device, `UNIQUE (item_id, device)` |
| `comments` | the notes customers leave, with a `hidden` flag |
| `orders` | one row per order, with a `ref` like `T001` |
| `order_lines` | what was in it |
| `meta` | key/value. Holds `menu_version`. |
| `photos` | the uploaded pictures as `BLOB`, with their mime type |

Two indexes: `ratings(item_id)` and `order_lines(order_id)`.

**Why the photographs are in the database.** A serverless host has no disk
that survives the request that wrote to it. The machine that takes an upload
is gone minutes later. The database is the only thing that outlives a request,
so that is where they go. The browser shrinks every picture to at most 1200px
and about 150KB before sending, which is what makes this reasonable rather
than silly.

**Ratings survive a rename.** They are keyed on the item id, and renaming an
item does not change its id. Deleting it does lose them.

---

## The API

Everything under `/api`. `server/routes.js` strips that prefix and matches
what is left.

**Open to anybody**

```
GET    /bootstrap        everything the shop page needs, in one call:
                         menu, ratings, your ratings, comments, version,
                         whether you are the owner, whether a code is needed
GET    /menu-version     one number. Cheap. Polled to notice changes.
POST   /ratings          { itemId, value }  1 to 5, keyed on x-device
GET    /comments         the visible ones
POST   /comments         { name, text }
POST   /orders           { customer, items, total }  returns { ref }
GET    /photo/<id>       the picture itself, cached for a year
```

**Owner only**

```
POST   /menu             add an item
PUT    /menu/<id>        change one
DELETE /menu/<id>        remove one
POST   /menu/order       { ids } reorder
POST   /menu/reset       put the data.js menu back
POST   /photos           { mime, data }  base64, returns { url }
GET    /orders           what has been ordered
PATCH  /comments/<id>    { hidden } hide a note
GET    /backup           all of it as one JSON file
```

### Who is the owner

```js
function isOwner(headers, fromThisMachine) {
  if (OWNER_PASSWORD) return headers['x-owner-key'] === OWNER_PASSWORD;
  return Boolean(fromThisMachine);
}
```

With `OWNER_PASSWORD` set, you must send it. With it empty, only a request
from the same machine counts — which makes working locally need no setup, and
is why **the variable must be set before the site is public**.

The `1212` code in the header star is **not** security. It only hides the
door. The page sends whatever you type to the server and the server decides;
nothing in the page knows the answer, so there is nothing to find by reading
the source.

### The browser side

`store.js` is the only file that calls `fetch`. Everything else asks it.
It holds the cache, adds the `x-device` and `x-owner-key` headers, and keeps
five things in browser storage:

```
tera:cart          localStorage     the basket
tera:device        localStorage     a random id, so a second tap replaces
                                    your rating instead of adding one
tera:lang          localStorage     en or ar
tera:ownerKey      sessionStorage   the owner code, gone when the tab closes
tera:shopOrigin    localStorage     where the API was last found
```

---

## How a change reaches a customer

Three mechanisms, because one is not enough:

1. **Same browser, another tab.** A `BroadcastChannel` called `tera-menu`.
   The manager saves, every open shop tab hears it and redraws at once.
2. **Another device.** `meta.menu_version` goes up on every menu change. Shop
   pages ask `/api/menu-version` every 15 seconds, and also when the tab is
   focused, becomes visible, or is restored from the back/forward cache. A
   different number means reload the menu.
3. **A new visitor.** `/api/bootstrap` on load. Nothing to notice.

---

## Decisions that were paid for

These are the ones that cost something to learn. Changing them needs a reason.

**Bump `?v=` whenever any file in `assets/` changes.** Every script and
stylesheet is loaded as `/assets/js/main.js?v=28`. Forgetting to raise it once
locked the owner out of the manager entirely: the browser kept an old
`main.js` that compared the code against a `SHOP.ownerCode` that had been
deleted, so every code was refused forever. The number is currently **28**.
`vercel.json` also sends `no-cache` on scripts, styles and pages so that a
stale copy cannot be kept even if somebody forgets.

**Escape everything that comes from a person.** Item names, descriptions and
notes are put into HTML with an `esc()` helper. An item named
`">\<img src=x onerror=...>` must render as text, not run. There is a test for
this; keep it.

**Never let a photograph reach the server at full size.** Shrink in the
browser first: `createImageBitmap` with `imageOrientation: 'from-image'` so
phone photographs are the right way up, draw to a canvas at most 1200 across,
fill the canvas white first so a transparent PNG does not go black, then step
the JPEG quality down until it is under ~220KB.

**Serve uploaded pictures with `s-maxage`, not just `max-age`.** Without the
first, a CDN runs the function and reads the database for every single
visitor.

**Touch targets grow in height, not width.** Five rating stars sit in a row
inside a card that is half a phone screen. Making them wider overflows the row
and makes neighbouring targets overlap, so you aim at four and get three.

**The server's static allowlist is a whitelist.** `PUBLIC = ['assets',
'pages', 'index.html', 'robots.txt']`. Anything not named is a 404. On Vercel
there is no such thing, which is why `.vercelignore` exists — without it,
`docs/` and `design/` are public addresses.

**Secrets only ever live in the host's environment.** `.env` locally,
the dashboard when hosted. Never in a file that git can see. `.env.example`
is committed and must stay empty.

---

## Rebuilding from zero

The order that works, each step leaving something you can look at:

1. **`index.html` and `style.css`.** The tokens first, then the header, hero
   and footer. Static, no JavaScript. Get the feel right before anything moves.
2. **`sprite.js` and the drawings.** Now a menu can look like something
   without photographs existing.
3. **`data.js`.** Settings and a handful of items, hard-coded.
4. **`main.js` reading `data.js` directly.** A whole working shop page: filter,
   sort, basket, WhatsApp link. No server yet. This is a real milestone and
   worth stopping at.
5. **`i18n.js` and Arabic.** Do this *before* the server, not after. It touches
   every piece of markup, and retrofitting it is miserable.
6. **`db.js` and `routes.js`,** then `server/index.js` to serve them.
7. **`store.js`,** and change `main.js` to ask the API instead of reading
   `data.js`. The shop now has a shared brain: ratings and notes are everyone's.
8. **`owner.html` and `owner.js`.** The manager, then the star and the code.
9. **Photographs:** the `photos` table, the two routes, the picker.
10. **`api/[...path].js` and `vercel.json`.** Hosting last, once it all works.

Two things to do at step 1 and not later: **root-absolute paths everywhere**,
and the **`?v=` number** on every asset link. Both are miserable to retrofit
and both have already caused real bugs here.

---

## Running it

```bash
npm install
npm start
```

With `.env` empty it uses `data/tera.db` on this machine. Fill in `TURSO_URL`
and `TURSO_TOKEN` and it talks to the live database instead — the banner on
start says which, every time, so there is no guessing.

```bash
npm run seed        # push data.js into whichever database .env points at
npm run seed:sql    # just write seed.sql, to load by hand
```

Related notes: **[HOSTING.md](HOSTING.md)** for Vercel and Turso,
**[GOING-LIVE.md](GOING-LIVE.md)** for a real domain and a host that allows a
business.
