/* /rahul/portfolio — one table for everything Rahul owns: Angel One holdings (live) + the manual trade log,
   both stored on the VPS (Data/owner.db). Owner-only on the server (404 for anyone else). */
import { chrome, fmt, esc, icon, n, mono, delta, tone, link, holdings, ownerApi, ownerSend, loadTerminal, allSignals, engineBadge, callPath, segmented, skel, errBox, empty, reveal, sheet, toast } from '../core.js';
import { ruler } from '../charts.js';
import { footNote } from './parts.js';

const today = () => new Date().toISOString().slice(0, 10);

export default async function portfolio(el, r) {
  const body = chrome(el, { title: 'Portfolio', page: 'Portfolio', top: { ey: `${icon('pf', 16)}My portfolio`, h: 'Angel + manual, | in one place.', hl: ['one place'], lede: 'Live Angel One holdings and your own trade log, matched with the AI calls.' },
    actions: '<button class="ib" data-add aria-label="Add a trade">' + icon('plus', 22) + '</button><button class="ib" data-refresh aria-label="Refresh" style="font-size:20px">↻</button>' });
  body.innerHTML = `<div id="pf">${skel(90, 1, 18)}${skel(56, 6)}</div>`;
  const root = body.querySelector('#pf');
  let tab = r.query.get('v') || 'all', D = null;
  el.querySelector('[data-add]').onclick = () => tradeSheet();
  el.querySelector('[data-refresh]').onclick = () => load();
  load();

  async function load() {
    root.innerHTML = `${skel(90, 1, 18)}${skel(56, 6)}`;
    const [pf, tr, term] = await Promise.all([
      ownerApi('/owner/portfolio').catch(e => ({ error: e.message, rows: [], totals: {} })),
      ownerApi('/owner/trades').catch(() => ({ trades: [] })),
      loadTerminal().catch(() => null),
    ]);
    const calls = term ? allSignals(term) : [];
    D = { pf, trades: tr.trades || [], callOf: s => calls.filter(c => String(c.sym).toUpperCase() === s) };
    draw();
  }

  function draw() {
    const { pf, trades, callOf } = D, t = pf.totals || {}, rows = pf.rows || [], open = rows.filter(x => x.qty > 0);
    const ai = open.filter(x => callOf(x.symbol).length);
    const kpi = (k, v, cls = '') => `<div class="panel"><div class="k">${k}</div><div class="v ${cls} tnum">${v}</div></div>`;
    root.innerHTML = `${pf.error ? errBox(pf.error) : ''}${pf.angel_error ? errBox('Angel: ' + pf.angel_error) : ''}
      <div class="mine-kpis">
        ${kpi('Total value', fmt.lakh(t.value))}
        ${kpi('Open P&amp;L', `${fmt.sinr(t.pnl)} <span class="small">${fmt.sp(t.pnl_pct)}</span>`, tone(t.pnl))}
        ${kpi(`Angel ${esc(pf.account || '')}`, fmt.lakh(t.angel_value))}
        ${kpi('Manual · booked', `${fmt.lakh(t.manual_value)} <span class="small ${tone(t.realised)}">${fmt.sinr(t.realised)}</span>`)}
      </div>
      <div id="pf-seg"></div><div id="pf-list" style="margin-top:10px"></div>`;
    segmented(root.querySelector('#pf-seg'), [['all', 'All stocks', open.length], ['ai', 'In AI calls', ai.length], ['log', 'Trade log', trades.length]], tab,
      v => { tab = v; history.replaceState(history.state, '', location.pathname + '?v=' + v); list(); });
    root.querySelector('[data-retry]')?.addEventListener('click', load);
    list();

    function list() {
      const L = root.querySelector('#pf-list');
      if (tab === 'ai') L.innerHTML = ai.length ? ai.map(x => aiCard(x, callOf(x.symbol))).join('') : empty('ai', 'No open AI call among your stocks', 'Stocks you hold that are also open AI calls show here, with the stop and target.');
      else if (tab === 'log') L.innerHTML = logView(trades);
      else L.innerHTML = open.length ? table(open) : empty('pf', 'Nothing here yet', 'Angel holdings load automatically. Add manual trades with +.');
      L.insertAdjacentHTML('beforeend', footNote('Private: only you can see this. Angel prices come from your broker; manual prices from the live feed.'));
      bind(L); reveal(L);
    }
  }

  function table(rows) {
    return `<div class="pf-table" role="table">
      <div class="pf-tr pf-th" role="row"><span>Stock</span><span>Qty · avg</span><span>Price</span><span>Value</span><span>P&amp;L</span></div>
      ${rows.map(x => { const c = D.callOf(x.symbol)[0]; return link(`xray/${encodeURIComponent(x.symbol)}`, `
        <span class="s1">${mono(x.symbol)}<span><b>${esc(x.symbol)}</b>${c ? ' <span class="tag bought">AI call</span>' : ''}<br><span class="src">${x.source.split('+').map(s => `<i class="${s.toLowerCase()}">${s}</i>`).join('')}</span></span></span>
        <span class="tnum">${fmt.x(x.qty, x.qty % 1 ? 2 : 0)}<br><span class="small">${fmt.px(x.avg)}</span></span>
        <span class="tnum">${fmt.px(x.ltp)}<br><span class="small ${tone(x.day_pct)}">${fmt.sp(x.day_pct)}</span></span>
        <span class="tnum">${fmt.lakh(x.value)}</span>
        <span class="tnum ${tone(x.pnl)}">${fmt.sinr(x.pnl)}<br><span class="small">${fmt.sp(x.pnl_pct)}</span></span>`, `pf-tr${c ? ' ai' : ''}`, 'role="row"'); }).join('')}
    </div>`;
  }

  function aiCard(x, cs) {
    const c = cs[0], toStop = (c.now / c.stop - 1) * 100, toTgt = (c.target / c.now - 1) * 100;
    return link(callPath(c), `<div class="top">${mono(x.symbol)}<div class="nm"><div class="t">${esc(x.symbol)} <span class="tag bought">Bought</span></div>
        <div class="s">${cs.map(k => engineBadge(k)).join(' ')}<span class="small">${esc(x.source)}</span></div></div>
        <div class="px"><div class="v tnum">${fmt.px(c.now)}</div>${delta(x.pnl_pct)}</div></div>
      ${ruler({ stop: c.stop, entry: c.entry, target: c.target, now: c.now }, { short: true })}
      <div class="kv">
        <div><div class="k">Your avg</div><div class="v tnum">${fmt.px(x.avg)}</div></div>
        <div><div class="k">Call entry</div><div class="v tnum">${fmt.px(c.entry)}</div></div>
        <div><div class="k">Your P&amp;L</div><div class="v ${tone(x.pnl)} tnum">${fmt.sinr(x.pnl)}</div></div>
        <div><div class="k">Stop</div><div class="v dn tnum">${fmt.px(c.stop)} <span class="small">${fmt.sp(-toStop)}</span></div></div>
        <div><div class="k">Target</div><div class="v up tnum">${fmt.px(c.target)} <span class="small">${fmt.sp(toTgt)}</span></div></div>
        <div><div class="k">Qty</div><div class="v tnum">${fmt.x(x.qty, 0)}</div></div>
      </div>`, 'sig mine-call owned', `aria-label="${esc(x.symbol)}, bought, AI call"`);
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
    L.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => tradeSheet(D.trades.find(t => String(t.id) === b.dataset.edit)));
    L.querySelector('[data-import]')?.addEventListener('click', async () => {
      try {
        const h = await holdings.get(); const items = (h.items || []).filter(x => x.symbol && n(x.qty) > 0 && n(x.avg_price) > 0);
        if (!items.length) { toast('No old portfolio stocks with a buy price found.'); return; }
        const d = await ownerSend('POST', '/owner/trades/import', { items: items.map(x => ({ ...x, date: today() })) });
        toast(`${d.added} stocks imported as buys`); load();
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
      try { await ownerSend(t ? 'PUT' : 'POST', '/owner/trades' + (t ? '/' + t.id : ''), body); s.close(); toast(t ? 'Trade saved' : `${body.side === 'BUY' ? 'Buy' : 'Sell'} ${body.symbol} added`); tab = 'log'; load(); }
      catch (e) { toast(e.message); }
    };
    s.el.querySelector('[data-del]')?.addEventListener('click', async () => {
      try { await ownerSend('DELETE', '/owner/trades/' + t.id); s.close(); toast('Trade deleted'); load(); } catch (e) { toast(e.message); }
    });
  }
}
