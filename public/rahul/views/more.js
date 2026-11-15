/* /rahul/more: the pages that are not on the main tabs, and the owner's one setting. */
import { chrome, icon, link, fmt } from '../core.js';
import { footNote } from './parts.js';
import { buySize } from './trade.js';

const ROWS = [
  ['xray', 'xray', 'X-Ray', 'Look up any stock'],
  ['edge', 'bolt', 'Edge', 'Market gauge, results, owners, big buyers, scorecard'],
  ['patterns', 'pattern', 'Patterns', 'Chart patterns forming now'],
];

export default async function more(el) {
  const body = chrome(el, { title: 'More', page: 'More', compact: true });
  const ic = k => `<span class="mono" style="background:var(--brand-soft);color:var(--brand);box-shadow:none">${icon(k, 18)}</span>`;
  body.innerHTML = `<div class="group">
      ${ROWS.map(([p, k, t, s]) => link(p, `${ic(k)}<div class="main"><div class="t">${t}</div><div class="s">${s}</div></div>${icon('chev', 16, 'chev')}`, 'row')).join('')}
      <a class="row" href="/app/scanner.html">${ic('flask')}<div class="main"><div class="t">Scanner</div><div class="s">Build and test your own rules</div></div>${icon('chev', 16, 'chev')}</a>
    </div>
    <section class="sec"><div class="sec-h"><h2>Settings</h2></div>
      <div class="panel pad"><div class="field"><label for="mo-size">Standard buy amount (₹)</label>
        <input id="mo-size" inputmode="numeric" value="${buySize()}" aria-describedby="mo-help"></div>
        <p class="small" id="mo-help" style="margin:8px 0 0">The buy sheet starts with this amount. Allowed: ₹2,000 to ₹50,000. Now ${fmt.inr(buySize())}.</p></div></section>
    ${footNote('Private page.')}`;
  const inp = body.querySelector('#mo-size'), help = body.querySelector('#mo-help');
  inp.onchange = () => {
    const v = Math.round(Number(String(inp.value).replace(/[^\d.]/g, '')));
    if (!(v >= 2000 && v <= 50000)) { help.textContent = 'Enter a number from 2,000 to 50,000.'; return; }
    try { localStorage.setItem('rh-size', String(v)); } catch { /* storage blocked */ }
    inp.value = v; help.textContent = `Saved. The buy sheet will start with ${fmt.inr(v)}.`;
  };
}
