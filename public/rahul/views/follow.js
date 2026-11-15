/* Portfolio -> Follow: did I take the AI calls, and what did skipping cost? Also the trade-book import that
   gives the tracker history from before the broker snapshots began. */
import { fmt, esc, icon, tone, link, mono, engineBadge, empty, ownerSend, toast, n } from '../core.js';

const STATE = { taken: ['up', 'Taken'], late: ['warn', 'Taken late'], skipped: ['dn', 'Skipped'], held_before: ['', 'Already held'] };

export function followView(d, period = 'month') {
  if (!d || !d.track_from || !(d.rows || []).length) {
    return `${empty('clock', 'No history yet', 'This fills in as you trade, and as the broker holdings are saved each day. To go back further, import your past trades in the Brokers tab.')}`;
  }
  const S = (d.summary || {})[period] || {}, rows = d.rows;
  const took = (S.taken || 0) + (S.late || 0);
  const sentence = !S.calls ? 'No calls in this period yet.'
    : n(S.skipped_avg) > n(S.taken_avg) ? 'The calls you skipped did better than the ones you took. Most of the profit comes from about 1 call in 10, so each skipped call is a risk.'
    : 'The calls you took did better this time. Keep taking each one so the big ones are not missed.';
  const cost = S.skipped_cost_inr || 0;
  const stat = (k, v, dd) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${dd}</div></div>`;
  const avg = v => (v == null ? '—' : `<span class="${tone(v)}">${fmt.sp(v)}</span>`);
  const byMonth = new Map();
  rows.forEach(r => { const k = String(r.call_date).slice(0, 7); if (!byMonth.has(k)) byMonth.set(k, []); byMonth.get(k).push(r); });
  const row = r => { const [cls, lab] = STATE[r.state] || ['', r.state];
    return link(`stock/${encodeURIComponent(r.symbol)}`, `${mono(r.symbol)}<div class="main"><div class="t">${esc(r.symbol)} <span class="pill ${cls}">${lab}</span></div>
      <div class="s" style="white-space:normal">${engineBadge({ engine: r.engine }, 'sm')}<span>Called ${fmt.date(r.call_date)} at ${fmt.px(r.call_entry)}${r.your_price ? ` · you paid ${fmt.px(r.your_price)}` : ''}${r.zone === 'below' ? ' · below entry' : ''}</span></div></div>
      <div class="end"><div class="v tnum ${tone(r.call_result)}">${r.call_result == null ? 'open' : fmt.sp(r.call_result)}</div>${r.your_result != null ? `<div class="d faint">you ${fmt.sp(r.your_result)}</div>` : r.exit_lag != null ? `<div class="d faint">sold ${r.exit_lag === 0 ? 'on the exit day' : r.exit_lag > 0 ? r.exit_lag + 'd after' : 'before'}</div>` : ''}</div>`, 'row'); };
  return `<div class="hs" role="group" aria-label="Period">${[['month', S.label && period === 'month' ? S.label : (d.summary.month || {}).label || 'This month'], ['all', 'All time']].map(([k, l]) => `<button class="chip" data-fperiod="${k}" aria-pressed="${k === period}">${esc(l)}</button>`).join('')}</div>
    <div class="stats four" style="margin-top:12px">
      ${stat('Calls taken', `${took} of ${S.calls || 0}`, S.late ? `${S.late} of them late` : 'within 3 sessions')}
      ${stat('Calls you took', avg(S.taken_avg), 'average result')}
      ${stat('Calls you skipped', avg(S.skipped_avg), cost ? (cost > 0 ? `would have made ${fmt.inr(cost)}` : `skipping saved ${fmt.inr(-cost)}`) : 'average result')}
      ${stat('AI exits followed', `${S.exits_followed || 0} of ${S.exits || 0}`, S.exits_late ? `${S.exits_late} late or still held` : 'sold within 2 days')}
    </div>
    <p class="eg-note">${sentence}${S.bought_below ? ` ${S.bought_below} bought below the call's entry; those have won about 3 in 10.` : ''}</p>
    ${[...byMonth].map(([m, l]) => `<div class="month">${new Date(m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div><div class="group">${l.map(row).join('')}</div>`).join('')}
    <p class="small" style="margin:14px 2px 0">Tracking starts on ${fmt.date(d.track_from)}. Results are after 0.45% costs. Your prices come from the broker (imported trades first, then orders from this app, then changes spotted at refresh). Import every broker you trade with in the Brokers tab, or its calls show as skipped.</p>`;
}

export function bindFollow(root, d, redraw) {
  root.querySelectorAll('[data-fperiod]').forEach(b => b.onclick = () => redraw(b.dataset.fperiod));
}

/* ------------------------------------------------------------ trade-book import */
const norm = h => String(h || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const COLS = {
  date: ['trade date', 'date', 'order execution time', 'trade time', 'execution date', 'order date'],
  symbol: ['symbol', 'scrip', 'scrip name', 'tradingsymbol', 'trading symbol', 'stock name', 'security name', 'instrument'],
  side: ['trade type', 'buy sell', 'buy sell indicator', 'type', 'transaction type', 'side', 'b s'],
  qty: ['quantity', 'qty', 'traded qty', 'traded quantity', 'trade quantity'],
  price: ['price', 'trade price', 'avg price', 'average price', 'traded price', 'rate'],
  id: ['trade id', 'trade no', 'trade number', 'tradeid', 'exchange trade id'],
};
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** Split CSV text into rows of cells. Handles quotes, commas inside quotes, a leading BOM and Windows line ends. */
export function csvRows(text) {
  const out = []; let row = [], cell = '', q = false;
  const s = String(text).replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(x => x.trim())) out.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); if (row.some(x => x.trim())) out.push(row);
  return out;
}
export function isoDate(v) {
  const s = String(v || '').trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if ((m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[a-z]*[-/ ,]+(\d{4})/)) && MON[m[2].toLowerCase()]) return `${m[3]}-${String(MON[m[2].toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}
/** Find the header row and map the columns. Returns { rows: [{date, symbol, side, qty, price, trade_id}], bad, missing: [names] }. */
export function parseTradeCsv(text) {
  const R = csvRows(text);
  let hi = -1, map = null, best = null;
  for (let i = 0; i < Math.min(R.length, 40); i++) {
    const hs = R[i].map(norm), m = {};
    Object.entries(COLS).forEach(([k, names]) => { const j = hs.findIndex(h => names.includes(h)); if (j >= 0) m[k] = j; });
    if (['date', 'symbol', 'side', 'qty', 'price'].every(k => k in m)) { hi = i; map = m; break; }
    if (!best || Object.keys(m).length > Object.keys(best).length) best = m;
  }
  if (!map) return { rows: [], bad: 0, missing: ['date', 'symbol', 'side', 'qty', 'price'].filter(k => !(k in (best || {}))) };
  const rows = []; let bad = 0;
  for (const c of R.slice(hi + 1)) {
    const date = isoDate(c[map.date]), side = /^b/i.test(String(c[map.side]).trim()) ? 'BUY' : /^s/i.test(String(c[map.side]).trim()) ? 'SELL' : null;
    const sym = String(c[map.symbol] || '').toUpperCase().replace(/[-\s]+EQ$/, '').replace(/\s+/g, ''), qty = n(c[map.qty]), price = n(c[map.price]);
    if (!date || !side || !sym || !(qty > 0) || !(price > 0)) { if (c.some(x => String(x).trim())) bad++; continue; }
    rows.push({ date, symbol: sym, side, qty, price, ...(map.id != null && String(c[map.id]).trim() ? { trade_id: String(c[map.id]).trim() } : {}) });
  }
  return { rows, bad, missing: [] };
}

export const importPanel = () => `<div class="panel brk" id="imp"><div class="brk-h"><b>Import past trades</b></div>
  <p class="small">Download your trade book from the broker (a CSV file), choose the broker, then pick the file. It gives the Follow tab history from before the daily holdings were saved. It does not change your holdings.</p>
  <div class="field"><label for="imp-b">Broker</label><select id="imp-b"><option>Angel</option><option>Kite</option><option>Dhan</option></select></div>
  <div class="field" style="margin-top:10px"><label for="imp-f">CSV file</label><input id="imp-f" type="file" accept=".csv,text/csv" style="max-width:100%"></div>
  <div id="imp-out" class="small" style="margin-top:8px"></div></div>`;

export function bindImport(root, onDone) {
  const f = root.querySelector('#imp-f'); if (!f) return;
  const out = root.querySelector('#imp-out'), sel = root.querySelector('#imp-b');
  f.onchange = async () => {
    const file = f.files[0]; if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) { out.innerHTML = '<span class="dn">This is an Excel file. Open it and save it as CSV first, then choose it again.</span>'; return; }
    const p = parseTradeCsv(await file.text());
    if (p.missing.length) { out.innerHTML = `<span class="dn">Could not find the ${p.missing.join(', ')} column${p.missing.length > 1 ? 's' : ''}. Check that this is a trade book with date, symbol, buy/sell, quantity and price.</span>`; return; }
    if (!p.rows.length) { out.innerHTML = '<span class="dn">No trades could be read from this file.</span>'; return; }
    const ds = p.rows.map(r => r.date).sort();
    out.innerHTML = `<b>${fmt.int(p.rows.length)} trades</b> read, ${fmt.date(ds[0])} to ${fmt.date(ds[ds.length - 1])}${p.bad ? `, ${p.bad} rows could not be read` : ''}.
      <div class="group" style="margin-top:8px">${p.rows.slice(0, 5).map(r => `<div class="row plain"><div class="main"><div class="t">${esc(r.symbol)} <span class="pill ${r.side === 'BUY' ? 'up' : 'dn'}">${r.side}</span></div><div class="s">${fmt.date(r.date)}</div></div><div class="end tnum">${fmt.x(r.qty, r.qty % 1 ? 2 : 0)} × ${fmt.px2(r.price)}</div></div>`).join('')}</div>
      <button class="btn block" data-go style="margin-top:10px">Import ${fmt.int(p.rows.length)} trades to ${esc(sel.value)}</button>`;
    out.querySelector('[data-go]').onclick = async e => {
      const b = e.currentTarget; b.disabled = true; b.textContent = 'Importing…';
      try {
        let added = 0, skipped = 0, bad = 0;
        for (let i = 0; i < p.rows.length; i += 5000) { const d = await ownerSend('POST', '/owner/fills/import', { broker: sel.value, rows: p.rows.slice(i, i + 5000) }); added += d.added; skipped += d.skipped; bad += d.bad; }
        out.innerHTML = `<span class="up">Imported ${fmt.int(added)} new trades</span>${skipped ? `, ${fmt.int(skipped)} were already there` : ''}${bad ? `, ${bad} skipped` : ''}. The Follow tab updates in about a minute.`;
        f.value = ''; toast(`${added} trades imported`); onDone && setTimeout(onDone, 1500);
      } catch (err) { b.disabled = false; b.textContent = 'Try again'; out.insertAdjacentHTML('beforeend', `<p class="ot-warn">${esc(err.message)}</p>`); }
    };
  };
}
