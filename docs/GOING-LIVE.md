# Putting TiraMood online: Cloudflare and Supabase

The data is already live. This is the other half: getting the pages onto
Cloudflare and, if you want it, a real name.

Both free plans **allow a business**, which is why we are here rather than on
Vercel. Cloudflare says so plainly, and static files on Pages are unmetered.

---

## Where things already stand

**Supabase is done.** Nothing left to do there.

| | |
|---|---|
| Project | `tiramood`, Paris |
| Address | `https://upbijweychvpuzbtmlxw.supabase.co` |
| Tables | items, ratings, comments, orders, order_lines, meta, settings |
| Your menu | 11 items, with their Arabic |
| Photographs | a public `photos` bucket in Storage |
| The owner's code | in the `settings` table, hashed |
| Row level security | on for every table, with no policies, on purpose |

That last line looks alarming in Supabase's own security advisor and is not a
mistake. The browser never holds a Supabase key of any kind. It talks to `/api`
on your own domain, and only the Cloudflare function — holding the secret key,
which goes past those rules — ever reaches the database. Having **no** policies
is what makes a leaked publishable key open nothing at all.

---

## Step 1. Get the code onto GitHub

Cloudflare builds from GitHub, so nothing can deploy until the commits are
pushed.

```bash
git push
```

Nothing goes live from this on its own.

---

## Step 2. Make the Pages project

1. Go to **dash.cloudflare.com** and sign in
2. **Workers & Pages**, then **Create**, then the **Pages** tab
3. **Connect to Git**, allow Cloudflare to see your GitHub, pick **tera**

Then the build settings:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | **None** |
| Build command | `npm run build` |
| Build output directory | `dist` |

**`dist` matters.** Pages serves its output folder exactly as it finds it.
Pointing it at the project root would publish `server/`, `docs/` and `.env`.
`npm run build` copies only the public site into `dist/` and refuses to build
if anything private appears on the list.

---

## Step 3. Add the two variables. Do not skip this

Still on the setup screen, open **Environment variables** and add both, for
**Production**:

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://upbijweychvpuzbtmlxw.supabase.co` |
| `SUPABASE_SERVICE_KEY` | the `sb_secret_...` key |

Get the secret key from
**Supabase → Project Settings → API Keys → Secret keys**. It is the same one
that is in your `.env`.

**There is no `OWNER_PASSWORD` any more.** The code lives in Supabase now, and
is changed from the manager.

---

## Step 4. Deploy

Press **Save and Deploy** and wait a couple of minutes. You get an address like
`tiramood.pages.dev`.

Pushing to `main` redeploys on its own from then on.

---

## Step 5. Check it, on a phone

That is where your customers are, so test there and not on the computer.

1. Open the address. 15 photographs and 11 items should be there.
2. Press **العربية**. The page flips right to left.
3. Put a cake in the basket, press Confirm. WhatsApp opens with the order
   written out, going to your number.
4. Tap the **star** at the end of the header, enter the code.
5. Change a price. Save.
6. **Open the shop on somebody else's phone. The new price is there.**
7. Add an item, press **Choose a photo**, take a picture with the camera.
   It appears on the shop.

Steps 6 and 7 are the ones that prove it.

One oddity, not a fault: Cloudflare strips `.html`, so the manager's address
ends up as `/pages/owner` rather than `/pages/owner.html`. It gets there either
way.

---

## Step 6. Change the code

`1212` is four digits on a public address. In the manager there is now a
**Change the code** button: at least six characters, live on every device at
once, nothing to redeploy.

Write it down. Nothing in the website knows it, so nothing can remind you.

---

## Step 7. Your own name, if you want one

Use a **`.com`**, about **$12 a year**. Not a `.dz`: that needs a registered
Algerian company or a trademark certificate, and the registrars that handle it
charge between $118 and $399 a year.

Cheapest first: **Cloudflare Registrar** (sells at cost, and the domain is
already where your site is), then **Porkbun**, then **Namecheap**.

Then, in your Pages project: **Custom domains**, **Set up a domain**, type it
in. If you bought it at Cloudflare the records are added for you. HTTPS is
automatic and free — never buy an SSL certificate.

> **Paying from Algeria** is usually the hard part. A local CIB card often will
> not go through on an international registrar. A Visa or Mastercard that works
> abroad will, and all of them take PayPal. Sort this out first, because it
> blocks everything else.

---

## What it costs

| | |
|---|---|
| Cloudflare Pages | **free** — static files unmetered, 100,000 function calls a day |
| Supabase | **free** — far more than this shop will use |
| Domain | ~$12 a year, optional |

About **1,600 DA a year**, and nothing at all if you keep the
`tiramood.pages.dev` address.

---

## The one thing to watch

**Supabase pauses a free project after 7 days of low activity.** Their words:
a few requests a day over the week is enough to prevent it. A normal week of
customers is plenty. A quiet week — a holiday, a closure — is not, and the shop
goes down until you press **Resume project** in the dashboard.

They email a warning about a week beforehand, and a paused project can be
restored for 90 days with one button.

Three ways to live with it:

- **Do nothing.** Check the email if one arrives. Free.
- **Open the shop yourself every few days.** That counts as activity.
- **Supabase Pro, $25 a month.** Paid projects are never paused.

For a shop that is open most weeks, doing nothing is a reasonable answer. Just
know which way it fails, so a dead site on a Monday is not a mystery.

---

## Living with it

**The menu, prices, photographs, the code.** All from your phone, through the
star. Nothing to push.

**The words on the pages, the hours, the phone number.** These are in the code:
change them, `git push`, and Cloudflare rebuilds within a minute.

**A backup.** While logged in as the owner:

```
https://your-address/api/backup
```

The menu, the ratings, the notes and the orders in one file. It does **not**
contain your code, by design.

---

## If something goes wrong

**The menu will not load.** The two Supabase variables are missing or wrong in
Pages. Fix them, then **Retry deployment** — saving alone does not restart
anything.

**Everything is slow for one request, then fine.** That is a Supabase project
waking up, or a cold function. Normal.

**The star will not take the code.** What you type must match what you last
saved. If you have genuinely lost it, tell me: it can be reset from the
database.

**Anything else.** Cloudflare: **Workers & Pages**, your project,
**Deployments**, open the latest, read the **Functions** log.

---

## Quick reference

```
Pages          Cloudflare, from GitHub, branch main
Build          npm run build        output: dist
Variables      SUPABASE_URL, SUPABASE_SERVICE_KEY
Data           Supabase, project upbijweychvpuzbtmlxw
Photographs    Supabase Storage, public bucket "photos"
Owner page     https://your-address/pages/owner
Menu edits     from your phone, live at once
Code changes   git push
```

How the whole thing is put together:
**[HOW-IT-IS-BUILT.md](HOW-IT-IS-BUILT.md)**.
