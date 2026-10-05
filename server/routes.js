/* ===============================================================
   The API, as plain functions.

   Nothing in here knows about Node's http module or about Vercel.
   It is handed a method, a path, a body and the headers, and gives
   back a status and something to send. Both the local server and the
   function on Vercel call this same code, so the shop behaves the
   same in both places.
   =============================================================== */

'use strict';

const db = require('./supabase.js');
const seed = require('../assets/js/data.js');

/* Settings arrive one of two ways. On this machine they are in the
   environment, read from .env before anything else runs. On Cloudflare
   there is no such thing: the function is handed its own bindings per
   request, and passes them here before doing anything. */
let OWNER_PASSWORD = (typeof process !== 'undefined' && process.env &&
                      process.env.OWNER_PASSWORD) || '';

function configure(env) {
  if (!env) return;
  if (env.OWNER_PASSWORD !== undefined) OWNER_PASSWORD = env.OWNER_PASSWORD || '';
  db.configure(env);
}

/* ---------------------------------------------------------------
   Who is asking
---------------------------------------------------------------- */

function deviceOf(headers) {
  const raw = String(headers['x-device'] || '').trim();
  return /^[A-Za-z0-9._-]{4,64}$/.test(raw) ? raw : '';
}

/* With no OWNER_PASSWORD set, only somebody at this machine can
   change the menu, which is why working locally needs no setup.
   Online that check means nothing, so a password is required and
   the caller tells us whether the request came from this machine. */
/* The code is kept in the database, hashed, not in a setting on the
   host. One copy rather than two, and changeable from a phone.

   OWNER_PASSWORD still works, but only as a way in before anything is
   saved: the first time it is used it moves itself into the database
   and is never consulted again. That makes a fresh install possible
   without a chicken and egg, and means nobody has to remember to keep
   two places in step afterwards. */
async function isOwner(headers, fromThisMachine) {
  const given = String(headers['x-owner-key'] || '');

  if (given && await db.checkOwnerPassword(given)) return true;
  if (await db.hasOwnerPassword()) return false;

  /* nothing saved yet */
  if (OWNER_PASSWORD) {
    if (given === OWNER_PASSWORD) {
      await db.setOwnerPassword(OWNER_PASSWORD);
      return true;
    }
    return false;
  }
  return Boolean(fromThisMachine);
}

async function codeIsNeeded() {
  return (await db.hasOwnerPassword()) || Boolean(OWNER_PASSWORD);
}

function cleanItem(input) {
  const categories = seed.CATEGORIES.map(c => c.id).filter(id => id !== 'all');
  return {
    name: String(input.name || '').trim().slice(0, 80),
    category: categories.includes(input.category) ? input.category : categories[0],
    price: Math.max(0, Math.round(Number(input.price) || 0)),
    serves: String(input.serves || '').trim().slice(0, 40),
    desc: String(input.desc || '').trim().slice(0, 400),
    name_ar: String(input.name_ar || '').trim().slice(0, 80),
    serves_ar: String(input.serves_ar || '').trim().slice(0, 40),
    desc_ar: String(input.desc_ar || '').trim().slice(0, 400),
    illo: /^[a-z]{3,12}$/.test(input.illo || '') ? input.illo : 'cake',
    tint: /^#[0-9a-fA-F]{3,8}$/.test(input.tint || '') ? input.tint : '#f0dcc2',
    photo: String(input.photo || '').trim().slice(0, 200)
  };
}

const reply = (status, body) => ({ status, body });

/* What a phone camera produces is several megabytes; the browser
   shrinks it before sending. This is the backstop, not the target. */
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/* base64 to bytes, without Buffer.
   Buffer is a Node idea and this file also runs inside Cloudflare's
   V8 isolate, where it does not exist. atob is in both. */
