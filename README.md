# Tera, cake shop website

Two pages. `index.html` is what customers see. `owner.html` is where you change
the menu. Plain HTML, CSS and JavaScript, no build step and no framework. Open
either file in a browser and it works.

```
index.html          the page customers see
owner.html          the menu manager, for you
privacy.html        what the site stores
terms.html          ordering, notice, allergies
assets/css/style.css
assets/js/data.js   shop settings and the menu   <- the file you edit
assets/js/sprite.js every drawing and icon, shared by both pages
assets/js/store.js  reading and writing saved data
assets/js/main.js   the shop page behaviour
assets/js/owner.js  the menu manager behaviour
assets/img/         favicon, and where your photos go
```

`owner.html` is not linked from the shop page, so customers will not stumble
onto it. Bookmark it. It carries a `noindex` tag so search engines skip it,
but that is not a lock. If the site is public and you want the page kept
private, either leave it off the server and run it from your own computer, or
put a password on it through your host.

## Change these before you share the site

Everything is in `assets/js/data.js`, at the top. The lines marked `[CHANGE]`
are placeholders and will not work as they are.

| Setting | What to put |
|---|---|
| `whatsapp` | Your number in full international form, digits only. No `+`, no spaces. Algeria example: `213661234567` |
| `phone` | The number as you want it displayed |
| `email` | Your email address |
| `instagram`, `facebook` | Links to your pages |
| `currency` | `DA` by default. Set `currencyBefore: true` for currencies written in front, like `$` |
| `name`, `kind` | The shop name shown in the header and footer |
| `hours`, `notice` | Shown under the hero and in the contact section |

Until the WhatsApp number is set, pressing Confirm shows a message saying so
instead of opening a broken chat.

## Changing the menu

Two ways. Use the menu manager for everyday changes, and the file when you want
those changes to reach customers.

### The menu manager, owner.html

Open it and you get the whole menu as a list. **Add an item** opens an editor
with a live preview of the card exactly as customers will see it. You pick one
of six drawings, a colour, a price and a description. The arrows beside each
row move an item up or down, which is the order it appears on the shop page.
**Edit** opens the same editor with **Delete** at the bottom, which needs two
taps so nothing goes by accident.

Renaming an item is safe. Each item keeps a fixed id behind the scenes, and
star ratings hang off that id, so they survive a new name or a new price.

Two things to know:

- Changes are saved in the browser you are using. You will see them on the shop
  page on that same device straight away, even in another tab. Someone else's
  phone still gets the menu from `assets/js/data.js`.
- **Back to the original menu** throws your changes away and returns to what is
  written in the file. It also takes two taps.

### Making the changes real, section 02 of owner.html

**Copy the menu code** puts the whole `MENU` list on your clipboard as code.
Open `assets/js/data.js`, delete the old `const MENU = [ ... ];` block, paste,
save, and upload the site. That is the moment customers see it.

**Download data.js** gives you a complete replacement file instead, with your
settings and menu already in it. It is the quicker route, but it does not carry
over the comments in the original file, so keep a copy of the old one.

### Editing the file by hand

`MENU` in `assets/js/data.js`. One entry per item:

```js
{
  id: 'honey-medovik',          // must be unique, used to store ratings
  name: 'Honey cake',
  category: 'cakes',            // cakes | pies | cookies | cupcakes
  price: 3000,                  // a plain number, no currency
  serves: 'Serves 8',
  desc: 'Eight thin honey layers with sour cream between them.',
  illo: 'cake',                 // cake | drip | pie | tart | cookie | cupcake
  tint: '#e3c08c',              // colour of the drawing
  photo: ''
}
```

Adding a category means adding it to `CATEGORIES` too.

## Using real photos

The drawings are there so the site looks finished without stock images. To use
your own photos, put the file in `assets/img/` and name it in the item:

```js
photo: 'assets/img/honey-cake.jpg'
```

The drawing is then replaced by the photo. Square or slightly landscape photos
fit best. Do this for one item or for all of them, mixing the two is fine.

## Where ratings, notes and orders go

They are saved in the visitor's own browser, under the keys `tera:menu`,
`tera:ratings`, `tera:comments`, `tera:orders` and `tera:cart`. The owner page
reads and writes the same keys.

This is worth understanding: browser storage is per device. A rating left on
one phone is not visible on another phone, and clearing browser data erases it.
It is enough to run the site and to build the owner page against, but if you
want one shared list of ratings and notes for the whole shop, that needs a
server. The four groups of functions at the bottom of `assets/js/store.js` are
the only places that would have to change.

Orders do not depend on this. An order reaches you as a WhatsApp message, which
is real and arrives on your phone. The saved copy is only a local record.

## Still to do

- The owner page handles the menu. Orders, star ratings and the notes customers
  leave are all being stored already, but there is no screen for reading them
  yet. That is the obvious next piece.
- `apple-touch-icon.png`, a 180 by 180 PNG for iPhone home screens. The SVG
  favicon already works everywhere else. Export one from
  `assets/img/favicon.svg` and drop it in `assets/img/`.
- A domain. The site is a folder of files, so any static host will serve it:
  Netlify, Cloudflare Pages, GitHub Pages. Buy a domain, point its A or CNAME
  record at whichever host you pick, and switch HTTPS on there.
- Read `privacy.html` and `terms.html` and correct anything that does not match
  how you actually work. Both pages carry a note saying so.

## Viewing it locally

Double clicking `index.html` works. To serve it over a local address instead:

```bash
python -m http.server 5500
```

Then open http://localhost:5500
