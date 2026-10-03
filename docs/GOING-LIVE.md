# Putting TiraMood online properly, with your own name

A real address like **tiramood.com**, on a host that allows a shop to be a
shop. One step at a time, in order. Nothing here needs a developer.

---

## First, the thing that changes the plan

Vercel's free plan **does not allow a business site**. This is their wording,
not a guess:

> Hobby teams are restricted to non-commercial personal use only. All
> commercial usage of the platform requires either a Pro or Enterprise plan.

And they count this as commercial usage:

> Advertising the sale of a product or service

That is exactly what TiraMood is: a menu, with prices, and an order button.
So the free Vercel account you have been using is against their rules, and an
account found doing it can be paused without much warning. Losing the shop on
a Friday because of a rule is not a risk worth carrying.

So this plan moves you somewhere a shop is allowed. The good news is that it
costs about the price of two coffees a month, and the code already runs in
both places without a single change.

---

## Step 1. Pick the name and buy it

**Use a `.com`.** Not a `.dz`. An Algerian `.dz` needs a registered Algerian
company or a trademark certificate, and the registrars that handle it charge
between 118 and 399 dollars a year. A `.com` is about **10 to 15 dollars a
year** and nobody has to prove anything.

Good names, in the order I would try them:

```
tiramood.com
tiramood.shop
tiramood.store
```

Where to buy, cheapest first:

| Registrar | Roughly | Note |
|---|---|---|
| **Cloudflare Registrar** | ~$10/yr | Sells at cost, never raises the price at renewal. Best value. |
| **Porkbun** | ~$11/yr | Simple, honest pricing, free privacy. |
| **Namecheap** | ~$13/yr | The most familiar, often cheap in year one then dearer. |

**What to actually do**

1. Go to the registrar and search for `tiramood.com`
2. If it is taken, try `.shop` or `.store` before inventing a longer name
3. Add it to the basket. **Turn off** every extra they offer: hosting, email,
   SSL, site builder. You need none of them. Keep WHOIS privacy if it is free.
4. Pay for **one year** to start, and turn **auto-renew on**

> **Paying from Algeria.** This is usually the hardest part of the whole plan.
> These sites need a card that works internationally. A local CIB card often
> will not go through. A Visa or Mastercard that works abroad will, and all
> three take PayPal, which is the usual way round it. Sort this out before you
> start, because it blocks everything else.

Write down the login for the registrar somewhere safe. You will need it once a
year and at no other time, which is exactly how people lose it.

---

## Step 2. Pick the host

Two honest options. Both allow a business. Both keep your Turso database
exactly as it is.

### Option A — Render, about $7 a month

**Pick this if you want the lowest cost.**

The project is a plain Node server that serves the pages and answers the menu
by itself. Render runs it as it is: no rewrite, no new files, no settings to
invent. It is also, quietly, a little safer, because the server only ever
hands out four things over the web (`assets`, `pages`, `index.html`,
`robots.txt`) and keeps everything else private without being asked.

Do **not** use Render's free tier for the shop. A free service goes to sleep
after 15 minutes with no visitors, and the next customer waits half a minute
staring at nothing. For a shop that is worse than no website.

### Option B — Vercel Pro, $20 a month

**Pick this if you want it fastest everywhere and least fiddly.**

It is what the project was shaped for, your deployment settings already exist,
and pages are served from servers close to whoever is looking. For customers
in Algeria opening the menu on mobile data, that difference is real.

### Which one

Start with **Render at $7**. It does everything you need today, and the shop
is small. If the site ever feels slow for customers, moving to Vercel Pro
later is an afternoon's work, not a rebuild.

---

## Step 3. Put the code where the host can see it

The host reads from GitHub. There are commits sitting on this computer that
have never been sent, including the photo button.

```bash
git push
```

Nothing goes live from this. It only puts the code where a host can reach it.

---

## Step 4. Deploy

### If you chose Render

1. Go to **render.com** and **Sign up with GitHub**
2. **New** then **Web Service**
3. Choose the **tera** repository
4. Fill in:

| Setting | Value |
|---|---|
| Name | `tiramood` |
| Region | **Frankfurt** — the closest to Algeria |
| Branch | `main` |
| Runtime | **Node** |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | **Starter** (the paid one, not Free) |

5. Open **Environment Variables** and add all three **before** you deploy:

```
TURSO_URL        libsql://tiramood-chelalba.aws-eu-west-1.turso.io
TURSO_TOKEN      the long eyJhbGci... line
OWNER_PASSWORD   a code only you know
```

