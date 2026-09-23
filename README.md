# Tera, cake shop website

A small Node server, two pages and one SQLite file. No framework, no npm
packages, no accounts to sign up for and no environment file. SQLite is built
into Node itself, so there is nothing to install beyond Node.

```
start.bat           double click this on Windows to run the shop
server.js           serves the pages and answers /api
db.js               every line of SQL, and the only file a hosted database changes
data/tera.db        the whole shop, created on first run
index.html          the page customers see
owner.html          the menu manager, for you
privacy.html        what the site stores
terms.html          ordering, notice, allergies
assets/js/data.js   shop settings, and the starting menu   <- the file you edit
assets/js/store.js  the pages talking to the server
assets/js/sprite.js every drawing and icon
assets/js/main.js   the shop page
assets/js/owner.js  the menu manager
assets/img/         favicon, and where your photos go
```

## Running it

You need Node 22 or newer. Check with `node --version`.

**On Windows, double click `start.bat`.** A black window opens and stays open
while the site runs. Closing that window stops the site.

Or from a terminal in this folder:

```bash
npm start
```

Either way it prints the address to open, like this:

```
  Tera is running
  Shop      http://localhost:5500/
  Manager   http://localhost:5500/owner.html
```

**Use the address it prints.** If something else on your computer is already
using port 5500, and Visual Studio Code often is, the server moves to 5501 or
5502 and says so. The pages only work at that address.

> Opening `index.html` by double clicking it will not work any more. The pages
> now ask a server for the menu, and a file opened straight from the folder has
> no server to ask. The page will say so if you try.

The first run creates `data/tera.db` and fills the menu with the items written
in `assets/js/data.js`. After that the database is in charge, and `data.js` is
only used for the shop settings and as the list the **Back to the original
menu** button restores.

There is no build step. Change a file, reload the page.

> Node 22 and 23 keep SQLite behind a flag. The server notices and restarts
> itself with the flag on, so you do not have to remember it.

## Change these before you share the site

All in `assets/js/data.js`, at the top. The lines marked `[CHANGE]` are
placeholders and will not work as they are.

| Setting | What to put |
|---|---|
| `whatsapp` | Your number in full international form, digits only. No `+`, no spaces. Algeria example: `213661234567` |
| `phone` | The number as you want it displayed |
| `email` | Your email address |
| `instagram`, `facebook` | Links to your pages |
| `currency` | `DA` by default. Set `currencyBefore: true` for currencies written in front, like `$` |
| `name`, `kind` | The shop name shown in the header and footer |
| `hours`, `notice` | Shown under the hero and in the contact section |

**The WhatsApp number is the one that stops orders working.** Until it is a
real number, pressing Confirm shows

> The shop WhatsApp number has not been set yet. Open assets/js/data.js and
> fill in "whatsapp".

That is the guard doing its job rather than a fault. Everything else about the
order, the basket, the form and the record kept in the database, already works.
Put your number in and the order opens in WhatsApp ready to send.

## Who can change the menu

With no `OWNER_PASSWORD` set, the menu can only be changed from the computer
the server is running on. That is why nothing needs configuring while you work
on your own machine.

The moment the site is on the internet that is not enough, because every
visitor now reaches the server from somewhere else and the check no longer
means anything. Set `OWNER_PASSWORD` and the menu manager asks for it:

```bash
OWNER_PASSWORD="something long and private" npm start
```

On Windows PowerShell:

```powershell
$env:OWNER_PASSWORD = "something long and private"; npm start
```

Customers are never asked for it. Browsing, rating, leaving notes and ordering
all stay open.

## The menu manager

`owner.html` shows the whole menu as a list. **Add an item** opens an editor
with a live preview of the card exactly as customers will see it: name,
category, price, size, description, one of six drawings and a colour. The
arrows move an item up or down, which is the order on the shop page. **Edit**
opens the same editor with **Delete** at the bottom, which takes two taps.

Every change is written to the database as you save it, so a customer opening
the shop on their own phone sees it straight away.

Renaming is safe. Each item keeps a fixed id underneath and star ratings hang
off that id, so a new name or a new price keeps the stars. Deleting an item
does throw its ratings away, which is why that one needs two taps.

**Back to the original menu** replaces the whole menu with the list in
`data.js`. Ratings and notes are not touched.

**Download a backup** gives you a JSON file with the menu, the ratings, the
notes and every order.

## Using real photos

The drawings are there so the site looks finished without stock images. To use
your own, put the file in `assets/img/` and give its path in the editor's
**Photo** field, for example `assets/img/honey-cake.jpg`. The drawing is
replaced by the photo. Mixing photos and drawings is fine.

