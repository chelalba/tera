/* ===============================================================
   The API, as plain functions.

   Nothing in here knows about Node's http module or about Vercel.
   It is handed a method, a path, a body and the headers, and gives
   back a status and something to send. Both the local server and the
   function on Vercel call this same code, so the shop behaves the
   same in both places.
   =============================================================== */

'use strict';

const db = require('./db.js');
const seed = require('../assets/js/data.js');

const OWNER_PASSWORD = process.env.OWNER_PASSWORD || '';

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
function isOwner(headers, fromThisMachine) {
  if (OWNER_PASSWORD) return headers['x-owner-key'] === OWNER_PASSWORD;
  return Boolean(fromThisMachine);
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
  const owner = isOwner(headers, local);
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
      ownerNeedsKey: Boolean(OWNER_PASSWORD)
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

  /* ----- the owner only, from here down ----- */

  const ownerOnly = route.indexOf('/menu') === 0 ||
                    route === '/orders' ||
                    route === '/backup' ||
                    route.indexOf('/comments/') === 0;

  if (ownerOnly && !owner) return reply(401, { error: 'owner only' });

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
    return reply(200, { item: saved, menu: await db.listItems() });
  }

  if (route.indexOf('/menu/') === 0 && method === 'DELETE') {
    const id = decodeURIComponent(route.slice('/menu/'.length));
    if (!await db.deleteItem(id)) return reply(404, { error: 'no such item' });
    return reply(200, { menu: await db.listItems() });
  }

  if (route === '/menu/order' && method === 'POST') {
    if (!Array.isArray(body.ids)) return reply(400, { error: 'ids must be a list' });
    return reply(200, { menu: await db.reorderItems(body.ids) });
  }

  if (route === '/menu/reset' && method === 'POST') {
    return reply(200, { menu: await db.resetToSeed(seed.MENU) });
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

module.exports = { handle, corsHeadersFor, seed, ownerNeedsKey: Boolean(OWNER_PASSWORD) };
