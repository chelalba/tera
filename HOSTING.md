# Putting TiraMood online

This is the plan to follow. It keeps everything working the way it does now,
including **changing the menu from your phone**, and it needs no command line
and no changes to the code.

Host: **Railway**. Cost: **$5 a month.**

---

## Why this one

You said changing the menu from your phone matters. That rules out the free
options, and it is worth understanding why, once, so the choice makes sense.

Changing the menu from your phone means a server that is always awake, holding
a database that remembers. No free host gives you that. I checked their own
documentation rather than guess:

- **Render**: a persistent disk requires a **paid** service.
- **Vercel**: throws the disk away after every request, so the database has to
  move to a separate service, which is where the Turso setup came from.
- **Railway free**: gives $1 of credit a month, which a shop running all day
  will use up.

Railway's paid plan fixes all of it at once, and here is the part that makes it
the safe choice: **nothing in your project has to change.** Railway puts your
files in a folder called `/app`, and your database already lives at `data`
inside the project. Mount the storage at `/app/data` and the file lands exactly
where the code already looks for it.

No rewrite means nothing new to break. That is what makes this the plan most
likely to still be working in a year.

---

## What it costs

| | |
|---|---|
| Railway Hobby | $5 a month |
| A domain name | about 10 to 15 a year, optional |

The $5 is a subscription that also pays for the resources you use. A shop this
size uses very little, so the $5 covers it.

---

## Before you start

You need two things, both free to make:

1. A **GitHub** account. You already have one: `chelalba`.
2. A **Railway** account, which you will make in step 2 by signing in with
   GitHub.

Have a card ready for the Railway subscription. Nothing else needs paying for.

---

## Step 1. Put the latest code on GitHub

**I have already done this for you.** Everything is committed and pushed.

If you ever need to do it again after making changes:

```bash
git add -A
git commit -m "describe what changed"
git push
```

---

## Step 2. Make the Railway account

1. Go to **railway.com**
2. Press **Login** and choose **Sign in with GitHub**
3. Authorise it when GitHub asks

---

## Step 3. Create the project from your repository

1. Press **New Project**
2. Choose **Deploy from GitHub repo**
3. If it asks for permission to see your repositories, allow it
4. Pick **tera**

Railway starts building straight away. It reads `package.json`, sees
`npm start`, and runs your server. Let it finish.

> **Branch.** If it asks which branch, choose the one holding this work. It is
> called `sqlite-backend` unless you have merged it into `main`. You can change
> this later under **Settings**, **Source**.

---

## Step 4. Add the storage. Do not skip this

This is the step that keeps your menu, ratings, notes and orders. Without it
they are wiped every time the app restarts.

1. In the project canvas, **right click** on empty space, or press **Ctrl+K**
2. Choose **Volume**
3. When it asks which service to attach it to, pick your app
4. For the **mount path**, type exactly:

```
/app/data
```

That path matters. Railway builds your app into `/app`, and the database lives
in `data` inside the project, so `/app/data` is where the file needs to be.
Anything else and the shop starts empty every morning.

Railway restarts the service. That is expected.

---

## Step 5. Lock the menu manager

On your own computer the manager is safe because only you can reach the
machine. Online that is no longer true, so it needs a password.

1. Open your service, then the **Variables** tab
2. Press **New Variable** and add:

| Name | Value |
|---|---|
| `OWNER_PASSWORD` | a code only you know |

Make it the same as the star code in `assets/js/data.js` so one number does
both jobs. It is `1212` today, and you should change it to something harder
before you share the address with anyone.

Railway restarts the service when you save.

---

## Step 6. Turn on the address

1. Open your service, then **Settings**
2. Find **Networking**, then **Public Networking**
3. Press **Generate Domain**

You get an address like `tera-production.up.railway.app`. That is your shop,
live.

---

## Step 7. Check it works

On your phone:

1. Open the address. The menu should be there with the photos.
2. Switch to Arabic with the button in the header.
3. Add something to the basket and press Confirm. WhatsApp should open with
   the order written out, going to 213558529207.
4. Tap the **star** at the end of the header, enter your code, and the menu
   manager opens.
5. Change a price, then open the shop on another phone. The new price should be
   there.

If step 5 works, everything is working.

---

## Step 8. Your own domain, optional

`tera-production.up.railway.app` reads as a test. A proper address is worth the
small yearly cost for a shop taking orders.

1. Buy the name at Namecheap, Porkbun or Cloudflare
2. In Railway: **Settings**, **Networking**, **Custom Domain**
3. Railway shows you a `CNAME` record to add at the registrar
4. Save it there and wait, usually minutes

HTTPS is issued automatically.

---

## Living with it

**Changing the menu.** Open the address on your phone, tap the star, enter the
code. Add, edit, reorder, delete. Every change is live for customers
immediately. No pushing, no computer.

**Changing prices, photos, or the shop settings in `data.js`.** These are code,
so they need a push from your computer:

```bash
git add -A
git commit -m "New photos"
git push
```

Railway rebuilds and redeploys on its own within a minute or two.

**Backups.** Your whole shop is one file on the volume. Right now there is no
button to download it, because we removed it. The endpoint still exists, so
visiting this address while logged in gives you everything as one file:

```
https://your-address/api/backup
```

Ask me and I will put the button back in the manager, which is easier to
remember than a URL. For a shop holding real orders I would.

---

## If something goes wrong

**The site shows an error instead of the menu.** Open the service in Railway
and read the **Deploy Logs**. The most likely cause is the Node version: this
project needs Node 22 or newer because SQLite is built into it. `package.json`
asks for that, but if the log says SQLite is missing, add a variable
`NIXPACKS_NODE_VERSION` set to `22`.

**The menu is empty after a restart.** The volume is mounted at the wrong path.
It must be exactly `/app/data`. Fix it in the volume settings.

**The manager will not let you in.** The code you type must match
`OWNER_PASSWORD` in Railway's Variables tab.

---

## The other plans, for reference

Both give up something you said you need, so they are here only for context.

- **[HOSTING-EASY.md](HOSTING-EASY.md)** is free and takes ten minutes, but
  the menu can only be changed by editing a file and pushing, and ratings and
  notes stop being shared.
- **[HOSTING-vercel-turso.md](HOSTING-vercel-turso.md)** is free and keeps
  everything, but needs WSL, a command line tool, and the server rewritten into
  serverless functions.

---

## Quick reference

```
Host          Railway, from the GitHub repository
Cost          $5 a month
Volume        mount at /app/data           <- the important one
Variable      OWNER_PASSWORD
Address       Settings, Networking, Generate Domain
Menu edits    from your phone, live immediately
Code changes  git push, Railway redeploys
```
