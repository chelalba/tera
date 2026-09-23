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

  /* what the last call from the server told us */
  const cache = {
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
      const err = new Error(
        'This page was opened straight from the folder, so it cannot reach the shop. ' +
        'Start the server first: open the tera folder, run start.bat (or npm start), ' +
        'then go to the address it prints.'
      );
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
      const err = new Error('The shop server is not answering. Check the window you ran it in.');
      err.offline = true;
      throw err;
    }).then(res =>
      res.json().catch(() => ({})).then(data => {
        if (!res.ok) {
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

  function createItem(item) {
    return call('POST', '/menu', item).then(d => { cache.menu = d.menu; return d.item; });
  }

  function updateItem(id, item) {
    return call('PUT', '/menu/' + encodeURIComponent(id), item)
      .then(d => { cache.menu = d.menu; return d.item; });
  }

  function deleteItem(id) {
    return call('DELETE', '/menu/' + encodeURIComponent(id))
      .then(d => { cache.menu = d.menu; return d.menu; });
  }

  function reorderMenu(ids) {
    return call('POST', '/menu/order', { ids: ids })
      .then(d => { cache.menu = d.menu; return d.menu; });
  }

  function resetMenu() {
    return call('POST', '/menu/reset').then(d => { cache.menu = d.menu; return d.menu; });
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
    load, uid, device,
    menu, createItem, updateItem, deleteItem, reorderMenu, resetMenu,
    summary, myRating, rate,
    comments, addComment,
    addOrder,
    cart, saveCart,
    isOwner, ownerNeedsKey, ownerKey, setOwnerKey
  };
})();
