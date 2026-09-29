# TiraMood

A tiramisu and cake shop: a shop page in English and Arabic, a menu manager,
and orders that arrive on WhatsApp. A small Node server and one SQLite file.
No framework, no npm packages and no environment file. SQLite is built into
Node itself, so there is nothing to install beyond Node.

```
index.html          the shop, the only page in the root
package.json
start.bat           double click this on Windows to run the shop
HOSTING.md          putting it online with Vercel and Turso
README.md

pages/
  owner.html        the menu manager, for you
  privacy.html      what the site stores
  terms.html        ordering, notice, allergies

assets/
  css/style.css
  js/data.js        shop settings and the starting menu   <- the file you edit
  js/i18n.js        every word of the site, English and Arabic
  js/sprite.js      the drawings and icons
  js/store.js       the pages talking to the server
  js/main.js        the shop page
  js/owner.js       the menu manager
  img/              the logo, the icons and the product photos

server/
  index.js          serves the pages and answers /api
  db.js             every line of SQL, and the only file a hosted database changes

design/             the original photos and the reference images, not served

data/               tera.db, the whole shop, created on first run
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
  TiraMood is running
  Shop      http://localhost:5500/
  Manager   http://localhost:5500/pages/owner.html
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

The WhatsApp number is already set to `213558529207`. Change it here if that
is ever wrong, and note there is also `ownerCode`, the number the star at the
end of the header asks for.

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

`pages/owner.html` shows the whole menu as a list. **Add an item** opens an editor
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
**Photo** field, for example `/assets/img/honey-cake.jpg`. The drawing is
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

# Putting it online

That has its own file: **[HOSTING.md](HOSTING.md)**. It covers Vercel for the
site, Turso for the data, both free, and what has to change in the code first.

## Still to do

- Orders, star ratings and the notes customers leave are all stored, and there
  are endpoints for reading them (`/api/orders`, `/api/comments`), but the menu
  manager has no screen for them yet.
- The menu manager and the privacy and terms pages are English only. The shop
  page itself is fully bilingual.
