/* QuantSync mobile: charts. Hand-drawn SVG, sized to the element, with touch scrubbing.
   Colours always come from CSS variables so light and dark both work. */
import { fmt, n, esc, toDate } from './core.js';

const NS = 'http://www.w3.org/2000/svg';
const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nice = (lo, hi, k = 4) => {
  const span = hi - lo || Math.abs(hi) || 1, raw = span / k, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw) || raw;
  const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
};
const short = v => (Math.abs(v) >= 1e5 ? fmt.x(v / 1e5, 1) + 'L' : Math.abs(v) >= 1e3 ? fmt.int(v) : fmt.x(v, Math.abs(v) >= 100 ? 0 : 1));
const dShort = t => { const d = toDate(t); return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''; };
const dMon = t => { const d = toDate(t); return d ? d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }).replace(' ', " '") : ''; };
const tickDates = (ts, k = 4) => { if (ts.length < 2) return []; const step = (ts.length - 1) / k; return Array.from({ length: k }, (_, i) => Math.round(step * (i + .5))); };

/** Re-draw on width change; returns a cleanup. */
function responsive(el, drawFn) {
  let w = 0;
  const run = () => { const nw = Math.round(el.clientWidth); if (nw && nw !== w) { w = nw; drawFn(nw); } };
  const ro = new ResizeObserver(run); ro.observe(el); run();
  return () => ro.disconnect();
}
function scrubber(el, svg, xs, onAt, onLeave) {
  const at = cx => { const r = svg.getBoundingClientRect(); const x = cx - r.left; let i = 0, best = 1e9; xs.forEach((v, j) => { const d = Math.abs(v - x); if (d < best) { best = d; i = j; } }); return i; };
  let active = false, sx = 0, sy = 0, timer = 0;
  const start = (cx) => { active = true; el.classList.add('scrub'); onAt(at(cx)); };
  svg.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    sx = e.clientX; sy = e.clientY; clearTimeout(timer);
    timer = setTimeout(() => start(sx), 140); // brief hold so vertical scrolling still works
  });
  svg.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') { start(e.clientX); return; }
    if (!active) { if (Math.abs(e.clientY - sy) > 8 || Math.abs(e.clientX - sx) > 6) { clearTimeout(timer); if (Math.abs(e.clientX - sx) > Math.abs(e.clientY - sy)) start(e.clientX); } return; }
    onAt(at(e.clientX));
  });
  svg.addEventListener('touchmove', e => { if (active) e.preventDefault(); }, { passive: false });
  const end = () => { clearTimeout(timer); if (!active) return; active = false; el.classList.remove('scrub'); onLeave(); };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end); svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') end(); });
}

/* ---------------------------------------------------------------- price chart */
/**
 * candles: [{t,o,h,l,c,e20,e50,e200,v}]
 * opts: { height, levels:[{v,label,tone,dash}], emas:bool, ranges:[[label,bars]], range, head: {el, base}, mark:{t,label}, mode }
 */
