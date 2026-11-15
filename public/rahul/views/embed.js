/* X-Ray comes from the main QuantSync site (/app), shown inside /rahul without that site's own header and tabs. */
import { icon, back } from '../core.js';

export default async function embed(el, r) {
  const path = r.arg ? `xray/${encodeURIComponent(r.arg)}` : 'xray';
  el.innerHTML = `<div class="hm"><div class="hm-top"><button class="ib back" data-back aria-label="Back">${icon('back', 22)}<span>More</span></button></div>
    <iframe class="rh-embed" src="/app/${path}?embed=1" title="Stock X-Ray" loading="eager"></iframe></div>`;
  el.querySelector('[data-back]').onclick = () => back('more');
}
