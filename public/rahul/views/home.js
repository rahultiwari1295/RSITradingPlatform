/* /rahul home: News, with one thin strip on top that says how many calls need action. */
import { icon, link, auth, isOwner, allSignals, ownerApi } from '../core.js';
import { loadBook } from './pfdata.js';
import { entryZone } from './parts.js';

export default async function home(el) {
  el.innerHTML = `<div class="hm"><div class="hm-top" id="hm-strip"></div>
    <iframe class="rh-embed" src="/app/news?embed=1" title="News" loading="eager"></iframe></div>`;
  const strip = el.querySelector('#hm-strip');
  await auth.whenReady();
  if (!isOwner()) { strip.remove(); return; }
  strip.innerHTML = '<span class="hm-sk"></span>';
  try {
    const book = await loadBook(false);
    const sell = book.rows.filter(x => ['exit', 'stop', 'target'].includes(x.status)).length;
    const held = new Set(book.rows.map(x => String(x.symbol).toUpperCase()));
    const fresh = book.term ? allSignals(book.term).filter(c => entryZone(c) === 'new' && !held.has(String(c.sym).toUpperCase())).length : 0;
    const txt = sell || fresh
      ? `<b class="${sell ? 'dn' : ''}">${sell} to sell</b> <i>·</i> <b>${fresh} new ${fresh === 1 ? 'call' : 'calls'}</b>`
      : 'Nothing to sell <i>·</i> no new call yet';
    let took = '';
    try { const f = await ownerApi('/owner/follow'); const m = (f.summary || {}).month; if (m && m.calls > 0) took = ` <i>·</i> took ${m.taken + m.late} of ${m.calls}`; } catch { /* not built yet */ }
    strip.innerHTML = link('calls', `<span class="hm-t">${txt}${took}</span>${icon('chev', 16, 'chev')}`, 'hm-strip');
  } catch { strip.remove(); }
}
