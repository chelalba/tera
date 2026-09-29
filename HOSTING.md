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

Make `OWNER_PASSWORD` the same as the star code in `assets/js/data.js` so one
number does both jobs. It is `1212` today, and you should change it to
something harder before sharing the address.

---

## Step 4. Deploy

Press **Deploy** and wait a minute or two. You get an address like
`tera-chelalba.vercel.app`.

The database is empty on the first visit, and the shop fills it from
`assets/js/data.js` the first time anybody opens it. That happens by itself.

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

**Changing photos, prices in `data.js`, or the shop settings.** These are code:

```bash
git add -A
git commit -m "New photos"
git push
```

Vercel redeploys on its own within a minute.

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

With no `TURSO_URL` in your environment it uses `data/tera.db` as before, so
you can try things out without touching the live shop.

To point your computer at the live database instead:

```bash
TURSO_URL="libsql://..." TURSO_TOKEN="ey..." npm start
```

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

## One thing I could not test

Every endpoint was tested against a real SQLite database through the same
client library, and all of it passes. What could not be tested from here is
that same code talking to Turso **over the network**, because that needs your
token and it is not mine to use.

The difference is transport only, and the library is built for it, so I expect
it to work. But the first deploy is the real test. If the menu does not load,
send me the Vercel function log and it will be a quick fix.

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
```