6. Press **Create Web Service** and wait two or three minutes

### If you chose Vercel Pro

1. **vercel.com**, upgrade the team to **Pro** first
2. **Add New** then **Project**, import **tera**
3. Framework Preset **Other**. Leave build and output empty.
4. Add the same three variables before deploying
5. **Deploy**, then **Settings**, **Git**, and set **Production Branch** to
   `main`

### About the password

`OWNER_PASSWORD` is the only thing standing between a stranger and your menu.
`1212` was fine while this was on your own computer. On a public address it is
not. Make it long and not a date:

```
tiramood-kitchen-2026-amina
```

Write it down. Nothing in the website knows it, so nothing can remind you.

---

## Step 5. Point the name at the host

You now have a working site at an ugly address. This gives it the real one.

### On Render

1. Open the service, then **Settings**, then **Custom Domains**
2. **Add Custom Domain** and type `tiramood.com`
3. Add it again as `www.tiramood.com`
4. Render shows you records to copy

### On Vercel

1. **Settings**, **Domains**, **Add**, type `tiramood.com`
2. Vercel shows you records to copy

### Then, at the registrar

Open the domain's **DNS** page and enter exactly what the host told you. It
will look like this, and the host's own screen is the authority, not this
table:

| Type | Name | Points to |
|---|---|---|
| A | `@` | the address the host gave you |
| CNAME | `www` | the address the host gave you |

Save. Then wait. It is usually minutes but it is allowed to take a day, and
there is nothing to fix while you wait. The host's domain page turns green by
itself when it is ready.

**HTTPS and the padlock happen on their own.** Do not buy an SSL certificate.
Both hosts make one for free. Anybody selling you one is selling you nothing.

---

## Step 6. Check it, in this order

Do these on a **phone**, not the computer, because that is where customers
will be.

1. Open `https://tiramood.com`. Padlock showing. Menu loads, photos there.
2. Press **العربية**. The page flips right to left.
3. Put a cake in the basket and press Confirm. WhatsApp opens with the order
   written out, going to your number.
4. Tap the **star** in the header, enter your new `OWNER_PASSWORD`.
5. Change a price. Save.
6. **Open the shop on somebody else's phone. The new price is there.**
7. Add an item and press **Choose a photo**. Take a picture with the camera.
   It appears on the shop.

Step 6 and step 7 are the ones that prove it. If those work, it all works.

---

## What it costs a year

| | Render | Vercel Pro |
|---|---|---|
| Domain | ~$12 | ~$12 |
| Hosting | ~$84 | ~$240 |
| Database (Turso free) | $0 | $0 |
| HTTPS | $0 | $0 |
| **Total** | **~$96 a year** | **~$252 a year** |

About 13,000 DA a year on Render, at the time of writing. Prices change, so
check the page before you pay.

---

## Keeping it alive

**Every year.** The domain renews. Keep auto-renew on and keep a working card
on the registrar. A shop whose domain lapses disappears completely, and
somebody else can buy the name.

**The menu, prices, photos.** All from your phone, through the star. Nothing
to push, nobody to ask.

**The words on the pages, the hours, the phone number.** These are in the code.
Change them here, then `git push`, and the host rebuilds itself in a minute.

**The database.** Turso's free tier is far more than this shop will use. If it
ever runs out they will email you long before anything stops.

**A backup.** While logged in as the owner:

```
https://tiramood.com/api/backup
```

Gives you the menu, the ratings, the notes and the orders in one file. Worth
doing before you change anything big.

---

## If it goes wrong

**The name shows somebody else's page, or an error.** DNS has not finished.
Wait. Check the records match the host's screen character for character.

**The menu will not load.** The two Turso variables are missing or wrong in
the host's settings. Fix them, then **redeploy** — saving alone does not
restart anything.

**The star will not take the code.** What you type must match
`OWNER_PASSWORD` exactly.

**It worked, now it says 404 and nothing else.** The deployment is gone, not
broken. Open the host's dashboard and redeploy. Nothing is lost: the pages are
on GitHub and the menu is in Turso.

---

## The short version

```
1  Sort out a card that works internationally
2  Buy tiramood.com                        ~$12/year
3  git push
4  Render: Web Service, Frankfurt, Starter, 3 variables
5  Add the domain, copy the DNS records, wait
6  Test on a phone: order, star, price, photo
7  Turn on auto-renew and write the password down
```
