/* ===============================================================
   The data, on Supabase.

   Same functions, same shapes, same names as the SQLite version this
   replaces, so routes.js did not have to learn anything new.

   Two things are worth knowing before changing anything here.

   It talks to Supabase over HTTP, not over a database socket. That is
   not a compromise, it is the only thing that works: Cloudflare runs
   this code in a V8 isolate with no TCP, so PostgREST over fetch is
   the way in. The same code then runs unchanged on this machine.

   It uses the service role key, which goes straight past row level
   security. That is why every table is locked with no policy at all:
   the browser never holds a Supabase key of any kind, it only ever
   talks to /api on our own domain, and this file is the only thing on
   the other side. If the publishable key ever leaks it opens nothing.
   =============================================================== */

const { createClient } = require('@supabase/supabase-js');

const URL = process.env.SUPABASE_URL || '';
const KEY = process.env.SUPABASE_SERVICE_KEY || '';

/* Cloudflare has no process.env. The function hands us its own
   bindings instead, once, before anything else runs. */
let settings = { url: URL, key: KEY };

function configure(env) {
  if (!env) return;
  settings = {
    url: env.SUPABASE_URL || settings.url,
    key: env.SUPABASE_SERVICE_KEY || settings.key
  };
  client = null;
}

let client = null;