export function priceChart(el, candles, opts = {}) {
  const H = opts.height || 250;
  const ranges = opts.ranges || [['1M', 22], ['3M', 66], ['6M', 128], ['1Y', 250]];
  let range = opts.range || ranges.find(r => r[1] >= Math.min(candles.length, 128))?.[1] || candles.length;
  let mode = opts.mode || 'auto';
  el.classList.add('chart');
  el.innerHTML = `<div class="tip"></div><div class="plot"></div>${ranges.length > 1 ? `<div class="ranges" role="group" aria-label="Chart range">${ranges.filter(r => r[1] <= candles.length + 10 || r === ranges[0]).map(([l, b]) => `<button type="button" data-b="${b}" aria-pressed="${b === range}">${l}</button>`).join('')}</div>` : ''}`;
  const plot = el.querySelector('.plot'), tip = el.querySelector('.tip');
  const tones = { up: 'var(--up-solid)', dn: 'var(--dn-solid)', brand: 'var(--brand)', ai: 'var(--ai-solid)', ink: 'var(--ink)', mute: 'var(--ink-3)' };
  const head = opts.head;
  const setHead = (c, prev, label) => {
    if (!head) return;
    const ch = prev ? (c.c / prev.c - 1) * 100 : NaN;
    head.v.textContent = fmt.px(c.c);
    if (head.d) { head.d.textContent = isFinite(ch) ? fmt.sp(ch, 2) : ''; head.d.className = 'd ' + (ch > 0 ? 'up' : ch < 0 ? 'dn' : ''); }
    if (head.w) head.w.textContent = label;
  };
  const resetHead = (data) => { if (!head) return; const last = data[data.length - 1], first = data[0]; const ch = (last.c / first.c - 1) * 100; head.v.textContent = fmt.px(last.c); if (head.d) { head.d.textContent = fmt.sp(ch, 1); head.d.className = 'd ' + (ch > 0 ? 'up' : ch < 0 ? 'dn' : ''); } if (head.w) head.w.textContent = (opts.rangeWord || ((b) => ({ 22: 'past month', 66: 'past 3 months', 128: 'past 6 months', 250: 'past year' }[b] || `past ${b} sessions`)))(range); };
  let w = 0, first = true;
  const draw = W => {
    w = W;
    const data = candles.slice(-range);
    if (!data.length) { plot.innerHTML = ''; return; }
    const padR = 8, padL = 0, padT = 12, padB = 22, pw = W - padL - padR, ph = H - padT - padB;
    let lo = Math.min(...data.map(d => d.l)), hi = Math.max(...data.map(d => d.h));
    const last = data[data.length - 1].c, span = hi - lo;
    (opts.levels || []).forEach(L => { if (isFinite(L.v) && L.v > last * .55 && L.v < last * 1.6 && (L.force || (L.v > lo - span * .9 && L.v < hi + span * .9))) { lo = Math.min(lo, L.v); hi = Math.max(hi, L.v); } });
    const m = (hi - lo) * .06 || last * .02; lo -= m; hi += m;
    const X = i => padL + (data.length === 1 ? pw / 2 : (i + .5) * (pw / data.length));
    const Y = v => padT + (1 - (v - lo) / (hi - lo)) * ph;
    const useCandles = mode === 'candle' || (mode === 'auto' && data.length <= 140);
    const up = 'var(--up-solid)', dn = 'var(--dn-solid)';
    let g = '';
    nice(lo, hi, 4).forEach(v => { const y = Y(v); if (y > padT + 4 && y < padT + ph - 2) g += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width=".6"/><text x="${W - 2}" y="${y - 4}" font-size="10" fill="var(--ink-3)" text-anchor="end" class="tnum">${short(v)}</text>`; });
    tickDates(data, W < 420 ? 3 : 5).forEach(i => { g += `<text x="${X(i)}" y="${H - 6}" font-size="10.5" fill="var(--ink-3)" text-anchor="middle">${range > 140 ? dMon(data[i].t) : dShort(data[i].t)}</text>`; });
    let body = '';
    if (opts.emas !== false) {
      [['e200', 'var(--ink-3)', '3 3'], ['e50', 'var(--ai-solid)', ''], ['e20', 'var(--brand)', '']].forEach(([k, col, dash]) => {
        const pts = data.map((d, i) => (isFinite(d[k]) ? `${X(i).toFixed(1)},${Y(d[k]).toFixed(1)}` : null)).filter(Boolean);
        if (pts.length > 2) body += `<polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="1.3" stroke-dasharray="${dash}" opacity=".85"/>`;
      });
    }
    if (useCandles) {
      const cw = Math.max(1, Math.min(9, (pw / data.length) * .62));
      data.forEach((d, i) => {
        const x = X(i), col = d.c >= d.o ? up : dn, y1 = Y(Math.max(d.o, d.c)), y2 = Y(Math.min(d.o, d.c));
        body += `<line x1="${x}" x2="${x}" y1="${Y(d.h)}" y2="${Y(d.l)}" stroke="${col}" stroke-width="1"/><rect x="${x - cw / 2}" y="${y1}" width="${cw}" height="${Math.max(1, y2 - y1)}" fill="${col}" rx="${cw > 4 ? 1 : 0}"/>`;
      });
    } else {
      const tcol = last >= data[0].c ? up : dn;
      const line = data.map((d, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(d.c).toFixed(1)}`).join(' ');
      const id = 'g' + Math.random().toString(36).slice(2, 7);
      body += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tcol}" stop-opacity=".22"/><stop offset="1" stop-color="${tcol}" stop-opacity="0"/></linearGradient></defs>
        <path d="${line} L${X(data.length - 1)} ${padT + ph} L${X(0)} ${padT + ph}Z" fill="url(#${id})"/><path d="${line}" fill="none" stroke="${tcol}" stroke-width="1.8" stroke-linejoin="round" ${first && !RM ? `class="draw" style="--len:${Math.ceil(pw * 3)}"` : ''}/>`;
    }
    /* level lines with labels kept apart */
    const labs = (opts.levels || []).filter(L => isFinite(L.v) && L.v >= lo && L.v <= hi).map(L => ({ ...L, y: Y(L.v) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 19) labs[i].ly = (labs[i - 1].ly ?? labs[i - 1].y) + 19;
    let lv = '';
    labs.forEach(L => {
      const col = tones[L.tone] || L.tone || 'var(--ink-2)', ly = clamp(L.ly ?? L.y, padT + 8, padT + ph - 2);
      const text = `${L.label} ${fmt.px(L.v)}`, tw = text.length * 6.1 + 12;
      lv += `<line x1="0" x2="${W}" y1="${L.y}" y2="${L.y}" stroke="${col}" stroke-width="1.2" stroke-dasharray="${L.dash || '5 4'}" opacity=".9"/>
        <g transform="translate(2,${ly - 9})"><rect width="${tw}" height="18" rx="6" fill="var(--surface)" stroke="${col}" stroke-width="1"/><text x="${tw / 2}" y="12.5" font-size="10.5" font-weight="600" fill="${col}" text-anchor="middle" class="tnum">${esc(text)}</text></g>`;
    });
    if (opts.mark) {
      const i = data.findIndex(d => d.t >= opts.mark.t);
      if (i >= 0) lv += `<line x1="${X(i)}" x2="${X(i)}" y1="${padT}" y2="${padT + ph}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="2 3" opacity=".5"/><g transform="translate(${clamp(X(i), 26, W - 26)},${padT + ph - 10})"><rect x="-24" y="-9" width="48" height="18" rx="6" fill="var(--ink)"/><text y="4" font-size="10.5" font-weight="600" fill="var(--surface)" text-anchor="middle">${esc(opts.mark.label || 'Entry')}</text></g>`;
    }
    const lastY = Y(last);
    const dot = `<circle cx="${X(data.length - 1)}" cy="${lastY}" r="3.5" fill="var(--ink)" stroke="var(--surface)" stroke-width="2"/>`;
    plot.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Price chart, ${data.length} sessions, last ${fmt.px(last)}">${g}${body}${lv}${dot}<g class="cross" opacity="0"><line y1="${padT}" y2="${padT + ph}" stroke="var(--ink)" stroke-width="1"/><circle r="4" fill="var(--ink)" stroke="var(--surface)" stroke-width="2"/></g></svg>`;
    if (first && !RM) plot.firstChild.classList.add('fade-in');
    first = false;
    const svg = plot.firstChild, cross = svg.querySelector('.cross'), xs = data.map((_, i) => X(i));
    scrubber(el, svg, xs, i => {
      const d = data[i];
      cross.setAttribute('opacity', 1); cross.querySelector('line').setAttribute('x1', xs[i]); cross.querySelector('line').setAttribute('x2', xs[i]);
      cross.querySelector('circle').setAttribute('cx', xs[i]); cross.querySelector('circle').setAttribute('cy', Y(d.c));
      tip.innerHTML = `${dShort(d.t)}${isFinite(d.o) && d.o !== d.c ? ` &nbsp;O ${short(d.o)} H ${short(d.h)} L ${short(d.l)} C <b>${short(d.c)}</b>` : ` &nbsp;<b>${fmt.px(d.c)}</b>`}`;
      tip.style.left = clamp(xs[i], tip.offsetWidth / 2 + 2, W - tip.offsetWidth / 2 - 2) + 'px'; tip.style.top = '-30px';
      setHead(d, data[i - 1], dShort(d.t));
    }, () => { cross.setAttribute('opacity', 0); resetHead(data); });
    resetHead(data);
  };
  const stop = responsive(plot, draw);
  el.querySelectorAll('.ranges button').forEach(b => b.onclick = () => { range = +b.dataset.b; el.querySelectorAll('.ranges button').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(w); });
  return stop;
}
export const toCandles = list => (list || []).map(c => ({ t: c.time || c.date || c.t, o: n(c.open ?? c.o), h: n(c.high ?? c.h), l: n(c.low ?? c.l), c: n(c.close ?? c.c), v: n(c.volume), e20: n(c.ema20), e50: n(c.ema50), e200: n(c.ema200) })).filter(c => isFinite(c.c)).map(c => ({ ...c, o: isFinite(c.o) ? c.o : c.c, h: isFinite(c.h) ? c.h : c.c, l: isFinite(c.l) ? c.l : c.c }));
/** EMAs computed on the client when the API gives plain candles. */
export function withEmas(cs) {
  const k = { e20: 2 / 21, e50: 2 / 51, e200: 2 / 201 }, s = {};
  return cs.map((c, i) => { const o = { ...c }; for (const key in k) { if (!isFinite(c[key])) { s[key] = s[key] == null ? c.c : s[key] + (c.c - s[key]) * k[key]; o[key] = i >= ({ e20: 15, e50: 40, e200: 150 }[key]) ? s[key] : NaN; } } return o; });
}

