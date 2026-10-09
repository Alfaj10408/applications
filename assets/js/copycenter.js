/* Application Copy Center — copy, search, local overrides. No network calls, no third-party code. */
(function () {
  'use strict';
  var STORAGE_KEY = 'cc:v1';
  var dataEl = document.getElementById('cc-data');
  var DATA = dataEl ? JSON.parse(dataEl.textContent) : {};
  var store = load();
  var savedOpenState = null;

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        return { overrides: parsed.overrides || {}, priv: parsed.priv || {} };
      }
    } catch (e) { /* storage unavailable or blocked */ }
    return { overrides: {}, priv: {} };
  }
  function save() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); return true; }
    catch (e) { return false; }
  }
  function isPrivate(id) { return !!(DATA[id] && DATA[id].private); }
  function original(id) { return DATA[id] ? String(DATA[id].value || '') : ''; }
  function current(id) {
    if (isPrivate(id)) return Object.prototype.hasOwnProperty.call(store.priv, id) ? store.priv[id] : '';
    return Object.prototype.hasOwnProperty.call(store.overrides, id) ? store.overrides[id] : original(id);
  }
  function isLocal(id) {
    return isPrivate(id) ? Object.prototype.hasOwnProperty.call(store.priv, id)
                         : Object.prototype.hasOwnProperty.call(store.overrides, id);
  }
  function normalize(text) {
    // Trim the ends only; keep internal line breaks. Strip trailing spaces on each line.
    return String(text).replace(/\r\n?/g, '\n').split('\n').map(function (l) { return l.replace(/\s+$/, ''); }).join('\n').trim();
  }

  /* ---------- rendering ---------- */
  var fieldEls = Array.prototype.slice.call(document.querySelectorAll('[data-field]'));
  function renderField(el) {
    var id = el.getAttribute('data-id');
    var val = current(id);
    var valueEl = el.querySelector('[data-role="value"]');
    valueEl.textContent = val;
    valueEl.classList.toggle('cc-empty', val === '');
    if (val === '') valueEl.setAttribute('data-placeholder', isPrivate(id) ? 'Not set in this browser' : 'Not set');
    else valueEl.removeAttribute('data-placeholder');
    var badge = el.querySelector('[data-role="local-badge"]');
    if (badge) badge.hidden = !isLocal(id) || isPrivate(id);
  }
  function renderAll() { fieldEls.forEach(renderField); }

  /* ---------- feedback ---------- */
  var feedbackTimers = new WeakMap();
  function feedback(el, msg, kind) {
    var fb = el.querySelector('[data-role="feedback"]');
    if (!fb) return;
    fb.textContent = msg;
    fb.className = 'cc-feedback is-visible' + (kind ? ' is-' + kind : '');
    var prev = feedbackTimers.get(el);
    if (prev) clearTimeout(prev);
    feedbackTimers.set(el, setTimeout(function () { fb.textContent = ''; fb.className = 'cc-feedback'; }, 1600));
  }

  /* ---------- copying ---------- */
  var dialog = document.getElementById('cc-dialog');
  var dialogText = document.getElementById('cc-dialog-text');
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function manualCopy(text) {
    if (dialog && typeof dialog.showModal === 'function') {
      dialogText.value = text;
      dialog.showModal();
      dialogText.focus(); dialogText.select();
    } else {
      window.prompt('Copy this value:', text);
    }
  }
  function copyValue(el) {
    var id = el.getAttribute('data-id');
    var text = current(id);
    if (text === '') { feedback(el, 'Nothing to copy', 'warn'); return; }
    var done = function () { feedback(el, 'Copied!', 'ok'); };
    var fallback = function () {
      if (legacyCopy(text)) { done(); return; }
      feedback(el, 'Clipboard blocked', 'warn');
      manualCopy(text);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  /* ---------- editing ---------- */
  function openEditor(el) {
    var id = el.getAttribute('data-id');
    var form = el.querySelector('[data-role="editor"]');
    var ta = form.querySelector('textarea');
    ta.value = current(id);
    form.hidden = false;
    el.classList.add('is-editing');
    ta.focus();
  }
  function closeEditor(el) {
    var form = el.querySelector('[data-role="editor"]');
    form.hidden = true;
    el.classList.remove('is-editing');
    var btn = el.querySelector('[data-action="edit"]');
    if (btn) btn.focus();
  }
  function saveEditor(el) {
    var id = el.getAttribute('data-id');
    var ta = el.querySelector('[data-role="editor"] textarea');
    var val = normalize(ta.value);
    if (isPrivate(id)) {
      if (val === '') delete store.priv[id]; else store.priv[id] = val;
    } else {
      if (val === original(id)) delete store.overrides[id]; else store.overrides[id] = val;
    }
    var ok = save();
    renderField(el);
    closeEditor(el);
    feedback(el, ok ? 'Saved in this browser' : 'Could not save (storage blocked)', ok ? 'ok' : 'warn');
    applySearch();
  }
  function resetField(el) {
    var id = el.getAttribute('data-id');
    if (isPrivate(id)) delete store.priv[id]; else delete store.overrides[id];
    save();
    renderField(el);
    closeEditor(el);
    feedback(el, isPrivate(id) ? 'Local value deleted' : 'Reset to original', 'ok');
    applySearch();
  }

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-action]');
    if (!btn) return;
    var el = btn.closest('[data-field]');
    if (!el) return;
    var action = btn.getAttribute('data-action');
    if (action === 'copy') copyValue(el);
    else if (action === 'edit') openEditor(el);
    else if (action === 'cancel') closeEditor(el);
    else if (action === 'reset') resetField(el);
  });
  document.addEventListener('submit', function (ev) {
    var form = ev.target.closest('[data-role="editor"]');
    if (!form) return;
    ev.preventDefault();
    saveEditor(form.closest('[data-field]'));
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      var editing = ev.target.closest && ev.target.closest('[data-field].is-editing');
      if (editing) { ev.preventDefault(); closeEditor(editing); return; }
    }
    // Ctrl/Cmd+Enter saves while editing a textarea
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey) && ev.target.matches && ev.target.matches('.cc-editor textarea')) {
      ev.preventDefault(); saveEditor(ev.target.closest('[data-field]'));
    }
    // "/" focuses search when not typing elsewhere
    if (ev.key === '/' && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      var t = ev.target;
      var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (!typing) { ev.preventDefault(); searchEl.focus(); searchEl.select(); }
    }
  });

  /* ---------- search ---------- */
  var searchEl = document.getElementById('cc-search');
  var countEl = document.getElementById('cc-count');
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-card]'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-section]'));
  function applySearch() {
    var q = normalize(searchEl.value).toLowerCase();
    var shown = 0;
    if (q && savedOpenState === null) {
      savedOpenState = cards.map(function (c) { return c.open; });
    }
    cards.forEach(function (card, idx) {
      var cardMatch = q && (card.getAttribute('data-title') || '').toLowerCase().indexOf(q) !== -1;
      var visibleInCard = 0;
      Array.prototype.forEach.call(card.querySelectorAll('[data-field]'), function (f) {
        var id = f.getAttribute('data-id');
        var hay = ((f.getAttribute('data-label') || '') + '\n' + current(id)).toLowerCase();
        var match = !q || cardMatch || hay.indexOf(q) !== -1;
        f.hidden = !match;
        if (match) visibleInCard++;
      });
      card.hidden = !!q && visibleInCard === 0;
      if (q && !card.hidden) card.open = true;
      if (!q && savedOpenState) card.open = savedOpenState[idx];
      shown += card.hidden ? 0 : visibleInCard;
    });
    if (!q) savedOpenState = null;
    sections.forEach(function (s) {
      var anyVisible = Array.prototype.some.call(s.querySelectorAll('[data-card]'), function (c) { return !c.hidden; });
      s.hidden = !!q && !anyVisible;
    });
    countEl.textContent = q ? (shown + ' of ' + fieldEls.length + ' fields match') : (fieldEls.length + ' fields');
  }
  var searchTimer = null;
  searchEl.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applySearch, 80);
  });
  searchEl.addEventListener('search', applySearch);

  /* ---------- toolbar ---------- */
  document.getElementById('cc-expand').addEventListener('click', function () { cards.forEach(function (c) { c.open = true; }); savedOpenState = null; });
  document.getElementById('cc-collapse').addEventListener('click', function () { cards.forEach(function (c) { c.open = false; }); savedOpenState = null; });
  document.getElementById('cc-clear').addEventListener('click', function () {
    var n = Object.keys(store.overrides).length + Object.keys(store.priv).length;
    var msg = n
      ? 'Delete all locally saved values in this browser (' + n + ' saved field' + (n === 1 ? '' : 's') + ', including private ones)? This cannot be undone.'
      : 'No locally saved values exist in this browser. Clear anyway?';
    if (!window.confirm(msg)) return;
    store = { overrides: {}, priv: {} };
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    renderAll();
    applySearch();
    countEl.textContent = 'Local data cleared. ' + fieldEls.length + ' fields';
  });

  // Open the card that a hash link points to
  function openHashTarget() {
    var h = window.location.hash;
    if (!h) return;
    var target = document.getElementById(h.slice(1));
    var card = target && target.closest && target.closest('[data-card]');
    if (card) card.open = true;
  }
  window.addEventListener('hashchange', openHashTarget);

  renderAll();
  applySearch();
  openHashTarget();
})();