function sb() {
  if (!client) {
    if (!settings.url || !settings.key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are not set');
    }
    client = createClient(settings.url, settings.key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return client;
}

function hosted() {
  return settings.url.replace(/^https?:\/\//, '');
}

const now = () => Date.now();

/* Every call comes back as { data, error }. Throwing here means one
   place to look when something is wrong, rather than a null that
   turns into a confusing mistake three functions later. */
function ok(result, what) {
  if (result.error) {
    throw new Error(what + ': ' + (result.error.message || 'unknown error'));
  }
  return result.data;
}

/* ---------------------------------------------------------------
   First run

   The tables are made by a migration, not from here, so there is
   nothing to build on demand. Kept so the routes can go on calling
   it, and so an empty database still fills itself.
---------------------------------------------------------------- */

let readyPromise = null;

function ready(seedMenu) {
  if (!readyPromise) {
    readyPromise = (async () => {
      if (seedMenu && seedMenu.length && await isEmpty()) {
        await seedItems(seedMenu);
      }
    })().catch(err => {
      readyPromise = null;      /* let the next request try again */
      throw err;
    });
  }
  return readyPromise;
}

/* ---------------------------------------------------------------
   Menu version, so an open shop page can notice a change cheaply
---------------------------------------------------------------- */

async function menuVersion() {
  const rows = ok(await sb().from('meta').select('value').eq('key', 'menu_version'),
                  'reading the menu version');
  return rows.length ? Number(rows[0].value) : 0;
}

async function bumpMenuVersion() {
  const current = await menuVersion();
  ok(await sb().from('meta').upsert(
        { key: 'menu_version', value: String(current + 1) }, { onConflict: 'key' }),
     'moving the menu version');
  return current + 1;
}

/* ---------------------------------------------------------------
   Menu
---------------------------------------------------------------- */

/* the browser calls the description "desc", the table keeps "descr"
   because desc is a reserved word */
function rowToItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    serves: row.serves,
    desc: row.descr,
    name_ar: row.name_ar || '',
    serves_ar: row.serves_ar || '',
    desc_ar: row.descr_ar || '',
    illo: row.illo,
    tint: row.tint,
    photo: row.photo
  };
}

async function listItems() {
  const rows = ok(await sb().from('items').select('*')
                    .order('position', { ascending: true })
                    .order('created_at', { ascending: true }),
                  'reading the menu');
  return rows.map(rowToItem);
}

async function getItem(id) {
  const rows = ok(await sb().from('items').select('*').eq('id', id).limit(1),
                  'reading an item');
  return rows.length ? rowToItem(rows[0]) : null;
}

async function nextPosition() {
  const rows = ok(await sb().from('items').select('position')
                    .order('position', { ascending: false }).limit(1),
                  'finding the end of the menu');
  return rows.length ? Number(rows[0].position) + 1 : 0;
}

function slug(text) {
  return String(text || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item';
}

async function freeId(base) {
  /* one round trip rather than one per guess: ask for everything that
     starts with the name and pick a number nothing else is using */
  const rows = ok(await sb().from('items').select('id').like('id', base + '%'),
                  'checking the name is free');
  const taken = new Set(rows.map(r => r.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(base + '-' + n)) n++;
  return base + '-' + n;
}

async function createItem(input) {
  const id = await freeId(slug(input.name));
  ok(await sb().from('items').insert({
    id,
    name: input.name,
    category: input.category,
    price: input.price,
    serves: input.serves,
    descr: input.desc,
    illo: input.illo,
    tint: input.tint,
    photo: input.photo,
    position: await nextPosition(),
    created_at: now(),
    name_ar: input.name_ar || '',
    serves_ar: input.serves_ar || '',
    descr_ar: input.desc_ar || ''
  }), 'adding an item');

  await bumpMenuVersion();
  return getItem(id);
}

async function updateItem(id, input) {
  const rows = ok(await sb().from('items').update({
    name: input.name,
    category: input.category,
    price: input.price,
    serves: input.serves,
    descr: input.desc,
    illo: input.illo,
    tint: input.tint,
    photo: input.photo,
    name_ar: input.name_ar || '',
    serves_ar: input.serves_ar || '',
    descr_ar: input.desc_ar || ''
  }).eq('id', id).select('id'), 'saving an item');

  if (!rows.length) return null;
  await bumpMenuVersion();
  return getItem(id);
}

/* An item coming back under the same id keeps the stars it earned,
   which is why deleting is a real decision rather than a tidy up. */
async function deleteItem(id) {
  const rows = ok(await sb().from('items').delete().eq('id', id).select('id'),
                  'removing an item');
  const gone = rows.length > 0;
  if (gone) {
    ok(await sb().from('ratings').delete().eq('item_id', id), 'clearing its stars');
    await bumpMenuVersion();
  }
  return gone;
}

async function reorderItems(ids) {
  /* upsert writes them all in one request, which matters here: a
     function on the free plan is measured in milliseconds of work,
     and fifteen round trips would be fifteen chances to run out */
  const rows = ok(await sb().from('items').select('*').in('id', ids),
                  'reading the menu to reorder it');
  const byId = new Map(rows.map(r => [r.id, r]));

  const moved = ids
    .map((id, i) => {
      const row = byId.get(id);
      return row ? Object.assign({}, row, { position: i }) : null;
    })
    .filter(Boolean);

  if (moved.length) {
    ok(await sb().from('items').upsert(moved, { onConflict: 'id' }), 'reordering');
  }
  await bumpMenuVersion();
  return listItems();
}

/* ---------------------------------------------------------------
   Ratings
---------------------------------------------------------------- */

async function rateItem(itemId, device, value) {
  ok(await sb().from('ratings').upsert(
        { item_id: itemId, device, value, created_at: now() },
        { onConflict: 'item_id,device' }),
     'saving your rating');
  return ratingSummaries();
}

/* PostgREST will not do GROUP BY, so the adding up happens here. The
   table holds one row per person per item, which stays small. */
async function ratingSummaries() {
  const rows = ok(await sb().from('ratings').select('item_id, value'),
                  'reading the ratings');
  const totals = {};
  for (const r of rows) {
    const t = totals[r.item_id] || (totals[r.item_id] = { sum: 0, count: 0 });
    t.sum += Number(r.value);
    t.count += 1;
  }
  const out = {};
  for (const id of Object.keys(totals)) {
    out[id] = { average: totals[id].sum / totals[id].count, count: totals[id].count };
  }
  return out;
}

async function ratingsByDevice(device) {
  const rows = ok(await sb().from('ratings').select('item_id, value').eq('device', device),
                  'reading your ratings');
  const out = {};
  rows.forEach(r => { out[r.item_id] = Number(r.value); });
  return out;
}

/* ---------------------------------------------------------------
   Comments
---------------------------------------------------------------- */

function rowToComment(r) {
  return {
    id: Number(r.id),
    name: r.name,
    text: r.body,
    ts: Number(r.created_at),
    hidden: Boolean(r.hidden)
  };
}

async function listComments(includeHidden) {
  let query = sb().from('comments').select('*').order('created_at', { ascending: false });
  if (!includeHidden) query = query.eq('hidden', false);
  return ok(await query, 'reading the notes').map(rowToComment);
}

async function addComment(name, text, device) {
  const rows = ok(await sb().from('comments').insert({
    name: String(name).slice(0, 40),
    body: String(text).slice(0, 600),
    device: device || '',
    created_at: now()
  }).select('*'), 'saving your note');
  return rowToComment(rows[0]);
}

async function hideComment(id, hidden) {
  ok(await sb().from('comments').update({ hidden: Boolean(hidden) }).eq('id', id),
     'hiding a note');
  return true;
}

/* ---------------------------------------------------------------
   Orders
---------------------------------------------------------------- */

async function addOrder(order) {
  const { count } = await sb().from('orders').select('*', { count: 'exact', head: true });
  const ref = 'T' + String((count || 0) + 1).padStart(3, '0');
  const c = order.customer || {};

  const rows = ok(await sb().from('orders').insert({
    ref,
    cust_name: c.name || '',
    cust_phone: c.phone || '',
    mode: c.mode || '',
    wanted_for: c.date || '',
    note: c.note || '',
    total: order.total || 0,
    status: 'sent',
    created_at: now()
  }).select('id'), 'saving the order');

  const orderId = rows[0].id;
  const lines = (order.items || []).map(it => ({
    order_id: orderId,
    item_id: it.id || '',
    name: it.name,
    price: it.price || 0,
    qty: it.qty || 1
  }));
  if (lines.length) {
    ok(await sb().from('order_lines').insert(lines), 'saving what was ordered');
  }

  return { ref };
}

async function listOrders(limit) {
  const orders = ok(await sb().from('orders').select('*')
                      .order('created_at', { ascending: false })
                      .limit(limit || 100),
                    'reading the orders');
  if (!orders.length) return [];

  /* all the lines for all the orders in one go, then matched up here */
  const lines = ok(await sb().from('order_lines').select('*')
                     .in('order_id', orders.map(o => o.id)),
                   'reading what was ordered');
  const byOrder = new Map();
  for (const l of lines) {
    if (!byOrder.has(l.order_id)) byOrder.set(l.order_id, []);
    byOrder.get(l.order_id).push(l);
  }

  return orders.map(o => ({
    ref: o.ref,
    ts: Number(o.created_at),
    total: Number(o.total),
    status: o.status,
    customer: {
      name: o.cust_name, phone: o.cust_phone,
      mode: o.mode, date: o.wanted_for, note: o.note
    },
    items: (byOrder.get(o.id) || []).map(l => ({
      id: l.item_id, name: l.name, price: Number(l.price), qty: Number(l.qty)
    }))
  }));
}

/* ---------------------------------------------------------------
   First run and starting over
---------------------------------------------------------------- */

async function isEmpty() {
  const { count } = await sb().from('items').select('*', { count: 'exact', head: true });
  return (count || 0) === 0;
}

async function seedItems(menu) {
  const stamp = now();
  const rows = menu.map((m, i) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    price: m.price || 0,
    serves: m.serves || '',
    descr: m.desc || '',
    illo: m.illo || 'cake',
    tint: m.tint || '#f0dcc2',
    photo: m.photo || '',
    position: i,
    created_at: stamp,
    name_ar: m.name_ar || '',
    serves_ar: m.serves_ar || '',
    descr_ar: m.desc_ar || ''
  }));
  ok(await sb().from('items').upsert(rows, { onConflict: 'id' }), 'filling the menu');
  await bumpMenuVersion();
  return listItems();
}

/* wipes the menu and puts the data.js list back. Ratings are left
   alone, so an item returning under the same id keeps its stars. */
async function resetToSeed(menu) {
  ok(await sb().from('items').delete().neq('id', ''), 'clearing the menu');
  return seedItems(menu);
}

/* ---------------------------------------------------------------
   Photographs

   In Storage, not in a table, and the item keeps the public address
   rather than an id. That means a customer's browser fetches the
   picture straight from Supabase and it never passes through the
   function at all, which is what keeps a menu full of photographs
   inside a free plan's ten milliseconds of work per request.
---------------------------------------------------------------- */

const BUCKET = 'photos';

const EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

async function savePhoto(bytes, mime) {
  const name = Date.now().toString(36) + '-' +
               Math.random().toString(36).slice(2, 10) + '.' +
               (EXTENSION[mime] || 'jpg');

  const up = await sb().storage.from(BUCKET).upload(name, bytes, {
    contentType: mime,
    cacheControl: '31536000',       /* the name is never reused */
    upsert: false
  });
  if (up.error) throw new Error('saving the photo: ' + up.error.message);

  const { data } = sb().storage.from(BUCKET).getPublicUrl(name);
  return { name, url: data.publicUrl };
}

/* Pictures nothing points at any more. Called after an item is saved
   or deleted, so replacing a photograph does not leave the old one
   sitting there for ever. */
async function forgetUnusedPhotos() {
  const listed = await sb().storage.from(BUCKET).list('', { limit: 1000 });
  if (listed.error || !listed.data || !listed.data.length) return 0;

  const items = ok(await sb().from('items').select('photo').neq('photo', ''),
                   'reading which photos are used');
  const used = new Set(
    items.map(i => String(i.photo).split('/').pop()).filter(Boolean)
  );

  const spare = listed.data.map(f => f.name).filter(n => !used.has(n));
  if (!spare.length) return 0;

  const gone = await sb().storage.from(BUCKET).remove(spare);
  if (gone.error) return 0;
  return spare.length;
}

/* ---------------------------------------------------------------
   The owner's code

   Kept here rather than in an environment variable, so there is one
   copy of it and it can be changed from a phone.

   Never stored as the code itself. PBKDF2 with its own salt, ten
   thousand rounds, which is chosen by the host rather than by taste:
   a Cloudflare function on the free plan gets ten milliseconds of
   work per request, and fifty thousand rounds measured seventeen.
---------------------------------------------------------------- */

const PBKDF2_ROUNDS = 10000;

/* Web Crypto, because this runs in Cloudflare's isolate as well as in
   Node. Node has it on globalThis from 18 onwards. */
function webcrypto() {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    return globalThis.crypto;
  }
  throw new Error('no Web Crypto here');
}

