/* Page title block, in the style of the main app's X-Ray page: a coloured label, a large headline whose words
   rise in one by one, and a short paragraph that explains the page. Motion is opacity and transform only. */
const E = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const words = (text, hl = []) => String(text).split(' ').map((w, i) => `<span class="w${hl.includes(w.replace(/[.,?!]/g, '')) ? ' g' : ''}" style="--i:${i}">${E(w)}</span>`).join(' ');
/** ey and extra are trusted HTML; h and lede are plain text. A "|" in h starts a new line. */
export function titleHTML({ ey = '', h, hl = [], lede = '', extra = '' }) {
  const lines = String(h).split('|').map(s => s.trim());
  let i = 0;
  const head = lines.map(l => `<span class="ln">${l.split(' ').map(w => `<span class="w${hl.includes(w.replace(/[.,?!]/g, '')) ? ' g' : ''}" style="--i:${i++}">${E(w)}</span>`).join(' ')}</span>`).join(' ');
  return `<div class="tb" style="--n:${i}">${ey ? `<div class="tb-ey">${ey}</div>` : ''}<h1 class="tb-h">${head}</h1>${lede ? `<p class="tb-sub">${E(lede)}</p>` : ''}${extra ? `<div class="tb-x">${extra}</div>` : ''}</div>`;
}
