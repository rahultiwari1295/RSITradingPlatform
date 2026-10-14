import { icon, api, chrome, fill, fmt, esc, n, link, mono, q, count, scoreColor, toDate } from '../core.js';
import { sec, footNote, statCell } from './parts.js';

export default async function market(el, r) {
  const want = r.query.get('s') || '';
  const body = chrome(el, { title: 'Market map', back: 'Today', sub: 'Every sector, ranked by how many of its stocks are in a long-term uptrend.', top: { ey: `${icon('grid', 16)}Market map`, h: 'Where the market | is strong.', hl: ['strong'], lede: 'Every sector, ranked by how many of its stocks are in a long-term uptrend.' } });
  fill(body, () => api('/app/market', 30), m => {
    const secs = [...(m.sectors || [])].sort((a, b) => n(b.above200_pct) - n(a.above200_pct));
    const st = m.stances || {}, tot = (n(st.BULLISH) || 0) + (n(st.NEUTRAL) || 0) + (n(st.BEARISH) || 0);
    body.innerHTML = `
      <div class="stats" style="margin-top:2px">${statCell('In uptrends', count(m.above200_pct, 'pct', 0), 'above 200-day avg', 'above200')}${statCell('Above 50-day', count(m.above50_pct, 'pct', 0), 'shorter trend')}${statCell('Avg X-Ray', count(m.avg_score), `${fmt.int(m.stocks)} stocks`, 'xray')}</div>
      ${tot ? `<div class="panel pad" style="margin-top:12px"><div class="h3">X-Ray verdicts across the market</div><div class="breadth" style="margin-top:10px"><div class="track" style="height:12px"><i style="width:${st.BULLISH / tot * 100}%;background:var(--up-solid)"></i><i style="width:${st.NEUTRAL / tot * 100}%;background:var(--ai-solid)"></i><i style="width:${st.BEARISH / tot * 100}%;background:var(--dn-solid)"></i></div>
        <div class="lg"><span><b class="up">${fmt.int(st.BULLISH)}</b> positive</span><span><b style="color:var(--ai)">${fmt.int(st.NEUTRAL)}</b> neutral</span><span><b class="dn">${fmt.int(st.BEARISH)}</b> negative</span></div></div></div>` : ''}
      ${sec('Sectors', `<div class="group">${secs.map(s => {
        const a = n(s.above200_pct), col = a >= 55 ? 'var(--up-solid)' : a >= 35 ? 'var(--ai-solid)' : 'var(--dn-solid)';
        return `<details class="sector" ${s.name === want ? 'open id="want"' : ''} style="border-top:.5px solid var(--line)"><summary class="row plain" style="display:grid;grid-template-columns:1fr auto;gap:6px 12px;cursor:pointer;list-style:none">
          <div class="main"><div class="t">${esc(s.name)}</div><div class="s">${fmt.int(s.n)} stocks, average X-Ray <b style="color:${scoreColor(s.avg_score)}">${fmt.int(s.avg_score)}</b></div></div>
          <div class="end"><div class="v tnum">${fmt.pct(a, 0)}</div><div class="d faint">in uptrends</div></div>
          <div style="grid-column:1/-1;height:6px;border-radius:3px;background:var(--sunk);overflow:hidden"><i style="display:block;height:100%;width:${a}%;background:${col};border-radius:3px;animation:grow 1s cubic-bezier(.2,.8,.2,1) both"></i></div></summary>
          ${(s.leaders || []).length ? `<div style="padding:0 0 6px"><div class="tiny" style="padding:4px 14px 2px;font-weight:600">Strongest in ${esc(s.name)}</div>${s.leaders.map(x => link(`xray/${encodeURIComponent(x.symbol)}`, `${mono(x.symbol)}<div class="main"><div class="t">${esc(x.symbol)}</div><div class="s">${esc(x.name || '')}</div></div><div class="end"><div class="v tnum" style="color:${scoreColor(x.score)}">${fmt.int(x.score)}</div><div class="d faint">X-Ray</div></div>`, 'row')).join('')}</div>` : ''}
        </details>`;
      }).join('').replace('border-top:.5px solid var(--line)', 'border-top:0')}</div>`, { p: 'Tap a sector to see its strongest stocks.' })}
      ${footNote(m.as_of ? `Computed from the X-Ray reports of ${fmt.date(m.as_of, { day: 'numeric', month: 'long' })}.` : '')}`;
    const w = body.querySelector('#want'); if (w) setTimeout(() => w.scrollIntoView({ block: 'center', behavior: 'smooth' }), 400);
  }, '<div class="sk" style="height:420px;border-radius:16px"></div>');
}