function toHex(bytes) {
  return Array.from(new Uint8Array(bytes))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

async function derive(password, saltHex) {
  const crypto = webcrypto();
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ROUNDS, hash: 'SHA-256' }, key, 256);
  return toHex(bits);
}

/* Compares without leaking, through timing, how much of it matched. */
function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return different === 0;
}

/* One read per minute per machine, rather than one per request. The
   isolate keeps module scope between requests, so a shop being read
   by customers never asks for this at all. */
let secretCache = { at: 0, value: undefined };
const SECRET_TTL = 60 * 1000;

async function ownerSecret() {
  if (secretCache.value !== undefined && Date.now() - secretCache.at < SECRET_TTL) {
    return secretCache.value;
  }
  const rows = ok(await sb().from('settings').select('value').eq('key', 'owner_password'),
                  'reading the owner code');
  let value = null;
  if (rows.length) {
    try { value = JSON.parse(rows[0].value); } catch (err) { value = null; }
  }
  secretCache = { at: Date.now(), value };
  return value;
}

async function setOwnerPassword(password) {
  const crypto = webcrypto();
  const saltHex = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await derive(password, saltHex);

  ok(await sb().from('settings').upsert({
    key: 'owner_password',
    value: JSON.stringify({ salt: saltHex, hash, rounds: PBKDF2_ROUNDS }),
    updated_at: now()
  }, { onConflict: 'key' }), 'saving the owner code');

  secretCache = { at: 0, value: undefined };
  return true;
}

async function checkOwnerPassword(given) {
  const stored = await ownerSecret();
  if (!stored || !stored.salt || !stored.hash) return false;
  if (!given) return false;
  return sameSecret(await derive(given, stored.salt), stored.hash);
}

async function hasOwnerPassword() {
  return Boolean(await ownerSecret());
}


module.exports = {
  configure, hosted, ready, menuVersion,
  listItems, getItem, createItem, updateItem,
  deleteItem, reorderItems, rateItem, ratingSummaries,
  ratingsByDevice, listComments, addComment, hideComment,
  addOrder, listOrders, isEmpty, seedItems,
  resetToSeed, savePhoto, forgetUnusedPhotos,
  ownerSecret, setOwnerPassword, checkOwnerPassword, hasOwnerPassword
};
