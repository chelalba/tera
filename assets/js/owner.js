/* ===============================================================
   Tera Home Bakery, menu manager
   Adds, changes, reorders and removes items on the menu, and writes
   the result back out as code for assets/js/data.js.
   =============================================================== */

(function () {
  'use strict';

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const ILLOS = [
    { id: 'cake',    label: 'Layer cake' },
    { id: 'drip',    label: 'Drip cake' },
    { id: 'pie',     label: 'Pie' },
    { id: 'tart',    label: 'Tart' },
    { id: 'cookie',  label: 'Cookies' },
    { id: 'cupcake', label: 'Cupcake' }
  ];

  const TINTS = [
    '#f0dcc2', '#e3c08c', '#d9b38c', '#c9a184',
    '#e9c4b4', '#dca898', '#f1d9c8', '#ebd9be',
    '#efdfa8', '#cfd5b4', '#e8c9a0', '#d6ae85'
  ];

  const state = {
    menu: TeraStore.menu(),
    editingId: null,     /* null while adding a new item */
    draft: null
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

  function categoryLabel(id) {
    const found = CATEGORIES.find(c => c.id === id);
    return found ? found.label : id;
  }

  /* categories a real item can belong to, so not the All chip */
  function realCategories() {
    return CATEGORIES.filter(c => c.id !== 'all');
  }

  function slug(text) {
    return String(text).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'item';
  }

  function freeId(base) {
    let id = base, n = 2;
    while (state.menu.some(p => p.id === id)) { id = base + '-' + n; n++; }
    return id;
  }

  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600);
  }

  function mediaMarkup(item) {
    if (item.photo) {
      return '<img src="' + esc(item.photo) + '" alt="">';
    }
    return '<svg style="--illo-tint:' + esc(item.tint || '#f0dcc2') + '" viewBox="0 0 200 150" ' +
           'aria-hidden="true"><use href="#i-' + esc(item.illo || 'cake') + '"/></svg>';
  }

  function save() {
    TeraStore.saveMenu(state.menu);
    renderList();
    renderCode();
  }

  /* two-step buttons, so nothing is deleted on one stray tap */
  function arm(button, labelEl, armedText, plainText, run) {
    if (button.dataset.armed === 'yes') {
      button.dataset.armed = 'no';
      button.classList.remove('is-armed');
      labelEl.textContent = plainText;
      run();
      return;
    }
    button.dataset.armed = 'yes';
    button.classList.add('is-armed');
    labelEl.textContent = armedText;
    setTimeout(() => {
      if (button.dataset.armed !== 'yes') return;
      button.dataset.armed = 'no';
      button.classList.remove('is-armed');
      labelEl.textContent = plainText;
    }, 4000);
  }

  /* ---------- the list ---------- */

  function renderList() {
    const list = $('#itemList');
    $('#itemCount').textContent = state.menu.length;
    $('#itemEmpty').hidden = state.menu.length > 0;
    $('#resetMenu').hidden = !TeraStore.menuIsEdited();

    $('#itemBreak').textContent = realCategories()
      .map(c => state.menu.filter(p => p.category === c.id).length + ' ' + c.label.toLowerCase())
      .filter(text => text.charAt(0) !== '0')
      .join(', ');

    list.innerHTML = state.menu.map((item, i) =>
      '<li class="item-row" data-id="' + esc(item.id) + '">' +
        '<div class="item-thumb">' + mediaMarkup(item) + '</div>' +
        '<div class="item-info">' +
          '<p class="item-name">' + esc(item.name) + '</p>' +
          '<p class="item-meta">' + esc(categoryLabel(item.category)) +
            (item.serves ? ' <span aria-hidden="true">/</span> ' + esc(item.serves) : '') +
            (item.photo ? ' <span aria-hidden="true">/</span> photo' : '') +
          '</p>' +
        '</div>' +
        '<p class="item-price">' + money(item.price) + '</p>' +
        '<div class="row-actions">' +
          '<button class="icon-btn icon-btn-small" type="button" data-move="-1"' +
            (i === 0 ? ' disabled' : '') + ' aria-label="Move ' + esc(item.name) + ' up">' +
            '<svg aria-hidden="true"><use href="#i-up"/></svg></button>' +
          '<button class="icon-btn icon-btn-small" type="button" data-move="1"' +
            (i === state.menu.length - 1 ? ' disabled' : '') + ' aria-label="Move ' + esc(item.name) + ' down">' +
            '<svg aria-hidden="true"><use href="#i-down"/></svg></button>' +
          '<button class="btn btn-ghost btn-small" type="button" data-edit>' +
            '<svg aria-hidden="true"><use href="#i-pencil"/></svg> Edit</button>' +
        '</div>' +
      '</li>'
    ).join('');
  }

  function wireList() {
    $('#itemList').addEventListener('click', e => {
      const row = e.target.closest('.item-row');
      if (!row) return;
      const index = state.menu.findIndex(p => p.id === row.dataset.id);
      if (index < 0) return;

      const move = e.target.closest('[data-move]');
      if (move) {
        const to = index + Number(move.dataset.move);
        if (to < 0 || to >= state.menu.length) return;
        const [item] = state.menu.splice(index, 1);
        state.menu.splice(to, 0, item);
        save();
        return;
      }

      if (e.target.closest('[data-edit]')) openEditor(state.menu[index]);
    });
  }

  /* ---------- the editor ---------- */

  function blankItem() {
    return {
      id: '', name: '', category: realCategories()[0].id, price: 1000,
      serves: '', desc: '', illo: 'cake', tint: TINTS[0], photo: ''
    };
  }

  function buildPickers() {
    $('#fCategory').innerHTML = realCategories()
      .map(c => '<option value="' + c.id + '">' + c.label + '</option>').join('');

    $('#illoPicker').innerHTML = ILLOS.map(i =>
      '<button class="illo-option" type="button" role="radio" aria-checked="false" ' +
      'data-illo="' + i.id + '" title="' + i.label + '">' +
        '<svg viewBox="0 0 200 150" aria-hidden="true"><use href="#i-' + i.id + '"/></svg>' +
        '<span>' + i.label + '</span>' +
      '</button>'
    ).join('');

    $('#tintPicker').innerHTML = TINTS.map(t =>
      '<button class="swatch" type="button" role="radio" aria-checked="false" ' +
      'data-tint="' + t + '" style="background:' + t + '">' +
      '<span class="visually-hidden">Colour ' + t + '</span></button>'
    ).join('');

    $('#fPriceUnit').textContent = 'in ' + SHOP.currency;
  }

  function fillForm(item) {
    $('#fName').value = item.name;
    $('#fCategory').value = item.category;
    $('#fPrice').value = item.price;
    $('#fServes').value = item.serves || '';
    $('#fDesc').value = item.desc || '';
    $('#fPhoto').value = item.photo || '';
    $('#fDescCount').textContent = (item.desc || '').length;
    $('#fTint').value = item.tint || TINTS[0];
    markPickers(item);
  }

  function markPickers(item) {
    $$('#illoPicker .illo-option').forEach(b => {
      const on = b.dataset.illo === item.illo;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
    });
    $$('#tintPicker .swatch').forEach(b => {
      const on = b.dataset.tint.toLowerCase() === String(item.tint).toLowerCase();
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
    });
  }

  function readForm() {
    return {
      name: $('#fName').value.trim(),
      category: $('#fCategory').value,
      price: Number($('#fPrice').value),
      serves: $('#fServes').value.trim(),
      desc: $('#fDesc').value.trim(),
      illo: state.draft.illo,
      tint: state.draft.tint,
      photo: $('#fPhoto').value.trim()
    };
  }

  function syncPreview() {
    const d = Object.assign({}, state.draft, readForm());
    state.draft = d;

    $('#previewMedia').innerHTML = mediaMarkup(d) +
      (d.serves ? '<span class="card-serves">' + esc(d.serves) + '</span>' : '');
    $('#previewName').textContent = d.name || 'Name of the item';
    $('#previewDesc').textContent = d.desc;
    $('#previewPrice').textContent = money(d.price);
  }

  function openEditor(item) {
    const isNew = !item;
    state.editingId = isNew ? null : item.id;
    state.draft = Object.assign(blankItem(), item || {});

    $('#editorTitle').textContent = isNew ? 'New item' : 'Edit item';
    $('#saveItem').lastChild.textContent = isNew ? ' Add to the menu' : ' Save the item';
    $('#deleteItem').hidden = isNew;
    $('#deleteLabel').textContent = 'Delete';
    $('#deleteItem').dataset.armed = 'no';
    $('#deleteItem').classList.remove('is-armed');
    $('#editorError').hidden = true;
    $('#editorId').textContent = isNew
      ? 'The name you type becomes this item id.'
      : 'Item id: ' + item.id + '. Ratings are kept against it, so renaming is safe.';

    fillForm(state.draft);
    syncPreview();
    showDrawer();
    $('.drawer-body', $('#editor')).scrollTop = 0;
    /* without preventScroll the drawer jumps past the preview card */
    setTimeout(() => $('#fName').focus({ preventScroll: true }), 120);
  }

  function saveItem() {
    const draft = Object.assign({}, state.draft, readForm());
    const error = $('#editorError');

    if (!draft.name) {
      error.textContent = 'Give the item a name.';
      error.hidden = false; $('#fName').focus(); return;
    }
    if (!isFinite(draft.price) || draft.price < 0) {
      error.textContent = 'The price has to be a number, 0 or more.';
      error.hidden = false; $('#fPrice').focus(); return;
    }
    error.hidden = true;

    if (state.editingId === null) {
      draft.id = freeId(slug(draft.name));
      state.menu.push(draft);
      toast(draft.name + ' is on the menu.');
    } else {
      const index = state.menu.findIndex(p => p.id === state.editingId);
      draft.id = state.editingId;
      state.menu[index] = draft;
      toast(draft.name + ' is saved.');
    }

    save();
    hideDrawer();
  }

  function deleteItem() {
    const index = state.menu.findIndex(p => p.id === state.editingId);
    if (index < 0) return;
    const name = state.menu[index].name;
    state.menu.splice(index, 1);
    save();
    hideDrawer();
    toast(name + ' is off the menu.');
  }

  function wireEditor() {
    $('#addItem').addEventListener('click', () => openEditor(null));
    $('#saveItem').addEventListener('click', saveItem);

    $('#deleteItem').addEventListener('click', e => {
      arm(e.currentTarget, $('#deleteLabel'), 'Tap again to delete', 'Delete', deleteItem);
    });

    $('#editorForm').addEventListener('input', e => {
      if (e.target.id === 'fDesc') $('#fDescCount').textContent = e.target.value.length;
      if (e.target.id === 'fTint') {
        state.draft.tint = e.target.value;
        markPickers(state.draft);
      }
      syncPreview();
    });

    $('#editorForm').addEventListener('change', syncPreview);

    $('#illoPicker').addEventListener('click', e => {
      const btn = e.target.closest('[data-illo]');
      if (!btn) return;
      state.draft.illo = btn.dataset.illo;
      markPickers(state.draft);
      syncPreview();
    });

    $('#tintPicker').addEventListener('click', e => {
      const btn = e.target.closest('[data-tint]');
      if (!btn) return;
      state.draft.tint = btn.dataset.tint;
      $('#fTint').value = btn.dataset.tint;
      markPickers(state.draft);
      syncPreview();
    });
  }

  /* ---------- drawer ---------- */

  let lastFocus = null;

  function showDrawer() {
    lastFocus = document.activeElement;
    $('#overlay').hidden = false;
    requestAnimationFrame(() => $('#overlay').classList.add('is-on'));
    $('#editor').classList.add('is-open');
    $('#editor').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function hideDrawer() {
    $('#overlay').classList.remove('is-on');
    $('#editor').classList.remove('is-open');
    $('#editor').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => { $('#overlay').hidden = true; }, 250);
    if (lastFocus) lastFocus.focus();
  }

  function wireDrawer() {
    $('#editorClose').addEventListener('click', hideDrawer);
    $('#overlay').addEventListener('click', hideDrawer);

    document.addEventListener('keydown', e => {
      const open = $('#editor').classList.contains('is-open');
      if (e.key === 'Escape' && open) { hideDrawer(); return; }
      if (e.key !== 'Tab' || !open) return;

      const focusable = $$('button, [href], input, select, textarea', $('#editor'))
        .filter(el => !el.disabled && el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- writing the code back out ---------- */

  function quote(text) {
    return "'" + String(text || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r?\n/g, ' ') + "'";
  }

  function menuCode() {
    const body = state.menu.map(p => [
      '  {',
      '    id: ' + quote(p.id) + ',',
      '    name: ' + quote(p.name) + ',',
      '    category: ' + quote(p.category) + ',',
      '    price: ' + (Number(p.price) || 0) + ',',
      '    serves: ' + quote(p.serves) + ',',
      '    desc: ' + quote(p.desc) + ',',
      '    illo: ' + quote(p.illo) + ', tint: ' + quote(p.tint) + ', photo: ' + quote(p.photo),
      '  }'
    ].join('\n')).join(',\n');

    return 'const MENU = [\n' + body + '\n];\n';
  }

  function shopCode() {
    const keys = ['name', 'kind', 'whatsapp', 'currency', 'currencyBefore',
                  'phone', 'email', 'instagram', 'facebook', 'hours', 'notice'];
    const body = keys.map(k => {
      const value = typeof SHOP[k] === 'boolean' ? SHOP[k] : quote(SHOP[k]);
      return '  ' + k + ': ' + value;
    }).join(',\n');
    return 'const SHOP = {\n' + body + '\n};\n';
  }

  function categoriesCode() {
    const body = CATEGORIES
      .map(c => '  { id: ' + quote(c.id) + ', label: ' + quote(c.label) + ' }')
      .join(',\n');
    return 'const CATEGORIES = [\n' + body + '\n];\n';
  }

  function wholeFile() {
    return [
      '/* ---------------------------------------------------------------',
      '   SHOP SETTINGS AND MENU',
      '   Written by the menu manager on ' + new Date().toLocaleString('en-GB') + '.',
      '',
      '   whatsapp must be the full international number, digits only,',
      '   with no plus sign and no spaces.',
      '---------------------------------------------------------------- */',
      '',
      shopCode(),
      categoriesCode(),
      menuCode()
    ].join('\n');
  }

  function renderCode() {
    $('#codeText').textContent = menuCode();
  }

  function copyText(text, done) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, () => fallback());
    } else {
      fallback();
    }
    function fallback() {
      const box = document.createElement('textarea');
      box.value = text;
      box.setAttribute('readonly', '');
      box.style.position = 'fixed';
      box.style.opacity = '0';
      document.body.appendChild(box);
      box.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(box);
      if (ok) done();
      else {
        $('#codeBox').hidden = false;
        $('#toggleCode').setAttribute('aria-expanded', 'true');
        $('#toggleCode').textContent = 'Hide the code';
        toast('Copying was blocked. The code is shown below, select it and copy.');
      }
    }
  }

  function wirePublish() {
    $('#copyCode').addEventListener('click', () => {
      copyText(menuCode(), () => toast('Menu code copied. Paste it into assets/js/data.js.'));
    });

    $('#downloadCode').addEventListener('click', () => {
      const blob = new Blob([wholeFile()], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'data.js';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('data.js downloaded. Put it in the assets/js folder.');
    });

    $('#toggleCode').addEventListener('click', e => {
      const box = $('#codeBox');
      const show = box.hidden;
      box.hidden = !show;
      e.currentTarget.setAttribute('aria-expanded', String(show));
      e.currentTarget.textContent = show ? 'Hide the code' : 'Show the code';
    });

    $('#resetMenu').addEventListener('click', e => {
      const label = e.currentTarget.querySelector('span') || e.currentTarget;
      arm(e.currentTarget, label, 'Tap again, this clears your changes',
          'Back to the original menu', () => {
        TeraStore.forgetMenu();
        state.menu = TeraStore.menu();
        renderList();
        renderCode();
        toast('The menu is back to the one in data.js.');
      });
    });
  }

  /* ---------- start ---------- */

  buildPickers();
  renderList();
  wireList();
  wireEditor();
  wireDrawer();
  wirePublish();
  renderCode();
})();
