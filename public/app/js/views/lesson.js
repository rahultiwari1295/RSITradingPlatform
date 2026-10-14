import { icon, esc, link, words, empty } from '../app.js';
import { LESSONS } from './learn.js';
import { ideaById } from '../rules.js';

export default async function lesson(el, r) {
  const i = LESSONS.findIndex(x => x.id === r.arg), x = LESSONS[i];
  if (!x) { el.innerHTML = `<div class="head">${empty('learn', 'Lesson not found', 'Browse all lessons instead.', link('learn', 'All lessons', 'btn sm pri'))}</div>`; return; }
  const nx = LESSONS[i + 1], idea = ideaById(x.try);
  el.innerHTML = `
  <article style="max-width:680px;margin:0 auto">
    <div class="head">${link('learn', `${icon('back', 16)}Learn · lesson ${i + 1} of ${LESSONS.length}`, 'ey')}
      <h1 class="h1" style="font-size:clamp(30px,7.6vw,44px)">${words(esc(x.title))}</h1><p class="tiny">${x.mins} minute read</p></div>
    <div class="prose" style="margin-top:14px">${typeof x.body === 'function' ? x.body() : x.body}</div>
    ${idea ? `<div class="card pad" style="margin-top:22px;display:grid;gap:10px"><span class="ey">${icon('play', 14)}Try it</span><b class="h3">${esc(idea.name)}</b><p class="small">${esc(idea.tagline)}</p>${link(`build?idea=${idea.id}`, 'Open in the builder', 'btn pri block')}</div>` : ''}
    ${nx ? link(`learn/${nx.id}`, `<span class="ic" style="--c:${nx.color}">${icon(nx.icon, 24)}</span><span><b>Next: ${esc(nx.title)}</b><span>${esc(nx.sub)}</span></span>${icon('chev', 18)}`, 'lesson card', 'style="margin-top:14px"') : ''}
  </article>`;
}
