/* ===============================================================
   Tera Home Bakery, menu manager
   Adds, changes, reorders and removes items on the menu. Every
   change goes to the server and is live for customers at once.
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
    menu: [],
    notes: [],
    editingId: null,     /* null while adding a new item */
    draft: null,
    busy: false,
    offline: false
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

  function mediaMarkup(item) {
    if (item.photo) {
      return '<img src="' + esc(photoUrl(item.photo)) + '" alt="">';
    }
    return '<svg style="--illo-tint:' + esc(item.tint || '#f0dcc2') + '" viewBox="0 0 200 150" ' +
           'aria-hidden="true"><use href="#i-' + esc(item.illo || 'cake') + '"/></svg>';
  }

  /* every change goes to the server, then the list is drawn from
     whatever the server says the menu now is */
  function afterChange(menu) {
    state.menu = menu || TeraStore.menu();
    renderList();
    return state.menu;
  }

  function failed(err) {
    if (err && err.status === 401) {
      toast('The server did not accept that. Enter the owner password first.');
      showLock(true);
    } else {
      toast('That did not save. ' + (err && err.message ? err.message : ''));
    }
    renderList();
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
            (item.name_ar ? '' : ' <span class="needs-ar">no Arabic</span>') +
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
        renderList();                       /* move now, confirm after */
        TeraStore.reorderMenu(state.menu.map(p => p.id))
          .then(afterChange)
          .catch(failed);
        return;
      }

      if (e.target.closest('[data-edit]')) openEditor(state.menu[index]);
    });
  }

  /* ---------- the notes people leave ----------

     Two different powers, and the difference matters. Hiding takes a
     note off the shop page and can be undone, which is what you want
     for one that is merely awkward or out of date. Deleting is for the
     one that should never have been written, and it does not come
     back, so it asks twice like everything else that cannot be undone. */

  function when(ts) {
    const d = new Date(Number(ts));
    if (!Number.isFinite(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderNotes() {
    const list = $('#noteList');
    const notes = state.notes || [];
    $('#noteCount').textContent = notes.length;
    $('#noteEmpty').hidden = notes.length > 0;

    list.innerHTML = notes.map(note =>
      '<li class="note-row' + (note.hidden ? ' is-hidden-note' : '') + '" data-id="' + esc(note.id) + '">' +
        '<div class="note-body">' +
          '<p class="note-head">' +
            '<span class="note-name">' + esc(note.name) + '</span>' +
            '<span class="note-when">' + esc(when(note.ts)) + '</span>' +
            (note.hidden ? '<span class="note-flag">hidden from the shop</span>' : '') +
          '</p>' +
          '<p class="note-text">' + esc(note.text) + '</p>' +
        '</div>' +
        '<div class="row-actions">' +
          '<button class="btn btn-ghost btn-small" type="button" data-hide>' +
            (note.hidden ? 'Show again' : 'Hide') + '</button>' +
          '<button class="btn btn-danger btn-small" type="button" data-remove>' +
            '<span data-remove-label>Delete</span></button>' +
        '</div>' +
      '</li>'
    ).join('');
  }

  /* The whole section is for the owner. A stranger would be shown the
     visible notes and two buttons that refuse them, which is worse
     than not showing it at all. */
  function showNotes(on) {
    const section = $('#notes');
    section.hidden = !on;
    if (on) loadNotes();
  }

  function noteFailed(err) {
    const box = $('#noteError');
    box.textContent = (err && err.message) || 'That did not work. Try again.';
    box.hidden = false;
  }

  function loadNotes() {
    return TeraStore.allComments().then(notes => {
      state.notes = notes;
      $('#noteError').hidden = true;
      renderNotes();
    }).catch(noteFailed);
  }

  function wireNotes() {
    $('#noteList').addEventListener('click', e => {
      const row = e.target.closest('.note-row');
      if (!row) return;
      const id = Number(row.dataset.id);
      const note = (state.notes || []).find(n => Number(n.id) === id);
      if (!note) return;
      $('#noteError').hidden = true;

      if (e.target.closest('[data-hide]')) {
        TeraStore.setCommentHidden(id, !note.hidden).then(notes => {
          state.notes = notes;
          renderNotes();
          toast(note.hidden ? 'Back on the shop page.' : 'Hidden from the shop page.');
        }).catch(noteFailed);
        return;
      }

      const remove = e.target.closest('[data-remove]');
      if (remove) {
        arm(remove, $('[data-remove-label]', remove), 'Tap again', 'Delete', () => {
          TeraStore.removeComment(id).then(notes => {
            state.notes = notes;
            renderNotes();
            toast('The note is gone.');
          }).catch(noteFailed);
        });
      }
    });
  }

  /* ---------- the editor ---------- */

  function blankItem() {
    return {
      id: '', name: '', category: realCategories()[0].id, price: 1000,
      serves: '', desc: '', name_ar: '', serves_ar: '', desc_ar: '',
      illo: 'cake', tint: TINTS[0], photo: ''
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

  /* ---------- the photograph ----------

     A phone camera gives you three to eight megabytes. Sending that
     would be slow for the owner on a phone, slow for every customer
     afterwards, and too big for the host to accept at all. So the
     picture is shrunk here, in the browser, before it goes anywhere:
     at most 1400 across, saved as JPEG, and the quality stepped down
     until it is comfortably small.

     A card on the shop page is a few hundred pixels across, so 1200 is
     already twice what the densest phone screen draws, and it lands
     around 150 kilobytes. Smaller matters twice over: the owner is
     often on a phone uploading over mobile data, and every customer
     downloads it afterwards. */

  const PHOTO_MAX_SIDE = 1200;
  const PHOTO_TARGET_BYTES = 220 * 1024;

  function photoStatus(message, kind) {
    const el = $('#photoStatus');
    el.textContent = message || '';
    el.hidden = !message;
    el.classList.toggle('is-bad', kind === 'bad');
  }

  function showPhoto(url) {
    const has = Boolean(url);
    $('#photoPreview').hidden = !has;
    $('#photoClear').hidden = !has;
    $('#photoChooseLabel').textContent = has ? 'Choose a different photo' : 'Choose a photo';
    if (has) $('#photoPreviewImg').src = photoUrl(url);
  }

  /* Reads the file into something we can draw. createImageBitmap is
     the one that turns a photograph the right way up on its own,
     which matters because a phone records which way it was held
     rather than rotating the pixels. The older path is there for
     browsers without it. */
  function decodeImage(file) {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(file, { imageOrientation: 'from-image' })
        .catch(() => decodeWithTag(file));
    }
    return decodeWithTag(file);
  }

  function decodeWithTag(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('This kind of picture cannot be read here. ' +
                         'A JPEG or PNG works everywhere.'));
      };
      img.src = url;
    });
  }

  function shrink(source) {
    const w = source.width;
    const h = source.height;
    const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(w, h));

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));

    const ctx = canvas.getContext('2d');
    /* a PNG with see-through corners would otherwise go black */
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    if (source.close) source.close();

    /* step the quality down until it is small enough, rather than
       guessing once: how well a picture compresses depends on the
       picture */
    let quality = 0.8;
    let data = canvas.toDataURL('image/jpeg', quality);
    while (data.length * 0.75 > PHOTO_TARGET_BYTES && quality > 0.4) {
      quality -= 0.07;
      data = canvas.toDataURL('image/jpeg', quality);
    }

    return {
      data: data,
      width: canvas.width,
      height: canvas.height,
      bytes: Math.round(data.length * 0.75)
    };
  }

  function kb(n) { return Math.round(n / 1024) + ' KB'; }

  function pickPhoto(file) {
    if (!file) return;
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
      photoStatus('That file is not a picture.', 'bad');
      return;
    }

    photoStatus('Reading the photo…');
    $('#photoChoose').disabled = true;

    decodeImage(file)
      .then(source => {
        const small = shrink(source);
        photoStatus('Sending ' + kb(small.bytes) + '…');
        return TeraStore.uploadPhoto(small.data, 'image/jpeg')
          .then(url => ({ url: url, small: small }));
      })
      .then(result => {
        $('#fPhoto').value = result.url;
        showPhoto(result.url);
        syncPreview();
        photoStatus('Saved. ' + kb(file.size) + ' became ' + kb(result.small.bytes) +
                    ', ' + result.small.width + ' by ' + result.small.height + '.');
      })
      .catch(err => {
        photoStatus(err.message || 'The photo could not be sent. Try again.', 'bad');
      })
      .then(() => {
        $('#photoChoose').disabled = false;
        $('#fPhotoFile').value = '';     /* so the same file can be picked again */
      });
  }

  /* ---------- changing the code ----------

     The code is kept in the database, so this changes it for every
     device at once and there is nothing to redeploy afterwards. */
  function wireCode() {
    const form = $('#codeForm');
    const input = $('#newCode');
    const error = $('#codeError');

    function show(open) {
      form.hidden = !open;
      error.hidden = true;
      input.value = '';
      if (open) input.focus();
    }

    $('#changeCode').addEventListener('click', () => show(form.hidden));
    $('#codeCancel').addEventListener('click', () => show(false));

    form.addEventListener('submit', e => {
      e.preventDefault();
      const next = input.value.trim();
      if (next.length < 6) {
        error.textContent = 'At least six characters.';
        error.hidden = false;
        return;
      }

      const button = $('button[type="submit"]', form);
      button.disabled = true;
      error.hidden = true;

      TeraStore.setOwnerPassword(next)
        .then(() => {
          show(false);
          toast('The code is changed. Use the new one from now on.');
        })
        .catch(err => {
          error.textContent = err.message || 'That could not be saved.';
          error.hidden = false;
        })
        .then(() => { button.disabled = false; });
    });
  }

  function wirePhoto() {
    $('#photoChoose').addEventListener('click', () => $('#fPhotoFile').click());
    $('#fPhotoFile').addEventListener('change', e => pickPhoto(e.target.files[0]));
    $('#photoClear').addEventListener('click', () => {
      $('#fPhoto').value = '';
      showPhoto('');
      photoStatus('');
      syncPreview();
    });
  }

  function fillForm(item) {
    $('#fName').value = item.name;
    $('#fCategory').value = item.category;
    $('#fPrice').value = item.price;
    $('#fServes').value = item.serves || '';
    $('#fDesc').value = item.desc || '';
    $('#fPhoto').value = item.photo || '';
    showPhoto(item.photo || '');
    photoStatus('');
    $('#fNameAr').value = item.name_ar || '';
    $('#fServesAr').value = item.serves_ar || '';
    $('#fDescAr').value = item.desc_ar || '';
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
      name_ar: $('#fNameAr').value.trim(),
      serves_ar: $('#fServesAr').value.trim(),
      desc_ar: $('#fDescAr').value.trim(),
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
      ? ''
      : 'Renaming is safe. The stars customers gave this item stay with it.';

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
    if (state.busy) return;
    state.busy = true;
    $('#saveItem').disabled = true;

    const adding = state.editingId === null;
    const request = adding
      ? TeraStore.createItem(draft)
      : TeraStore.updateItem(state.editingId, draft);

    request.then(() => {
      afterChange();
      hideDrawer();
      toast(draft.name + (adding
        ? ' is on the shop now, customers can see it.'
        : ' is saved. The shop is showing the new details.'));
    }).catch(err => {
      if (err.status === 401) {
        error.textContent = 'The server did not accept that. Enter the owner password first.';
        error.hidden = false;
        showLock(true);
      } else {
        error.textContent = 'That did not save. ' + err.message;
        error.hidden = false;
      }
    }).then(() => {
      state.busy = false;
      $('#saveItem').disabled = false;
    });
  }

  function deleteItem() {
    const item = state.menu.find(p => p.id === state.editingId);
    if (!item) return;
    TeraStore.deleteItem(item.id).then(() => {
      afterChange();
      hideDrawer();
      toast(item.name + ' is off the menu.');
    }).catch(failed);
  }

  function wireEditor() {
    $('#addItem').addEventListener('click', () => {
      /* still visible when the shop cannot be reached, so say why
         rather than opening an editor that could not save anything */
      if (state.offline) {
        const box = $('.load-error');
        if (box) box.scrollIntoView({ block: 'center' });
        toast('Not connected to the shop yet. See the note above the list.');
        return;
      }
      openEditor(null);
    });
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


  /* ---------- the original menu ---------- */

  function wireReset() {
    $('#resetMenu').addEventListener('click', e => {
      const button = e.currentTarget;
      const label = button.querySelector('span') || button;
      arm(button, label, 'Tap again, this replaces the whole menu',
          'Back to the original menu', () => {
        TeraStore.resetMenu().then(menu => {
          afterChange(menu);
          toast('The menu is back to the one you started with.');
        }).catch(failed);
      });
    });
  }

  /* ---------- owner password ---------- */

  function showLock(show) {
    $('#ownerLock').hidden = !show;
    document.body.classList.toggle('is-locked', show);
  }

  function wireLock() {
    $('#ownerLockForm').addEventListener('submit', e => {
      e.preventDefault();
      const field = $('#ownerKey');
      const error = $('#ownerLockError');
      TeraStore.setOwnerKey(field.value);
      field.value = '';

      TeraStore.load().then(() => {
        if (TeraStore.isOwner()) {
          error.hidden = true;
          showLock(false);
          afterChange();
          showNotes(true);
          toast('Unlocked. You can change the menu now.');
        } else {
          TeraStore.setOwnerKey('');
          error.textContent = 'That password was not right.';
          error.hidden = false;
        }
      }).catch(err => {
        error.textContent = 'Could not reach the server. ' + err.message;
        error.hidden = false;
      });
    });
  }

  /* ---------- start ---------- */

  buildPickers();
  wireList();
  wireEditor();
  wirePhoto();
  wireCode();
  wireNotes();
  wireDrawer();
  wireReset();
  wireLock();

  /* The toolbar is never taken away. Losing the Add button because
     something else went wrong leaves nothing to work with and no clue
     why, so the problem is shown above it instead. */
  function showPageError(err) {
    state.offline = true;

    const box = document.createElement('div');
    box.className = 'load-error';

    const title = document.createElement('h3');
    title.textContent = 'The menu is not loading';

    const why = document.createElement('p');
    why.textContent = 'The shop is not answering. Check that it is running, then reload this page.';
    box.append(title, why);

    $('.tool-row').before(box);
    $('#itemEmpty').hidden = true;
  }

  /* Landed on an address that has no shop behind it. Look for the
     real one on the neighbouring ports and go there, rather than
     leaving somebody to work out the address for themselves. */
  function rescueOrExplain(err) {
    if (!err.wrongServer) return showPageError(err);

    toast('Looking for the shop...');
    TeraStore.findShopOrigin().then(origin => {
      if (!origin || origin === location.origin) return showPageError(err);
      location.replace(origin + location.pathname + location.search + location.hash);
    }).catch(() => showPageError(err));
  }

  TeraStore.load().then(() => {
    afterChange();
    const locked = !TeraStore.isOwner();
    showLock(locked);
    showNotes(!locked);
  }).catch(rescueOrExplain);
})();