/* ---------------------------------------------------------------- line / area */
/** pts: [{t,v}] ; opts: {height, fmt, bench:[{t,v}], benchLabel, head, zero, tone, label} */
export function areaChart(el, pts, opts = {}) {
  const H = opts.height || 200;
  el.classList.add('chart');
  el.innerHTML = '<div class="tip"></div><div class="plot"></div>';
  const plot = el.querySelector('.plot'), tip = el.querySelector('.tip');
  const F = opts.fmt || fmt.px;
  let first = true;
  const draw = W => {
    if (pts.length < 2) { plot.innerHTML = '<p class="small" style="padding:20px 0">Not enough data to draw this yet.</p>'; return; }
    const padT = 10, padB = opts.noDates ? 6 : 22, ph = H - padT - padB;
    const vals = pts.map(p => p.v).concat((opts.bench || []).map(p => p.v));
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (opts.zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    const m = (hi - lo) * .08 || Math.abs(hi) * .05 || 1; lo -= m; hi += m;
    const X = i => (i / (pts.length - 1)) * (W - 2) + 1, Y = v => padT + (1 - (v - lo) / (hi - lo)) * ph;
    const last = pts[pts.length - 1].v, tcol = opts.tone || (last >= pts[0].v ? 'var(--up-solid)' : 'var(--dn-solid)');
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
    const id = 'a' + Math.random().toString(36).slice(2, 7);
    let g = '';
    nice(lo, hi, 3).forEach(v => { const y = Y(v); if (y > padT + 4 && y < padT + ph) g += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width=".6"/><text x="${W - 2}" y="${y - 4}" font-size="10" fill="var(--ink-3)" text-anchor="end" class="tnum">${esc(opts.axis ? opts.axis(v) : short(v))}</text>`; });
    if (opts.zero) g += `<line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--ink-3)" stroke-width=".8"/>`;
    if (!opts.noDates) tickDates(pts, W < 420 ? 3 : 5).forEach(i => { g += `<text x="${X(i)}" y="${H - 6}" font-size="10.5" fill="var(--ink-3)" text-anchor="middle">${dShort(pts[i].t)}</text>`; });
    let bench = '';
    if (opts.bench && opts.bench.length > 1) {
      const bx = i => (i / (opts.bench.length - 1)) * (W - 2) + 1;
      bench = `<path d="${opts.bench.map((p, i) => `${i ? 'L' : 'M'}${bx(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--ink-3)" stroke-width="1.4" stroke-dasharray="4 4"/>`;
    }
    const len = Math.ceil(W * 2.2);
    plot.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Chart')}, latest ${esc(F(last))}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tcol}" stop-opacity=".24"/><stop offset="1" stop-color="${tcol}" stop-opacity="0"/></linearGradient></defs>${g}${bench}
      <path d="${line} L${X(pts.length - 1)} ${padT + ph} L${X(0)} ${padT + ph}Z" fill="url(#${id})" ${first && !RM ? 'class="fade-in"' : ''}/>
      <path d="${line}" fill="none" stroke="${tcol}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" ${first && !RM ? `class="draw" style="--len:${len}"` : ''}/>
      <circle cx="${X(pts.length - 1)}" cy="${Y(last)}" r="3.5" fill="${tcol}" stroke="var(--surface)" stroke-width="2"/>
      <g class="cross" opacity="0"><line y1="${padT}" y2="${padT + ph}" stroke="var(--ink)" stroke-width="1"/><circle r="4" fill="var(--ink)" stroke="var(--surface)" stroke-width="2"/></g></svg>`;
    first = false;
    const svg = plot.firstChild, cross = svg.querySelector('.cross'), xs = pts.map((_, i) => X(i));
    scrubber(el, svg, xs, i => {
      cross.setAttribute('opacity', 1);
      const l = cross.querySelector('line'); l.setAttribute('x1', xs[i]); l.setAttribute('x2', xs[i]);
      const c = cross.querySelector('circle'); c.setAttribute('cx', xs[i]); c.setAttribute('cy', Y(pts[i].v));
      tip.innerHTML = `${opts.noDates ? (pts.length - 1 - i ? (pts.length - 1 - i) + ' sessions ago' : 'Last close') : dShort(pts[i].t)} &nbsp;<b>${esc(F(pts[i].v))}</b>`;
      tip.style.left = clamp(xs[i], tip.offsetWidth / 2 + 2, W - tip.offsetWidth / 2 - 2) + 'px'; tip.style.top = '-30px';
      opts.onScrub && opts.onScrub(pts[i], i);
    }, () => { cross.setAttribute('opacity', 0); opts.onScrub && opts.onScrub(null); });
  };
  return responsive(plot, draw);
}

/* ---------------------------------------------------------------- signed bars (monthly results etc.) */
/** items: [{label, v, sub}] */
export function barChart(el, items, opts = {}) {
  const H = opts.height || 150;
  el.classList.add('chart');
  el.innerHTML = '<div class="tip"></div><div class="plot"></div>';
  const plot = el.querySelector('.plot'), tip = el.querySelector('.tip');
  const F = opts.fmt || (v => fmt.sp(v));
  const draw = W => {
    if (!items.length) { plot.innerHTML = ''; return; }
    const padT = 8, padB = 20, ph = H - padT - padB;
    const vals = items.map(i => i.v), hi = Math.max(0, ...vals), lo = Math.min(0, ...vals), sp = hi - lo || 1;
    const Y = v => padT + (1 - (v - lo) / sp) * ph, bw = W / items.length, gap = Math.min(6, bw * .28);
    let s = `<line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--ink-3)" stroke-width=".8"/>`;
    const every = Math.ceil(items.length / (W < 420 ? 6 : 12));
    items.forEach((it, i) => {
      const x = i * bw + gap / 2, y = Y(Math.max(0, it.v)), h = Math.max(1.5, Math.abs(Y(it.v) - Y(0)));
      const col = it.color || (it.v >= 0 ? 'var(--up-solid)' : 'var(--dn-solid)');
      s += `<rect class="b" x="${x}" y="${y}" width="${bw - gap}" height="${h}" rx="${Math.min(4, (bw - gap) / 3)}" fill="${col}" opacity="${it.dim ? .45 : 1}" style="transform-origin:${x}px ${Y(0)}px;${RM ? '' : `animation:barIn .6s ${i * 18}ms cubic-bezier(.2,.8,.2,1) both`}"/>`;
      if (i % every === 0 || i === items.length - 1) s += `<text x="${x + (bw - gap) / 2}" y="${H - 5}" font-size="10.5" fill="var(--ink-3)" text-anchor="middle">${esc(it.label)}</text>`;
    });
    plot.innerHTML = `<style>@keyframes barIn{from{transform:scaleY(0)}}</style><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Bar chart')}">${s}</svg>`;
    const svg = plot.querySelector('svg'), xs = items.map((_, i) => i * bw + bw / 2);
    scrubber(el, svg, xs, i => {
      svg.querySelectorAll('.b').forEach((b, j) => b.setAttribute('opacity', j === i ? 1 : .35));
      tip.innerHTML = `${esc(items[i].full || items[i].label)} &nbsp;<b>${esc(F(items[i].v))}</b>${items[i].sub ? ' &nbsp;' + esc(items[i].sub) : ''}`;
      tip.style.left = clamp(xs[i], tip.offsetWidth / 2 + 2, W - tip.offsetWidth / 2 - 2) + 'px'; tip.style.top = '-30px';
    }, () => svg.querySelectorAll('.b').forEach((b, j) => b.setAttribute('opacity', items[j].dim ? .45 : 1)));
  };
  return responsive(plot, draw);
}

/* ---------------------------------------------------------------- small pieces (return markup) */
export function spark(values, { w = 120, h = 32, tone, level, fill = true, sw = 1.6 } = {}) {
  const v = (values || []).map(n).filter(isFinite);
  if (v.length < 2) return `<svg width="${w}" height="${h}"></svg>`;
  let lo = Math.min(...v), hi = Math.max(...v);
  if (isFinite(level)) { lo = Math.min(lo, level); hi = Math.max(hi, level); }
  const m = (hi - lo) * .1 || 1; lo -= m; hi += m;
  const X = i => (i / (v.length - 1)) * (w - 4) + 2, Y = x => (1 - (x - lo) / (hi - lo)) * (h - 4) + 2;
  const col = tone || (v[v.length - 1] >= v[0] ? 'var(--up-solid)' : 'var(--dn-solid)');
  const d = v.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(x).toFixed(1)}`).join(' ');
  const id = 's' + Math.random().toString(36).slice(2, 7);
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="${w}" height="${h}" aria-hidden="true">${fill ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".22"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs><path d="${d} L${X(v.length - 1)} ${h} L${X(0)} ${h}Z" fill="url(#${id})"/>` : ''}${isFinite(level) ? `<line x1="0" x2="${w}" y1="${Y(level)}" y2="${Y(level)}" stroke="var(--ink-3)" stroke-dasharray="3 3" stroke-width="1" vector-effect="non-scaling-stroke"/>` : ''}<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
}

