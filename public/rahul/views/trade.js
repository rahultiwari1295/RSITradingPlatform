/* Buy / sell sheet for the owner. Live price, cash in each broker, quantity <-> amount, then the trade code.
   The server re-checks everything (owner login, trade code, safety limit, holdings for a sell). Nothing is sent
   until the code is typed on the second step. */
import { fmt, esc, icon, n, mono, tone, ownerApi, ownerSend, sheet, toast } from '../core.js';

const BROKERS = ['Angel', 'Dhan', 'Kite'];
const BUDGET = 14000;            // default size of one buy
const AMOUNTS = [10000, 12000, 14000, 15000];

/** opts: { sym, side: 'BUY'|'SELL', broker?, call?: {entry, stop, target}, onDone? } */
export function orderSheet(opts) {
  const sym = String(opts.sym).toUpperCase();
  let side = opts.side === 'SELL' ? 'SELL' : 'BUY';
  const st = { t: null, broker: opts.broker || null, otype: 'LIMIT', qty: 0, limit: 0, ltp: 0, step: 1, nonce: '', busy: false, qtyTouched: false };
  const s = sheet(`<div class="ot" data-side="${side}">
      <div class="ot-h">${mono(sym, 'lg')}<div style="min-width:0;flex:1"><h3 style="margin:0">${side === 'BUY' ? 'Buy' : 'Sell'} ${esc(sym)}</h3>
        <div class="small" id="ot-px">Loading live price…</div></div>
        <div class="ot-side" role="group" aria-label="Buy or sell">${['BUY', 'SELL'].map(k => `<button data-sd="${k}" aria-pressed="${k === side}">${k === 'BUY' ? 'Buy' : 'Sell'}</button>`).join('')}</div></div>
      <div id="ot-body"><div class="sk" style="height:180px;border-radius:16px;margin-top:12px"></div></div>
    </div>`, { label: `${side} ${sym}` });
  const root = s.el.querySelector('.ot'), B = s.el.querySelector('#ot-body'), pxEl = s.el.querySelector('#ot-px');
  let alive = true, timer = null;
  const stop = () => { alive = false; clearInterval(timer); };
  new MutationObserver((_, o) => { if (!document.body.contains(s.el)) { stop(); o.disconnect(); } }).observe(document.body, { childList: true });

  s.el.querySelectorAll('[data-sd]').forEach(b => b.onclick = () => {
    if (st.step !== 1 || side === b.dataset.sd) return;
    side = b.dataset.sd; root.dataset.side = side; st.qtyTouched = false;
    s.el.querySelector('h3').textContent = `${side === 'BUY' ? 'Buy' : 'Sell'} ${sym}`;
    s.el.querySelectorAll('[data-sd]').forEach(x => x.setAttribute('aria-pressed', x === b));
    if (side === 'SELL' && !(heldIn(st.broker) > 0)) st.broker = BROKERS.find(k => heldIn(k) > 0) || st.broker;
    defaults(); form();
  });

  const heldIn = k => n(st.t?.held?.[k]?.qty) || 0;
  const cashIn = k => n(st.t?.funds?.[k]?.cash);
  const okBroker = k => st.t?.funds?.[k]?.status === 'ok';
  const price = () => (st.otype === 'LIMIT' && st.limit > 0 ? st.limit : st.ltp);

  ownerApi(`/owner/ticket?symbol=${encodeURIComponent(sym)}`).then(t => {
    if (!alive) return;
    st.t = t; st.ltp = n(t.ltp) || 0; st.limit = st.ltp;
    if (!st.broker || !okBroker(st.broker)) st.broker = side === 'SELL' ? (BROKERS.find(k => heldIn(k) > 0) || 'Angel') : (BROKERS.find(okBroker) || 'Angel');
    showPx(t.as_of); defaults(); form();
    timer = setInterval(async () => {
      if (!alive || document.hidden) return;
      try { const p = await ownerApi(`/owner/price?symbol=${encodeURIComponent(sym)}`); if (!alive || !(n(p.ltp) > 0)) return;
        const was = st.ltp; st.ltp = n(p.ltp); showPx(p.as_of, st.ltp - was); if (st.step === 1) { if (st.otype === 'MARKET') calc(); else liveNote(); } } catch { /* keep last */ }
    }, 5000);
  }).catch(e => { B.innerHTML = `<div class="err" role="alert"><span>${esc(e.message)}</span></div>`; });

  function showPx(asOf, move = 0) {
    pxEl.innerHTML = st.ltp ? `<span class="ot-live"><i></i>Live</span> <b class="tnum ${move ? tone(move) : ''}" style="font-size:16px;color:var(--ink)">${fmt.px2(st.ltp)}</b> <span class="small">at ${esc(asOf || '')}</span>` : 'No live price right now';
  }

  function defaults() {
    if (side === 'BUY') { const p = price(); st.qty = p > 0 ? Math.floor(BUDGET / p) : 0; }
    else st.qty = heldIn(st.broker);
  }

  function form() {
    st.step = 1;
    const t = st.t, c = opts.call;
    const brk = k => {
      const f = (t.funds || {})[k] || {}, h = heldIn(k), on = st.broker === k;
      const need = f.status === 'login_needed' || f.status === 'not_set_up';
      const sub = side === 'SELL' ? (h ? `You hold ${fmt.int(h)}` : 'Not held here') : (f.status === 'ok' ? `${fmt.inr(f.cash)} free` : need ? (f.status === 'not_set_up' ? 'Not set up' : 'Not connected') : 'Balance unavailable');
      const dis = side === 'SELL' ? !h : f.status !== 'ok';
      return `<div class="ot-b${on ? ' on' : ''}${dis ? ' dis' : ''}"><button data-brk="${k}" ${dis ? 'disabled' : ''} aria-pressed="${on}"><b>${k}</b><span class="small tnum">${sub}</span></button>
        ${need && f.status === 'login_needed' && side === 'BUY' ? `<button class="ot-con" data-con="${k}">Connect</button>` : ''}</div>`;
    };
    const chips = side === 'BUY'
      ? AMOUNTS.map(a => `<button class="chip" data-amt="${a}">₹${a / 1000}K</button>`).join('')
      : [[.25, '25%'], [.5, '50%'], [1, 'All']].map(([f, l]) => `<button class="chip" data-frac="${f}">${l}</button>`).join('');
    B.innerHTML = `
      ${c ? `<div class="ot-plan small">AI call · entry <b>${fmt.px(c.entry)}</b> · stop <b class="dn">${fmt.px(c.stop)}</b> · target <b class="up">${fmt.px(c.target)}</b></div>` : ''}
      <div class="ot-lab">Broker</div><div class="ot-brks">${BROKERS.map(brk).join('')}</div>
      <div class="ot-lab">Order type</div>
      <div class="seg ot-seg" role="group">${[['LIMIT', 'Limit'], ['MARKET', 'Market']].map(([k, l]) => `<button data-ot="${k}" aria-pressed="${st.otype === k}">${l}</button>`).join('')}</div>
      <div class="kv2" style="margin-top:12px">
        <div class="field"><label for="ot-q">Quantity</label><input id="ot-q" inputmode="numeric" value="${st.qty}"></div>
        <div class="field"><label for="ot-a">${st.otype === 'LIMIT' ? 'Limit price (₹)' : 'Amount (₹)'}</label><input id="ot-a" inputmode="decimal" value="${st.otype === 'LIMIT' ? st.limit.toFixed(2) : Math.round(st.qty * st.ltp)}"></div>
      </div>
      ${st.otype === 'LIMIT' ? `<div class="field"><label for="ot-m">Amount (₹)</label><input id="ot-m" inputmode="numeric" value="${Math.round(st.qty * price())}"></div>` : ''}
      <div class="hs ot-chips" role="group" aria-label="${side === 'BUY' ? 'Amount' : 'Part to sell'}">${chips}</div>
      <div id="ot-live" class="small" style="margin:6px 2px 0"></div>
      <div class="ot-sum" id="ot-sum"></div>
      <button class="btn block ot-go" data-review>Review ${side === 'BUY' ? 'buy' : 'sell'}</button>
      <p class="tiny" style="text-align:center;margin:10px 0 0">Delivery (CNC) order on NSE. You type your trade code on the next step; nothing is sent before that.</p>`;
    const qEl = B.querySelector('#ot-q'), aEl = B.querySelector('#ot-a'), mEl = B.querySelector('#ot-m');
    const amtEl = st.otype === 'LIMIT' ? mEl : aEl;
    B.querySelectorAll('[data-brk]').forEach(b => b.onclick = () => { st.broker = b.dataset.brk; if (side === 'SELL') st.qty = heldIn(st.broker); form(); });
    B.querySelectorAll('[data-con]').forEach(b => b.onclick = async () => {
      try { const d = await ownerApi(`/owner/${b.dataset.con.toLowerCase()}/login`); location.href = d.url; } catch (e) { toast(e.message); }
    });
    B.querySelectorAll('[data-ot]').forEach(b => b.onclick = () => { st.otype = b.dataset.ot; if (st.otype === 'LIMIT' && !(st.limit > 0)) st.limit = st.ltp; form(); });
    qEl.oninput = () => { st.qty = Math.max(0, Math.floor(n(qEl.value) || 0)); st.qtyTouched = true; amtEl.value = st.qty ? Math.round(st.qty * price()) : ''; calc(); };
    amtEl.oninput = () => { const p = price(); st.qty = p > 0 ? Math.floor((n(amtEl.value) || 0) / p) : 0; qEl.value = st.qty; calc(); };
    if (st.otype === 'LIMIT') aEl.oninput = () => { st.limit = n(aEl.value) || 0; if (mEl.value && price() > 0 && !st.qtyTouched) { st.qty = Math.floor(n(mEl.value) / price()); qEl.value = st.qty; } else mEl.value = Math.round(st.qty * price()); calc(); };
    B.querySelectorAll('[data-amt]').forEach(b => b.onclick = () => { const p = price(); st.qty = p > 0 ? Math.floor(n(b.dataset.amt) / p) : 0; st.qtyTouched = false; qEl.value = st.qty; amtEl.value = Math.round(st.qty * p); calc(); });
    B.querySelectorAll('[data-frac]').forEach(b => b.onclick = () => { st.qty = Math.max(1, Math.floor(heldIn(st.broker) * n(b.dataset.frac))); qEl.value = st.qty; amtEl.value = Math.round(st.qty * price()); calc(); });
    B.querySelector('[data-review]').onclick = review;
    calc();
  }

  function liveNote() {
    const el = B.querySelector('#ot-live'); if (!el) return;
    if (st.otype === 'LIMIT' && st.ltp > 0 && st.limit > 0) {
      const d = (st.limit / st.ltp - 1) * 100;
      el.innerHTML = Math.abs(d) < .05 ? 'Limit is at the live price.' : `Limit is <b class="${side === 'BUY' ? (d > 0 ? 'dn' : 'up') : (d < 0 ? 'dn' : 'up')}">${fmt.sp(d, 2)}</b> from the live price ${fmt.px2(st.ltp)}.`;
    } else el.textContent = st.otype === 'MARKET' ? `Market order: fills near ${fmt.px2(st.ltp)}; the final price can differ a little.` : '';
  }

  function problems() {
    const p = price(), val = st.qty * p, out = [];
    if (!(st.qty > 0)) out.push(side === 'BUY' && p > BUDGET ? `One share costs ${fmt.inr(p)}, more than ₹14K. Quantity is 0; type one in if you still want it.` : 'Enter a quantity.');
    if (!(p > 0)) out.push('No price yet.');
    if (side === 'BUY' && !okBroker(st.broker)) out.push(`${st.broker} is not connected.`);
    if (side === 'BUY' && okBroker(st.broker) && val > cashIn(st.broker)) out.push(`Needs ${fmt.inr(val)}, but ${st.broker} has ${fmt.inr(cashIn(st.broker))} free.`);
    if (side === 'SELL' && st.qty > heldIn(st.broker)) out.push(`${st.broker} holds only ${fmt.int(heldIn(st.broker))}.`);
    if (val > n(st.t.max_order_value)) out.push(`Above the ${fmt.inr(st.t.max_order_value)} limit per order.`);
    return out;
  }

  function calc() {
    liveNote();
    const p = price(), val = st.qty * p, c = opts.call, el = B.querySelector('#ot-sum'); if (!el) return;
    const h = st.t.held?.[st.broker];
    const rows = [['Order value', `<b class="tnum">${fmt.inr(val)}</b>`]];
    if (side === 'BUY') {
      if (okBroker(st.broker)) rows.push([`${st.broker} cash after`, `<span class="tnum ${cashIn(st.broker) - val < 0 ? 'dn' : ''}">${fmt.inr(cashIn(st.broker) - val)}</span>`]);
      if (c && c.stop < p) rows.push(['Loss if stop hits', `<span class="dn tnum">${fmt.inr(st.qty * (p - c.stop))}</span>`]);
      if (c && c.target > p) rows.push(['Gain at target', `<span class="up tnum">${fmt.inr(st.qty * (c.target - p))}</span>`]);
    } else if (h) {
      const pnl = st.qty * (p - n(h.avg));
      rows.push(['Your avg', `<span class="tnum">${fmt.px2(h.avg)}</span>`], ['P&amp;L on this sale', `<span class="tnum ${tone(pnl)}">${fmt.sinr(pnl)} (${fmt.sp((p / n(h.avg) - 1) * 100)})</span>`]);
    }
    const bad = problems();
    el.innerHTML = rows.map(([k, v]) => `<div><span>${k}</span>${v}</div>`).join('') + (bad.length ? `<p class="ot-warn">${bad.map(esc).join('<br>')}</p>` : '');
    B.querySelector('[data-review]').disabled = bad.length > 0;
  }

  function review() {
    if (problems().length) return;
    st.step = 2; st.nonce = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());
    const p = price(), val = st.qty * p;
    B.innerHTML = `<div class="ot-review">
        <div class="ot-big ${side === 'BUY' ? 'up' : 'dn'}">${side === 'BUY' ? 'BUY' : 'SELL'} ${fmt.int(st.qty)} ${esc(sym)}</div>
        <div class="ot-sum">
          <div><span>Broker</span><b>${esc(st.broker)}</b></div>
          <div><span>Order</span><b>${st.otype === 'LIMIT' ? `Limit at ${fmt.px2(st.limit)}` : 'Market'} · Delivery · NSE</b></div>
          <div><span>Value</span><b class="tnum">${st.otype === 'MARKET' ? '≈ ' : ''}${fmt.inr(val)}</b></div>
        </div>
        <div class="field" style="margin-top:14px"><label for="ot-pin">Trade code</label><input id="ot-pin" type="password" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="Type your code to confirm"></div>
        <div id="ot-err"></div>
        <button class="btn block ot-go" data-send disabled>${side === 'BUY' ? 'Place buy order' : 'Place sell order'}</button>
        <button class="btn quiet block" data-back style="margin-top:8px">Back</button></div>`;
    const pin = B.querySelector('#ot-pin'), send = B.querySelector('[data-send]');
    setTimeout(() => pin.focus(), 50);
    pin.oninput = () => { send.disabled = pin.value.length < 4; };
    pin.onkeydown = e => { if (e.key === 'Enter' && !send.disabled) send.click(); };
    B.querySelector('[data-back]').onclick = form;
    send.onclick = async () => {
      if (st.busy) return; st.busy = true; send.disabled = true; send.textContent = 'Sending…';
      try {
        const r = await ownerSend('POST', '/owner/order', { broker: st.broker, symbol: sym, side, qty: st.qty, order_type: st.otype, price: st.otype === 'LIMIT' ? st.limit : 0, pin: pin.value, nonce: st.nonce });
        done(true, r);
      } catch (e) {
        st.busy = false; pin.value = ''; send.textContent = side === 'BUY' ? 'Place buy order' : 'Place sell order';
        if (/trade code|locked/i.test(e.message)) { B.querySelector('#ot-err').innerHTML = `<p class="ot-warn">${esc(e.message)}</p>`; pin.focus(); }
        else done(false, { message: e.message });
      }
    };
  }

  function done(okd, r) {
    stop();
    B.innerHTML = `<div class="ot-done">
      <div class="ot-ic ${okd ? 'up' : 'dn'}">${icon(okd ? 'check' : 'x', 28)}</div>
      <h3>${okd ? `Order sent to ${esc(st.broker)}` : 'Order not placed'}</h3>
      <p>${okd ? `${side === 'BUY' ? 'Buy' : 'Sell'} ${fmt.int(st.qty)} ${esc(sym)}${r.order_id ? ` · order id <b>${esc(r.order_id)}</b>` : ''}. Check ${esc(st.broker)} for the fill, then tap ↻ on the portfolio to update it.` : esc(r.message || 'The broker refused the order.')}</p>
      <button class="btn block" data-close>Done</button></div>`;
    if (okd) toast(`${side === 'BUY' ? 'Buy' : 'Sell'} order sent: ${st.qty} ${sym}`);
    opts.onDone && opts.onDone(okd);
  }
}
