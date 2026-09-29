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

  const t = (key, vars) => TeraI18n.t(key, vars);
  const itemText = (obj, field) => TeraI18n.item(obj, field);

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
    const unit = (TeraI18n.isArabic() && SHOP.currency_ar) ? SHOP.currency_ar : SHOP.currency;
    return SHOP.currencyBefore ? unit + digits : digits + ' ' + unit;
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


  /* a photo may be written with or without the leading slash; the
     manager lives one folder down, so it needs the absolute form */
  function photoUrl(value) {
    const v = String(value || '').trim();
    if (!v) return '';
    if (/^(https?:)?\/\//.test(v) || v.charAt(0) === '/') return v;
    return '/' + v.replace(/^\.?\//, '');
  }

  function mediaMarkup(p, cls) {
    if (p.photo) {
      return '<img src="' + esc(photoUrl(p.photo)) + '" alt="' + esc(itemText(p, 'name')) + '" loading="lazy">';
    }
    return '<svg class="' + (cls || '') + '" style="--illo-tint:' + esc(p.tint) + '" viewBox="0 0 200 150" aria-hidden="true">' +
           '<use href="#i-' + esc(p.illo) + '"/></svg>';
  }

  /* ---------- shop details into the page ---------- */

  function fillShopDetails() {
    const waNumber = String(SHOP.whatsapp).replace(/\D/g, '');
    const waLink = 'https://wa.me/' + waNumber;

    const ar = TeraI18n.isArabic();
    $('#factHours').textContent = (ar && SHOP.hours_ar) ? SHOP.hours_ar : SHOP.hours;

    $('#linkWhatsapp').href = waLink;
    $('#linkPhone').href = 'tel:' + String(SHOP.phone).replace(/\s/g, '');
    $('#valPhone').textContent = SHOP.phone;
    $('#linkMail').href = 'mailto:' + SHOP.email;
    $('#valMail').textContent = SHOP.email;
    $('#valHours').textContent = (ar && SHOP.hours_ar) ? SHOP.hours_ar : SHOP.hours;

    $('#socInstagram').href = SHOP.instagram;
    $('#socFacebook').href = SHOP.facebook;

    const kind = (ar && SHOP.kind_ar) ? SHOP.kind_ar : SHOP.kind;
    $('#copyLine').textContent =
      SHOP.name + ' ' + kind + '. ' + new Date().getFullYear() + '.';
  }

  /* ---------- filters ---------- */

  function renderChips() {
    const wrap = $('#chips');
    wrap.innerHTML = CATEGORIES.map(c =>
      '<button class="chip" type="button" data-cat="' + c.id + '" aria-pressed="' +
      (c.id === state.category) + '">' + esc(itemText(c, 'label')) + '</button>'
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
    if (state.sort === 'name')       list.sort((a, b) =>
      itemText(a, 'name').localeCompare(itemText(b, 'name'), TeraI18n.lang()));
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
               'data-value="' + i + '" aria-label="' + esc(t('card.rate', { n: i })) + '">' +
               '<svg aria-hidden="true"><use href="#i-star"/></svg></button>';
    }

    let meta;
    if (!sum.count) {
      meta = '<span class="rating-meta">' + esc(t('card.notRated')) + '</span>';
    } else {
      meta = '<span class="rating-meta' + (mine ? ' is-yours' : '') + '">' +
             sum.average.toFixed(1) + ' (' + sum.count + ')' + '</span>';
    }

    return '<div class="stars" role="group" aria-label="' + esc(t('card.rateGroup')) +
           '">' + stars + '</div>' + meta;
  }

  function renderGrid() {
    const grid = $('#grid');
    const items = visibleItems();
    const label = CATEGORIES.find(c => c.id === state.category);

    $('#gridHeading').textContent = state.category === 'all'
      ? t('menu.everything')
      : itemText(label, 'label');
    $('#gridEmpty').hidden = items.length > 0;

    grid.innerHTML = items.map(p =>
      '<article class="card" data-id="' + esc(p.id) + '">' +
        '<div class="card-media">' + mediaMarkup(p) +
          (itemText(p, 'serves') ? '<span class="card-serves">' + esc(itemText(p, 'serves')) + '</span>' : '') +
        '</div>' +
        '<div class="card-body">' +
          '<h4 class="card-name">' + esc(itemText(p, 'name')) + '</h4>' +
          '<p class="card-desc">' + esc(itemText(p, 'desc')) + '</p>' +
          '<div class="card-rating">' + starsMarkup(p.id) + '</div>' +
          '<div class="card-foot">' +
            '<span class="price">' + money(p.price) + '</span>' +
            '<button class="add-btn" type="button" data-add="' + esc(p.id) + '">' +
              '<svg aria-hidden="true"><use href="#i-plus"/></svg> ' + esc(t('card.add')) +
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
        const id = card.dataset.id;
        const value = Number(star.dataset.value);

        /* the stars fill in at once, the server confirms a moment later */
        const redraw = () => { $('.card-rating', card).innerHTML = starsMarkup(id); };
        TeraStore.rate(id, value).then(() => {
          redraw();
          toast(t('toast.rated'));
        }).catch(() => {
          redraw();
          toast(t('toast.rateFailed'));
        });
        redraw();
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
    toast(t('toast.added', { name: itemText(product(id), 'name') }));
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
          '<p class="cart-name">' + esc(itemText(p, 'name')) + '</p>' +
          '<p class="cart-price">' + money(p.price * line.qty) + '</p>' +
        '</div>' +
        '<div class="cart-side">' +
          '<div class="qty">' +
            '<button type="button" data-step="-1" aria-label="' + esc(t('basket.less', { name: itemText(p, 'name') })) + '">' +
              '<svg aria-hidden="true"><use href="#i-minus"/></svg></button>' +
            '<output>' + line.qty + '</output>' +
            '<button type="button" data-step="1" aria-label="' + esc(t('basket.more', { name: itemText(p, 'name') })) + '">' +
              '<svg aria-hidden="true"><use href="#i-plus"/></svg></button>' +
          '</div>' +
          '<button class="line-remove" type="button" data-remove>' + esc(t('basket.remove')) + '</button>' +
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
        toast(t('toast.removed'));
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
    return d.toLocaleDateString(TeraI18n.isArabic() ? 'ar' : 'en-GB', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }

  function buildMessage(details, ref) {
    const lines = [];
    lines.push(t('wa.hello', { shop: SHOP.name }));
    lines.push('');

    state.cart.forEach(line => {
      const p = product(line.id);
      if (p) {
        lines.push(line.qty + ' ' + t('wa.times') + ' ' + itemText(p, 'name') +
                   '  (' + money(p.price * line.qty) + ')');
      }
    });

    lines.push('');
    lines.push(t('wa.total') + ': ' + money(cartTotal()));
    lines.push('');
    lines.push(t('wa.name') + ': ' + details.name);
    lines.push(t('wa.phone') + ': ' + details.phone);
    lines.push(modeLabel(details.mode) + ': ' + prettyDate(details.date));
    if (details.note) lines.push(t('wa.note') + ': ' + details.note);
    lines.push(t('wa.ref') + ': ' + ref);

    return lines.join('\n');
  }

  function modeLabel(mode) {
    return mode === 'Delivery' ? t('basket.delivery') : t('basket.collection');
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

    if (!details.name) { showOrderError(t('order.needName')); $('#oName').focus(); return; }
    if (details.phone.replace(/\D/g, '').length < 6) {
      showOrderError(t('order.needPhone'));
      $('#oPhone').focus();
      return;
    }
    if (!details.date) { showOrderError(t('order.needDate')); $('#oDate').focus(); return; }
    showOrderError('');

    const waNumber = String(SHOP.whatsapp).replace(/\D/g, '');
    if (!waNumber || /^2130+$/.test(waNumber)) {
      showOrderError(t('order.notReady'));
      return;
    }

    /* The tab is opened now, while the click is still fresh, because a
       browser blocks a new tab that appears after waiting on the
       server. It is filled in once the order has its number. */
    const tab = window.open('', '_blank');
    const button = $('#sendOrder');
    button.disabled = true;

    TeraStore.addOrder({
      items: state.cart.map(line => {
        const p = product(line.id);
        return { id: p.id, name: p.name, price: p.price, qty: line.qty };
      }),
      total: cartTotal(),
      customer: details
    }).then(saved => {
      const url = 'https://wa.me/' + waNumber + '?text=' +
                  encodeURIComponent(buildMessage(details, saved.ref));
      if (tab) tab.location.href = url;
      else window.location.href = url;

      state.cart = [];
      saveCart();
      $('#orderForm').reset();
      closeDrawer();
      toast(t('order.ready', { ref: saved.ref }));
    }).catch(err => {
      if (tab) tab.close();
      button.disabled = false;
      showOrderError(t('order.failed') + err.message);
    });
  }

  /* ---------- notes ---------- */

  function timeAgo(ts) {
    const locale = TeraI18n.isArabic() ? 'ar' : 'en';
    const mins = Math.round((Date.now() - ts) / 60000);
    const rel = (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat)
      ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
      : null;
    if (mins < 1) return rel ? rel.format(0, 'minute') : 'just now';
    if (mins < 60) return rel ? rel.format(-mins, 'minute') : mins + ' minutes ago';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return rel ? rel.format(-hrs, 'hour') : hrs + ' hours ago';
    return new Date(ts).toLocaleDateString(locale === 'ar' ? 'ar' : 'en-GB',
      { day: 'numeric', month: 'long' });
  }

  function renderComments() {
    const wrap = $('#commentList');
    const list = TeraStore.comments().filter(c => !c.hidden);
    wrap.textContent = '';

    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'comment-empty';
      empty.textContent = t('notes.empty');
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

      if (!name) { error.textContent = t('notes.needName'); error.hidden = false; $('#cName').focus(); return; }
      if (text.length < 3) { error.textContent = t('notes.needText'); error.hidden = false; $('#cText').focus(); return; }

      error.hidden = true;
      const button = $('button[type="submit"]', form);
      button.disabled = true;

      TeraStore.addComment(name, text).then(() => {
        form.reset();
        count.textContent = '0';
        renderComments();
        toast(t('notes.saved'));
      }).catch(err => {
        error.textContent = t('notes.failed') + err.message;
        error.hidden = false;
      }).then(() => {
        button.disabled = false;
      });
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

  /* an item the owner has removed should not sit in a basket */
  function dropMissingFromCart() {
    const before = state.cart.length;
    state.cart = state.cart.filter(line => product(line.id));
    if (state.cart.length !== before) TeraStore.saveCart(state.cart);
  }

  function paint() {
    state.menu = TeraStore.menu();
    dropMissingFromCart();
    renderGrid();
    renderCart();
    renderComments();
  }

  /* Keeping up with the owner.

     A shop page can sit open for hours while the owner adds a cake or
     changes a price. Rather than pulling the whole menu down on a
     timer, the page asks for one number and only reloads when that
     number has moved. */
  function watchMenu() {
    let checking = false;

    function check() {
      if (checking || document.hidden) return;
      checking = true;
      TeraStore.menuChanged()
        .then(changed => (changed ? TeraStore.load().then(() => {
          paint();
          toast(t('toast.menuUpdated'));
        }) : null))
        .catch(() => {})
        .then(() => { checking = false; });
    }

    /* the menu manager in another tab tells us the moment it saves,
       so the shop redraws without waiting for the next check */
    TeraStore.onMenuChange(() => {
      TeraStore.load().then(() => {
        paint();
        toast(t('toast.menuUpdated'));
      }).catch(() => {});
    });

    setInterval(check, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
  }

  function showLoadError() {
    const grid = $('#grid');
    grid.innerHTML = '';

    const box = document.createElement('div');
    box.className = 'load-error';

    const title = document.createElement('h3');
    title.textContent = t('error.title');

    const why = document.createElement('p');
    why.textContent = t('error.body');

    box.append(title, why);
    grid.after(box);
  }

  /* ---------- the owner star ---------- */

  /* The star opens a box asking for a code. Getting it right sends you
     to the menu manager. The code is kept as the owner key as well, so
     if the server has been given an OWNER_PASSWORD that matches, the
     manager opens unlocked rather than asking again. */
  function wireOwnerStar() {
    const dialog = $('#codeDialog');
    const input = $('#codeInput');
    const error = $('#codeError');

    function open() {
      error.hidden = true;
      input.value = '';
      dialog.hidden = false;
      requestAnimationFrame(() => {
        dialog.classList.add('is-on');
        input.focus();
      });
    }

    function close() {
      dialog.classList.remove('is-on');
      setTimeout(() => { dialog.hidden = true; }, 200);
      $('#ownerStar').focus();
    }

    $('#ownerStar').addEventListener('click', open);
    $('#codeCancel').addEventListener('click', close);

    dialog.addEventListener('mousedown', e => {
      if (e.target === dialog) close();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !dialog.hidden) close();
    });

    function refuse() {
      TeraStore.setOwnerKey('');
      error.textContent = t('code.wrong');
      error.hidden = false;
      input.select();
    }

    /* The code is checked by the server, never here. Nothing in the
       page decides it, so there is no answer to find by reading the
       source, and only one place to set it. */
    $('#codeForm').addEventListener('submit', e => {
      e.preventDefault();
      const given = input.value.trim();
      if (!given) return refuse();

      const submit = $('button[type="submit"]', $('#codeForm'));
      submit.disabled = true;
      error.hidden = true;

      TeraStore.setOwnerKey(given);
      TeraStore.load()
        .then(() => {
          if (TeraStore.isOwner()) window.location.href = '/pages/owner.html';
          else refuse();
        })
        .catch(refuse)
        .then(() => { submit.disabled = false; });
    });
  }

  /* ---------- language ---------- */

  /* Walks the page filling in every tagged element. Called once at
     the start and again whenever the visitor switches. */
  function applyLanguage() {
    const root = document.documentElement;
    root.lang = TeraI18n.meta('htmlLang');
    root.dir = TeraI18n.meta('dir');

    $$('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key === 'brand.kind') {
        el.textContent = TeraI18n.isArabic() && SHOP.kind_ar ? SHOP.kind_ar : SHOP.kind;
        return;
      }
      el.textContent = t(key);
    });

    $$('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    const btn = $('#langToggle');
    btn.textContent = TeraI18n.meta('switchTo');
    btn.setAttribute('aria-label', TeraI18n.meta('switchLabel'));
    btn.lang = TeraI18n.isArabic() ? 'en' : 'ar';

    $('#chips').setAttribute('aria-label', t('menu.filterLabel'));
    $('#ownerStar').setAttribute('aria-label', t('code.star'));
    $('#codeInput').setAttribute('aria-label', t('code.label'));
    $('#cartClose').setAttribute('aria-label', t('basket.close'));
  }

  function wireLanguage() {
    $('#langToggle').addEventListener('click', () => {
      TeraI18n.set(TeraI18n.isArabic() ? 'en' : 'ar');
      applyLanguage();
      fillShopDetails();
      renderChips();
      paint();
    });
  }

  /* ---------- start ---------- */

  TeraI18n.start();
  applyLanguage();
  wireLanguage();
  wireOwnerStar();
  fillShopDetails();
  renderChips();
  wireGrid();
  wireSort();
  wireCart();
  wireDrawer();
  wireComments();
  wireNav();
  setDateFloor();
  $('#sendOrder').addEventListener('click', sendOrder);

  /* Opened from an address with no shop behind it, usually another
     server on the same machine. Find the real one and go there.

     There is no loop to guard against: we only move to an address
     that has just answered for itself, and never to the one we are
     already on. */
  function rescueOrExplain(err) {
    if (!err.wrongServer) return showLoadError(err);

    TeraStore.findShopOrigin().then(origin => {
      if (!origin || origin === location.origin) return showLoadError(err);
      location.replace(origin + location.pathname + location.search + location.hash);
    }).catch(() => showLoadError(err));
  }

  TeraStore.load()
    .then(() => { paint(); watchMenu(); })
    .catch(rescueOrExplain);
})();
