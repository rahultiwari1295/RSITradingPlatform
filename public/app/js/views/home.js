import { icon, link, go, words, esc } from '../app.js';
import { IDEAS, SUGGEST, art } from '../rules.js';
import { LESSONS } from './learn.js';

/* Home: one promise, one input. No stock picks, no performance numbers. */
export default async function home(el) {
  el.innerHTML = `
  <section class="hero">
    <span class="ey">${icon('spark', 16)}QuantSync Lab</span>
    <h1 class="h1">${words('Turn any trading idea <br>into <em>rules</em>, and test it.')}</h1>
    <p class="lede">Describe a setup in plain words. See which NSE stocks meet your rules today, how they did on years of past prices, and let the AI coach improve them.</p>
    <form class="ask" id="ask" autocomplete="off">
      <textarea id="q" rows="2" aria-label="Describe your idea" placeholder="Describe a setup…"></textarea>
      <div class="row"><span class="tiny">Plain words work. You can edit every rule.</span><button class="btn pri" type="submit">${icon('spark', 17)}Build it</button></div>
    </form>
    <div class="sugs" id="sugs">${SUGGEST.map(s => `<button type="button">${esc(s)}</button>`).join('')}</div>
  </section>

  <section class="sec" data-rv>
    <div class="sech"><h2 class="h2">How it <em>works</em></h2></div>
    <div class="steps">
      <div class="step"><span class="n">${icon('edit', 21)}</span><div><b>1 · Describe it</b><p>Type your idea, or start from one of ours. It becomes clear rules you can read and change.</p></div></div>
      <div class="step"><span class="n">${icon('search', 21)}</span><div><b>2 · See the matches</b><p>Every NSE stock is checked against your rules after each close. You see the ones that meet them.</p></div></div>
      <div class="step"><span class="n">${icon('spark', 21)}</span><div><b>3 · Test and improve</b><p>Run it on years of past prices. The AI coach studies the results and suggests a smarter filter.</p></div></div>
    </div>
  </section>

  <section class="sec" data-rv>
    <div class="sech"><h2 class="h2">Start from an <em>idea</em></h2>${link('ideas', 'All ideas')}</div>
    <div class="ideas">${IDEAS.slice(0, 6).map(ideaCard).join('')}</div>
  </section>

  <section class="sec" data-rv>
    <div class="sech"><h2 class="h2">Learn the <em>basics</em></h2>${link('learn', 'All lessons')}</div>
    <div class="list">${LESSONS.slice(0, 3).map(lessonRow).join('')}</div>
  </section>

  <section class="sec" data-rv>
    <div class="card pad" style="display:grid;gap:14px;padding:22px">
      <span class="ey">${icon('xray', 16)}Stock X-Ray</span>
      <h2 class="h2">Understand any company <em>in a minute.</em></h2>
      <p class="small">Trend, momentum, buying activity and the business behind the chart, explained in plain words. Facts, not a verdict.</p>
      <form class="xsearch" id="xs">${icon('search', 20)}<input id="xi" placeholder="Company or symbol, e.g. TCS" aria-label="Search a company" autocomplete="off"><button class="btn pri sm">X-Ray</button></form>
    </div>
  </section>`;

  const q = el.querySelector('#q');
  el.querySelector('#ask').onsubmit = e => { e.preventDefault(); const v = q.value.trim(); if (!v) { q.focus(); return; } go('build?q=' + encodeURIComponent(v)); };
  q.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.querySelector('#ask').requestSubmit(); } });
  el.querySelector('#sugs').onclick = e => { const b = e.target.closest('button'); if (b) go('build?q=' + encodeURIComponent(b.textContent)); };
  el.querySelector('#xs').onsubmit = e => { e.preventDefault(); const v = el.querySelector('#xi').value.trim().toUpperCase().replace(/\s+/g, ''); if (v) go('xray/' + encodeURIComponent(v)); };

  /* typing hints in the idea box */
  let i = 0, k = 0, del = false, tm = 0;
  const tick = () => {
    if (!q.isConnected) return;
    if (document.activeElement === q || q.value) { q.placeholder = 'Describe a setup…'; tm = setTimeout(tick, 1200); return; }
    const s = 'e.g. ' + SUGGEST[i];
    if (!del) { k++; if (k >= s.length) { del = true; q.placeholder = s; tm = setTimeout(tick, 1700); return; } }
    else { k -= 2; if (k <= 0) { del = false; k = 0; i = (i + 1) % SUGGEST.length; } }
    q.placeholder = s.slice(0, Math.max(0, k)) + '▏'; tm = setTimeout(tick, del ? 22 : 55);
  };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) tm = setTimeout(tick, 1400);
  return () => clearTimeout(tm);
}

export const ideaCard = x => link(`ideas/${x.id}`, `<div class="top2"><span class="ic" style="--c:${x.color}">${icon(x.icon, 22)}</span><div><b>${esc(x.name)}</b><div class="tiny">${esc(x.by)} · ${x.tf === '1W' ? 'weekly' : 'daily'} chart</div></div></div>
  <p>${esc(x.tagline)}</p><div class="art" style="color:var(--ink-3)">${art(x.art, x.color)}</div>`, 'idea', 'data-rv');
export const lessonRow = x => link(`learn/${x.id}`, `<span class="ic" style="--c:${x.color}">${icon(x.icon, 24)}</span><span><b>${esc(x.title)}</b><span>${esc(x.sub)} · ${x.mins} min</span></span>${icon('chev', 18)}`, 'lesson');
