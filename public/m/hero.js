/* Page title block: a quiet status line, a strong title whose words rise in once, and at most one short line under it.
   Motion is opacity and transform only, so it stays smooth on low-end phones. */
const E = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const words = (text, hl = []) => String(text).split(' ').map((w, i) => `<span class="w${hl.includes(w.replace(/[.,?!]/g, '')) ? ' g' : ''}" style="--i:${i}">${E(w)}</span>`).join(' ');
/** meta and extra are trusted HTML; h and sub are plain text. */
export function titleHTML({ meta = '', h, hl = [], sub = '', extra = '' }) {
  const n = String(h).split(' ').length;
  return `<div class="tb" style="--n:${n}">${meta ? `<div class="tb-meta">${meta}</div>` : ''}<h1 class="tb-h">${words(h, hl)}</h1>${sub ? `<p class="tb-sub">${E(sub)}</p>` : ''}${extra ? `<div class="tb-x">${extra}</div>` : ''}</div>`;
}
