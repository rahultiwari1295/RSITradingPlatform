/* News and X-Ray come from the main QuantSync site (/app), shown inside /rahul without that site's own header and tabs. */
import { CFG } from '../core.js';

export default async function embed(el, r) {
  const path = r.tab === 'xray' ? (r.arg ? `xray/${encodeURIComponent(r.arg)}` : 'xray') : 'news';
  el.innerHTML = `<iframe class="rh-embed" src="/app/${path}?embed=1" title="${r.tab === 'xray' ? 'Stock X-Ray' : 'News'}" loading="eager"></iframe>`;
}
