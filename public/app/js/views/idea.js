import { icon, esc, link, words, empty } from '../app.js';
import { ideaById, art, catalog, say } from '../rules.js';

/* One idea as a readable rulebook. No results are shown here: the person runs and tests it. */
export default async function idea(el, r) {
  const x = ideaById(r.arg);
  if (!x) { el.innerHTML = `<div class="head">${empty('ideas', 'Idea not found', 'It may have been renamed. Browse all ideas instead.', link('ideas', 'All ideas', 'btn sm pri'))}</div>`; return; }
  const cat = await catalog().catch(() => null);
  el.innerHTML = `
  <div class="head">${link('ideas', `${icon('back', 16)}Ideas`, 'ey')}
    <h1 class="h1">${words(esc(x.name))}</h1><p class="lede">${esc(x.tagline)}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill ${x.by === 'QuantSync rulebook' ? 'ai' : ''}">${esc(x.by)}</span><span class="pill">${x.tf === '1W' ? 'Weekly' : 'Daily'} chart</span><span class="pill">${x.mode === 'all' ? 'All rules' : 'Any one rule'}</span></div></div>
  <div class="card pad" style="margin-top:16px;color:var(--ink-3)"><div style="height:110px">${art(x.art, x.color)}</div><p class="tiny" style="margin-top:6px">Drawing of the idea, not real prices.</p></div>

  <section class="sec"><div class="sech"><h2 class="h2">What it <em>looks for</em></h2></div>
    <div class="rulebox">${x.what.map((t, i) => `<div class="rule" style="--i:${i}"><span class="n">${i + 1}</span><span class="t" style="font-weight:500">${esc(t)}</span></div>`).join(`<div class="join">${x.mode === 'all' ? 'AND' : 'OR'}</div>`)}</div></section>

  <section class="sec"><div class="sech"><h2 class="h2">The exact <em>rules</em></h2></div>
    <div class="rulebox">${x.conds.map((c, i) => `<div class="rule" style="--i:${i}"><span class="n">${i + 1}</span><span class="t">${say(cat, c)}</span></div>`).join(`<div class="join">${x.mode === 'all' ? 'AND' : 'OR'}</div>`)}
    ${x.by === 'QuantSync rulebook' ? '<p class="tiny">These are QuantSync’s published pattern definitions, the same ones anyone can use in the builder.</p>' : ''}</div></section>

  <section class="sec"><div class="card pad" style="display:grid;gap:10px"><b class="h3">Why some traders study it</b><p class="small">${esc(x.why)}</p></div>
    <div class="callout">${icon('warn', 18)}<b> Watch out.</b> ${esc(x.watch)}</div></section>

  <section class="sec" style="display:grid;gap:10px">
    ${link(`build?idea=${x.id}`, `${icon('play', 16)}Open in the builder`, 'btn pri block')}
    <p class="tiny" style="text-align:center">In the builder you can see which stocks meet these rules today and test them on past prices.</p></section>`;
}