/** X-Ray dial: the four pillars as one ring, each segment sized by its weight and filled by its score. */
export function dial(pillars, total, size = 148) {
  const keys = ['trend', 'momentum', 'volume', 'quality'].filter(k => pillars && pillars[k]);
  const r = size / 2 - 10, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r, gapL = 6;
  const maxSum = keys.reduce((a, k) => a + (n(pillars[k].max) || 25), 0) || 100;
  const col = n(total) >= 70 ? 'var(--up-solid)' : n(total) >= 45 ? 'var(--ai-solid)' : 'var(--dn-solid)';
  let off = 0, s = '';
  keys.forEach((k, i) => {
    const p = pillars[k], seg = (n(p.max) || 25) / maxSum * C - gapL, fillL = Math.max(0, Math.min(1, n(p.score) / (n(p.max) || 25))) * seg;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--sunk)" stroke-width="12" stroke-dasharray="${seg} ${C - seg}" stroke-dashoffset="${-off}" stroke-linecap="butt"/>`;
    const pc = (n(p.score) / (n(p.max) || 25)) * 100, pcol = pc >= 70 ? 'var(--up-solid)' : pc >= 45 ? 'var(--ai-solid)' : 'var(--dn-solid)';
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${pcol}" stroke-width="12" stroke-dasharray="${fillL} ${C - fillL}" stroke-dashoffset="${-off}" style="${RM ? '' : `animation:dialIn 1.1s ${200 + i * 120}ms cubic-bezier(.2,.8,.2,1) both`}"/>`;
    off += seg + gapL;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)" aria-hidden="true"><style>@keyframes dialIn{from{stroke-dasharray:0 ${C}}}</style>${s}</svg>`;
}

