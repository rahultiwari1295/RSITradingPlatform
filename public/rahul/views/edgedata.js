/* Owner "edge" data (server: /api/owner/edge/*, built nightly by scripts/edge_build.py) and the small pieces
   several screens share: the market gauge wording, the stock row, the strength pill, warnings. */
import { ownerApi, fmt, esc, mono, link, tone, n } from '../core.js';

const mem = new Map();
function cached(key, load, ttl = 5 * 60e3) {
  const h = mem.get(key);
  if (h && Date.now() - h.t < ttl) return h.p;
  const p = load().catch(e => { mem.delete(key); throw e; });
  mem.set(key, { t: Date.now(), p });
  return p;
}
export const edgeHome = (symbols = []) => cached('home|' + symbols.join(','), () => ownerApi('/owner/edge/home?symbols=' + encodeURIComponent(symbols.join(','))), 3 * 60e3);
export const edgeBlob = key => cached('blob|' + key, () => ownerApi('/owner/edge/blob/' + key));
export const edgeStock = sym => cached('stock|' + sym, () => ownerApi('/owner/edge/stock/' + encodeURIComponent(sym)));
export const edgeStocks = symbols => cached('stocks|' + symbols.join(','), () => ownerApi('/owner/edge/stocks?symbols=' + encodeURIComponent(symbols.join(','))).then(d => d.stocks || {}));

/** Market gauge: what each reading means for new buys. */
export const GAUGE = {
  full: { t: 'Full size', cls: 'up', line: 'Most stocks are rising and the index is above its 50-day average. New buys can be taken at full size.' },
  half: { t: 'Half size', cls: 'warn', line: 'The market is mixed. New buys are better taken at half size.' },
  none: { t: 'No new buys', cls: 'dn', line: 'Most stocks are falling. Past calls made in this kind of market did poorly.' },
};
export const gaugeFacts = R => {
  const ix = R.index || {};
  const a = ix.above50 && ix.above200 ? 'above its 50-day and 200-day averages' : ix.above50 ? 'above its 50-day average but below the 200-day' : ix.above200 ? 'below its 50-day average but above the 200-day' : 'below its 50-day and 200-day averages';
  return `<b>${fmt.x(R.b50, 0)}%</b> of liquid stocks are above their 50-day average${n(R.b50_wk) ? ` (${fmt.x(R.b50_wk, 0)}% a week ago)` : ''}. NIFTY 500 is ${a}.`;
};
export const evidenceLine = R => {
  const e = R.evidence || {}, part = k => (e[k] ? `${GAUGE[k].t}: <b class="${tone(e[k].avg)}">${fmt.sp(e[k].avg)}</b> a call (${e[k].n} calls)` : '');
  const s = ['full', 'half', 'none'].map(part).filter(Boolean).join(' · ');
  return s ? `How past AI calls did by the reading on the day before entry. ${s}.` : '';
};

/** Strength rank 1-99 against all liquid stocks (99 = strongest). */
export const rsPill = v => (n(v) > 0 ? `<span class="pill ${v >= 80 ? 'up' : v < 30 ? 'dn' : ''}" title="Strength rank against all liquid stocks. 99 is the strongest.">RS ${fmt.int(v)}</span>` : '');
export const warnChips = (ws, max = 3) => (ws || []).slice(0, max).map(w => `<span class="pill ${w.level === 'bad' ? 'dn' : 'warn'}">${esc(w.text)}</span>`).join('');
/** One tappable stock row: opens the single-stock page. */
export const srow = (sym, sub, end = '', extra = '') => link(`stock/${encodeURIComponent(sym)}`, `${mono(sym)}<div class="main"><div class="t">${esc(sym)}</div><div class="s">${sub}</div>${extra}</div><div class="end">${end}</div>`, 'row eg-row');
export const cr = v => (n(v) >= 100 ? '₹' + fmt.int(Math.round(v)) + ' cr' : '₹' + fmt.x(v, 1) + ' cr');
export const day = iso => { const d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
export const note = html => `<p class="eg-note">${html}</p>`;
