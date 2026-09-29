/* ---------------------------------------------------------------
   TALKING TO THE SERVER

   The menu, the star ratings, the notes and the orders all live in
   one SQLite file on the server, so everybody sees the same thing.
   This file is the only place the pages talk to it.

   The basket is the exception. It stays in this browser, because a
   half filled basket belongs to one person on one device and there
   is nothing to share.
---------------------------------------------------------------- */

const TeraStore = (function () {
  'use strict';

  const KEY_CART   = 'tera:cart';
  const KEY_DEVICE = 'tera:device';
  const KEY_OWNER  = 'tera:ownerKey';
  const KEY_ORIGIN = 'tera:shopOrigin';

  /* what the last call from the server told us */
  const cache = {
    menuVersion: 0,
    menu: [],
    ratings: {},        /* itemId -> { average, count } */
    yourRatings: {},    /* itemId -> 1..5 */
    comments: [],
    owner: false,
    ownerNeedsKey: false,
    ready: false
  };

  /* ----- browser side odds and ends ----------------------------- */

  function readLocal(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) { return fallback; }
  }

  function writeLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (err) { return false; }
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' +
           Math.random().toString(36).slice(2, 7);
  }

  /* A name for this browser, so a second tap on the stars replaces
     your rating instead of adding another one. It is random and it
     is not tied to you. */
  function device() {
    let d = readLocal(KEY_DEVICE, null);
    if (!d) { d = uid('dev'); writeLocal(KEY_DEVICE, d); }
    return d;
  }

  function ownerKey() {
    try { return sessionStorage.getItem(KEY_OWNER) || ''; }
    catch (err) { return ''; }
  }

  function setOwnerKey(value) {
    try {
      if (value) sessionStorage.setItem(KEY_OWNER, value);
      else sessionStorage.removeItem(KEY_OWNER);
    } catch (err) { /* private windows block this, carry on */ }
  }

  /* ----- the call itself ---------------------------------------- */

  function call(method, path, body) {
    /* Opened by double clicking the file rather than through the
       server. Nothing can work, so say why in plain words instead of
       letting every call fail on its own. */
    if (location.protocol === 'file:') {
      const err = new Error('The shop is not reachable from here.');
      err.offline = true;
      return Promise.reject(err);
    }

    const options = {
      method: method,
      headers: { 'x-device': device() }
    };
    const key = ownerKey();
    if (key) options.headers['x-owner-key'] = key;
    if (body !== undefined) {
      options.headers['content-type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    return fetch('/api' + path, options).catch(() => {
      const err = new Error('The shop is not answering just now.');
      err.offline = true;
      throw err;
    }).then(res =>
      res.json().catch(() => ({})).then(data => {
        if (!res.ok) {
          /* The page loaded, but there is no shop behind this address.
             Usually a plain file server such as the editor's Live
             Server, which serves the html and knows nothing of /api. */
          if (res.status === 404 && !data.error) {
            const wrong = new Error('The shop is not answering at this address.');
            wrong.wrongServer = true;
            wrong.status = 404;
            throw wrong;
          }
          const err = new Error(data.error || ('the server said ' + res.status));
          err.status = res.status;
          throw err;
        }
        return data;
      })
    );
  }

  /* ----- loading ------------------------------------------------ */

  function load() {
    return call('GET', '/bootstrap').then(data => {
      cache.menuVersion = data.menuVersion || 0;
      cache.menu = data.menu || [];
      cache.ratings = data.ratings || {};
      cache.yourRatings = data.yourRatings || {};
      cache.comments = data.comments || [];
      cache.owner = Boolean(data.owner);
      cache.ownerNeedsKey = Boolean(data.ownerNeedsKey);
      cache.ready = true;
      return cache;
    });
  }

  /* ----- menu --------------------------------------------------- */

  function menu() { return cache.menu; }

  /* Asks the server for one number and says whether the menu has
     moved since this page last read it. Cheap enough to call often. */
  function menuChanged() {
    return call('GET', '/menu-version')
      .then(data => Number(data.version) !== Number(cache.menuVersion))
      .catch(() => false);
  }

  /* Looking for the shop on a neighbouring port.

     People open these pages from whatever is already serving the
     folder, often an editor's Live Server, which hands over the html
     but has no shop behind it. The server itself moves up a port when
     one is busy, so rather than asking anybody to hunt for the right
     address we knock on the likely doors and find it. */
  /* The ports worth knocking on, best guess first.

     5500 upwards is where the server lands when nothing is set: it
     starts at 5500 and climbs if a port is taken. A PORT in .env can
     put it anywhere, so the ports editors and frameworks hand out are
     worth a knock too. The list is short on purpose; every entry is a
     failed request in the console when the shop is not there. */
  const LIKELY_PORTS = [3000, 5500, 5501, 5502, 5503, 5504, 5505, 5506,
                        5507, 5508, 5509, 5510, 5511, 5512, 5513, 5514,
                        3001, 8000, 8080, 5173, 4000];

  /* Does this address answer as the shop? Resolves to the origin, or
     to null. Never rejects, so one bad port cannot sink the search. */
  function shopAnswersAt(origin) {
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), 2500);
    return fetch(origin + '/api/menu-version', {
      headers: { 'x-device': device() },
      signal: stop.signal
    })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => (typeof data.version === 'number' ? origin : null))
      .catch(() => null)
      .then(result => { clearTimeout(timer); return result; });
  }

  function findShopOrigin() {
    const host = location.hostname || 'localhost';
    const here = Number(location.port) || (location.protocol === 'https:' ? 443 : 80);

    /* The one that worked last time, asked first and on its own. It is
       almost always still right, and then nothing else is knocked on
       and the console stays clean. */
    const remembered = readLocal(KEY_ORIGIN, null);

    function sweep() {
      const tries = LIKELY_PORTS
        .filter(p => p !== here)
        .map(p => shopAnswersAt('http://' + host + ':' + p));

      return Promise.all(tries).then(found => found.find(Boolean) || null);
    }

    const first = (remembered && remembered !== location.origin)
      ? shopAnswersAt(remembered)
      : Promise.resolve(null);

    return first
      .then(hit => hit || sweep())
      .then(origin => {
        if (origin) writeLocal(KEY_ORIGIN, origin);
        return origin;
      });
  }

  /* A direct line between the menu manager and any shop page open in
     the same browser. The owner saves, every shop tab hears it at
     once and redraws, with no waiting for the next check. Other
     devices still pick the change up through menuChanged above. */
  const channel = (function () {
    try { return new BroadcastChannel('tera-menu'); }
    catch (err) { return null; }
  })();

  function announceMenuChange() {
    if (channel) { try { channel.postMessage('menu-changed'); } catch (err) { /* ignore */ } }
  }

  function onMenuChange(handler) {
    if (!channel) return;
    channel.addEventListener('message', e => {
      if (e.data === 'menu-changed') handler();
    });
  }

  function createItem(item) {
    return call('POST', '/menu', item)
      .then(d => { cache.menu = d.menu; announceMenuChange(); return d.item; });
  }

  function updateItem(id, item) {
    return call('PUT', '/menu/' + encodeURIComponent(id), item)
      .then(d => { cache.menu = d.menu; announceMenuChange(); return d.item; });
  }

  function deleteItem(id) {
    return call('DELETE', '/menu/' + encodeURIComponent(id))
      .then(d => { cache.menu = d.menu; announceMenuChange(); return d.menu; });
  }

  function reorderMenu(ids) {
    return call('POST', '/menu/order', { ids: ids })
      .then(d => { cache.menu = d.menu; announceMenuChange(); return d.menu; });
  }

  function resetMenu() {
    return call('POST', '/menu/reset')
      .then(d => { cache.menu = d.menu; announceMenuChange(); return d.menu; });
  }

  /* ----- ratings ------------------------------------------------ */

  function summary(itemId) {
    return cache.ratings[itemId] || { average: 0, count: 0 };
  }

  function myRating(itemId) {
    return cache.yourRatings[itemId] || 0;
  }

  /* The stars fill in straight away and the server is told after. If
     the call fails the old numbers come back, so nothing is claimed
     that was not saved. */
  function rate(itemId, value) {
    const hadBefore = cache.yourRatings[itemId];
    const previous = JSON.parse(JSON.stringify(cache.ratings));

    const guess = cache.ratings[itemId]
      ? { average: cache.ratings[itemId].average, count: cache.ratings[itemId].count }
      : { average: 0, count: 0 };
    if (hadBefore) {
      const total = guess.average * guess.count - hadBefore + value;
      guess.average = total / guess.count;
    } else {
      const total = guess.average * guess.count + value;
      guess.count += 1;
      guess.average = total / guess.count;
    }
    cache.ratings[itemId] = guess;
    cache.yourRatings[itemId] = value;

    return call('POST', '/ratings', { itemId: itemId, value: value })
      .then(d => { cache.ratings = d.ratings; return d.ratings; })
      .catch(err => {
        cache.ratings = previous;
        if (hadBefore) cache.yourRatings[itemId] = hadBefore;
        else delete cache.yourRatings[itemId];
        throw err;
      });
  }

  /* ----- comments ----------------------------------------------- */

  function comments() { return cache.comments; }

  function addComment(name, text) {
    return call('POST', '/comments', { name: name, text: text }).then(d => {
      cache.comments = [d.comment].concat(cache.comments);
      return d.comment;
    });
  }

  /* ----- orders ------------------------------------------------- */

  function addOrder(order) { return call('POST', '/orders', order); }

  /* ----- basket, kept in this browser --------------------------- */

  function cart() { return readLocal(KEY_CART, []); }
  function saveCart(lines) { writeLocal(KEY_CART, lines); }

  /* ----- owner -------------------------------------------------- */

  function isOwner() { return cache.owner; }
  function ownerNeedsKey() { return cache.ownerNeedsKey; }

  return {
    load, uid, device, findShopOrigin,
    menu, menuChanged, onMenuChange, createItem, updateItem, deleteItem, reorderMenu, resetMenu,
    summary, myRating, rate,
    comments, addComment,
    addOrder,
    cart, saveCart,
    isOwner, ownerNeedsKey, ownerKey, setOwnerKey
  };
})();
