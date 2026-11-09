/* /m/mine — the owner's private portfolio. Angel One holdings (live, from the VPS), manual holdings (account),
   and which of them are current AI calls. Everyone else sees "Not found"; the server also refuses them. */
import { chrome, fmt, esc, icon, n, mono, delta, tone, link, api, holdings, auth, isOwner, ownerApi, loadTerminal, allSignals, engineBadge, callPath, segmented, skel, errBox, empty, reveal } from '../core.js';
import { ruler } from '../charts.js';
import { footNote } from './parts.js';

const sum = (a, f) => a.reduce((s, x) => s + (isFinite(f(x)) ? f(x) : 0), 0);

export default async function mine(el, r) {
  const body = chrome(el, { title: 'My portfolio', back: 'Portfolio', actions: '<button class="ib" data-refresh aria-label="Refresh" style="font-size:20px">↻</button>' });
  body.innerHTML = `<div id="mn">${skel(90, 1, 18)}${skel(64, 5)}</div>`;
  const root = body.querySelector('#mn');
  const user = await auth.whenReady();
  if (!user || !isOwner()) {
    root.innerHTML = empty('search', 'Not found', 'This page does not exist.', `<a class="btn" href="/m/" data-nav>Go home</a>`);
    return;
  }
  let tab = r.query.get('v') || 'ai', data = null;
  el.querySelector('[data-refresh]').onclick = () => load(true);
  load(false);

  async function load(fresh) {
    root.innerHTML = `${skel(90, 1, 18)}${skel(64, 5)}`;
    const [ang, man, term] = await Promise.all([
      ownerApi('/owner/holdings' + (fresh ? '?fresh=1' : '')).then(d => ({ ok: true, ...d })).catch(e => ({ ok: false, error: e.message, items: [] })),
      holdings.get().catch(() => ({ items: [] })),
      loadTerminal().catch(() => null),
    ]);
    const manual = (man.items || []).filter(x => x.symbol && n(x.qty) > 0);
    const quotes = await Promise.all(manual.map(x => api(`/stock/quote/${encodeURIComponent(x.symbol)}`, 2).catch(() => null)));
    const mrows = manual.map((x, i) => {
      const q = quotes[i] || {}, px = n(q.price), prev = n(q.prev_close), qty = n(x.qty), avg = n(x.avg_price);
      return { symbol: x.symbol.toUpperCase(), qty, avg_price: avg, ltp: px, invested: avg * qty, value: px * qty, pnl: (px - avg) * qty,
               pnl_pct: (px / avg - 1) * 100, day_pct: (px / prev - 1) * 100, src: 'Manual' };
    });
    const arows = (ang.items || []).map(x => ({ ...x, src: 'Angel' }));
    const calls = term ? allSignals(term) : [];
    const callOf = s => calls.filter(c => String(c.sym).toUpperCase() === s);
    data = { ang, arows, mrows, calls, callOf };
    draw();
  }

  function draw() {
    const { ang, arows, mrows, callOf } = data;
    const all = [...arows, ...mrows];
    const inCalls = [...new Set(all.map(x => x.symbol))].filter(s => callOf(s).length);
    const kpi = (k, v, cls = '') => `<div class="panel"><div class="k">${k}</div><div class="v ${cls} tnum">${v}</div></div>`;
    const aT = ang.totals || { value: sum(arows, x => x.value), invested: sum(arows, x => x.invested) };
    const mV = sum(mrows, x => x.value), mI = sum(mrows, x => x.invested);
    const aP = aT.value - aT.invested, mP = mV - mI;
    root.innerHTML = `
      <div class="mine-kpis">
        ${kpi(`Angel (${esc(ang.account || '')}) value`, fmt.lakh(aT.value))}
        ${kpi('Angel P&amp;L', `${fmt.sinr(aP)} <span class="small">${fmt.sp(aT.invested ? aP / aT.invested * 100 : NaN)}</span>`, tone(aP))}
        ${kpi('Manual value', fmt.lakh(mV))}
        ${kpi('Manual P&amp;L', `${fmt.sinr(mP)} <span class="small">${fmt.sp(mI ? mP / mI * 100 : NaN)}</span>`, tone(mP))}
      </div>
      ${ang.ok ? `<p class="small">Angel holdings ${ang.cached_seconds > 5 ? `updated ${fmt.int(ang.cached_seconds)} s ago` : 'just updated'} · ${fmt.int(arows.length)} stocks · ${fmt.int(mrows.length)} manual</p>` : errBox(`Angel: ${ang.error}`)}
      <div id="mn-seg" style="margin-top:12px"></div><div id="mn-list" style="margin-top:10px"></div>`;
    segmented(root.querySelector('#mn-seg'), [['ai', 'In AI calls', inCalls.length], ['angel', 'Angel', arows.length], ['manual', 'Manual', mrows.length]], tab,
      v => { tab = v; history.replaceState(history.state, '', location.pathname + '?v=' + v); list(); });
    if (!ang.ok) root.querySelector('[data-retry]')?.addEventListener('click', () => load(true));
    list();

    function list() {
      const L = root.querySelector('#mn-list');
      if (tab === 'ai') {
        L.innerHTML = inCalls.length ? inCalls.map(s => aiCard(s, all.filter(x => x.symbol === s), callOf(s))).join('')
          : empty('ai', 'None of your stocks is an open AI call', 'When you buy a stock from an AI call, it shows here with its stop and target.');
      } else {
        const rows = tab === 'angel' ? arows : mrows;
        L.innerHTML = rows.length ? `<div class="group">${rows.map(row).join('')}</div>`
          : empty('pf', tab === 'angel' ? 'No Angel holdings' : 'No manual holdings', tab === 'angel' ? 'Nothing came back from Angel One.' : 'Add stocks on the Portfolio page.');
      }
      L.insertAdjacentHTML('beforeend', footNote('Private page: only visible when you are signed in as the owner. Angel prices come from your broker; manual prices from the exchange feed.'));
      reveal(L);
    }
  }

  function row(x) {
    const c = data.callOf(x.symbol)[0];
    return link(`xray/${encodeURIComponent(x.symbol)}`, `${mono(x.symbol)}
      <div class="main"><div class="t">${esc(x.symbol)}${c ? ' <span class="tag bought">AI call</span>' : ''}</div>
        <div class="small">${fmt.int(x.qty)} × ${fmt.px(x.avg_price)} · now ${fmt.px(x.ltp)}${isFinite(x.day_pct) ? ` · today ${fmt.sp(x.day_pct)}` : ''}</div></div>
      <div class="end"><div class="v tnum">${fmt.lakh(x.value)}</div><div class="${tone(x.pnl)} tnum small">${fmt.sinr(x.pnl)} (${fmt.sp(x.pnl_pct)})</div></div>`, `row mine-row${c ? ' ai' : ''}`);
  }

  function aiCard(sym, mineRows, cs) {
    const qty = sum(mineRows, x => x.qty), inv = sum(mineRows, x => x.invested), val = sum(mineRows, x => x.value);
    const avg = qty ? inv / qty : NaN, pnl = val - inv, c = cs[0];
    const toStop = (c.now / c.stop - 1) * 100, toTgt = (c.target / c.now - 1) * 100;
    return link(callPath(c), `<div class="top">${mono(sym)}<div class="nm"><div class="t">${esc(sym)} <span class="tag bought">Bought</span></div>
        <div class="s">${cs.map(x => engineBadge(x)).join(' ')}<span class="small">${mineRows.map(x => x.src).join(' + ')}</span></div></div>
        <div class="px"><div class="v tnum">${fmt.px(c.now)}</div>${delta(isFinite(avg) ? (c.now / avg - 1) * 100 : NaN)}</div></div>
      ${ruler({ stop: c.stop, entry: c.entry, target: c.target, now: c.now }, { short: true })}
      <div class="kv">
        <div><div class="k">Your avg</div><div class="v tnum">${fmt.px(avg)}</div></div>
        <div><div class="k">Call entry</div><div class="v tnum">${fmt.px(c.entry)}</div></div>
        <div><div class="k">Your P&amp;L</div><div class="v ${tone(pnl)} tnum">${fmt.sinr(pnl)}</div></div>
        <div><div class="k">Stop</div><div class="v dn tnum">${fmt.px(c.stop)} <span class="small">${fmt.sp(-toStop)}</span></div></div>
        <div><div class="k">Target</div><div class="v up tnum">${fmt.px(c.target)} <span class="small">${fmt.sp(toTgt)}</span></div></div>
        <div><div class="k">Qty</div><div class="v tnum">${fmt.int(qty)}</div></div>
      </div>`, 'sig mine-call owned', `aria-label="${esc(sym)}, bought, AI call"`);
  }
}
