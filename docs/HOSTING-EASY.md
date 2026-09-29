# The easy free way to put TiraMood online

No command line, no database, no Turso, no WSL. About ten minutes, free with
no expiry. This is the alternative to [HOSTING.md](HOSTING.md), which is more
capable and a lot more setup.

---

## Why this one is easy

The hard part was never the website. It was the database.

A SQLite file needs a disk that survives restarts, and no free host gives you
one. I checked: Render's own documentation says a persistent disk needs a
**paid** service. Vercel throws the disk away after every request. That is why
the other plan ends up at Turso, a CLI, and WSL.

So this plan removes the database instead of hosting it.

Your shop does not actually need a server for the thing that earns money. The
menu can be read straight from `assets/js/data.js`, and a WhatsApp order is
just a link. Neither needs anything running.

---

## What you keep and what you lose

**Keeps working, exactly as now:**

- The whole shop page, the photos, the logo
- English and Arabic with the switch
- The basket, the order form, and **WhatsApp ordering**
- Prices, categories, sorting, the star at the end of the header

**Changes:**

| | With a server (HOSTING.md) | This plan |
|---|---|---|
| Star ratings | shared by everyone | kept on each visitor's own phone |
| Customer notes | shared, you can read them | kept on their own phone, you cannot |
| Order records | saved for you | the WhatsApp message only |
| Menu changes | live for everyone at once | edit `data.js` and push |

Read the middle two rows carefully. Ratings and notes stop being a way for you
to hear from customers, because each phone only shows its own. If that matters
to you, this is the wrong plan and the Turso one is worth the setup.

**Orders are unaffected.** They arrive on your WhatsApp the same way. You lose
only the duplicate copy the database was keeping.

---

## One change to the code first

The pages currently expect a server and show an error without one. They need to
fall back to the menu in `data.js` when there is nothing to talk to.

It is a contained change, all inside `assets/js/store.js`. **Ask me and I will
do it**, then this plan works start to finish. Nothing below will work until
that is in.

---

## Step by step

### 1. Push what you have to GitHub

In VS Code's terminal, in the project folder:

```bash
git add -A
git commit -m "Ready to publish"
git push
```

### 2. Make a Netlify account

Go to **netlify.com** and sign up **with GitHub**. One click, no card.

### 3. Point it at the repository

1. **Add new site** then **Import an existing project**
2. Choose **GitHub**, and authorise it if asked
3. Pick the **tera** repository
4. On the settings screen:

| Field | What to put |
|---|---|
| Branch | `sqlite-backend`, or `main` once you merge |
| Build command | **leave empty** |
| Publish directory | `.` (a single dot) |

5. Press **Deploy**

That is it. A minute later you get an address like
`glittering-tiramisu-123.netlify.app` and the shop is live.

The publish directory is a dot because `index.html` sits in the root. That is
why the folders were arranged the way they were.

### 4. Check it on your phone

Open the address, switch to Arabic, put something in the basket and press
Confirm. WhatsApp should open with the order written out, addressed to
213558529207.

### 5. Changing the menu from now on

Open the menu manager on your own computer with `npm start`, make the changes,
then copy them into `assets/js/data.js` and push:

```bash
git add -A
git commit -m "New winter menu"
git push
```

Netlify rebuilds within a minute. Every visitor sees it.

> The menu manager still opens on the live site through the star, but changes
> made there only affect the phone they were made on. The file is what everyone
> sees.

---

## A real domain

`something.netlify.app` reads as a demo. A proper address costs about 10 to 15
a year and takes five minutes.

1. Buy the name at Namecheap, Porkbun or Cloudflare
2. In Netlify: **Domain management**, then **Add a domain**
3. Netlify shows the DNS records to enter at the registrar
4. Save them and wait, usually minutes

HTTPS is issued automatically. Nothing to configure.

---

## Two other hosts, same idea

If you would rather not use Netlify, these behave the same way. All free, all
connect to GitHub through a web page with no command line.

**Vercel.** Same steps. Import the repository, framework preset **Other**,
build command empty. Use this if you would rather have one account for both
this and the Turso plan later.

**GitHub Pages.** No new account at all, since the code is already on GitHub.
In the repository: **Settings**, **Pages**, source **Deploy from a branch**,
pick the branch and the `/ (root)` folder. The address is
`chelalba.github.io/tera`. Slightly fussier with custom domains, otherwise fine.

---

## If you change your mind later

Nothing here is a dead end. The server, the database and every bit of the API
stay in the project untouched. Moving to the full version later means doing the
Turso setup and switching hosts. The shop page does not change at all.

---

## Quick reference

```
Host          Netlify, from the GitHub repository
Build         none
Publish dir   .
Data          none, the menu lives in assets/js/data.js
Orders        WhatsApp, as now
Deploy        git push
Menu edits    edit data.js, then push
```
