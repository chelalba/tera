# Putting TiraMood online

> Looking for the quick way? **[HOSTING-EASY.md](HOSTING-EASY.md)** puts the
> shop online in about ten minutes with no command line and no database. It
> gives up shared ratings and customer notes. This file is the full version.


Two things have to live somewhere: **the site** and **the data**. Vercel is
excellent at the first and cannot do the second, so the data goes to Turso.
Both are free at the size this shop will be.

Read the first section before you start. It explains the one thing that will
otherwise waste your afternoon.

---

## The thing to understand first

Right now the whole shop is one file on your computer: `data/tera.db`. The
server reads and writes it directly. That works because your computer stays on
and keeps its disk.

Vercel does not work that way. It does not run your server; it wakes a small
function for each request and throws it away afterwards. Anything written to
disk is gone the moment the function ends, so **a SQLite file cannot live on
Vercel**. Upload the project as it stands and the menu resets constantly, or
fails outright.

The fix is not to abandon SQLite. It is to move the file to a service that
holds it for you. **Turso** is exactly that: hosted SQLite, same SQL, same
queries. Your `server/db.js` keeps its shape.

So:

| Piece | Where | Cost |
|---|---|---|
| Pages, images, styles | Vercel | free |
| The API | Vercel functions | free |
| The database | Turso | free |
| Your domain | a registrar | about 10 to 15 a year |

---

## What has to change in the code

This is not a rewrite, but it is not zero either. Three jobs:

**1. Split the server into functions.** `server/index.js` is one Node server
handling every route. Vercel wants each endpoint as its own file under `api/`.
The route logic moves across almost unchanged; what goes away is the
`http.createServer` wrapper and the static file serving, because Vercel serves
files itself.

**2. Point the database at Turso.** In `server/db.js`, swap the two lines that
open the file:

```js
// now
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(DB_FILE);

// on Turso
const { createClient } = require('@libsql/client');
const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN
});
```

The SQL itself does not change. The calls become asynchronous, so
`db.prepare(x).get()` becomes `await db.execute(x)`. Everything needing that
change is inside `db.js`, which is why all the SQL was kept in one file.

**3. Set a real owner password.** On your computer the menu manager is safe
because only you can reach the machine. Online that is no longer true. Set
`OWNER_PASSWORD` in Vercel and make it the same as the star code in
`assets/js/data.js`, so one number opens both.

> I can do these three for you. Ask, and say whether you want the local
> `npm start` to keep working as well (it can: the code can pick Turso when
> the environment variables are there and the local file when they are not).

---

## Step by step

### 1. Put the project on GitHub

You already have a repository at `chelalba/tera`. From the project folder:

```bash
git add -A
git commit -m "Reorganise the project"
git push
```

Check `data/` is not in the repository. It is in `.gitignore`, so it should
not be. If `git status` ever shows `data/tera.db`, stop and tell me.

### 2. Make the database on Turso

1. Go to **turso.tech** and sign up with GitHub. No card.
2. Create a database. Call it `tiramood`.
3. Copy the two values it gives you:
   - the database URL, starting `libsql://`
   - an auth token

Keep them somewhere safe for a minute. They are the keys to your data.

### 3. Connect Vercel to GitHub

1. Go to **vercel.com** and sign up with the same GitHub account.
2. **Add New Project**, pick the `tera` repository, and import it.
3. Framework preset: **Other**. Leave the build command empty. Vercel serves
   `index.html` from the root, which is why the folders were arranged this way.
4. Before you press Deploy, open **Environment Variables** and add three:

| Name | Value |
|---|---|
| `TURSO_URL` | the `libsql://` address from Turso |
| `TURSO_TOKEN` | the auth token from Turso |
| `OWNER_PASSWORD` | a code only you know |

5. Deploy. You get an address like `tiramood.vercel.app`.

### 4. Fill the menu

The Turso database starts empty. Open
`https://your-address/pages/owner.html`, enter your code, and the menu seeds
itself from `assets/js/data.js` on first run, exactly as it does locally.

### 5. Every change after that

Push to GitHub and Vercel rebuilds within a minute or two.

```bash
git add -A
git commit -m "New winter menu"
git push
```

Menu changes made in the manager do **not** need a push. They go straight to
the database and customers see them at once. Pushing is only for code, photos
and settings.

---

## Your own domain

`tiramood.vercel.app` works, but it reads as a demo. A real address is worth
the small yearly cost for a shop taking orders.

1. Buy the name. Namecheap, Porkbun and Cloudflare all sell them; expect
   10 to 15 a year for a `.com`.
2. In Vercel: **Settings, Domains, Add**, and type the name.
3. Vercel shows you the records to enter at the registrar, usually:
   - `A` record for the bare name pointing at Vercel's address
   - `CNAME` for `www` pointing at `cname.vercel-dns.com`
4. Save them at the registrar and wait. Usually minutes, sometimes a few hours.

HTTPS is issued automatically once the records resolve. Nothing to configure.

---

## What the free tiers actually give you

Generous for a bakery. Check the current numbers before you rely on them,
because these change.

**Vercel Hobby** covers a personal project comfortably: plenty of bandwidth and
function calls for a shop of this size. The condition worth knowing is that
Hobby is for non-commercial use. A shop taking orders may need the paid tier.
Read their terms, and treat that as the most likely thing to cost you money.

**Turso** free tier is roughly 500 databases, 9 GB of storage and a billion row
reads a month. Your whole shop is a few hundred kilobytes. You will not come
close.

---

## Backups

Once the data is on Turso it is no longer a file you can copy off your desk.
Two habits:

- Press **Download a backup** in the menu manager now and then. It saves the
  menu, ratings, notes and every order as one JSON file.
- Turso has its own snapshot and restore. Worth reading once, before you need
  it rather than after.

---

## If you would rather not split the server

There is a simpler road that keeps `server/index.js` exactly as it is, running
as a real Node server with a real disk and the SQLite file on it:

- **Fly.io** with a small volume. No code changes at all. Not free, but a
  machine this size is a couple of dollars a month.
- **Render** with a persistent disk. Same idea. Their free tier does not
  include a disk, so this is also paid.

That is the trade. Vercel is free and fast but needs the code reshaped. Fly
costs a little and takes the code as it stands.

For a shop that runs on WhatsApp orders and gets a few visitors a day, I would
take Vercel and Turso, and spend the saved money on the domain.

---

## Quick reference

```
Site          Vercel, from the GitHub repository
Data          Turso, hosted SQLite
Secrets       TURSO_URL, TURSO_TOKEN, OWNER_PASSWORD, in Vercel settings
Owner page    https://your-address/pages/owner.html
Deploy        git push
Menu edits    no push needed, they are live immediately
```
