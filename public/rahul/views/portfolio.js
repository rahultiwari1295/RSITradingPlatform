/* /rahul/portfolio — one table for everything Rahul owns: Angel One holdings (live) + the manual trade log,
   both stored on the VPS (Data/owner.db). Owner-only on the server (404 for anyone else). */
import { chrome, fmt, esc, icon, n, mono, delta, tone, link, holdings, ownerApi, ownerSend, loadTerminal, allSignals, engineBadge, callPath, segmented, skel, errBox, empty, reveal, sheet, toast } from '../core.js';
import { ruler } from '../charts.js';
import { footNote } from './parts.js';
import { loadBook, STATUS, EXIT_DAYS } from './pfdata.js';
import { orderSheet } from './trade.js';
import { go } from '../core.js';

const today = () => new Date().toISOString().slice(0, 10);

export default async function portfolio(el, r) {
  const body = chrome(el, { title: 'Portfolio', page: 'Portfolio', top: { ey: `${icon('pf', 16)}My portfolio`, h: 'All your brokers, | in one place.', hl: ['one place'], lede: 'Angel, Kite, Dhan and your manual trades, matched with the AI calls.' },
    actions: '<button class="ib" data-add aria-label="Add a trade">' + icon('plus', 22) + '</button><button class="ib" data-refresh aria-label="Refresh" style="font-size:20px">↻</button>' });
  body.innerHTML = `<div id="pf">${skel(90, 1, 18)}${skel(56, 6)}</div>`;
  const root = body.querySelector('#pf');
  let tab = ['log', 'brokers', 'act'].includes(r.query.get('v')) ? r.query.get('v') : 'pf', D = null;
  let view = ['all', 'ai', 'non', 'exit'].includes(r.query.get('f')) ? r.query.get('f') : 'all';
  let sortBy = (() => { try { return localStorage.getItem('rh-pf-sort') || 'value_d'; } catch { return 'value_d'; } })();
  el.querySelector('[data-add]').onclick = () => tradeSheet();
  el.querySelector('[data-refresh]').onclick = () => load(true);
  load(false);

  async function load(fresh) {
    root.innerHTML = `${skel(90, 1, 18)}${skel(96, 5)}`;
    const [book, tr, act] = await Promise.all([loadBook(fresh), ownerApi('/owner/trades').catch(() => ({ trades: [] })),
      ownerApi('/owner/activity').catch(() => ({ orders: [], moves: [] }))]);
    D = { pf: book.pf, rows: book.rows, trades: tr.trades || [], act };
    if (fresh) { const today = new Date().toISOString().slice(0, 10), m = (act.moves || []).filter(x => String(x.ts).slice(0, 10) === today && /sold|reduced/.test(x.kind));
      if (m.length) toast(`Spotted as sold: ${m.slice(0, 3).map(x => x.symbol).join(', ')}${m.length > 3 ? ' +' + (m.length - 3) : ''}`); }
    draw();
  }

  const SORTS = { value_d: ['Value: high to low', x => -x.value], value_a: ['Value: low to high', x => x.value],
    pct_d: ['P&L %: high to low', x => -(x.pnl_pct ?? -1e9)], pct_a: ['P&L %: low to high', x => (x.pnl_pct ?? 1e9)],
    pnl_d: ['P&L ₹: high to low', x => -x.pnl], pnl_a: ['P&L ₹: low to high', x => x.pnl], day_d: ['Today: best first', x => -(x.day_pct ?? -1e9)],
    act: ['Needs action first', x => STATUS[x.status].rank * 1e9 - x.value] };
  const SRC = ['Angel', 'Kite', 'Dhan', 'Manual'];

  function totals(rows) {
    const value = rows.reduce((a, x) => a + x.value, 0), inv = rows.reduce((a, x) => a + x.invested, 0);
    const day = rows.reduce((a, x) => a + (isFinite(x.day_pct) && x.day_pct !== null ? x.value - x.value / (1 + x.day_pct / 100) : 0), 0);
    const src = Object.fromEntries(SRC.map(k => [k, rows.reduce((a, x) => a + (x.parts?.[k]?.qty || 0) * x.ltp, 0)]));
    return { value, inv, pnl: value - inv, pct: inv ? (value / inv - 1) * 100 : NaN, day, dayPct: value - day ? day / (value - day) * 100 : NaN, n: rows.length, src };
  }

  function draw() {
    const { pf, trades, rows: open, act } = D;
    const isAi = x => x.status !== 'none' && x.status !== 'exit';
    const sets = { all: open, ai: open.filter(isAi), non: open.filter(x => x.status === 'none'), exit: open.filter(x => x.status === 'exit' || x.status === 'stop') };
    if (view === 'exit' && !sets.exit.length) view = 'all';
    const bad = Object.entries(pf.brokers || {}).filter(([, b]) => b.status && !['ok', 'not_set_up'].includes(b.status));
    const nAct = (act.orders || []).length + (act.moves || []).length;
    root.innerHTML = `${pf.error ? errBox(pf.error) : ''}${bad.map(([k, b]) => `<div class="err" role="alert"><span>${k}: ${esc(b.status === 'login_needed' ? 'connect again (Brokers tab)' : b.error || b.status)}</span></div>`).join('')}
      <div id="pf-seg"></div><div id="pf-body" style="margin-top:12px"></div>`;
    segmented(root.querySelector('#pf-seg'), [['pf', 'Holdings', open.length], ['act', 'Activity', nAct], ['log', 'Manual', trades.length], ['brokers', 'Brokers', Object.values(pf.brokers || {}).filter(b => b.status === 'ok').length]], tab,
      v => { tab = v; history.replaceState(history.state, '', location.pathname + '?v=' + v + (v === 'pf' ? '&f=' + view : '')); body2(); });
    root.querySelector('[data-retry]')?.addEventListener('click', () => load(true));
    body2();

    function body2() {
      const B = root.querySelector('#pf-body');
      if (tab === 'log') B.innerHTML = logView(trades);
      else if (tab === 'brokers') B.innerHTML = brokersView(pf.brokers || {}, trades.length);
      else if (tab === 'act') B.innerHTML = actView(act);
      else {
        const rows = [...sets[view]].sort((a, b) => SORTS[sortBy][1](a) - SORTS[sortBy][1](b)), t = totals(rows);
        const kpi = (k, v, cls = '', sub = '') => `<div class="panel"><div class="k">${k}</div><div class="v ${cls} tnum">${v}</div>${sub ? `<div class="small">${sub}</div>` : ''}</div>`;
        const name = { all: 'Complete portfolio', ai: 'AI call positions', non: 'Non-AI positions', exit: 'Needs action' }[view];
        const chips = [['all', 'Complete', sets.all.length], ['ai', 'AI calls', sets.ai.length], ['non', 'Non-AI', sets.non.length]].concat(sets.exit.length ? [['exit', 'Exit now', sets.exit.length]] : []);
        const ex = sets.exit;
        B.innerHTML = `${ex.length && view !== 'exit' ? `<button class="hc-alert" data-view="exit">${icon('bolt', 18)}<span><b>${ex.length} ${ex.length === 1 ? 'stock needs' : 'stocks need'} action</b><small>${esc(ex.slice(0, 4).map(x => x.symbol).join(', '))}${ex.length > 4 ? ' +' + (ex.length - 4) : ''}: the AI has closed the call, or price is at the stop.</small></span>${icon('chev', 18)}</button>` : ''}
          <div class="hs pf-views" role="group" aria-label="Which positions">${chips.map(([k, l, c]) => `<button class="chip${k === 'exit' ? ' dnc' : ''}" data-view="${k}" aria-pressed="${k === view}">${l} <span class="n">${c}</span></button>`).join('')}</div>
          <div class="mine-kpis">
            ${kpi(name, fmt.lakh(t.value), '', `${fmt.int(t.n)} stocks · invested ${fmt.lakh(t.inv)}`)}
            ${kpi('Open P&amp;L', `${fmt.sinr(t.pnl)} <span class="small">${fmt.sp(t.pct)}</span>`, tone(t.pnl))}
            ${kpi('Today', `${fmt.sinr(t.day)} <span class="small">${fmt.sp(t.dayPct)}</span>`, tone(t.day))}
            ${kpi('Where it sits', SRC.filter(k => t.src[k] > 0).map(k => `<span class="srcv"><i class="${k.toLowerCase()}">${k}</i> ${fmt.lakh(t.src[k])}</span>`).join(' ') || '—', 'srcline')}
          </div>
          <div class="pf-tools"><label class="small" for="pf-sort">Sort</label><select id="pf-sort">${Object.entries(SORTS).map(([k, [l]]) => `<option value="${k}"${k === sortBy ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
          ${rows.length ? `<div class="hc-list">${rows.map(card).join('')}</div>` : empty(view === 'ai' ? 'ai' : 'pf', view === 'ai' ? 'None of your stocks is an open AI call' : 'Nothing here', view === 'ai' ? 'Stocks you hold that are also open AI calls show here.' : 'Holdings from your brokers appear here.')}`;
        B.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view; history.replaceState(history.state, '', location.pathname + '?v=pf&f=' + view); body2(); });
        B.querySelector('#pf-sort').onchange = e => { sortBy = e.target.value; try { localStorage.setItem('rh-pf-sort', sortBy); } catch { /* blocked */ } body2(); };
        B.querySelectorAll('[data-sell]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); const x = open.find(y => y.symbol === b.dataset.sell);
          orderSheet({ sym: x.symbol, side: 'SELL', broker: Object.keys(x.parts || {}).find(k => k !== 'Manual'), call: x.call, onDone: ok => ok && load(true) }); });
      }
      B.insertAdjacentHTML('beforeend', footNote(`Private: only you can see this. "Exit call" means the AI closed its call on a stock you still hold in the last ${EXIT_DAYS} days.`));
      bind(B); reveal(B);
    }
  }

  /* One holding. Three prices side by side: what you paid, what the call said, where it is now. */
  function card(x) {
    const c = x.call, e = x.exitCall, st = STATUS[x.status];
    const canSell = Object.keys(x.parts || {}).some(k => k !== 'Manual');
    const cell = (k, v, d = '') => `<div><span>${k}</span><b class="tnum">${v}</b>${d ? `<small>${d}</small>` : ''}</div>`;
    const note = x.status === 'exit' ? `<p class="hc-note dn">${icon('bolt', 15)}<span>The AI <b>closed this call on ${fmt.date(e.exitDate)}</b> at ${fmt.px(e.exit)} (${esc(e.reason.toLowerCase())}, ${fmt.sp(e.roi)}). You still hold ${fmt.int(x.qty)}.</span></p>`
      : x.status === 'stop' ? `<p class="hc-note dn">${icon('bolt', 15)}<span>Price is <b>at or below the stop</b> of ${fmt.px(c.stop)}. The call fails on a close below it.</span></p>`
      : x.status === 'target' ? `<p class="hc-note up">${icon('check', 15)}<span>Price has <b>reached the target</b> of ${fmt.px(c.target)}.</span></p>` : '';
    return `<article class="hc st-${x.status}">
      <a class="hc-main" href="/rahul/stock/${encodeURIComponent(x.symbol)}" data-nav aria-label="${esc(x.symbol)}, ${st.t}">
        <div class="hc-top">${mono(x.symbol)}<div class="hc-id"><b>${esc(x.symbol)}</b><span class="src">${Object.keys(x.parts || {}).map(s => `<i class="${s.toLowerCase()}">${s}</i>`).join('')}</span></div>
          <div class="hc-val"><b class="tnum">${fmt.lakh(x.value)}</b><span class="tnum ${tone(x.pnl)}">${fmt.sinr(x.pnl)} · ${fmt.sp(x.pnl_pct)}</span></div></div>
        <div class="hc-st"><span class="pill ${st.cls}">${st.t}${c ? ` · day ${fmt.int(c.days)}` : ''}</span>${c ? engineBadge(c) : ''}${isFinite(x.day_pct) && x.day_pct !== null ? `<span class="small">today <b class="${tone(x.day_pct)}">${fmt.sp(x.day_pct)}</b></span>` : ''}</div>
        <div class="hc-3">
          ${cell('Your entry', fmt.px(x.avg), `${fmt.x(x.qty, x.qty % 1 ? 2 : 0)} shares`)}
          ${c ? cell('Call entry', fmt.px(c.entry), isFinite(x.vsCall) ? (Math.abs(x.vsCall) < 0.3 ? 'same as yours' : `you paid ${fmt.sp(x.vsCall)}`) : fmt.date(c.entryDate))
              : e ? cell('Call entry', fmt.px(e.entry), fmt.date(e.entryDate)) : cell('Call entry', '—', 'no AI call')}
          ${cell('Now', fmt.px(x.ltp), c ? `stop ${fmt.px(c.stop)}` : e ? `AI exit ${fmt.px(e.exit)}` : '')}
        </div>
        ${c ? ruler({ stop: c.stop, entry: c.entry, target: c.target, now: x.ltp }, { short: true }) : ''}
        ${note}
      </a>
      ${canSell && (x.status === 'exit' || x.status === 'stop' || x.status === 'target') ? `<button class="btn sm hc-sell" data-sell="${esc(x.symbol)}">Sell ${esc(x.symbol)}</button>` : ''}
    </article>`;
  }

  function actView(a) {
    const O = a.orders || [], M = a.moves || [];
    if (!O.length && !M.length) return empty('clock', 'No activity yet', 'Orders you place here and buys or sells spotted when you refresh your brokers show up in this list.');
    const kind = { sold: ['Sold', 'dn'], reduced: ['Sold part', 'dn'], bought: ['Bought', 'up'], added: ['Bought more', 'up'] };
    const all = O.map(o => ({ ts: o.ts, html: `<div class="row pf-log"><span class="side ${o.side === 'BUY' ? 'up' : 'dn'}">${o.side}</span>
        <div class="main"><div class="t">${esc(o.symbol)} <span class="pill ${o.status === 'sent' ? 'up' : 'dn'}">${o.status === 'sent' ? 'Order sent' : 'Failed'}</span></div><div class="small">${esc(o.broker)} · ${esc(String(o.ts).slice(0, 16))}${o.status !== 'sent' && o.message ? ' · ' + esc(o.message) : o.order_id ? ' · id ' + esc(o.order_id) : ''}</div></div>
        <div class="end tnum"><div>${fmt.int(o.qty)} × ${o.order_type === 'LIMIT' ? fmt.px2(o.price) : 'market'}</div><div class="small">${fmt.inr(o.qty * (o.price || o.ref_price || 0))}</div></div></div>` }))
      .concat(M.map(m => { const [lab, cls] = kind[m.kind] || [m.kind, '']; return { ts: m.ts, html: `<div class="row pf-log"><span class="side ${cls}">${lab}</span>
        <div class="main"><div class="t">${esc(m.symbol)} <span class="small">spotted in ${esc(m.source)}</span></div><div class="small">${esc(String(m.ts).slice(0, 16))} · avg ${fmt.px2(m.avg_price)}</div></div>
        <div class="end tnum"><div>${fmt.x(m.qty, m.qty % 1 ? 2 : 0)} × ${fmt.px2(m.price)}</div>${m.pnl != null ? `<div class="small ${tone(m.pnl)}">${fmt.sinr(m.pnl)}</div>` : ''}</div></div>` }; }))
      .sort((x, y) => String(y.ts).localeCompare(String(x.ts)));
    return `<p class="small" style="margin:0 2px 10px">Orders placed from this app, and buys or sells spotted by comparing your broker holdings each time you refresh. Spotted prices are the last traded price at refresh, not your exact fill.</p><div class="group">${all.map(x => x.html).join('')}</div>`;
  }

  function brokersView(b, nTrades) {
    const st = { ok: ['up', 'Connected'], login_needed: ['warn', 'Login needed today'], not_set_up: ['', 'Not set up'], token_expired: ['dn', 'Token expired'], error: ['dn', 'Error'] };
    const card = (k, body) => { const x = b[k] || {}, [cls, lab] = st[x.status] || ['', x.status || '—'];
      return `<div class="panel brk"><div class="brk-h"><b>${k}</b>${x.account ? ` <span class="small">${esc(x.account)}</span>` : ''}<span class="pill ${cls}">${lab}</span></div>
        <div class="small">${x.status === 'ok' ? `${fmt.int(x.count)} holdings · checked ${esc(x.as_of || '')}${x.expires ? ' · valid till ' + esc(x.expires) : ''}` : esc(x.error || '')}</div>${body || ''}</div>`; };
    return `${card('Angel')}
      ${card('Kite', `<p class="small">Zerodha logs out every morning, so Kite needs one tap a day. You log in on Zerodha's own page; this app never sees your password.</p>${(b.Kite || {}).status === 'not_set_up' ? '<p class="small"><b>Setup once:</b> create a Kite Connect app at developers.kite.trade, set its redirect URL to <code>https://quantsync-api.duckdns.org:40034/api/owner/kite/callback</code>, then put <code>api_key</code> and <code>api_secret</code> under <code>"kite"</code> in the VPS config.json.</p>' : '<button class="btn block" data-kite>Connect Kite (Zerodha login)</button>'}`)}
      ${card('Dhan', `<p class="small">Dhan logs out every day, so Dhan needs one tap a day. You log in on Dhan's own page; this app never sees your password.</p><button class="btn block" data-dhan>Connect Dhan (Dhan login)</button>`)}
      <div class="panel brk"><div class="brk-h"><b>Manual</b><span class="pill">${fmt.int(nTrades)} trades</span></div><div class="small">For anything not in a connected broker. Add with +.</div></div>
      <p class="small" style="margin-top:8px">Angel updates on its own. Kite and Dhan update when you tap ↻ (top right); a stock that has gone from the list since the last refresh is logged as sold in Activity.</p>`;
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
    L.querySelector('[data-dhan]')?.addEventListener('click', async () => { try { const d = await ownerApi('/owner/dhan/login'); location.href = d.url; } catch (e) { toast(e.message); } });
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
