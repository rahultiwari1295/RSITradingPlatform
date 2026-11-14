/* News briefing helpers: pure functions, no DOM. Used by news.js.
   - stories():  merge repeats of the same story (same company + same kind of event, or near-identical headlines
                 from different outlets) into one row that says how many reports it stands for.
   - headline(): exchange filings often carry a useless title ("General Updates", "Outcome of Board Meeting");
                 use the first line of the summary instead when that happens.
   - dealDigest(): bulk / block deals grouped per stock. A party that buys and sells the same shares on the same
                 day (a round trip) cancels out, so 30 rows of churn become one line with the real net buyers / sellers. */

const GENERIC = /^(general updates?|updates?|outcome of (the )?board meeting|board meeting( outcome| intimation)?|announcement( under regulation.*)?|intimation.*|disclosure.*|clarification.*|press release|newspaper publication.*|others?|shareholders? meeting.*)\.?$/i;
const STOP = new Set('the a an and or of to in on for with from by at as is are was were be been after before over under into its it this that amid says said new will has have had not but his her their than then also more most about update updates news report reports live today'.split(' '));

const nice = t => String(t || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
export function headline(x) {
  const h = String(x.headline || '').trim();
  const lines = String(x.summary || '').split('\n').map(s => s.trim()).filter(Boolean);
  if (h && !GENERIC.test(h)) return h;
  // generic filing title: say what kind of event it is; "Company: General Updates." carries no information either
  const l0 = lines.find(l => !GENERIC.test(l.replace(/^[^:]{2,60}:\s*/, '').replace(/\.$/, '')) && !/has (informed|submitted to) the exchange/i.test(l));
  const kind = nice(x.label || x.type);
  if (l0) return l0;
  return kind && kind.toLowerCase() !== 'filing' ? `${kind}${x.company ? ': ' + x.company : ''}` : (h || lines[0] || kind);
}
export function detail(x) {
  const h = headline(x).toLowerCase();
  return String(x.summary || '').split('\n').map(s => s.trim()).filter(s => s && s.toLowerCase() !== h && s.toLowerCase() !== String(x.headline || '').toLowerCase() && !GENERIC.test(s.replace(/^[^:]{2,60}:\s*/, '').replace(/\.$/, '')))[0] || '';
}
const outlet = h => { const m = String(h).match(/\s[-–|]\s([^-–|]{2,40})$/); return m ? m[1].trim() : ''; };
const words = h => new Set(String(h).replace(/\s[-–|]\s[^-–|]{2,40}$/, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)));
const ts = x => new Date(String(x.ts || '').replace(' ', 'T')).getTime() || 0;

/** One entry per story, biggest impact first. Each: { ...bestItem, n, sources[], title, why }. */
export function stories(items) {
  const out = [];
  const seen = new Set();
  for (const x of [...items].sort((a, b) => (b.impact || 0) - (a.impact || 0) || ts(b) - ts(a))) {
    if (x.id != null) { if (seen.has(x.id)) continue; seen.add(x.id); }
    const w = words(x.headline || x.summary);
    const hit = out.find(s => {
      if (x.symbol || s.symbol) return x.symbol === s.symbol && (x.type === s.type || String(x.headline).toLowerCase() === String(s.headline).toLowerCase());
      let shared = 0; for (const k of w) if (s._w.has(k)) shared++;
      const uni = w.size + s._w.size - shared;
      return shared >= 3 || (shared >= 2 && (x.type === s.type || shared / Math.max(1, uni) >= 0.25)) || (w.size > 0 && shared === w.size && shared === s._w.size);
    });
    const src = outlet(x.headline) || x.source || '';
    if (hit) { hit.n++; if (src && !hit.sources.includes(src)) hit.sources.push(src); for (const k of w) hit._w.add(k); if (!hit.why) hit.why = detail(x); continue; }
    out.push({ ...x, n: 1, sources: src ? [src] : [], _w: w, title: headline(x).replace(/\s[-–|]\s[^-–|]{2,40}$/, ''), why: detail(x) });
  }
  return out;
}

/** Split stories by what they mean for a holder. */
export function byTone(list) {
  return { good: list.filter(x => x.sentiment === 'positive'), bad: list.filter(x => x.sentiment === 'negative'), other: list.filter(x => x.sentiment !== 'positive' && x.sentiment !== 'negative') };
}

/** Deals per stock with round trips removed.
    Returns [{ symbol, deals, days, gross_cr, buy_cr, sell_cr, net_cr, churn (0..1), buyers[], sellers[], last }] sorted by |net|. */
export function dealDigest(deals) {
  const by = new Map();
  for (const d of deals || []) {
    if (!d.symbol) continue;
    const g = by.get(d.symbol) || by.set(d.symbol, { symbol: d.symbol, deals: 0, gross: 0, party: new Map(), dates: new Set(), kinds: new Set() }).get(d.symbol);
    const v = +d.value_cr || (+d.qty * +d.price) / 1e7 || 0, buy = /buy/i.test(d.side);
    g.deals++; g.gross += v; g.dates.add(String(d.deal_date || '').slice(0, 10)); g.kinds.add(d.kind || 'Bulk');
    const p = g.party.get(d.party || 'Unnamed') || g.party.set(d.party || 'Unnamed', { name: d.party || 'Unnamed', buy: 0, sell: 0, px: 0, w: 0 }).get(d.party || 'Unnamed');
    if (buy) p.buy += v; else p.sell += v;
    p.px += (+d.price || 0) * v; p.w += v;
  }
  const out = [];
  for (const g of by.values()) {
    const P = [...g.party.values()].map(p => ({ name: p.name, net: p.buy - p.sell, traded: p.buy + p.sell, price: p.w ? p.px / p.w : 0 }));
    // a real position change: the party kept at least a fifth of what it traded, and at least Rs 0.5 crore
    const real = P.filter(p => Math.abs(p.net) >= 0.5 && Math.abs(p.net) / Math.max(1e-9, p.traded) >= 0.2);
    const buyers = real.filter(p => p.net > 0).sort((a, b) => b.net - a.net), sellers = real.filter(p => p.net < 0).sort((a, b) => a.net - b.net);
    const buy = buyers.reduce((a, p) => a + p.net, 0), sell = -sellers.reduce((a, p) => a + p.net, 0);
    const kept = P.reduce((a, p) => a + Math.abs(p.net), 0);
    out.push({ symbol: g.symbol, deals: g.deals, days: g.dates.size, kinds: [...g.kinds], gross_cr: g.gross, buy_cr: buy, sell_cr: sell, net_cr: buy - sell,
      churn: g.gross ? Math.max(0, 1 - kept / g.gross) : 0, buyers, sellers, last: [...g.dates].sort().pop() || '' });
  }
  return out.sort((a, b) => Math.max(b.buy_cr, b.sell_cr) - Math.max(a.buy_cr, a.sell_cr) || b.gross_cr - a.gross_cr);
}