function bytesFromBase64(base64) {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/* ---------------------------------------------------------------
   The routes

   route   the path with /api stripped, for example /bootstrap
   method  GET, POST, PUT, PATCH, DELETE
   body    the parsed JSON body, or {}
   headers the request headers, lower cased
   local   true when the request came from this machine
---------------------------------------------------------------- */

async function handle({ route, method, body, headers, local }) {
  await db.ready(seed.MENU);

  const device = deviceOf(headers);
  const owner = await isOwner(headers, local);
  body = body || {};

  /* ----- open to everybody ----- */

  if (route === '/menu-version' && method === 'GET') {
    return reply(200, { version: await db.menuVersion() });
  }

  if (route === '/bootstrap' && method === 'GET') {
    const [menu, ratings, yourRatings, comments, version] = await Promise.all([
      db.listItems(),
      db.ratingSummaries(),
      device ? db.ratingsByDevice(device) : Promise.resolve({}),
      db.listComments(false),
      db.menuVersion()
    ]);
    return reply(200, {
      menuVersion: version,
      menu, ratings, yourRatings, comments,
      owner,
      ownerNeedsKey: await codeIsNeeded()
    });
  }

  if (route === '/ratings' && method === 'POST') {
    const value = Math.round(Number(body.value));
    if (!device) return reply(400, { error: 'no device id' });
    if (!(value >= 1 && value <= 5)) return reply(400, { error: 'rating must be 1 to 5' });
    if (!await db.getItem(body.itemId)) return reply(404, { error: 'no such item' });
    return reply(200, { ratings: await db.rateItem(body.itemId, device, value) });
  }

  if (route === '/comments' && method === 'GET') {
    return reply(200, { comments: await db.listComments(owner) });
  }

  if (route === '/comments' && method === 'POST') {
    const name = String(body.name || '').trim();
    const text = String(body.text || '').trim();
    if (!name) return reply(400, { error: 'a name is needed' });
    if (text.length < 3) return reply(400, { error: 'the note is too short' });
    return reply(200, { comment: await db.addComment(name, text, device) });
  }

  if (route === '/orders' && method === 'POST') {
    if (!Array.isArray(body.items) || !body.items.length) {
      return reply(400, { error: 'the order is empty' });
    }
    return reply(200, await db.addOrder(body));
  }

  /* There is no route for reading a photograph any more. They live in
     Supabase Storage with a public address, so a customer's browser
     fetches each one straight from there. It never passes through this
     function, which is the point: a function on the free plan is
     measured in milliseconds of work per request, and shifting image
     bytes it does not need to touch would spend all of them. */

  /* ----- the owner only, from here down ----- */

  const ownerOnly = route.indexOf('/menu') === 0 ||
                    route === '/orders' ||
                    route === '/backup' ||
                    route === '/photos' ||
                    route === '/password' ||
                    route.indexOf('/comments/') === 0;

  if (ownerOnly && !owner) return reply(401, { error: 'owner only' });

  /* The picture arrives as base64 inside ordinary JSON. Not the most
     compact way to move bytes, but it needs no multipart handling and
     no raw body reading, so the same code works unchanged on this
     machine and on Vercel. A shrunk photograph is small enough that
     the third it adds does not matter. */
  if (route === '/photos' && method === 'POST') {
    const mime = String(body.mime || '').toLowerCase();
    if (PHOTO_TYPES.indexOf(mime) < 0) {
      return reply(400, { error: 'that is not a photograph we can take' });
    }

    const base64 = String(body.data || '').replace(/^data:[^,]*,/, '');
    if (!base64) return reply(400, { error: 'the photograph is empty' });

    let bytes;
    try { bytes = bytesFromBase64(base64); }
    catch (err) { return reply(400, { error: 'the photograph did not arrive whole' }); }

    if (!bytes.length) return reply(400, { error: 'the photograph is empty' });
    if (bytes.length > MAX_PHOTO_BYTES) {
      return reply(413, { error: 'that photograph is too big, even after shrinking' });
    }

    const saved = await db.savePhoto(bytes, mime);
    return reply(200, { url: saved.url, bytes: bytes.length });
  }

  /* Changing the code. Owner only, like everything from here down,
     so you must already be in to change it. */
  if (route === '/password' && method === 'POST') {
    const next = String(body.password || '').trim();
    if (next.length < 6) {
      return reply(400, { error: 'make it at least six characters' });
    }
    if (next.length > 100) {
      return reply(400, { error: 'that is too long' });
    }
    await db.setOwnerPassword(next);
    return reply(200, { saved: true });
  }

  if (route === '/menu' && method === 'POST') {
    const item = cleanItem(body);
    if (!item.name) return reply(400, { error: 'the item needs a name' });
    const made = await db.createItem(item);
    return reply(200, { item: made, menu: await db.listItems() });
  }

  if (route.indexOf('/menu/') === 0 && method === 'PUT') {
    const id = decodeURIComponent(route.slice('/menu/'.length));
    const item = cleanItem(body);
    if (!item.name) return reply(400, { error: 'the item needs a name' });
    const saved = await db.updateItem(id, item);
    if (!saved) return reply(404, { error: 'no such item' });
    await db.forgetUnusedPhotos();
    return reply(200, { item: saved, menu: await db.listItems() });
  }

  if (route.indexOf('/menu/') === 0 && method === 'DELETE') {
    const id = decodeURIComponent(route.slice('/menu/'.length));
    if (!await db.deleteItem(id)) return reply(404, { error: 'no such item' });
    await db.forgetUnusedPhotos();
    return reply(200, { menu: await db.listItems() });
  }

  if (route === '/menu/order' && method === 'POST') {
    if (!Array.isArray(body.ids)) return reply(400, { error: 'ids must be a list' });
    return reply(200, { menu: await db.reorderItems(body.ids) });
  }

  if (route === '/menu/reset' && method === 'POST') {
    return reply(200, { menu: await db.resetToSeed(seed.MENU) });
  }

  /* Two different things, on purpose.

     Hiding takes a note off the shop page and is undoable, which is
     what you want for one that is merely awkward. Deleting is for the
     one that should never have been written: it does not come back. */
  if (route.indexOf('/comments/') === 0 && method === 'DELETE') {
    const id = Number(route.slice('/comments/'.length));
    if (!Number.isFinite(id)) return reply(400, { error: 'which note?' });
    if (!await db.deleteComment(id)) return reply(404, { error: 'no such note' });
    return reply(200, { comments: await db.listComments(true) });
  }

  if (route.indexOf('/comments/') === 0 && method === 'PATCH') {
    const id = Number(route.slice('/comments/'.length));
    await db.hideComment(id, Boolean(body.hidden));
    return reply(200, { comments: await db.listComments(true) });
  }

  if (route === '/orders' && method === 'GET') {
    return reply(200, { orders: await db.listOrders(200) });
  }

  if (route === '/backup' && method === 'GET') {
    const [menu, ratings, comments, orders] = await Promise.all([
      db.listItems(), db.ratingSummaries(), db.listComments(true), db.listOrders(1000)
    ]);
    return reply(200, { savedAt: new Date().toISOString(), menu, ratings, comments, orders });
  }

  return reply(404, { error: 'no such endpoint' });
}

/* A page served by something else on this machine, typically an
   editor's Live Server on a neighbouring port, may ask us questions.
   That is what lets such a page find the real shop. Only localhost,
   never the open internet. */
function corsHeadersFor(origin) {
  if (!origin) return null;
  if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) return null;
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'content-type, x-device, x-owner-key',
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'vary': 'origin'
  };
}

/* ownerNeedsKey is a function now, not a value. It used to be read
   once when this file loaded, which was fine when the only setting
   came from the environment at startup. Cloudflare hands the settings
   over later, so reading it early would always have said no. */
module.exports = {
  handle,
  configure,
  corsHeadersFor,
  seed,
  ownerNeedsKey: codeIsNeeded
};
