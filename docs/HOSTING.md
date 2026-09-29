# Putting TiraMood online with Vercel and Turso

The code is rewritten and ready. Everything below is done in a browser.
Free, and the menu stays editable from your phone.

---

## What changed, in short

Vercel does not run a server that stays awake. It runs a small function for
each request and throws it away, so the SQLite file had nowhere to live. That
is why the database moved to Turso, which you have already set up.

The rewrite is done and tested:

- **`api/[...path].js`** is the whole API as one Vercel function. One file
  rather than thirteen, so the routing stays in a single place.
- **`server/routes.js`** holds every endpoint. Both Vercel and `npm start`
  call it, so local and live cannot drift apart.
- **`server/db.js`** now talks to Turso when `TURSO_URL` is set, and to
  `data/tera.db` when it is not. Same SQL either way.
- **`server/index.js`** is now only for your own computer.

Nothing about the shop page, the menu manager, Arabic or WhatsApp changed.

---

## What you need

The two values from Turso:

| | |
|---|---|
| `TURSO_URL` | `libsql://tiramood-chelalba.aws-eu-west-1.turso.io` |
| `TURSO_TOKEN` | the long `eyJhbGci...` line from `turso db tokens create` |

And a code for `OWNER_PASSWORD`, which you invent.

---

## Step 1. Push the rewrite

**I have already done this.** The code is on GitHub on the `sqlite-backend`
branch.

---

## Step 2. Import the project into Vercel

1. Go to **vercel.com** and **Sign up with GitHub**
2. **Add New** then **Project**
3. Find **tera** in the list and press **Import**
4. If it asks which branch, choose **sqlite-backend**

On the configuration screen:

| Setting | What to choose |
|---|---|
| Framework Preset | **Other** |
| Build Command | leave empty |
| Output Directory | leave empty |
| Install Command | leave as it is |

Vercel serves `index.html` from the root by itself, and runs anything in
`api/` as a function. That is why the folders are arranged this way.

---

## Step 3. Add the three variables. Do not skip this

Still on the same screen, open **Environment Variables** and add all three
before deploying:

| Name | Value |
|---|---|
| `TURSO_URL` | the `libsql://...` address |
| `TURSO_TOKEN` | the long token |
| `OWNER_PASSWORD` | a code only you know |

Without the first two the site has no database and the menu will not load.

`OWNER_PASSWORD` is the **only** place this code is set. The star on the shop
page sends whatever you type straight to the server, which decides. Nothing in
the page holds the answer, so there is nothing to find by reading the source.

Pick something harder than `1212`.

---

## Step 4. Deploy

Press **Deploy** and wait a minute or two. You get an address like
`tera-chelalba.vercel.app`.

**The database is already filled.** The 15 items, with their Arabic, are in
Turso now. Nothing has to happen on the first visit.

---

## Step 5. Check it, in this order

1. Open the address. The 15 items and the photos should be there.
2. Press **العربية**. The page should flip to Arabic, right to left.
3. Put something in the basket and press Confirm. WhatsApp should open with
   the order written out, going to 213558529207.
4. Tap the **star** at the end of the header and enter your `OWNER_PASSWORD`.
5. Change a price and save.
6. Open the shop on a different phone. **The new price should be there.**

Step 6 is the one that proves it. If that works, everything works.

---

## Step 6. Your own domain, optional

1. Buy the name at Namecheap, Porkbun or Cloudflare
2. In Vercel: **Settings**, **Domains**, **Add**
3. Vercel shows the records to enter at the registrar
4. Save them and wait, usually minutes

HTTPS is automatic.

---

## Living with it

**Changing the menu.** Open the address on your phone, tap the star, enter the
code. Add, edit, reorder, delete. Live for customers at once. No pushing.

**Changing the pages, the photos or the shop settings.** These are code:

```bash
git add -A
git commit -m "New photos"
git push
```

Vercel redeploys on its own within a minute.

**Changing `assets/js/data.js`.** This one is different, and worth
understanding once.

`data.js` is the *starting* menu. It filled the database, and now the database
is the real menu. The two are no longer the same thing: editing `data.js` and
pushing does **not** change what customers see, because the shop reads Turso,
and Turso already has items.

Two ways round it, and the first is almost always the right one:

- **The menu manager.** Tap the star, make the change. Live at once.
- **From this computer**, when you have edited `data.js` and want it sent up:

```bash
npm run seed
```

That rebuilds the SQL from `data.js` and writes it to whichever database
`.env` points at, saying which one before it writes anything. An item already
there is brought back in line with `data.js`; it is never duplicated, and
ratings, notes and orders are never touched. Safe to run twice.

It does not *remove* anything. An item you added from the menu manager and
never put in `data.js` stays where it is. Delete it from the manager.

**Backups.** Your data is on Turso now, not a file you can copy. While logged
in as the owner, this address gives you everything as one file:

```
https://your-address/api/backup
```

Turso also has its own snapshots. Worth reading once before you need it.

---

## Still works on your own computer

```bash
npm start
```

Settings for your own machine live in **`.env`** beside the project. Both
Turso lines are filled in, so `npm start` here talks to the **live** database.
The banner on start says so, so there is never any guessing.

That is worth knowing before you experiment: a price you change locally is a
price customers see. To work on a copy instead, comment the two Turso lines out
with a `#` and `npm start` falls back to `data/tera.db` on this computer,
which nobody else can reach.

`.env` is in `.gitignore`, so it is never committed and never reaches Vercel
or GitHub. **`.env.example`** is the copy that is committed, as a record of
which names exist. Never put a real token in that one.

The two Turso values, if you ever need them again, from Ubuntu:

```bash
turso db show tiramood
```

```bash
turso db tokens create tiramood
```

A token is shown once and cannot be read back. Making a new one does not break
the old one: if you want an old token to stop working, invalidate it.

---

## If something goes wrong

**The menu will not load and the page says so.** The two Turso variables are
missing or wrong. Vercel: **Settings**, **Environment Variables**. After
changing them you must **Redeploy** from the Deployments tab; saving alone
does not restart anything.

**The manager will not accept the code.** What you type must match
`OWNER_PASSWORD` exactly.

**Everything else.** Vercel: **Deployments**, open the latest, read the
**Functions** log. The error will be there.

---

## What has been tested against the real database

Every endpoint was run against your Turso database over the network, from this
computer, on 2026-09-29. All of it passed:

- the shop loads, 15 items, Arabic intact
- rating an item, and the shop remembering what this device rated
- leaving a note, and rubbish being turned away
- placing an order, right down to the lines and the total
- adding, editing and deleting an item with the code
- **being refused** without the code, on the menu, the orders and the backup
- the menu version moving when the menu changes, which is what makes an open
  shop page on another phone notice

The probe rows were cleared afterwards. Your database holds the 15 items and
nothing else.

What is left untested is Vercel itself, which nobody can test until the first
deploy. The code that talks to Turso is the same code either way, and it works.

---

## The other plans, for reference

- **[HOSTING-EASY.md](HOSTING-EASY.md)** Netlify, free, ten minutes, but the
  menu can only be changed by editing a file and pushing.
- **[HOSTING-vercel-turso.md](HOSTING-vercel-turso.md)** the earlier notes,
  written before the rewrite existed.

---

## Quick reference

```
Host          Vercel, from the GitHub repository, branch sqlite-backend
Data          Turso
Variables     TURSO_URL, TURSO_TOKEN, OWNER_PASSWORD
Framework     Other, no build command
Owner page    https://your-address/pages/owner.html
Menu edits    from your phone, live at once
Code changes  git push
data.js       npm run seed  (it is the starting menu, not the live one)
```
