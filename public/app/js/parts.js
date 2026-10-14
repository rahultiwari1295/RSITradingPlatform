/* Pieces shared by Build and the saved-strategy page. */
import { fmt, esc, icon, mono, link, line, lab, ok } from './app.js';

export const HONEST = `<div class="honest">${icon('info', 18)}<span>Hypothetical test of rules you chose, run on past NSE prices: each match is followed from the next day’s open, with 0.10% costs each way. It is a learning tool, not a forecast. Fewer than 30 trades means the numbers can swing a lot.</span></div>`;

/** A stock that meets the person's rules. Facts only: no ranking, no advice. */
export function stockRow(r) {
  const bits = [ok(r.rsi_14) ? `RSI ${Math.round(r.rsi_14)}` : '', ok(r.vol_ratio) ? `volume ${(+r.vol_ratio).toFixed(1)}×` : ''].filter(Boolean).join(' · ');
  return link(`xray/${encodeURIComponent(r.symbol)}`, `${mono(r.symbol)}<span style="min-width:0"><span class="t" style="display:block">${esc(r.symbol)}</span><span class="s" style="display:block">${bits || 'Open X-Ray'}</span></span>
    <span class="r"><b>${fmt.inr(r.close)}</b><span class="${fmt.tone(r.ret_1)}">${fmt.pct(r.ret_1)}</span></span>`, 'li');
}

/** Results of a past test, in plain words. */
export async function renderTest(el, r, { title = 'Your rules', note = true } = {}) {
  const a = (r.summary && r.summary.All) || {}, an = r.analytics || {}, yrs = r.years || [];
  if (!a.trades) { el.innerHTML = `<div class="card pad"><b class="h3">No past matches</b><p class="small" style="margin-top:4px">These rules never matched in the test period. Try loosening one rule.</p></div>`; return; }
  el.innerHTML = `
    <div class="stats">
      <div><small>Times it matched</small><b>${fmt.int(a.trades)}</b><span>${an.first_date ? `${fmt.date(an.first_date)} ${String(an.first_date).slice(0, 4)} to now` : 'in the test period'}</span></div>
      <div><small>Ended higher</small><b class="${a.win_rate >= 50 ? 'up' : ''}">${fmt.plain(a.win_rate)}</b><span>${fmt.int(a.wins)} of ${fmt.int(a.trades)}</span></div>
      <div><small>Average per match</small><b class="${fmt.tone(a.avg_ret)}">${fmt.pct(a.avg_ret, 2)}</b><span>after costs</span></div>
      <div><small>Deepest dip</small><b class="dn">${fmt.pct(a.max_dd)}</b><span>from a peak</span></div>
    </div>
    <div class="card pad" style="margin-top:12px">
      <div class="legend"><span><i style="--c:var(--brand)"></i>${esc(title)}</span><span><i class="dash" style="--c:var(--ink-3)"></i>Nifty 50</span></div>
      <div class="tiny" style="margin-bottom:6px">Value of ₹1,00,000 following every match, equal amounts</div>
      <div id="tq"></div></div>
    ${yrs.length ? `<div class="yrs" style="margin-top:12px">${yrs.map(y => { const s = (r.summary || {})[String(y)] || {}; return `<div><small>${y}${y === new Date().getFullYear() ? ' so far' : ''}</small><b>${fmt.plain(s.win_rate)}</b><div class="tiny">ended higher · ${fmt.int(s.trades)} matches</div></div>`; }).join('')}</div>` : ''}
    ${note ? `<div style="margin-top:12px">${HONEST}</div>` : ''}`;
  const eq = an.equity || []; if (eq.length < 2) return;
  const dates = eq.map(p => p.d), vals = eq.map(p => p.v * 1000);
  let bench = null;
  try {
    const b = await lab.benchmark(dates[0]); const bd = b.points || [];
    if (bd.length > 5) { let j = 0, b0 = null; bench = dates.map(dt => { while (j < bd.length - 1 && bd[j + 1].d <= dt) j++; const v = bd[j].d <= dt ? bd[j].v : NaN; if (b0 == null && Number.isFinite(v)) b0 = v; return b0 ? 100000 * v / b0 : NaN; }); }
  } catch { /* no benchmark */ }
  const S = []; if (bench) S.push({ data: bench, color: 'var(--ink-3)', dash: true, w: 1.5 }); S.push({ data: vals, color: 'var(--brand)', area: true });
  line(el.querySelector('#tq'), S, { h: 230, dates, yfmt: v => '₹' + (Math.max(0, v) / 100000).toFixed(1) + 'L', label: 'Test result', tip: i => `${fmt.date(dates[i])} · ${fmt.inr(vals[i])}${bench && Number.isFinite(bench[i]) ? ' · Nifty ' + fmt.inr(bench[i]) : ''}` });
}

/** Run a past test job with a progress bar. Returns the result. */
export async function runJob(start, box, label) {
  const { job_id } = await start();
  box.innerHTML = `<div class="work" aria-live="polite"><div style="display:flex;gap:10px;align-items:center"><span class="spin" style="color:var(--brand)"></span><b>${esc(label)}</b></div><div class="tiny" id="jst">Starting</div><div class="prog"><i id="jbar"></i></div></div>`;
  const j = await window.QD.waitJob(job_id, x => {
    const s = box.querySelector('#jst'), b = box.querySelector('#jbar'); if (!s) return;
    s.textContent = x.status === 'queued' ? `In line${x.position ? ' · position ' + x.position : ''}${x.eta_s ? ' · about ' + Math.max(1, Math.round(x.eta_s / 60)) + ' min' : ''}` : (x.stage || 'Working');
    b.style.width = Math.max(4, x.progress || 0) + '%';
  });
  return j;
}
