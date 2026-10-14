/* Animated hero art, ported from the main app's X-Ray / Home screens. */
const F = '-apple-system,Inter,sans-serif';
function bl(a, b, c) {
  return `<div class="q-bl" style="--c1:${a}"></div><div class="q-bl" style="--c2:${b}"></div><div class="q-bl" style="--c3:${c}"></div><div class="q-dots"></div>`;
}
function miniRing(score) {
  const r = 14.25, c = 2 * Math.PI * r;
  return `<svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="${r}" fill="none" stroke="var(--track)" stroke-width="3.5"/><circle cx="16" cy="16" r="${r}" fill="none" stroke="var(--up)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - score / 100)}" transform="rotate(-90 16 16)"/><text x="16" y="17" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="var(--fg)" font-family="${F}">${score}</text></svg>`;
}
export const ART = {
  home: (o = {}) => {
    const pts= [];
    for (let x = 0; x <= 340; x += 10) { const y = 150 - x * 0.22 + Math.sin(x / 17) * 12 + (x > 230 ? -(x - 230) * 0.35 : 0); pts.push(x + "," + y.toFixed(1)); }
    return bl("var(--ax)", "var(--ai)", "var(--pt)") +
      `<svg class="q-bg" viewBox="0 0 340 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><polyline class="q-drawloop" pathLength="1" points="${pts.join(" ")}" fill="none" stroke="var(--fg)" stroke-opacity=".35" stroke-width="2" stroke-linejoin="round"/></svg>` +
      `<div class="q-chipf" style="left:6%;top:12%;animation-delay:-1s">${miniRing(o.xs ?? 76)}<div>Stock X-Ray<small>${o.xt || "Health score in seconds"}</small></div></div>` +
      `<div class="q-chipf" style="right:5%;top:40%;animation-delay:-3s"><span class="q-dot" style="background:var(--up);width:9px;height:9px"></span><div>AI Call · Buy<small>${o.ai || "Today's top call"}</small></div></div>` +
      `<div class="q-chipf" style="left:12%;bottom:10%;animation-delay:-4.6s"><svg width="44" height="24" viewBox="0 0 44 24"><path d="M2 20L9 15 15 18 22 11 28 14 34 10 42 2" fill="none" stroke="var(--pt)" stroke-width="2" stroke-linecap="round"/><path d="M2 9H42" stroke="var(--pt)" stroke-dasharray="2 3"/></svg><div>Pattern Call<small>${o.pt || "Breakouts ranked by odds"}</small></div></div>`;
  },
  xray: () => {
    let o = "", at = 0, arcs = "";
    for (let i = 0; i < 60; i++) { const a = (i * 6 * Math.PI) / 180, l = i % 5 ? 3 : 6; o += `<line x1="${(100 + Math.cos(a) * (96 - l)).toFixed(1)}" y1="${(100 + Math.sin(a) * (96 - l)).toFixed(1)}" x2="${(100 + Math.cos(a) * 96).toFixed(1)}" y2="${(100 + Math.sin(a) * 96).toFixed(1)}" stroke="var(--fg)" stroke-opacity="${i % 5 ? 0.25 : 0.6}" stroke-width="1"/>`; }
    const W = [30, 25, 25, 20], v = [80, 72, 64, 85], C = ["var(--p1)", "var(--p2)", "var(--p5)", "var(--p3)"];
    W.forEach((w, i) => { const L = w - 2, f = (L * v[i]) / 100; arcs += `<circle cx="100" cy="100" r="78" pathLength="100" fill="none" stroke="var(--track)" stroke-width="9" stroke-dasharray="${L} ${100 - L}" stroke-dashoffset="${-at + 25}"/><circle class="q-arcin" style="--l:${f.toFixed(1)};--i:${i}" cx="100" cy="100" r="78" pathLength="100" fill="none" stroke="${C[i]}" stroke-width="9" stroke-linecap="round" stroke-dashoffset="${-at + 25}"/>`; at += w; });
    return bl("var(--ax)", "var(--p2)", "var(--p4)") + `<svg viewBox="0 0 200 200" style="position:absolute;left:50%;top:50%;height:88%;transform:translate(-50%,-50%)" aria-hidden="true"><g class="q-spin">${o}</g>${arcs}<text x="100" y="104" text-anchor="middle" font-family="${F}" font-size="38" font-weight="750" fill="var(--fg)">X-Ray</text><text x="100" y="126" text-anchor="middle" font-family="${F}" font-size="10.5" font-weight="600" fill="var(--dim)">HEALTH SCORE</text></svg><div class="q-scan"></div>`;
  },
  calls: () => {
    const pts= [];
    for (let x = 0; x <= 320; x += 8) { const y = x < 170 ? 118 + Math.sin(x / 11) * 9 + Math.cos(x / 5) * 3 : 118 - (x - 170) * 0.42 + Math.sin(x / 9) * 5; pts.push(x + "," + y.toFixed(1)); }
    const ex = 170, ey = 118;
    return bl("var(--ai)", "var(--p2)", "var(--ai)") + `<svg class="q-bg" viewBox="0 0 340 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">` +
      `<line x1="0" x2="340" y1="48" y2="48" stroke="var(--up)" stroke-dasharray="4 5" stroke-opacity=".8"/><text x="330" y="40" text-anchor="end" font-size="10" font-weight="600" fill="var(--up)" font-family="${F}">TAKE PROFIT</text>` +
      `<line x1="0" x2="340" y1="160" y2="160" stroke="var(--dn)" stroke-dasharray="4 5" stroke-opacity=".8"/><text x="330" y="176" text-anchor="end" font-size="10" font-weight="600" fill="var(--dn)" font-family="${F}">STOP LOSS</text>` +
      `<polyline class="q-drawloop" pathLength="1" points="${pts.join(" ")}" fill="none" stroke="var(--ai)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<g class="q-popin" style="transform-origin:${ex}px ${ey}px"><circle cx="${ex}" cy="${ey}" r="5" fill="var(--ai)"/><rect x="${ex - 24}" y="${ey - 34}" width="48" height="22" rx="11" fill="var(--ai)"/><text x="${ex}" y="${ey - 19}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--bg)" font-family="${F}">BUY</text></g>` +
      `<path class="q-twk" d="M60 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="var(--ai)"/><path class="q-twk" style="animation-delay:-1.4s" d="M285 92l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="var(--fg)" opacity=".7"/></svg>`;
  },
  patterns: () => {
    let b = "", x = 18;
    const tops = [136, 120, 128, 104, 96, 110, 92, 86, 100, 90, 84, 88, 82, 80, 58, 40];
    for (let i = 0; i < 16; i++) { const up = i >= 14; b += `<rect class="q-pbar2${up ? " q-glowb" : ""}" style="--i:${i}" x="${x}" y="${tops[i]}" width="12" height="${170 - tops[i]}" rx="3" fill="${up ? "var(--pt)" : "var(--fg)"}" fill-opacity="${up ? 1 : 0.22}"/>`; x += 19.5; }
    return bl("var(--pt)", "var(--p4)", "var(--pt)") + `<svg class="q-bg" viewBox="0 0 340 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${b}<line class="q-dash" x1="0" x2="340" y1="78" y2="78" stroke="var(--pt)" stroke-width="2"/><text x="12" y="70" font-size="10.5" font-weight="700" fill="var(--pt)" font-family="${F}">CEILING</text></svg>`;
  },
  portfolio: (o = {}) => {
    const seg = o.seg && o.seg.length ? o.seg : [[30, "var(--p1)"], [25, "var(--p2)"], [20, "var(--p5)"], [15, "var(--p3)"], [10, "var(--p4)"]];
    let at = 0, c = "";
    seg.forEach((s) => { c += `<circle cx="100" cy="100" r="62" pathLength="100" fill="none" stroke="${s[1]}" stroke-width="18" stroke-dasharray="${Math.max(0, s[0] - 1.5)} ${101.5 - s[0]}" stroke-dashoffset="${-at}"/>`; at += s[0]; });
    return bl("var(--pf)", "var(--p1)", "var(--p5)") + `<svg viewBox="0 0 200 200" style="position:absolute;left:50%;top:50%;height:86%;transform:translate(-50%,-50%)" aria-hidden="true"><g class="q-spin" style="animation-duration:60s">${c}</g><text x="100" y="98" text-anchor="middle" font-family="${F}" font-size="${o.value ? 22 : 15}" font-weight="750" fill="var(--fg)">${o.value || "Your stocks"}</text><text x="100" y="118" text-anchor="middle" font-family="${F}" font-size="10.5" font-weight="600" fill="var(--dim)">${o.sub || "CHECKED DAILY"}</text></svg>`;
  },
};

const E = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const words = (text, hl = []) => text.split(' ').map((w, i) => `<span class="q-w${hl.includes(w.replace(/[.,?]/g, '')) ? ' q-g' : ''}" style="--i:${i}">${E(w)}</span>`).join(' ');
/** The hero block: moving art card, eyebrow, word-by-word headline, lede, and an optional slot (search). */
export function heroHTML({ art, artOpts, ey, h, hl = [], lede, extra = '', icon = '' }) {
  const n = h.split(' ').length;
  return `<div class="q-hero q-play"><div class="q-hcopy"><p class="q-ey">${icon}${E(ey)}</p><h1 class="q-ht">${words(h, hl)}</h1><p class="q-lede" style="--i:${n}">${E(lede)}</p>${extra}</div></div>`;
}
