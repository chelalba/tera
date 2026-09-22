/* ---------------------------------------------------------------
   STORAGE
   Everything the visitor does is kept in this browser, under the
   keys below. The owner page reads the same keys, so ratings,
   comments and orders show up there.

   Worth knowing: this is browser storage, not a server. Two people
   on two phones each keep their own copy. When you want one shared
   list for the whole shop, the four functions at the bottom of this
   file are the only ones that need to be pointed at a database.
---------------------------------------------------------------- */

const TeraStore = (function () {
  const K = {
    menu:     'tera:menu',
    ratings:  'tera:ratings',
    comments: 'tera:comments',
    orders:   'tera:orders',
    cart:     'tera:cart',
    device:   'tera:device'
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const val = JSON.parse(raw);
      return val === null || val === undefined ? fallback : val;
    } catch (err) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' +
           Math.random().toString(36).slice(2, 7);
  }

  /* A stable id for this browser, so a visitor can change their own
     star rating instead of stacking a second vote on the same cake. */
  function device() {
    let d = read(K.device, null);
    if (!d) { d = uid('dev'); write(K.device, d); }
    return d;
  }

  /* ----- the menu ----------------------------------------------- */

  /* The shop page asks for the menu here rather than reading MENU
     straight out of data.js. If the owner page has saved a menu, that
     one wins. If it has not, the one written in data.js is used. */

  function menu() {
    const saved = read(K.menu, null);
    if (Array.isArray(saved) && saved.length) return saved;
    return MENU.map(item => Object.assign({}, item));
  }

  function saveMenu(list) { return write(K.menu, list); }

  function menuIsEdited() { return Array.isArray(read(K.menu, null)); }

  function forgetMenu() {
    try { localStorage.removeItem(K.menu); return true; }
    catch (err) { return false; }
  }

  /* ----- ratings ------------------------------------------------ */

  function allRatings() { return read(K.ratings, []); }

  function rate(productId, value) {
    const list = allRatings();
    const me = device();
    const found = list.find(r => r.productId === productId && r.device === me);
    if (found) {
      found.value = value;
      found.ts = Date.now();
    } else {
      list.push({ id: uid('rat'), productId, value, ts: Date.now(), device: me });
    }
    write(K.ratings, list);
    return summary(productId);
  }

  function myRating(productId) {
    const me = device();
    const found = allRatings().find(r => r.productId === productId && r.device === me);
    return found ? found.value : 0;
  }

  function summary(productId) {
    const list = allRatings().filter(r => r.productId === productId);
    if (!list.length) return { average: 0, count: 0 };
    const total = list.reduce((sum, r) => sum + r.value, 0);
    return { average: total / list.length, count: list.length };
  }

  /* ----- comments ----------------------------------------------- */

  function comments() {
    return read(K.comments, []).slice().sort((a, b) => b.ts - a.ts);
  }

  function addComment(name, text) {
    const list = read(K.comments, []);
    const entry = {
      id: uid('cmt'),
      name: String(name).trim().slice(0, 40),
      text: String(text).trim().slice(0, 600),
      ts: Date.now(),
      device: device(),
      hidden: false
    };
    list.push(entry);
    write(K.comments, list);
    return entry;
  }

  /* ----- cart --------------------------------------------------- */

  function cart() { return read(K.cart, []); }
  function saveCart(lines) { write(K.cart, lines); }

  /* ----- orders ------------------------------------------------- */

  function orders() {
    return read(K.orders, []).slice().sort((a, b) => b.ts - a.ts);
  }

  function addOrder(order) {
    const list = read(K.orders, []);
    const entry = Object.assign({
      id: uid('ord'),
      ref: 'T' + String(list.length + 1).padStart(3, '0'),
      ts: Date.now(),
      status: 'sent'
    }, order);
    list.push(entry);
    write(K.orders, list);
    return entry;
  }

  return {
    keys: K,
    uid,
    menu, saveMenu, menuIsEdited, forgetMenu,
    allRatings, rate, myRating, summary,
    comments, addComment,
    cart, saveCart,
    orders, addOrder
  };
})();
