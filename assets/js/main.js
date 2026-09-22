/* ===============================================================
   Tera Home Bakery, customer page
   =============================================================== */

(function () {
  'use strict';

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const state = {
    category: 'all',
    sort: 'default',
    menu: TeraStore.menu(),
    cart: TeraStore.cart()
  };

  /* ---------- helpers ---------- */

  /* item text is pasted into markup below, so a name carrying a quote
     or an angle bracket has to be made safe first */
  function esc(text) {
    return String(text === null || text === undefined ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function money(value) {
    const n = Number(value) || 0;
    const digits = n.toLocaleString('en-US').replace(/,/g, ' ');
    return SHOP.currencyBefore ? SHOP.currency + digits : digits + ' ' + SHOP.currency;
  }

  function product(id) {
    return state.menu.find(p => p.id === id);
  }

  function cartCount() {
    return state.cart.reduce((sum, line) => sum + line.qty, 0);
  }

  function cartTotal() {
    return state.cart.reduce((sum, line) => {
      const p = product(line.id);
      return p ? sum + p.price * line.qty : sum;
    }, 0);
  }

  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600);
  }

  function mediaMarkup(p, cls) {
    if (p.photo) {
      return '<img src="' + esc(p.photo) + '" alt="' + esc(p.name) + '" loading="lazy">';
    }
    return '<svg class="' + (cls || '') + '" style="--illo-tint:' + esc(p.tint) + '" viewBox="0 0 200 150" aria-hidden="true">' +
           '<use href="#i-' + esc(p.illo) + '"/></svg>';
  }

  /* ---------- shop details into the page ---------- */

  function fillShopDetails() {
    const waNumber = String(SHOP.whatsapp).replace(/\D/g, '');
    const waLink = 'https://wa.me/' + waNumber;

    $('#factHours').textContent = SHOP.hours;
    $('#factNotice').textContent = SHOP.notice;

    $('#linkWhatsapp').href = waLink;
    $('#linkPhone').href = 'tel:' + String(SHOP.phone).replace(/\s/g, '');
    $('#valPhone').textContent = SHOP.phone;
    $('#linkMail').href = 'mailto:' + SHOP.email;
    $('#valMail').textContent = SHOP.email;
    $('#valHours').textContent = SHOP.hours;

    $('#socInstagram').href = SHOP.instagram;
    $('#socFacebook').href = SHOP.facebook;

    $('#copyLine').textContent =
      SHOP.name + ' ' + SHOP.kind + '. ' + new Date().getFullYear() + '.';
  }

  /* ---------- filters ---------- */

  function renderChips() {
    const wrap = $('#chips');
    wrap.innerHTML = CATEGORIES.map(c =>
      '<button class="chip" type="button" data-cat="' + c.id + '" aria-pressed="' +
      (c.id === state.category) + '">' + c.label + '</button>'
    ).join('');

    wrap.addEventListener('click', e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      state.category = btn.dataset.cat;
      $$('.chip', wrap).forEach(c => c.setAttribute('aria-pressed', String(c === btn)));
      renderGrid();
    });
  }

  function visibleItems() {
    let list = state.category === 'all'
      ? state.menu.slice()
      : state.menu.filter(p => p.category === state.category);

    if (state.sort === 'price-asc')  list.sort((a, b) => a.price - b.price);
    if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (state.sort === 'name')       list.sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === 'rating') {
      list.sort((a, b) => TeraStore.summary(b.id).average - TeraStore.summary(a.id).average);
    }
    return list;
  }

  /* ---------- product grid ---------- */

  function starsMarkup(productId) {
    const mine = TeraStore.myRating(productId);
    const sum = TeraStore.summary(productId);
    const shown = mine || Math.round(sum.average);

    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += '<button class="star' + (i <= shown ? ' is-on' : '') + '" type="button" ' +
               'data-value="' + i + '" aria-label="Rate ' + i + ' out of 5">' +
               '<svg aria-hidden="true"><use href="#i-star"/></svg></button>';
    }

    let meta;
    if (!sum.count) {
      meta = '<span class="rating-meta">Not rated yet</span>';
    } else {
      meta = '<span class="rating-meta' + (mine ? ' is-yours' : '') + '">' +
             sum.average.toFixed(1) + ' (' + sum.count + ')' + '</span>';
    }

    return '<div class="stars" role="group" aria-label="Rate this">' + stars + '</div>' + meta;
  }

  function renderGrid() {
    const grid = $('#grid');
    const items = visibleItems();
    const label = CATEGORIES.find(c => c.id === state.category);

    $('#gridHeading').textContent = state.category === 'all' ? 'Everything' : label.label;
    $('#gridEmpty').hidden = items.length > 0;

    grid.innerHTML = items.map(p =>
      '<article class="card" data-id="' + esc(p.id) + '">' +
        '<div class="card-media">' + mediaMarkup(p) +
          (p.serves ? '<span class="card-serves">' + esc(p.serves) + '</span>' : '') +
        '</div>' +
        '<div class="card-body">' +
          '<h4 class="card-name">' + esc(p.name) + '</h4>' +
          '<p class="card-desc">' + esc(p.desc) + '</p>' +
          '<div class="card-rating">' + starsMarkup(p.id) + '</div>' +
          '<div class="card-foot">' +
            '<span class="price">' + money(p.price) + '</span>' +
            '<button class="add-btn" type="button" data-add="' + esc(p.id) + '">' +
              '<svg aria-hidden="true"><use href="#i-plus"/></svg> Add' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    ).join('');
  }

  function wireGrid() {
    const grid = $('#grid');

    grid.addEventListener('click', e => {
      const add = e.target.closest('[data-add]');
      if (add) {
        addToCart(add.dataset.add);
        add.classList.add('is-added');
        setTimeout(() => add.classList.remove('is-added'), 600);
        return;
      }

      const star = e.target.closest('.star');
      if (star) {
        const card = star.closest('.card');
        const value = Number(star.dataset.value);
        TeraStore.rate(card.dataset.id, value);
        $('.card-rating', card).innerHTML = starsMarkup(card.dataset.id);
        toast('Thank you, your rating is saved.');
      }
    });

    /* highlight the stars you are about to pick */
    grid.addEventListener('mouseover', e => {
      const star = e.target.closest('.star');
      if (!star) return;
      const value = Number(star.dataset.value);
      $$('.star', star.parentElement).forEach(s => {
        s.classList.toggle('is-hot', Number(s.dataset.value) <= value);
      });
    });

    grid.addEventListener('mouseout', e => {
      const stars = e.target.closest('.stars');
      if (stars) $$('.star', stars).forEach(s => s.classList.remove('is-hot'));
    });
  }

  /* ---------- basket ---------- */

  function addToCart(id) {
    const line = state.cart.find(l => l.id === id);
    if (line) line.qty += 1;
    else state.cart.push({ id: id, qty: 1 });
    saveCart();
    toast(product(id).name + ' is in your basket.');
  }

  function setQty(id, qty) {
    const line = state.cart.find(l => l.id === id);
    if (!line) return;
    line.qty = qty;
    if (line.qty < 1) state.cart = state.cart.filter(l => l.id !== id);
    saveCart();
  }

  function saveCart() {
    TeraStore.saveCart(state.cart);
    renderCart();
  }

  function renderCart() {
    const count = cartCount();
    const badge = $('#cartCount');
    badge.textContent = count;
    badge.hidden = count === 0;

    const list = $('#cartLines');
    $('#cartEmpty').hidden = count > 0;
    $('#orderForm').hidden = count === 0;
    $('#sendOrder').disabled = count === 0;
    $('#cartTotal').textContent = money(cartTotal());

    list.innerHTML = state.cart.map(line => {
      const p = product(line.id);
      if (!p) return '';
      return '<li class="cart-line" data-id="' + esc(p.id) + '">' +
        '<div class="cart-thumb">' + mediaMarkup(p) + '</div>' +
        '<div>' +
          '<p class="cart-name">' + esc(p.name) + '</p>' +
          '<p class="cart-price">' + money(p.price * line.qty) + '</p>' +
        '</div>' +
        '<div class="cart-side">' +
          '<div class="qty">' +
            '<button type="button" data-step="-1" aria-label="One less ' + esc(p.name) + '">' +
              '<svg aria-hidden="true"><use href="#i-minus"/></svg></button>' +
            '<output>' + line.qty + '</output>' +
            '<button type="button" data-step="1" aria-label="One more ' + esc(p.name) + '">' +
              '<svg aria-hidden="true"><use href="#i-plus"/></svg></button>' +
          '</div>' +
          '<button class="line-remove" type="button" data-remove>Remove</button>' +
        '</div>' +
      '</li>';
    }).join('');
  }

  function wireCart() {
    $('#cartLines').addEventListener('click', e => {
      const row = e.target.closest('.cart-line');
      if (!row) return;
      const id = row.dataset.id;

      const step = e.target.closest('[data-step]');
      if (step) {
        const line = state.cart.find(l => l.id === id);
        setQty(id, line.qty + Number(step.dataset.step));
        return;
      }
      if (e.target.closest('[data-remove]')) {
        setQty(id, 0);
        toast('Removed from your basket.');
      }
    });
  }

  /* ---------- drawer ---------- */

  let lastFocus = null;

  function openDrawer() {
    lastFocus = document.activeElement;
    $('#overlay').hidden = false;
    requestAnimationFrame(() => $('#overlay').classList.add('is-on'));
    $('#drawer').classList.add('is-open');
    $('#drawer').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('#cartClose').focus();
  }

  function closeDrawer() {
    $('#overlay').classList.remove('is-on');
    $('#drawer').classList.remove('is-open');
    $('#drawer').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => { $('#overlay').hidden = true; }, 250);
    if (lastFocus) lastFocus.focus();
  }

  function wireDrawer() {
    $('#cartOpen').addEventListener('click', openDrawer);
    $('#cartClose').addEventListener('click', closeDrawer);
    $('#overlay').addEventListener('click', closeDrawer);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && $('#drawer').classList.contains('is-open')) closeDrawer();
      if (e.key !== 'Tab' || !$('#drawer').classList.contains('is-open')) return;

      const focusable = $$('button, [href], input, select, textarea', $('#drawer'))
        .filter(el => !el.disabled && el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- the WhatsApp order ---------- */

  function prettyDate(value) {
    const d = new Date(value + 'T12:00:00');
    if (isNaN(d)) return value;
    return d.toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }

  function buildMessage(details, ref) {
    const lines = [];
    lines.push('Hello ' + SHOP.name + ', I would like to order.');
    lines.push('');

    state.cart.forEach(line => {
      const p = product(line.id);
      if (p) lines.push(line.qty + ' x ' + p.name + '  (' + money(p.price * line.qty) + ')');
    });

    lines.push('');
    lines.push('Total: ' + money(cartTotal()));
    lines.push('');
    lines.push('Name: ' + details.name);
    lines.push('Phone: ' + details.phone);
    lines.push(details.mode + ': ' + prettyDate(details.date));
    if (details.note) lines.push('Note: ' + details.note);
    lines.push('Order ref: ' + ref);

    return lines.join('\n');
  }

  function readOrderForm() {
    return {
      name:  $('#oName').value.trim(),
      phone: $('#oPhone').value.trim(),
      date:  $('#oDate').value,
      mode:  ($('input[name="mode"]:checked') || {}).value || 'Collection',
      note:  $('#oNote').value.trim()
    };
  }

  function showOrderError(message) {
    const box = $('#orderError');
    box.textContent = message;
    box.hidden = !message;
  }

  function sendOrder() {
    if (!state.cart.length) return;

    const details = readOrderForm();

    if (!details.name) { showOrderError('Please write your name.'); $('#oName').focus(); return; }
    if (details.phone.replace(/\D/g, '').length < 6) {
      showOrderError('Please write a phone number we can reach you on.');
      $('#oPhone').focus();
      return;
    }
    if (!details.date) { showOrderError('Please pick the day you want your order.'); $('#oDate').focus(); return; }
    showOrderError('');

    const waNumber = String(SHOP.whatsapp).replace(/\D/g, '');
    if (!waNumber || /^2130+$/.test(waNumber)) {
      showOrderError('The shop WhatsApp number has not been set yet. Open assets/js/data.js and fill in "whatsapp".');
      return;
    }

    const saved = TeraStore.addOrder({
      items: state.cart.map(line => {
        const p = product(line.id);
        return { id: p.id, name: p.name, price: p.price, qty: line.qty };
      }),
      total: cartTotal(),
      customer: details
    });

    const url = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(buildMessage(details, saved.ref));
    window.open(url, '_blank', 'noopener');

    state.cart = [];
    saveCart();
    $('#orderForm').reset();
    closeDrawer();
    toast('Your order ' + saved.ref + ' is ready in WhatsApp. Press send there.');
  }

  /* ---------- notes ---------- */

  function timeAgo(ts) {
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + (mins === 1 ? ' minute ago' : ' minutes ago');
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  }

  function renderComments() {
    const wrap = $('#commentList');
    const list = TeraStore.comments().filter(c => !c.hidden);
    wrap.textContent = '';

    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'comment-empty';
      empty.textContent = 'No notes yet. Yours would be the first one.';
      wrap.appendChild(empty);
      return;
    }

    list.forEach(c => {
      const row = document.createElement('article');
      row.className = 'comment';

      const avatar = document.createElement('span');
      avatar.className = 'comment-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = (c.name[0] || '?').toUpperCase();

      const body = document.createElement('div');
      const head = document.createElement('div');
      head.className = 'comment-head';

      const name = document.createElement('h4');
      name.className = 'comment-name';
      name.textContent = c.name;

      const when = document.createElement('time');
      when.className = 'comment-time';
      when.dateTime = new Date(c.ts).toISOString();
      when.textContent = timeAgo(c.ts);

      const text = document.createElement('p');
      text.className = 'comment-text';
      text.textContent = c.text;

      head.append(name, when);
      body.append(head, text);
      row.append(avatar, body);
      wrap.appendChild(row);
    });
  }

  function wireComments() {
    const form = $('#commentForm');
    const count = $('#cCount');

    $('#cText').addEventListener('input', e => {
      count.textContent = e.target.value.length;
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#cName').value.trim();
      const text = $('#cText').value.trim();
      const error = $('#commentError');

      if (!name) { error.textContent = 'Please write your name.'; error.hidden = false; $('#cName').focus(); return; }
      if (text.length < 3) { error.textContent = 'Please write your note first.'; error.hidden = false; $('#cText').focus(); return; }

      error.hidden = true;
      TeraStore.addComment(name, text);
      form.reset();
      count.textContent = '0';
      renderComments();
      toast('Thank you, your note is saved.');
    });
  }

  /* ---------- odds and ends ---------- */

  function wireNav() {
    const nav = $('#nav');
    const toggle = $('#navToggle');

    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    nav.addEventListener('click', e => {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function wireSort() {
    $('#sort').addEventListener('change', e => {
      state.sort = e.target.value;
      renderGrid();
    });
  }

  function setDateFloor() {
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    $('#oDate').min = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
  }

  /* If the owner changes the menu in another tab, pick it up here
     rather than showing a price that is no longer real. */
  function watchMenu() {
    window.addEventListener('storage', e => {
      if (e.key !== TeraStore.keys.menu) return;
      state.menu = TeraStore.menu();
      dropMissingFromCart();
      renderGrid();
      renderCart();
      toast('The menu was just updated.');
    });
  }

  /* an item the owner has removed should not sit in a basket */
  function dropMissingFromCart() {
    const before = state.cart.length;
    state.cart = state.cart.filter(line => product(line.id));
    if (state.cart.length !== before) TeraStore.saveCart(state.cart);
  }

  /* ---------- start ---------- */

  dropMissingFromCart();
  fillShopDetails();
  renderChips();
  renderGrid();
  wireGrid();
  wireSort();
  renderCart();
  wireCart();
  wireDrawer();
  renderComments();
  wireComments();
  wireNav();
  watchMenu();
  setDateFloor();

  $('#sendOrder').addEventListener('click', sendOrder);
})();
