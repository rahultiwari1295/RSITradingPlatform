import { icon, api, chrome, fill, fmt, esc, n, ok, loadPatterns, q, empty, toDate } from '../core.js';
import { patternCard, patternRow, sparks, sec, STAGE, footNote } from './parts.js';

export default async function patterns(el, r) {
  const body = chrome(el, { title: 'Patterns', top: { meta: `<span>Daily and weekly charts</span>`, h: 'Chart Patterns', hl: ['Patterns'], sub: 'Breakouts across every NSE stock, with measured odds.' } });
  body.innerHTML = `<div id="p-flow"></div><div id="p-list"></div><div id="p-edge"></div>${footNote('Patterns are scanned after each close on daily and weekly charts.')}`;
  let stage = r.query.get('stage') || 'Breakout', tf = 'all', shown = 20;

  fill(body.querySelector('#p-flow'), () => loadPatterns(), d => {
    if (!d.counts[stage]) stage = ['Breakout', 'Retest', 'Near', 'Forming'].find(s => d.counts[s]) || 'Breakout';
    const flow = body.querySelector('#p-flow');
    const paint = () => {
      flow.innerHTML = `<div class="flowline" role="group" aria-label="Pattern stage">${Object.entries(STAGE).map(([k, s]) => `<button data-s="${k}" aria-pressed="${k === stage}"><div class="v">${fmt.int(d.counts[k] || 0)}</div><div class="k">${s.t}</div><div class="bar" style="background:${s.c}"></div></button>`).join('')}</div>
        <p class="small" style="margin:10px 2px 0">${esc(STAGE[stage].what)} ${q(STAGE[stage].g)}</p>
        <div class="hs" style="margin-top:12px">${[['all', 'All charts'], ['D', 'Daily'], ['W', 'Weekly']].map(([k, l]) => `<button class="chip" data-tf="${k}" aria-pressed="${k === tf}">${l}</button>`).join('')}</div>`;
      flow.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { stage = b.dataset.s; shown = 20; paint(); list(d); });
      flow.querySelectorAll('[data-tf]').forEach(b => b.onclick = () => { tf = b.dataset.tf; shown = 20; paint(); list(d); });
    };
    paint(); list(d);
    if (d.scanDate) el.querySelector('.tb-meta').insertAdjacentHTML('beforeend', `<i class="sep"></i><span>Scanned ${fmt.date(d.scanDate, { weekday: 'short', day: 'numeric', month: 'short' })}</span>`);
  }, '<div class="sk" style="height:80px;border-radius:14px"></div>');

  function list(d) {
    const slot = body.querySelector('#p-list');
    const rows = d.rows.filter(p => p.stage === stage && (tf === 'all' || p.tf === tf));
    if (!rows.length) { slot.innerHTML = `<div style="margin-top:16px">${empty('pattern', `No ${STAGE[stage].t.toLowerCase()} setups${tf !== 'all' ? ' on this chart' : ''}`, 'Try another stage or chart. The scan runs again after the next close.')}</div>`; return; }
    const rich = stage === 'Breakout' || stage === 'Retest';
    slot.innerHTML = `<div style="margin-top:16px" class="${rich ? 'stack' : 'group'}">${rows.slice(0, shown).map(p => (rich ? patternCard(p) : patternRow(p))).join('')}</div>
      ${rows.length > shown ? `<button class="btn quiet block" data-more style="margin-top:14px">Show ${Math.min(20, rows.length - shown)} more</button>` : ''}`;
    const m = slot.querySelector('[data-more]'); if (m) m.onclick = () => { shown += 20; list(d); };
    if (rich) sparks(slot, api);
  }

  fill(body.querySelector('#p-edge'), () => api('/radar/edge', 60), e => {
    const c = e.cells || {};
    const cell = (k, label) => {
      const x = c[k]; if (!x) return '';
      const avg = n(x.mean_R) * n(x.avg_risk_pct);
      return `<div class="side"><div class="h"><span class="pill ${x.verdict === 'VALIDATED' ? 'up' : ''}">${x.verdict === 'VALIDATED' ? 'Validated' : 'Unproven'}</span></div>
        <div class="big tnum">${fmt.pct(n(x.hit_target) * 100, 0)}</div><div class="sub">reached the target first</div>
        <dl><dt>Setups</dt><dd>${fmt.int(x.n)}</dd><dt>Profitable</dt><dd>${fmt.pct(n(x.win_rate) * 100, 0)}</dd><dt>Avg per trade</dt><dd class="${avg >= 0 ? 'up' : 'dn'}">${fmt.sp(avg)}</dd></dl>
        <p class="tiny" style="margin:10px 0 0">${label}</p></div>`;
    };
    const html = cell('D|BREAKOUT|A', 'Grade A breakouts, daily charts.') + cell('W|BREAKOUT|A', 'Grade A breakouts, weekly charts.');
    if (!html) return;
    const yr = (e.date_range || [])[0];
    body.querySelector('#p-edge').innerHTML = sec(`Do breakouts work?${q('odds')}`, `<div class="duo">${html}</div>`, { p: `We tested ${fmt.int(e.events)} breakouts in ${fmt.int(e.symbols)} stocks${yr ? ' since ' + toDate(yr).getFullYear() : ''}, with a stop below the level and a target twice as far away.` });
  }, '', { quiet: true });
}