/** The trade ruler: stop on the left, target on the right, entry marked, a needle for today's price. */
export function ruler({ stop, entry, target, now }, { labels = ['Stop', 'Entry', 'Target'], bare = false, short = false } = {}) {
  if (![stop, entry, target].every(isFinite)) return '';
  const lo = Math.min(stop, isFinite(now) ? now : stop), hi = Math.max(target, isFinite(now) ? now : target), sp = hi - lo || 1;
  const P = v => ((v - lo) / sp) * 100;
  const pe = P(entry), ps = P(stop), pt = P(target), pn = isFinite(now) ? P(now) : NaN;
  const ch = isFinite(now) ? (now / entry - 1) * 100 : NaN;
  return `<div class="ruler${bare ? ' bare' : ''}" role="img" aria-label="${labels[0]} ${fmt.px(stop)}, ${labels[1]} ${fmt.px(entry)}, ${labels[2]} ${fmt.px(target)}${isFinite(now) ? `, now ${fmt.px(now)}` : ''}">
    <div class="rt"><div class="zl" style="left:${ps}%;width:${pe - ps}%"></div><div class="zw" style="left:${pe}%;width:${pt - pe}%"></div><div class="entry" style="left:${pe}%"></div>
    ${isFinite(pn) ? `<div class="needle" style="left:${RM ? pn : pe}%" data-to="${pn}"><b style="--sx:${pn < 16 ? 38 : pn > 84 ? -38 : 0}%">${short || Math.abs(ch) < .05 ? fmt.px(now) : fmt.px(now) + ' ' + fmt.sp(ch)}</b></div>` : ''}</div>
    <div class="lb"><div class="dn">${labels[0]}<b>${fmt.px(stop)}</b></div><div>${labels[1]}<b>${fmt.px(entry)}</b></div><div class="up">${labels[2]}<b>${fmt.px(target)}</b></div></div></div>`;
}
/** Move ruler needles from the entry to today's price once they are on screen. */
export function settle(root) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); requestAnimationFrame(() => { e.target.style.left = e.target.dataset.to + '%'; }); } }), { threshold: .4 });
  root.querySelectorAll('.needle[data-to]').forEach(nd => io.observe(nd));
}