## What is in the database

| Table | Holds |
|---|---|
| `items` | the menu, in the order you arranged it |
| `ratings` | one row per item per device, so a second tap replaces your vote |
| `comments` | the notes customers leave |
| `orders`, `order_lines` | a copy of every order sent to WhatsApp |

Orders reach you as a real WhatsApp message. The rows are your own record of
them.

To look inside, any SQLite tool opens `data/tera.db`. DB Browser for SQLite is
free and needs no setup.

## Backups

The whole shop is one file. Copy `data/tera.db` somewhere safe and that is a
complete backup. Do it while the server is stopped, or use **Download a
backup** in the menu manager, which is safe at any time.

`data/` is in `.gitignore`, so the database is never committed.

---

# Hosting it for free

The awkward part of SQLite is that it is a file, and most free hosting gives
you a disk that is wiped every time the app restarts. Pick a plan below that
keeps the file, or moves it somewhere that keeps it for you.

Free tiers change. Check the current limits before you commit to one.

## Plan A, Fly.io with a disk. Least work, code stays exactly as it is

Fly gives your app a real volume, so `data/tera.db` survives restarts and
nothing in this project changes.

1. Install flyctl and sign in:
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth signup
   ```
2. From the project folder:
   ```bash
   fly launch --no-deploy
   ```
   Say no when it offers to add a database. It writes a `fly.toml`.
3. Create the disk and point the app at it:
   ```bash
   fly volumes create tera_data --size 1
   ```
   In `fly.toml` add:
   ```toml
   [mounts]
     source = "tera_data"
     destination = "/data"

   [env]
     TERA_DB = "/data/tera.db"
     PORT = "8080"
   ```
   `TERA_DB` is already read by `db.js`, so the database lands on the volume.
4. Set the password and deploy:
   ```bash
   fly secrets set OWNER_PASSWORD="something long and private"
   fly deploy
   ```

Cost: Fly is pay as you go rather than free, and a machine this small with a
1 GB volume lands around two or three dollars a month. It is the least work and
the fewest surprises. If it truly has to cost nothing, use Plan B.

## Plan B, free forever, database moves to Turso

Turso is hosted SQLite. Your app can then run on any free host, including ones
that wipe the disk, because the data is no longer on that disk.

1. Sign up at turso.tech, create a database, and copy its URL and token.
2. Install the client and change **one file**:
   ```bash
   npm install @libsql/client
   ```
   In `db.js`, swap the two lines that open the database:
   ```js
   const { createClient } = require('@libsql/client');
   const db = createClient({
     url: process.env.TURSO_URL,
     authToken: process.env.TURSO_TOKEN
   });
   ```
   The SQL itself does not change. The calls become async, so
   `db.prepare(...).get()` becomes `await db.execute(...)`. Everything that
   needs touching is inside `db.js`, which is why it is the only file with SQL
   in it.
3. Deploy the app to Render, free web service, connected to your GitHub repo.
   Build command `npm install`, start command `npm start`. Add three
   environment variables in the Render dashboard: `TURSO_URL`, `TURSO_TOKEN`
   and `OWNER_PASSWORD`.

Cost: nothing. The catch is that a Render free service goes to sleep after
about fifteen minutes with no visitors, so the first person to arrive waits
roughly a minute for it to wake. For a bakery taking orders on WhatsApp that is
usually survivable, but it is the reason Plan A exists.

## Plan C, Cloudflare, free and always awake

Cloudflare D1 is also SQLite, and Workers do not sleep. This is the best free
result and the most work: Workers are not Node, so `server.js` has to be
rewritten against the Workers API and D1 bindings rather than `node:http` and
`node:sqlite`. `db.js` maps over almost directly because D1 speaks the same
SQL. Worth it if the site gets busy and you want no cold starts.

## Whichever you pick

- Set `OWNER_PASSWORD`. Without it, on a public server, anyone who finds
  `owner.html` can change your menu.
- Put a real domain in front of it. A `.something.app` address says demo. Buy a
  domain, point its records at the host, and switch HTTPS on there.
- Take a backup before you change anything.

## Still to do

- Orders, star ratings and the notes customers leave are all being stored, and
  there are endpoints for reading them (`/api/orders`, `/api/comments`), but
  there is no screen in the menu manager for them yet. That is the obvious next
  piece.
- `apple-touch-icon.png`, a 180 by 180 PNG for iPhone home screens. The SVG
  favicon already works everywhere else.
- Read `privacy.html` and `terms.html` and correct anything that does not match
  how you work. The privacy page still describes browser storage and needs
  updating now that the data sits on a server.
