'use strict';

/* =========================================================
 * Troškovi – praćenje režija za više nekretnina
 * Podaci se čuvaju lokalno (localStorage) na telefonu.
 * ========================================================= */

const STORAGE_KEY = 'troskovi.v1';

const DEFAULT_DATA = {
  version: 1,
  currency: 'RSD',
  properties: [
    { id: 'stan1', name: 'Stan 1', icon: '🏢' },
    { id: 'stan2', name: 'Stan 2', icon: '🏬' },
    { id: 'kuca', name: 'Kuća', icon: '🏡' },
  ],
  categories: [
    { id: 'struja', name: 'Struja', icon: '⚡', unit: 'kWh' },
    { id: 'voda', name: 'Voda', icon: '💧', unit: 'm³' },
    { id: 'grejanje', name: 'Grejanje', icon: '🔥', unit: '' },
    { id: 'gas', name: 'Gas', icon: '🧯', unit: 'm³' },
    { id: 'infostan', name: 'Infostan / komunalije', icon: '🗑️', unit: '' },
    { id: 'internet', name: 'Internet / TV', icon: '📶', unit: '' },
    { id: 'telefon', name: 'Telefon', icon: '📞', unit: '' },
    { id: 'porez', name: 'Porez na imovinu', icon: '🏛️', unit: '' },
    { id: 'odrzavanje', name: 'Održavanje / popravke', icon: '🛠️', unit: '' },
    { id: 'ostalo', name: 'Ostalo', icon: '📦', unit: '' },
  ],
  expenses: [],
};

/* ---------- Capacitor pluginovi (samo na telefonu) ---------- */

const Cap = window.Capacitor;
const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
const Filesystem = isNative ? Cap.registerPlugin('Filesystem') : null;
const Share = isNative ? Cap.registerPlugin('Share') : null;
// Napomena: window.Capacitor dolazi iz vendor/capacitor.js (kopira ga `npm run sync`).

/* ---------- Stanje ---------- */

let data = load();
const ui = {
  screen: 'overview',
  month: currentPeriod(),
  propertyFilter: 'all',
  form: { propertyId: null, categoryId: null },
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) {
    console.error('Greška pri učitavanju podataka', e);
  }
  return structuredClone(DEFAULT_DATA);
}

