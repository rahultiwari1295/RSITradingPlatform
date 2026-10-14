import { icon, words } from '../app.js';
import { IDEAS } from '../rules.js';
import { ideaCard } from './home.js';

/* Ideas: open rulebooks. Every rule is published; people run and test them themselves. */
export default async function ideas(el) {
  const q = IDEAS.filter(x => x.by === 'QuantSync rulebook'), cl = IDEAS.filter(x => x.by !== 'QuantSync rulebook');
  el.innerHTML = `
  <div class="head"><span class="ey">${icon('ideas', 16)}Ideas</span><h1 class="h1">${words('Start from a <em>proven pattern</em> of thinking.')}</h1>
    <p class="lede">Each idea is an open rulebook: every condition is written out, so you know exactly what you are running. Open one, change it, and test it yourself.</p></div>
  <section class="sec" style="margin-top:22px"><div class="sech"><h2 class="h2">QuantSync <em>rulebooks</em></h2></div><div class="ideas">${q.map(ideaCard).join('')}</div></section>
  <section class="sec"><div class="sech"><h2 class="h2">Classic <em>ideas</em></h2></div><div class="ideas">${cl.map(ideaCard).join('')}</div></section>`;
}
