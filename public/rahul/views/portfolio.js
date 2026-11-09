/* /rahul/portfolio — one table for everything Rahul owns: Angel One holdings (live) + the manual trade log,
   both stored on the VPS (Data/owner.db). Owner-only on the server (404 for anyone else). */
import { chrome, fmt, esc, icon, n, mono, delta, tone, link, holdings, ownerApi, ownerSend, loadTerminal, allSignals, engineBadge, callPath, segmented, skel, errBox, empty, reveal, sheet, toast } from '../core.js';
import { ruler } from '../charts.js';
import { footNote } from './parts.js';

const today = () => new Date().toISOString().slice(0, 10);

export default async function portfolio(el, r) {
  const body = chrome(el, { title: 'Portfolio', page: 'Portfolio', top: { ey: `${icon('pf', 16)}My portfolio`, h: 'All your brokers, | in one place.', hl: ['one place'], lede: 'Angel, Kite, Dhan and your manual trades, matched with the AI calls.' },
    actions: '<button class="ib" data-add aria-label="Add a trade">' + icon('plus', 22) + '</button><button class="ib" data-refresh aria-label="Refresh" style="font-size:20px">↻</button>' });
  body.innerHTML = `<div id="pf">${skel(90, 1, 18)}${skel(56, 6)}</div>`;
  const root = body.querySelector('#pf');
  let tab = ['log', 'brokers'].includes(r.query.get('v')) ? r.query.get('v') : 'pf', D = null;
  let view = ['all', 'ai', 'non'].includes(r.query.get('f')) ? r.query.get('f') : 'all';
  let sortBy = (() => { try { return localStorage.getItem('rh-pf-sort') || 'value_d'; } catch { return 'value_d'; } })();
  el.querySelector('[data-add]').onclick = () => tradeSheet();
  el.querySelector('[data-refresh]').onclick = () => load(true);
  load(false);

  async function load(fresh) {
    root.innerHTML = `${skel(90, 1, 18)}${skel(56, 6)}`;
    const [pf, tr, term] = await Promise.all([
      ownerApi('/owner/portfolio' + (fresh ? '?fresh=1' : '')).catch(e => ({ error: e.message, rows: [], by_source: {}, brokers: {} })),
      ownerApi('/owner/trades').catch(() => ({ trades: [] })),
      loadTerminal().catch(() => null),
    ]);
    const calls = term ? allSignals(term) : [];
    D = { pf, trades: tr.trades || [], callOf: s => calls.filter(c => String(c.sym).toUpperCase() === s) };
    draw();
  }

  const SORTS = { value_d: ['Value: high to low', x => -x.value], value_a: ['Value: low to high', x => x.value],
    pct_d: ['P&L %: high to low', x => -(x.pnl_pct ?? -1e9)], pct_a: ['P&L %: low to high', x => (x.pnl_pct ?? 1e9)],
    pnl_d: ['P&L ₹: high to low', x => -x.pnl], pnl_a: ['P&L ₹: low to high', x => x.pnl], day_d: ['Today: best first', x => -(x.day_pct ?? -1e9)] };
  const SRC = ['Angel', 'Kite', 'Dhan', 'Manual'];

  function totals(rows) {
    const value = rows.reduce((a, x) => a + x.value, 0), inv = rows.reduce((a, x) => a + x.invested, 0);
    const day = rows.reduce((a, x) => a + (isFinite(x.day_pct) && x.day_pct !== null ? x.value - x.value / (1 + x.day_pct / 100) : 0), 0);
    const src = Object.fromEntries(SRC.map(k => [k, rows.reduce((a, x) => a + (x.parts?.[k]?.qty || 0) * x.ltp, 0)]));
    return { value, inv, pnl: value - inv, pct: inv ? (value / inv - 1) * 100 : NaN, day, dayPct: value - day ? day / (value - day) * 100 : NaN, n: rows.length, src };
  }

  function draw() {
    const { pf, trades, callOf } = D, open = (pf.rows || []).filter(x => x.qty > 0);
    const isAi = x => callOf(x.symbol).length > 0;
    const sets = { all: open, ai: open.filter(isAi), non: open.filter(x => !isAi(x)) };
    const bad = Object.entries(pf.brokers || {}).filter(([, b]) => b.status && !['ok', 'not_set_up'].includes(b.status));
    root.innerHTML = `${pf.error ? errBox(pf.error) : ''}${bad.map(([k, b]) => `<div class="err" role="alert"><span>${k}: ${esc(b.status === 'login_needed' ? 'connect again today (Brokers tab)' : b.error || b.status)}</span></div>`).join('')}
      <div id="pf-seg"></div><div id="pf-body" style="margin-top:12px"></div>`;
    segmented(root.querySelector('#pf-seg'), [['pf', 'Portfolio', open.length], ['log', 'Trade log', trades.length], ['brokers', 'Brokers', Object.values(pf.brokers || {}).filter(b => b.status === 'ok').length]], tab,
      v => { tab = v; history.replaceState(history.state, '', location.pathname + '?v=' + v + (v === 'pf' ? '&f=' + view : '')); body2(); });
    root.querySelector('[data-retry]')?.addEventListener('click', () => load(true));
    body2();

    function body2() {
      const B = root.querySelector('#pf-body');
      if (tab === 'log') B.innerHTML = logView(trades);
      else if (tab === 'brokers') B.innerHTML = brokersView(pf.brokers || {}, trades.length);
      else {
        const rows = [...sets[view]].sort((a, b) => SORTS[sortBy][1](a) - SORTS[sortBy][1](b)), t = totals(rows);
        const kpi = (k, v, cls = '', sub = '') => `<div class="panel"><div class="k">${k}</div><div class="v ${cls} tnum">${v}</div>${sub ? `<div class="small">${sub}</div>` : ''}</div>`;
        const name = { all: 'Complete portfolio', ai: 'AI call positions', non: 'Non-AI positions' }[view];
        B.innerHTML = `<div class="hs pf-views" role="group" aria-label="Which positions">${[['all', 'Complete', sets.all.length], ['ai', 'AI calls', sets.ai.length], ['non', 'Non-AI', sets.non.length]].map(([k, l, c]) => `<button class="chip" data-view="${k}" aria-pressed="${k === view}">${l} <span class="n">${c}</span></button>`).join('')}</div>
          <div class="mine-kpis">
            ${kpi(name, fmt.lakh(t.value), '', `${fmt.int(t.n)} stocks · invested ${fmt.lakh(t.inv)}`)}
            ${kpi('Open P&amp;L', `${fmt.sinr(t.pnl)} <span class="small">${fmt.sp(t.pct)}</span>`, tone(t.pnl))}
            ${kpi('Today', `${fmt.sinr(t.day)} <span class="small">${fmt.sp(t.dayPct)}</span>`, tone(t.day))}
            ${kpi('Where it sits', SRC.filter(k => t.src[k] > 0).map(k => `<span class="srcv"><i class="${k.toLowerCase()}">${k}</i> ${fmt.lakh(t.src[k])}</span>`).join(' ') || '—', 'srcline')}
          </div>
          <div class="pf-tools"><label class="small" for="pf-sort">Sort</label><select id="pf-sort">${Object.entries(SORTS).map(([k, [l]]) => `<option value="${k}"${k === sortBy ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
          ${rows.length ? table(rows, view === 'ai') : empty(view === 'ai' ? 'ai' : 'pf', view === 'ai' ? 'None of your stocks is an open AI call' : 'Nothing here', view === 'ai' ? 'Stocks you hold that are also open AI calls show here.' : 'Holdings from your brokers appear here automatically.')}`;
        B.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view; history.replaceState(history.state, '', location.pathname + '?v=pf&f=' + view); body2(); });
        B.querySelector('#pf-sort').onchange = e => { sortBy = e.target.value; try { localStorage.setItem('rh-pf-sort', sortBy); } catch { /* blocked */ } body2(); };
      }
      B.insertAdjacentHTML('beforeend', footNote('Private: only you can see this. Broker prices come from each broker; manual prices from the live feed.'));
      bind(B); reveal(B);
    }
  }

  function table(rows, withCall) {
    return `<div class="pf-table" role="table">
      <div class="pf-tr pf-th" role="row"><span>Stock</span><span>Qty · avg</span><span>Price</span><span>Value</span><span>P&amp;L</span></div>
      ${rows.map(x => { const c = D.callOf(x.symbol)[0]; return link(c && withCall ? callPath(c) : `xray/${encodeURIComponent(x.symbol)}`, `
        <span class="s1">${mono(x.symbol)}<span><b>${esc(x.symbol)}</b>${c ? ' <span class="tag bought">AI call</span>' : ''}<br><span class="src">${Object.keys(x.parts || {}).map(s => `<i class="${s.toLowerCase()}">${s}</i>`).join('')}</span>
          ${c && withCall ? `<br><span class="small">Stop <b class="dn">${fmt.px(c.stop)}</b> · Target <b class="up">${fmt.px(c.target)}</b></span>` : ''}</span></span>
        <span class="tnum">${fmt.x(x.qty, x.qty % 1 ? 2 : 0)}<br><span class="small">${fmt.px(x.avg)}</span></span>
        <span class="tnum">${fmt.px(x.ltp)}<br><span class="small ${tone(x.day_pct)}">${fmt.sp(x.day_pct)}</span></span>
        <span class="tnum">${fmt.lakh(x.value)}</span>
        <span class="tnum ${tone(x.pnl)}">${fmt.sinr(x.pnl)}<br><span class="small">${fmt.sp(x.pnl_pct)}</span></span>`, `pf-tr${c ? ' ai' : ''}`, 'role="row"'); }).join('')}
    </div>`;
  }

  function brokersView(b, nTrades) {
    const st = { ok: ['up', 'Connected'], login_needed: ['warn', 'Login needed today'], not_set_up: ['', 'Not set up'], token_expired: ['dn', 'Token expired'], error: ['dn', 'Error'] };
    const card = (k, body) => { const x = b[k] || {}, [cls, lab] = st[x.status] || ['', x.status || '—'];
      return `<div class="panel brk"><div class="brk-h"><b>${k}</b>${x.account ? ` <span class="small">${esc(x.account)}</span>` : ''}<span class="pill ${cls}">${lab}</span></div>
        <div class="small">${x.status === 'ok' ? `${fmt.int(x.count)} holdings · checked ${esc(x.as_of || '')}${x.expires ? ' · valid till ' + esc(x.expires) : ''}` : esc(x.error || '')}</div>${body || ''}</div>`; };
    return `${card('Angel')}
      ${card('Kite', `<p class="small">Zerodha logs out every morning, so Kite needs one tap a day. You log in on Zerodha's own page; this app never sees your password.</p>${(b.Kite || {}).status === 'not_set_up' ? '<p class="small"><b>Setup once:</b> create a Kite Connect app at developers.kite.trade, set its redirect URL to <code>https://quantsync-api.duckdns.org:40034/api/owner/kite/callback</code>, then put <code>api_key</code> and <code>api_secret</code> under <code>"kite"</code> in the VPS config.json.</p>' : '<button class="btn block" data-kite>Connect Kite (Zerodha login)</button>'}`)}
      ${card('Dhan', (b.Dhan || {}).status === 'ok' ? '' : '<p class="small"><b>Setup:</b> in web.dhan.co → My Profile → DhanHQ Trading APIs, generate an access token (valid up to 30 days) and put <code>client_id</code> and <code>access_token</code> under <code>"dhan"</code> in the VPS config.json. Holdings then refresh on their own.</p>')}
      <div class="panel brk"><div class="brk-h"><b>Manual</b><span class="pill">${fmt.int(nTrades)} trades</span></div><div class="small">For anything not in a connected broker. Add with +.</div></div>
      <p class="small" style="margin-top:8px">All brokers are fetched when you open this page and saved every trading day at 4:10 PM.</p>`;
  }

  function logView(trades) {
    const imp = `<button class="btn quiet block" data-import style="margin-bottom:12px">Import my old portfolio list</button>`;
    if (!trades.length) return `${empty('pf', 'No manual trades yet', 'Add a buy or sell with +. Angel holdings are tracked separately and automatically.', '<button class="btn" data-addb>Add a trade</button>')}${imp}`;
    return `${imp}<div class="group">${trades.map(t => `<button class="row pf-log" data-edit="${t.id}">
      <span class="side ${t.side === 'BUY' ? 'up' : 'dn'}">${t.side}</span>
      <div class="main"><div class="t">${esc(t.symbol)}</div><div class="small">${fmt.dateY(t.trade_date)}${t.note ? ' · ' + esc(t.note) : ''}</div></div>
      <div class="end tnum"><div>${fmt.x(t.qty, t.qty % 1 ? 2 : 0)} × ${fmt.px2(t.price)}</div><div class="small">${fmt.inr(t.qty * t.price)}</div></div></button>`).join('')}</div>`;
  }

  function bind(L) {
    L.querySelector('[data-addb]')?.addEventListener('click', () => tradeSheet());
    L.querySelector('[data-kite]')?.addEventListener('click', async () => { try { const d = await ownerApi('/owner/kite/login'); location.href = d.url; } catch (e) { toast(e.message); } });
    L.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => tradeSheet(D.trades.find(t => String(t.id) === b.dataset.edit)));
    L.querySelector('[data-import]')?.addEventListener('click', async () => {
      try {
        const h = await holdings.get(); const items = (h.items || []).filter(x => x.symbol && n(x.qty) > 0 && n(x.avg_price) > 0);
        if (!items.length) { toast('No old portfolio stocks with a buy price found.'); return; }
        const d = await ownerSend('POST', '/owner/trades/import', { items: items.map(x => ({ ...x, date: today() })) });
        toast(`${d.added} stocks imported as buys`); load(false);
      } catch (e) { toast(e.message); }
    });
  }

  function tradeSheet(t = null) {
    const s = sheet(`<h3>${t ? 'Edit trade' : 'Add a trade'}</h3>
      <div class="field"><label for="tr-s">Stock symbol (NSE)</label><input id="tr-s" autocapitalize="characters" value="${esc(t ? t.symbol : '')}" placeholder="e.g. TCS"></div>
      <div class="hs" role="group" aria-label="Buy or sell" style="margin:6px 0 10px">${['BUY', 'SELL'].map(k => `<button class="chip" data-side="${k}" aria-pressed="${(t ? t.side : 'BUY') === k}">${k === 'BUY' ? 'Buy' : 'Sell'}</button>`).join('')}</div>
      <div class="kv2"><div class="field"><label for="tr-q">Quantity</label><input id="tr-q" inputmode="decimal" value="${t ? t.qty : ''}"></div>
      <div class="field"><label for="tr-p">Price (₹)</label><input id="tr-p" inputmode="decimal" value="${t ? t.price : ''}"></div></div>
      <div class="field"><label for="tr-d">Date</label><input id="tr-d" type="date" value="${t ? t.trade_date : today()}"></div>
      <div class="field"><label for="tr-n">Note (optional)</label><input id="tr-n" value="${esc(t ? t.note || '' : '')}"></div>
      <button class="btn block" data-save>${t ? 'Save' : 'Add trade'}</button>
      ${t ? '<button class="btn quiet block dn" data-del style="margin-top:8px">Delete this trade</button>' : ''}`);
    let side = t ? t.side : 'BUY';
    s.el.querySelectorAll('[data-side]').forEach(b => b.onclick = () => { side = b.dataset.side; s.el.querySelectorAll('[data-side]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    s.el.querySelector('[data-save]').onclick = async () => {
      const v = id => s.el.querySelector(id).value.trim();
      const body = { symbol: v('#tr-s').toUpperCase(), side, qty: n(v('#tr-q')), price: n(v('#tr-p')), date: v('#tr-d'), note: v('#tr-n') };
      if (!body.symbol || !(body.qty > 0) || !(body.price > 0)) { toast('Symbol, quantity and price are needed.'); return; }
      try { await ownerSend(t ? 'PUT' : 'POST', '/owner/trades' + (t ? '/' + t.id : ''), body); s.close(); toast(t ? 'Trade saved' : `${body.side === 'BUY' ? 'Buy' : 'Sell'} ${body.symbol} added`); tab = 'log'; load(false); }
      catch (e) { toast(e.message); }
    };
    s.el.querySelector('[data-del]')?.addEventListener('click', async () => {
      try { await ownerSend('DELETE', '/owner/trades/' + t.id); s.close(); toast('Trade deleted'); load(false); } catch (e) { toast(e.message); }
    });
  }
}