function normalize(d) {
  return {
    version: 1,
    currency: d.currency || DEFAULT_DATA.currency,
    properties: Array.isArray(d.properties) && d.properties.length ? d.properties : structuredClone(DEFAULT_DATA.properties),
    categories: Array.isArray(d.categories) && d.categories.length ? d.categories : structuredClone(DEFAULT_DATA.categories),
    expenses: Array.isArray(d.expenses) ? d.expenses : [],
  };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ---------- Pomoćne funkcije ---------- */

const $ = (sel) => document.querySelector(sel);

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftPeriod(period, delta) {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function periodLabel(period, short = false) {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('sr-Latn-RS', short ? { month: 'short' } : { month: 'long', year: 'numeric' });
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}.`;
}

function money(n) {
  const v = Number(n) || 0;
  return `${v.toLocaleString('sr-Latn-RS', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${data.currency}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const propById = (id) => data.properties.find((p) => p.id === id) || { name: '?', icon: '❓' };
const catById = (id) => data.categories.find((c) => c.id === id) || { name: '?', icon: '❓', unit: '' };

function isOverdue(e) {
  return !e.paid && e.dueDate && e.dueDate < today();
}

function filteredExpenses() {
  return data.expenses.filter((e) => ui.propertyFilter === 'all' || e.propertyId === ui.propertyFilter);
}

function sum(list) {
  return list.reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- Navigacija ---------- */

const TITLES = { overview: 'Pregled', add: 'Novi trošak', history: 'Istorija', settings: 'Podešavanja' };

function showScreen(name) {
  ui.screen = name;
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.screen === name));
  $('#screen-title').textContent = name === 'add' && $('#f-id').value ? 'Izmena troška' : TITLES[name];
  $('#property-filter').hidden = name === 'add' || name === 'settings';
  render();
  window.scrollTo(0, 0);
}

document.querySelectorAll('.tabbar button').forEach((b) =>
  b.addEventListener('click', () => {
    if (b.dataset.screen === 'add') resetForm();
    showScreen(b.dataset.screen);
  })
);

$('#property-filter').addEventListener('change', (e) => {
  ui.propertyFilter = e.target.value;
  render();
});

$('#prev-month').addEventListener('click', () => {
  ui.month = shiftPeriod(ui.month, -1);
  renderOverview();
});
$('#next-month').addEventListener('click', () => {
  ui.month = shiftPeriod(ui.month, 1);
  renderOverview();
});

/* ---------- Render ---------- */

function render() {
  renderPropertyFilter();
  if (ui.screen === 'overview') renderOverview();
  if (ui.screen === 'add') renderForm();
  if (ui.screen === 'history') renderHistory();
  if (ui.screen === 'settings') renderSettings();
}

function renderPropertyFilter() {
  const sel = $('#property-filter');
  if (!data.properties.some((p) => p.id === ui.propertyFilter)) ui.propertyFilter = 'all';
  sel.innerHTML =
    `<option value="all">Sve nekretnine</option>` +
    data.properties.map((p) => `<option value="${p.id}">${p.icon} ${escapeHtml(p.name)}</option>`).join('');
  sel.value = ui.propertyFilter;
}

function breakdown(list, key, lookup) {
  const total = sum(list) || 1;
  const groups = {};
  list.forEach((e) => (groups[e[key]] = (groups[e[key]] || 0) + (Number(e.amount) || 0)));
  const rows = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return `<div class="muted">Nema unosa za ovaj mesec.</div>`;
  return rows
    .map(([id, amount]) => {
      const x = lookup(id);
      return `<div class="line" style="display:block">
        <div style="display:flex;justify-content:space-between">
          <span>${x.icon} ${escapeHtml(x.name)}</span><span class="amount">${money(amount)}</span>
        </div>
        <div class="meter"><div style="width:${((amount / total) * 100).toFixed(1)}%"></div></div>
      </div>`;
    })
    .join('');
}

function renderOverview() {
  $('#month-label').textContent = periodLabel(ui.month);
  const all = filteredExpenses();
  const month = all.filter((e) => e.period === ui.month);

  $('#month-total').textContent = money(sum(month));
  $('#unpaid-total').textContent = money(sum(all.filter((e) => !e.paid)));

  $('#by-property').innerHTML = breakdown(month, 'propertyId', propById);
  $('#by-category').innerHTML = breakdown(month, 'categoryId', catById);

  // Grafikon za poslednjih 12 meseci (završno sa izabranim)
  const periods = [];
  for (let i = 11; i >= 0; i--) periods.push(shiftPeriod(ui.month, -i));
  const totals = periods.map((p) => sum(all.filter((e) => e.period === p)));
  const max = Math.max(...totals, 1);
  $('#year-chart').innerHTML = periods
    .map(
      (p, i) => `<div class="bar ${p === ui.month ? 'current' : ''}" title="${periodLabel(p)}: ${money(totals[i])}">
        <div style="height:${((totals[i] / max) * 100).toFixed(1)}%"></div>
        <span>${periodLabel(p, true).replace('.', '')}</span>
      </div>`
    )
    .join('');
}

function renderHistory() {
  const catSel = $('#h-category');
  const prevCat = catSel.value || 'all';
  catSel.innerHTML =
    `<option value="all">Sve kategorije</option>` +
    data.categories.map((c) => `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`).join('');
  catSel.value = data.categories.some((c) => c.id === prevCat) ? prevCat : 'all';

  const status = $('#h-status').value;
  const list = filteredExpenses()
    .filter((e) => catSel.value === 'all' || e.categoryId === catSel.value)
    .filter((e) => status === 'all' || (status === 'paid' ? e.paid : !e.paid))
    .sort((a, b) => b.period.localeCompare(a.period) || (b.createdAt || 0) - (a.createdAt || 0));

  if (!list.length) {
    $('#history-list').innerHTML = `<div class="empty">Još nema unetih troškova.<br/>Dodaj prvi preko „Unos”.</div>`;
    return;
  }

  let html = '';
  let lastPeriod = null;
  list.forEach((e) => {
    if (e.period !== lastPeriod) {
      const periodTotal = sum(list.filter((x) => x.period === e.period));
      html += `<div class="group-title">${periodLabel(e.period)} · ${money(periodTotal)}</div>`;
      lastPeriod = e.period;
    }
    const c = catById(e.categoryId);
    const p = propById(e.propertyId);
    const qty = e.quantity ? ` · ${e.quantity} ${escapeHtml(c.unit || '')}` : '';
    const badge = e.paid
      ? `<span class="badge paid">plaćeno</span>`
      : isOverdue(e)
      ? `<span class="badge overdue">kasni · ${formatDate(e.dueDate)}</span>`
      : `<span class="badge unpaid">neplaćeno${e.dueDate ? ' · rok ' + formatDate(e.dueDate) : ''}</span>`;
    html += `<div class="item" data-id="${e.id}">
      <div class="icon">${c.icon}</div>
      <div class="info">
        <div class="title">${escapeHtml(c.name)}</div>
        <div class="sub">${p.icon} ${escapeHtml(p.name)}${qty}${e.note ? ' · ' + escapeHtml(e.note) : ''}</div>
      </div>
      <div class="right">
        <div class="amount"><strong>${money(e.amount)}</strong></div>
        ${badge}
      </div>
    </div>`;
  });
  $('#history-list').innerHTML = html;
}

$('#h-category').addEventListener('change', renderHistory);
$('#h-status').addEventListener('change', renderHistory);

$('#history-list').addEventListener('click', (ev) => {
  const badge = ev.target.closest('.badge');
  const item = ev.target.closest('.item');
  if (!item) return;
  const exp = data.expenses.find((e) => e.id === item.dataset.id);
  if (!exp) return;
  // Klik na status = brzo označi plaćeno/neplaćeno
  if (badge) {
    exp.paid = !exp.paid;
    exp.paidDate = exp.paid ? today() : null;
    save();
    renderHistory();
    toast(exp.paid ? 'Označeno kao plaćeno' : 'Označeno kao neplaćeno');
    return;
  }
  editExpense(exp);
});

/* ---------- Forma za unos ---------- */

function renderChips(container, items, selectedId, onPick) {
  container.innerHTML = items
    .map((x) => `<button type="button" class="chip ${x.id === selectedId ? 'selected' : ''}" data-id="${x.id}">${x.icon} ${escapeHtml(x.name)}</button>`)
    .join('');
  container.onclick = (ev) => {
    const b = ev.target.closest('.chip');
    if (b) onPick(b.dataset.id);
  };
}

function renderForm() {
  const f = ui.form;
  if (!data.properties.some((p) => p.id === f.propertyId)) f.propertyId = data.properties[0]?.id;
  if (!data.categories.some((c) => c.id === f.categoryId)) f.categoryId = data.categories[0]?.id;

  renderChips($('#f-property'), data.properties, f.propertyId, (id) => {
    f.propertyId = id;
    renderForm();
  });
  renderChips($('#f-category'), data.categories, f.categoryId, (id) => {
    f.categoryId = id;
    renderForm();
  });
  const unit = catById(f.categoryId).unit;
  $('#f-unit-label').textContent = unit ? `(${unit})` : '';
}

function resetForm() {
  $('#expense-form').reset();
  $('#f-id').value = '';
  $('#f-period').value = currentPeriod();
  if (ui.propertyFilter !== 'all') ui.form.propertyId = ui.propertyFilter;
  $('#f-delete').hidden = true;
  $('#f-cancel').hidden = true;
  $('#f-submit').textContent = 'Sačuvaj';
}

function editExpense(e) {
  resetForm();
  $('#f-id').value = e.id;
  ui.form.propertyId = e.propertyId;
  ui.form.categoryId = e.categoryId;
  $('#f-amount').value = e.amount;
  $('#f-period').value = e.period;
  $('#f-quantity').value = e.quantity ?? '';
  $('#f-due').value = e.dueDate || '';
  $('#f-note').value = e.note || '';
  $('#f-paid').checked = !!e.paid;
  $('#f-delete').hidden = false;
  $('#f-cancel').hidden = false;
  $('#f-submit').textContent = 'Sačuvaj izmene';
  showScreen('add');
}

$('#expense-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const amount = parseFloat($('#f-amount').value);
  if (!(amount >= 0)) return toast('Unesi iznos');
  if (!ui.form.propertyId || !ui.form.categoryId) return toast('Izaberi nekretninu i kategoriju');

  const id = $('#f-id').value;
  const existing = id && data.expenses.find((e) => e.id === id);
  const paid = $('#f-paid').checked;
  const qty = $('#f-quantity').value;

  const exp = {
    id: id || uid(),
    propertyId: ui.form.propertyId,
    categoryId: ui.form.categoryId,
    amount,
    period: $('#f-period').value || currentPeriod(),
    quantity: qty === '' ? null : parseFloat(qty),
    dueDate: $('#f-due').value || null,
    note: $('#f-note').value.trim(),
    paid,
    paidDate: paid ? (existing && existing.paidDate) || today() : null,
    createdAt: (existing && existing.createdAt) || Date.now(),
  };

  if (existing) Object.assign(existing, exp);
  else data.expenses.push(exp);
  save();

  toast(existing ? 'Izmene sačuvane' : 'Trošak dodat');
  if (existing) {
    showScreen('history');
  } else {
    // Ostani na formi radi bržeg unosa više računa, zadrži nekretninu i mesec
    const period = exp.period;
    resetForm();
    $('#f-period').value = period;
  }
});

$('#f-delete').addEventListener('click', () => {
  const id = $('#f-id').value;
  if (!id || !confirm('Obrisati ovaj trošak?')) return;
  data.expenses = data.expenses.filter((e) => e.id !== id);
  save();
  toast('Trošak obrisan');
  showScreen('history');
});

$('#f-cancel').addEventListener('click', () => showScreen('history'));

/* ---------- Podešavanja ---------- */

function renderSettings() {
  $('#properties-edit').innerHTML = data.properties
    .map(
      (p) => `<div class="edit-row" data-id="${p.id}">
        <input class="emoji" value="${escapeHtml(p.icon)}" data-field="icon" />
        <input value="${escapeHtml(p.name)}" data-field="name" />
        <button class="btn small danger" data-action="remove">✕</button>
      </div>`
    )
    .join('');
  $('#categories-edit').innerHTML = data.categories
    .map(
      (c) => `<div class="edit-row" data-id="${c.id}">
        <input class="emoji" value="${escapeHtml(c.icon)}" data-field="icon" />
        <input value="${escapeHtml(c.name)}" data-field="name" />
        <input class="unit" value="${escapeHtml(c.unit || '')}" data-field="unit" placeholder="jed." />
        <button class="btn small danger" data-action="remove">✕</button>
      </div>`
    )
    .join('');
  $('#currency').value = data.currency;
}

function bindEditList(containerSel, listKey, refField, label) {
  const container = $(containerSel);
  container.addEventListener('change', (ev) => {
    const row = ev.target.closest('.edit-row');
    const field = ev.target.dataset.field;
    if (!row || !field) return;
    const item = data[listKey].find((x) => x.id === row.dataset.id);
    if (item) {
      item[field] = ev.target.value.trim();
      save();
      toast('Sačuvano');
    }
  });
  container.addEventListener('click', (ev) => {
    if (ev.target.dataset.action !== 'remove') return;
    const id = ev.target.closest('.edit-row').dataset.id;
    const used = data.expenses.filter((e) => e[refField] === id).length;
    if (data[listKey].length <= 1) return toast(`Mora postojati bar jedna ${label}`);
    if (used) return toast(`Ne može se obrisati – ima ${used} unetih troškova`);
    if (!confirm('Obrisati?')) return;
    data[listKey] = data[listKey].filter((x) => x.id !== id);
    save();
    renderSettings();
  });
}

bindEditList('#properties-edit', 'properties', 'propertyId', 'nekretnina');
bindEditList('#categories-edit', 'categories', 'categoryId', 'kategorija');

$('#add-property').addEventListener('click', () => {
  data.properties.push({ id: uid(), name: 'Nova nekretnina', icon: '🏠' });
  save();
  renderSettings();
});

$('#add-category').addEventListener('click', () => {
  data.categories.push({ id: uid(), name: 'Nova kategorija', icon: '📌', unit: '' });
  save();
  renderSettings();
});

$('#currency').addEventListener('change', (ev) => {
  data.currency = ev.target.value.trim() || 'RSD';
  save();
  toast('Valuta sačuvana');
});

/* ---------- Izvoz / uvoz ---------- */

async function shareFile(filename, content, mime) {
  if (isNative) {
    try {
      const res = await Filesystem.writeFile({ path: filename, data: content, directory: 'CACHE', encoding: 'utf8' });
      await Share.share({ title: filename, url: res.uri, dialogTitle: 'Sačuvaj ili pošalji' });
      return;
    } catch (e) {
      if (String(e && e.message).toLowerCase().includes('cancel')) return;
      console.error(e);
      toast('Izvoz nije uspeo: ' + (e.message || e));
      return;
    }
  }
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('#export-btn').addEventListener('click', () => {
  shareFile(`troskovi-${today()}.json`, JSON.stringify(data, null, 2), 'application/json');
});

$('#export-csv-btn').addEventListener('click', () => {
  const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const header = ['Mesec', 'Nekretnina', 'Kategorija', 'Iznos', 'Valuta', 'Potrošnja', 'Jedinica', 'Rok', 'Plaćeno', 'Datum plaćanja', 'Napomena'];
  const rows = [...data.expenses]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((e) => {
      const c = catById(e.categoryId);
      return [e.period, propById(e.propertyId).name, c.name, e.amount, data.currency, e.quantity ?? '', c.unit || '', e.dueDate || '', e.paid ? 'da' : 'ne', e.paidDate || '', e.note || ''].map(q).join(';');
    });
  // BOM da bi Excel pravilno prikazao š, č, ć...
  shareFile(`troskovi-${today()}.csv`, '﻿' + [header.map(q).join(';'), ...rows].join('\n'), 'text/csv');
});

$('#import-file').addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || !Array.isArray(parsed.expenses)) throw new Error('Neispravan fajl');
    if (!confirm(`Uvesti ${parsed.expenses.length} troškova? Trenutni podaci će biti zamenjeni.`)) return;
    data = normalize(parsed);
    save();
    render();
    toast('Podaci uvezeni');
  } catch (e) {
    toast('Uvoz nije uspeo: ' + e.message);
  }
});

/* ---------- Android dugme "nazad" ---------- */

if (isNative) {
  const App = Cap.registerPlugin('App');
  App.addListener('backButton', () => {
    if (ui.screen !== 'overview') showScreen('overview');
    else App.exitApp();
  });
}

/* ---------- Start ---------- */

resetForm();
showScreen('overview');
