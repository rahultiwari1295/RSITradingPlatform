import React, { useEffect, useMemo, useState } from "react";
import { q, px, sgn, num, cr, clamp, RM } from "./core";
import { useLoad, loadReport, loadTerminal, loadCandles, loadNews, loadPatterns, searchPattern, actionInfo, scoreTone, type PatternRow } from "./data";
import { Icon, Ring, Rail, Pill, Sh, Words, Skeleton, ErrorBox, PriceChart, Spark, type Level } from "./ui";
import { STG, tfName, gapTxt, type Go } from "./tabs";

export function PageBar({ back, title, onBack, onShare }: { back: string; title: string; onBack: () => void; onShare: () => void }) {
  return (
    <div className={q("pbar")}>
      <button className={q("bk")} onClick={onBack} aria-label={"Back to " + back}><Icon n="back" s={22} w={2.4} />{back}</button>
      <span className={q("tt")}>{title}</span>
      <button className={q("sb")} onClick={onShare} aria-label="Share this page"><Icon n="share" s={18} w={2.2} /></button>
    </div>
  );
}
const Why = ({ items, color = "var(--up)", icon = "check" }: { items: string[]; color?: string; icon?: string }) => (
  <ul className={q("why")}>{items.map((w, i) => <li key={i}><Icon n={icon} s={18} w={icon === "warn" ? 2.2 : 2.6} c={color} /><span>{w}</span></li>)}</ul>
);
const pctNum = (s: any) => num(String(s || "").replace("%", ""));
const rowOf = (tbl: any, names: string[]) => (tbl?.rows || []).find((r: any) => names.some((n) => String(r.metric || "").toLowerCase() === n.toLowerCase()));

/* ======================= STOCK X-RAY REPORT ======================= */
const PILLARS: [string, string, string][] = [
  ["trend", "Trend", "Is the price in an uptrend or a downtrend"],
  ["momentum", "Momentum", "Are buyers pushing the price right now"],
  ["volume", "Buying activity", "Are big buyers collecting shares"],
  ["quality", "Business quality", "How good the company itself is"],
];
const PC = ["var(--p1)", "var(--p2)", "var(--p5)", "var(--p3)"];
function Dial({ pillars, total }: { pillars: any; total: number }) {
  let at = 0, o = "";
  for (let i = 0; i < 100; i++) { const a = ((i * 3.6 - 90) * Math.PI) / 180, l = i % 10 ? 3 : 6; o += `<line x1="${(100 + Math.cos(a) * (97 - l)).toFixed(2)}" y1="${(100 + Math.sin(a) * (97 - l)).toFixed(2)}" x2="${(100 + Math.cos(a) * 97).toFixed(2)}" y2="${(100 + Math.sin(a) * 97).toFixed(2)}" stroke="var(--dim)" stroke-width="${i % 10 ? 0.5 : 0.9}" opacity="${i % 10 ? 0.45 : 0.85}"/>`; }
  const maxTot = PILLARS.reduce((a, [k]) => a + (num(pillars?.[k]?.max) || 0), 0) || 100;
  PILLARS.forEach(([k], i) => {
    const mx = num(pillars?.[k]?.max) || 25, sc = clamp(num(pillars?.[k]?.score) || 0, 0, mx), L = (mx / maxTot) * 100 - 1.6, v = (L * sc) / mx;
    o += `<circle cx="100" cy="100" r="80" pathLength="100" fill="none" stroke="var(--track)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${L.toFixed(2)} ${(100 - L).toFixed(2)}" stroke-dashoffset="${(-at + 25).toFixed(2)}"/>`;
    o += `<circle class="q-arc" data-l="${v.toFixed(2)}" cx="100" cy="100" r="80" pathLength="100" fill="none" stroke="${PC[i]}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${RM ? v.toFixed(2) : "0"} 100" stroke-dashoffset="${(-at + 25).toFixed(2)}" style="transition:stroke-dasharray 1.2s cubic-bezier(.2,.9,.2,1) ${i * 90}ms"/>`;
    at += (mx / maxTot) * 100;
  });
  return (
    <div className={q("dial")}>
      <div dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 200 200" role="img" aria-label="Health score made of four checks">${o}</svg>` }} />
      <div className={q("c")}><b className={q("num")} data-count={total} data-fmt="int">{RM ? Math.round(total) : 0}</b><span>Health score out of 100</span></div>
    </div>
  );
}
function Bars({ labels, series, cols, fmt }: { labels: string[]; series: number[][]; cols: string[]; fmt: (v: number) => string }) {
  const W = 340, h = 200, pb = 24, pt = 22, n = labels.length, k = series.length;
  const max = Math.max(1, ...series.flat().filter((v) => isFinite(v))) * 1.15, gw = W / n, bw = Math.min(22, gw / (k + 1));
  return (
    <svg className={q("svgc")} viewBox={`0 0 ${W} ${h}`} role="img">
      {[0, 1, 2, 3].map((i) => <line key={i} x1="0" x2={W} y1={pt + ((h - pt - pb) * i) / 3} y2={pt + ((h - pt - pb) * i) / 3} stroke="var(--line)" />)}
      {labels.map((l, i) => {
        const cx = gw * (i + 0.5);
        return (
          <g key={i}>
            {series.map((s, j) => {
              const v = Math.max(0, isFinite(s[i]) ? s[i] : 0), bh = (v / max) * (h - pt - pb), x = cx - (bw * k + (k - 1) * 4) / 2 + j * (bw + 4);
              return (
                <g key={j}>
                  <rect className={q("b")} x={x} y={h - pb - bh} width={bw} height={bh} rx={4} fill={cols[j]} style={{ transitionDelay: i * 70 + "ms" }} />
                  {i === n - 1 ? <text className={q("v")} x={x + bw / 2} y={h - pb - bh - 6} textAnchor="middle">{fmt(s[i])}</text> : null}
                </g>
              );
            })}
            <text x={cx} y={h - 6} textAnchor="middle">{l}</text>
          </g>
        );
      })}
    </svg>
  );
}
export function XRayReport({ sym, go, onBack, onShare }: { sym: string; go: Go; onBack: () => void; onShare: () => void }) {
  const r = useLoad<any>("dna:" + sym, () => loadReport(sym));
  const t = useLoad("terminal", loadTerminal);
  const d = r.data;
  const bar = <PageBar back="X-Ray" title={sym} onBack={onBack} onShare={onShare} />;
  if (r.loading) return <div className={q("inner")} style={{ ["--acc" as any]: "var(--ax)" }}>{bar}<Skeleton /></div>;
  if (r.error || !d || d.error) return <div className={q("inner")} style={{ ["--acc" as any]: "var(--ax)" }}>{bar}<ErrorBox text={d?.error || r.error || `No X-Ray for ${sym} yet.`} onRetry={r.reload} /></div>;
  const u = d.ui_report || {}, m = d.current_metrics || {}, f = d.fundamentals || {}, kr = f.key_ratios || {}, tc = u.trade_execution_card || {};
  const score = num(u.dna_health_score ?? u.score_breakdown?.total), tone = scoreTone(score);
  const pillars = u.score_breakdown?.pillars || {};
  const bs = u.beginner_summary || {};
  const live = (t.data?.active || []).find((c) => c.sym === sym);
  const inc = f.annual_income_statement;
  const yrs: string[] = (inc?.years || []).filter((y: string) => y !== "TTM").slice(-5);
  const idx = yrs.map((y) => (inc?.years || []).indexOf(y));
  const sales = rowOf(inc, ["Sales", "Revenue"]), np = rowOf(inc, ["Net Profit", "Net profit"]);
  const sv = idx.map((i) => num(sales?.values?.[i])), nv = idx.map((i) => num(np?.values?.[i]));
  const sh = f.shareholding_pattern || {};
  const own = [["Promoters", "Promoters (owners)", "var(--p1)"], ["FIIs", "Foreign funds", "var(--p2)"], ["DIIs", "Indian funds", "var(--p5)"], ["Government", "Government", "var(--p4)"], ["Public", "Public", "var(--p6)"]]
    .map(([k, label, c]) => ({ label, c, v: num(sh[k]?.holding_pct), qoq: num(sh[k]?.qoq_change) })).filter((o) => isFinite(o.v) && o.v > 0);
  const qp = (f.quarterly_performance || []).slice(-4);
  const cg = f.compounded_growth || {};
  const candles = (d.chart_candles || []).map((c: any) => ({ t: String(c.time), o: num(c.open), h: num(c.high), l: num(c.low), c: num(c.close) })).filter((c: any) => isFinite(c.c));
  const levels: Level[] = [
    { y: num(m.ema200), label: "Long-term average", color: "--p1", dash: [4, 4] },
    { y: num(tc.stop_loss), label: "Stop loss", color: "--dn", dash: [2, 3] },
    { y: num(m.w52_high), label: "1-year high", color: "--warn", dash: [4, 4] },
  ];
  const checklist = d.catalysts?.checklist || [], news = d.catalysts?.news || [];
  const solv = d.solvency || {};
  return (
    <div className={q("inner")} style={{ ["--acc" as any]: "var(--ax)" }}>
      {bar}
      <div className={q("dhead q-play")}>
        <p className={q("ey")}><Icon n="xray" s={16} w={2.2} />Stock X-Ray report{d.sector && d.sector !== "NSE Equities" ? " · " + d.sector : ""}</p>
        <h1><Words text={d.company_name && d.company_name !== sym ? d.company_name : sym} /></h1>
        <p className={q("note")} style={{ padding: 0 }}>NSE: {sym} · report from {d.report_date}{d.is_fresh === false ? " · refreshing soon" : ""}</p>
      </div>
      <div className={q("card pad jl en")}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}><span className={q("price num")}>{px(m.price)}</span>{isFinite(num(m.dist_52w_pct)) ? <b className={q("num dim")} style={{ fontSize: 15 }}>{sgn(m.dist_52w_pct)} from 1-year high</b> : null}</div>
        <Rail lo={num(m.w52_low)} hi={num(m.w52_high)} now={num(m.price)} ll={"1-year low " + px(m.w52_low)} rl={"High " + px(m.w52_high)} />
        <Dial pillars={pillars} total={score} />
        <p style={{ textAlign: "center", margin: "6px 0 10px" }}><Pill k={tone.k}>{tone.t}</Pill></p>
        <p className={q("quote")} style={{ textAlign: "center", margin: "0 auto 16px", maxWidth: "32ch" }}><b>{u.action_title || d.action_title}</b></p>
        <ul className={q("leg")}>{PILLARS.map(([k, name, desc], i) => (
          <li key={k}><i style={{ background: PC[i] }} /><span>{name}<small>{pillars[k]?.summary ? desc : desc}</small></span><b className={q("num")}>{isFinite(num(pillars[k]?.score)) ? Math.round(num(pillars[k].score)) : "—"}<span> /{pillars[k]?.max ?? "—"}</span></b></li>
        ))}</ul>
      </div>
      {bs.what_is_happening ? (
        <section className={q("sec en")}>
          <Sh t="In plain words" />
          <div className={q("card pad q-sum")}>
            <div><b>What is happening</b><p>{bs.what_is_happening}</p></div>
            {bs.the_opportunity ? <div><b>The opportunity</b><p>{bs.the_opportunity}</p></div> : null}
            {bs.the_danger ? <div><b>The danger</b><p>{bs.the_danger}</p></div> : null}
          </div>
        </section>
      ) : null}
      <div className={q("g2")}>
        {(u.why_buy_reasons || []).length ? <section className={q("sec en")}><Sh t="Good signs" /><div className={q("card pad")}><Why items={u.why_buy_reasons} /></div></section> : null}
        {(u.why_avoid_reasons || []).length ? <section className={q("sec en")}><Sh t="Warning signs" /><div className={q("card pad")}><Why items={u.why_avoid_reasons} color="var(--warn)" icon="warn" /></div></section> : null}
      </div>
      {candles.length > 10 ? (
        <section className={q("sec en")}>
          <Sh t="Price, last year" small="Drag to read prices" />
          <div className={q("card jl")} style={{ padding: 12 }}><PriceChart candles={candles} levels={levels} accent="--ax" /></div>
        </section>
      ) : null}
      {tc.entry_zone ? (
        <section className={q("sec en")}>
          <Sh t="If you want to trade it" small="From the X-Ray model" />
          <div className={q("list kv")}>
            <span>Where to buy</span><b>{String(tc.entry_zone)}</b>
            {isFinite(num(tc.stop_loss)) ? <><span>Exit if it falls to<small>Stop loss</small></span><b className={q("num dn")}>{px(tc.stop_loss)}</b></> : null}
            {isFinite(num(tc.target_1)) ? <><span>First target</span><b className={q("num up")}>{px(tc.target_1)}</b></> : null}
            {isFinite(num(tc.target_2)) ? <><span>Second target</span><b className={q("num up")}>{px(tc.target_2)}</b></> : null}
          </div>
          {live ? <button className={q("btn w acc")} style={{ ["--acc" as any]: "var(--ai)" }} onClick={() => go(`/calls/${sym}`)}><Icon n="ai" s={17} w={2.2} /> The AI has a live call on {sym}</button> : null}
        </section>
      ) : null}
      <div className={q("g2")}>
        <section className={q("sec en")}>
          <Sh t="Key facts" />
          <div className={q("list kv")}>
            <span>Company size<small>Value of all its shares</small></span><b className={q("num")}>{cr(f.market_cap_cr)}</b>
            <span>Price to earnings<small>Years of profit you pay for</small></span><b className={q("num")}>{isFinite(num(kr.stock_pe)) ? num(kr.stock_pe).toFixed(1) : "—"}</b>
            <span>Return on capital<small>Profit on money put in</small></span><b className={q("num")}>{isFinite(num(kr.roce_pct)) ? num(kr.roce_pct).toFixed(1) + "%" : "—"}</b>
            <span>Return on equity</span><b className={q("num")}>{isFinite(num(kr.roe_pct)) ? num(kr.roe_pct).toFixed(1) + "%" : "—"}</b>
            <span>Debt safety<small>{solv.grade || "Borrowings vs reserves"}</small></span><b className={q("num")}>{isFinite(num(solv.score)) ? Math.round(num(solv.score)) + "/100" : "—"}</b>
            <span>Dividend yield<small>Cash paid out each year</small></span><b className={q("num")}>{isFinite(num(kr.dividend_yield_pct)) ? num(kr.dividend_yield_pct).toFixed(2) + "%" : "—"}</b>
          </div>
        </section>
        {own.length ? (
          <section className={q("sec en")}>
            <Sh t="Who owns it" small={sh.Promoters?.quarter} />
            <div className={q("card pad")}>
              <div className={q("own")}>{own.map((o, i) => <i key={o.label} style={{ width: o.v.toFixed(1) + "%", background: o.c, transitionDelay: i * 80 + "ms" }} />)}</div>
              <div className={q("lg2")}>{own.map((o) => <span key={o.label}><i style={{ background: o.c }} />{o.label}<b className={q("num")}>{o.v.toFixed(1)}%{isFinite(o.qoq) && o.qoq !== 0 ? <small className={q(o.qoq > 0 ? "up" : "dn")} style={{ marginLeft: 6, fontWeight: 500 }}>{o.qoq > 0 ? "▲" : "▼"}{Math.abs(o.qoq).toFixed(2)}</small> : null}</b></span>)}</div>
            </div>
          </section>
        ) : null}
      </div>
      {yrs.length >= 3 && sales ? (
        <section className={q("sec en")}>
          <Sh t="Sales and profit" small="₹ crore, by financial year" />
          <div className={q("card pad")}>
            <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 13, color: "var(--mu)" }}><span><span className={q("dot")} style={{ background: "var(--p2)", marginRight: 6 }} />Sales</span><span><span className={q("dot")} style={{ background: "var(--up)", marginRight: 6 }} />Net profit</span></div>
            <Bars labels={yrs.map((y) => y.replace("Mar ", "FY").replace(/^FY20/, "FY"))} series={[sv, nv]} cols={["var(--p2)", "var(--up)"]} fmt={(v) => (isFinite(v) ? Math.round(v).toLocaleString("en-IN") : "")} />
          </div>
        </section>
      ) : null}
      <div className={q("g2")}>
        {(cg.sales_growth || []).length ? (
          <section className={q("sec en")}>
            <Sh t="How fast it grew" small="Per year, on average" />
            <div className={q("card pad")}><div className={q("tw")}><table className={q("tbl")}><thead><tr><th>Period</th><th>Sales</th><th>Profit</th><th>Share price</th></tr></thead><tbody>
              {(cg.sales_growth || []).map((s: any, i: number) => (
                <tr key={i}><td>{s.period}</td><td className={q(pctNum(s.value) >= 0 ? "up" : "dn")}>{s.value}</td><td>{cg.profit_growth?.[i]?.value ?? "—"}</td><td>{cg.price_cagr?.[i]?.value ?? "—"}</td></tr>
              ))}
            </tbody></table></div></div>
          </section>
        ) : null}
        {qp.length ? (
          <section className={q("sec en")}>
            <Sh t="Last four quarters" small="₹ crore" />
            <div className={q("card pad")}><div className={q("tw")}><table className={q("tbl")}><thead><tr><th>Quarter</th><th>Sales</th><th>Profit</th><th>Margin</th></tr></thead><tbody>
              {qp.map((x: any) => <tr key={x.quarter}><td>{x.quarter}</td><td>{x.sales_cr}</td><td>{x.net_profit_cr}</td><td>{x.opm_pct}</td></tr>)}
            </tbody></table></div></div>
          </section>
        ) : null}
      </div>
      {(f.pros || []).length || (f.cons || []).length ? (
        <div className={q("g2")}>
          {(f.pros || []).length ? <section className={q("sec en")}><Sh t="Strengths" /><div className={q("card pad")}><Why items={f.pros.map((s: string) => s.replace(/&#x27;/g, "'"))} /></div></section> : null}
          {(f.cons || []).length ? <section className={q("sec en")}><Sh t="Weak spots" /><div className={q("card pad")}><Why items={f.cons.map((s: string) => s.replace(/&#x27;/g, "'"))} color="var(--warn)" icon="warn" /></div></section> : null}
        </div>
      ) : null}
      {checklist.length ? (
        <section className={q("sec en")}>
          <Sh t="Red-flag check" />
          <div className={q("list jl")}>{checklist.map((c: any, i: number) => (
            <div key={i} className={q("row ind")}><span className={q("ico sm")} style={{ ["--c" as any]: c.pass ? "var(--up)" : "var(--dn)" }}><Icon n={c.pass ? "check" : "warn"} s={17} w={2.4} /></span><div className={q("grow")}><div className={q("t1")}>{c.item}</div><div className={q("t2")}>{c.status}</div></div></div>
          ))}</div>
        </section>
      ) : null}
      {news.length ? (
        <section className={q("sec en")}>
          <Sh t="In the news" />
          <div className={q("list jl")}>{news.slice(0, 5).map((n: any, i: number) => (
            <div key={i} className={q("row ind")}><span className={q("ico sm")}><Icon n="news" s={17} /></span><div className={q("grow")}><div className={q("t1")} style={{ fontWeight: 600, fontSize: 15 }}>{n.title}</div><div className={q("t2")}>{n.source} · {String(n.time || "").slice(0, 16)}</div></div></div>
          ))}</div>
        </section>
      ) : null}
      <p className={q("note")}>X-Ray never changes a trade call. It tells you how much to trust the company behind the chart. Not investment advice.</p>
    </div>
  );
}

/* ======================= AI CALL ======================= */
function MiniXray({ sym, go }: { sym: string; go: Go }) {
  const r = useLoad<any>("dna:" + sym, () => loadReport(sym));
  const s = num(r.data?.ui_report?.dna_health_score);
  if (r.loading) return <div className={q("sk")} style={{ height: 76, borderRadius: 22 }} />;
  if (!isFinite(s)) return null;
  const t = scoreTone(s);
  return (
    <button className={q("card pad press en")} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left" }} onClick={() => go(`/xray/${sym}`)}>
      <Ring score={s} size={52} w={5} />
      <div className={q("grow")}><div className={q("t1")}>Company health <Pill k={t.k}>{t.t}</Pill></div><div className={q("t2")}>{r.data?.ui_report?.action_title || "Open the full X-Ray report"}</div></div>
      <Icon n="chev" s={17} w={2.4} className="q-chev" />
    </button>
  );
}
function NewsList({ sym }: { sym: string }) {
  const n = useLoad<any>("news:" + sym, () => loadNews(sym));
  const items = (n.data?.news || []).slice(0, 4);
  if (!items.length) return null;
  return (
    <section className={q("sec en")}>
      <Sh t="Latest news" />
      <div className={q("list jl")}>{items.map((x: any, i: number) => (
        <div key={i} className={q("row ind")}><span className={q("ico sm")}><Icon n="news" s={17} /></span><div className={q("grow")}><div className={q("t1")} style={{ fontWeight: 600, fontSize: 15 }}>{x.title || x.headline}</div><div className={q("t2")}>{x.source || ""}{x.time || x.published_at ? " · " + String(x.time || x.published_at).slice(0, 16) : ""}</div></div></div>
      ))}</div>
    </section>
  );
}
export function CallPage({ sym, go, onBack, onShare }: { sym: string; go: Go; onBack: () => void; onShare: () => void }) {
  const t = useLoad("terminal", loadTerminal);
  const ch = useLoad<any[]>(`candles:${sym}:120`, () => loadCandles(sym, 120));
  const bar = <PageBar back="AI Calls" title={sym} onBack={onBack} onShare={onShare} />;
  const c = t.data ? t.data.active.find((x) => x.sym === sym) || t.data.toBuy.find((x) => x.sym === sym) : undefined;
  const levels = useMemo<Level[]>(() => (c ? [
    { y: c.target, label: "Take profit", color: "--up", dash: [2, 3] },
    { y: c.entry, label: "Bought", color: "--ai", dash: [4, 4] },
    { y: c.stop, label: "Stop loss", color: "--dn", dash: [2, 3] },
  ] : []), [c]);
  if (t.loading) return <div className={q("inner")} style={{ ["--acc" as any]: "var(--ai)" }}>{bar}<Skeleton /></div>;
  if (t.error) return <div className={q("inner")} style={{ ["--acc" as any]: "var(--ai)" }}>{bar}<ErrorBox text={t.error} onRetry={t.reload} /></div>;
  if (!c) return (
    <div className={q("inner")} style={{ ["--acc" as any]: "var(--ai)" }}>{bar}
      <div className={q("card pad err")}><h3>No open AI call on {sym}</h3><p className={q("mu")} style={{ margin: 0 }}>It may have closed. Check the closed trades, or X-Ray the company.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className={q("btn sm soft")} onClick={() => go("/calls")}>All AI calls</button><button className={q("btn sm soft")} onClick={() => go(`/xray/${sym}`)}>X-Ray {sym}</button></div></div>
    </div>
  );
  const a = actionInfo(c.action), risk = c.entry - c.stop, st = t.data!.stats;
  const chg = c.entry > 0 ? (c.now / c.entry - 1) * 100 : NaN;
  const bullets = String(c.why || "").split(/(?<=[.!?;])\s+|,(?=\s?[A-Z])/).map((s) => s.trim()).filter((s) => s.length > 3).map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  return (
    <div className={q("inner")} style={{ ["--acc" as any]: "var(--ai)" }}>
      {bar}
      <div className={q("dhead q-play")}>
        <p className={q("ey")}><Icon n="ai" s={16} w={2.2} />AI Call · {c.strategy}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><h1><Words text={c.sym} /></h1><Pill k={a.k}>{a.t}</Pill></div>
        <p className={q("lede")} style={{ marginTop: 4 }}>{c.name}</p>
      </div>
      <div className={q("card jl en")} style={{ padding: 12 }}>
        {ch.data && ch.data.length > 5 ? <PriceChart candles={ch.data} levels={levels} accent="--ai" /> : c.spark.length > 5 ? <PriceChart closes={c.spark} levels={levels} accent="--ai" /> : <div className={q("sk")} style={{ height: 240, borderRadius: 16 }} />}
        <p className={q("note")} style={{ padding: "8px 6px 2px" }}>Drag across the chart to read prices.</p>
      </div>
      <div className={q("g2")}>
        <div className={q("list kv en")}>
          <span>Bought at</span><b className={q("num")}>{px(c.entry)}</b>
          <span>Exit if it falls to<small>Stop loss, decided in advance</small></span><b className={q("num dn")}>{px(c.stop)}</b>
          <span>Take profit at</span><b className={q("num up")}>{px(c.target)}</b>
          <span>Price now</span><b className={q("num")}>{px(c.now)}{isFinite(chg) ? <small className={q(chg >= 0 ? "up" : "dn")} style={{ marginLeft: 6 }}>{sgn(chg)}</small> : null}</b>
          {risk > 0 ? <><span>Risk per share</span><b className={q("num")}>{px(risk)} ({((risk / c.entry) * 100).toFixed(1)}%)</b></> : null}
          <span>Days in the trade</span><b className={q("num")}>{c.days}</b>
        </div>
        <section className={q("sec en")}>
          <Sh t="Why the AI called it" />
          <div className={q("card pad")}>{bullets.length ? <Why items={bullets} /> : <p className={q("mu")} style={{ margin: 0 }}>The setup passed the {c.strategy} rules.</p>}</div>
        </section>
      </div>
      {c.fib.length ? (
        <section className={q("sec en")}>
          <Sh t="Next price levels" small="Where sellers may show up" />
          <div className={q("list kv")}>{c.fib.map(([k, v]) => <React.Fragment key={k}><span>Level {k}</span><b className={q("num")}>{px(v)}</b></React.Fragment>)}</div>
        </section>
      ) : null}
      <section className={q("sec en")}>
        <Sh t="How reliable is the AI?" />
        <div className={q("card pad")}>
          <div style={{ display: "grid", gap: 14 }}>
            <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 7 }}><span className={q("mu")}>Closed trades that made money</span><b className={q("num")}>{st.winRate.toFixed(0)}%</b></div><div className={q("bar")} style={{ ["--w" as any]: st.winRate + "%", ["--c" as any]: "var(--up)" }}><i /></div></div>
            <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 7 }}><span className={q("mu")}>Conviction for this call</span><b className={q("num")}>{Math.round(c.conviction)}/100</b></div><div className={q("bar")} style={{ ["--w" as any]: clamp(c.conviction, 0, 100) + "%", ["--c" as any]: "var(--ai)" }}><i /></div></div>
          </div>
          <p className={q("mu")} style={{ margin: "16px 0 0", fontSize: 15, lineHeight: 1.45 }}>Across {st.closedN.toLocaleString("en-IN")} closed trades the average result was <b style={{ color: "var(--fg)" }}>{sgn(st.avgPct)} per trade</b>. Winners averaged {sgn(st.avgWinPct)}, losers {sgn(st.avgLossPct)}.</p>
        </div>
      </section>
      <MiniXray sym={sym} go={go} />
      <NewsList sym={sym} />
      <p className={q("note")}>Not investment advice. Decide your own position size.</p>
    </div>
  );
}
export function ClosedPage({ id, go, onBack, onShare }: { id: string; go: Go; onBack: () => void; onShare: () => void }) {
  const t = useLoad("terminal", loadTerminal);
  const c = t.data?.closed.find((x) => x.id === id);
  const bar = <PageBar back="AI Calls" title={c?.sym || "Closed trade"} onBack={onBack} onShare={onShare} />;
  if (t.loading) return <div className={q("inner")} style={{ ["--acc" as any]: "var(--ai)" }}>{bar}<Skeleton /></div>;
  if (!c) return <div className={q("inner")} style={{ ["--acc" as any]: "var(--ai)" }}>{bar}<ErrorBox text="This trade is not in the record we loaded." onRetry={() => go("/calls")} /></div>;
  return (
    <div className={q("inner")} style={{ ["--acc" as any]: "var(--ai)" }}>
      {bar}
      <div className={q("dhead q-play")}>
        <p className={q("ey")}><Icon n="ai" s={16} w={2.2} />Closed AI call{c.strategy ? " · " + c.strategy : ""}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><h1><Words text={c.sym} /></h1><Pill k={c.isWin ? "buy" : "sell"}>{c.isWin ? "Profit " : "Loss "}{sgn(c.roiPct)}</Pill></div>
        <p className={q("lede")} style={{ marginTop: 4 }}>{c.name}</p>
      </div>
      {c.spark.length > 5 ? <div className={q("card jl en")} style={{ padding: 12 }}><PriceChart closes={c.spark} levels={[{ y: c.entry, label: "Bought", color: "--ai", dash: [4, 4] }, { y: c.exit, label: "Sold", color: c.isWin ? "--up" : "--dn", dash: [2, 3] }]} accent="--ai" /></div> : null}
      <div className={q("list kv en")}>
        <span>Bought</span><b className={q("num")}>{px(c.entry)} · {c.entryDate}</b>
        <span>Sold</span><b className={q("num")}>{px(c.exit)} · {c.exitDate}</b>
        <span>Result after costs</span><b className={q("num " + (c.isWin ? "up" : "dn"))}>{sgn(c.roiPct)}</b>
        <span>Why it closed</span><b>{c.reason}</b>
        <span>Days held</span><b className={q("num")}>{c.days}</b>
      </div>
      {c.why ? <section className={q("sec en")}><Sh t="Why the AI bought it" /><div className={q("card pad")}><p className={q("mu")} style={{ margin: 0, lineHeight: 1.5 }}>{c.why}</p></div></section> : null}
      <MiniXray sym={c.sym} go={go} />
      <p className={q("note")}>Every closed trade stays in the record, wins and losses alike.</p>
    </div>
  );
}

/* ======================= PATTERN CALL ======================= */
export function PatternPage({ sym, tf, go, onBack, onShare }: { sym: string; tf?: string; go: Go; onBack: () => void; onShare: () => void }) {
  const p = useLoad("patterns", loadPatterns);
  const [extra, setExtra] = useState<PatternRow | null | undefined>(undefined);
  const t = useLoad("terminal", loadTerminal);
  const fromList = p.data?.rows.find((r) => r.sym === sym && (!tf || r.tf === tf)) || p.data?.rows.find((r) => r.sym === sym);
  useEffect(() => { if (p.data && !fromList && extra === undefined) searchPattern(sym).then((l: PatternRow[]) => setExtra(l[0] || null), () => setExtra(null)); }, [p.data, fromList, sym, extra]);
  const row = fromList || extra || undefined;
  const ch = useLoad<any[]>(`candles:${sym}:120`, () => loadCandles(sym, 120));
  const bar = <PageBar back="Patterns" title={sym} onBack={onBack} onShare={onShare} />;
  if (p.loading || (p.data && !fromList && extra === undefined)) return <div className={q("inner")} style={{ ["--acc" as any]: "var(--pt)" }}>{bar}<Skeleton /></div>;
  if (!row) return (
    <div className={q("inner")} style={{ ["--acc" as any]: "var(--pt)" }}>{bar}
      <div className={q("card pad err")}><h3>{sym} has no pattern setup today</h3><p className={q("mu")} style={{ margin: 0 }}>The scan only lists stocks near or through a price ceiling.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className={q("btn sm soft")} onClick={() => go("/patterns")}>All pattern calls</button><button className={q("btn sm soft")} onClick={() => go(`/xray/${sym}`)}>X-Ray {sym}</button></div></div>
    </div>
  );
  const s = STG[row.stage], live = (t.data?.active || []).find((c) => c.sym === sym);
  const levels: Level[] = [
    { y: row.level, label: "Ceiling", color: "--pt", dash: [4, 4] },
    ...(isFinite(row.target) ? [{ y: row.target, label: "Take profit", color: "--up", dash: [2, 3] }] : []),
    ...(isFinite(row.stop) ? [{ y: row.stop, label: "Stop loss", color: "--dn", dash: [2, 3] }] : []),
  ];
  const todo: Record<string, string[]> = {
    Breakout: [row.action === "BUY" ? "This is a buy setup. Buy at the next day’s opening price." : "It broke out, but the odds for this kind of breakout are not proven. Watch, or buy a small amount.", "Set your exit just under the old ceiling. If the price falls back there, the idea was wrong.", "Take profit at about twice what you risk."],
    Near: [`Be ready, not in. Nothing to do until it closes clearly above ${px(row.level)}.`, "Set a price alert at the ceiling.", "Odds apply only once it breaks out."],
    Retest: ["The price broke out, then came back to the old ceiling.", "Some call this a second chance, but our tests have not shown it works better than the first buy.", "Watch only, unless it closes back above the ceiling with a strong day."],
    Forming: ["The ceiling is still being tested. No setup yet.", "Check back when the price gets close to it.", "Nothing to do today."],
    Other: [],
  };
  return (
    <div className={q("inner")} style={{ ["--acc" as any]: "var(--pt)" }}>
      {bar}
      <div className={q("dhead q-play")}>
        <p className={q("ey")}><Icon n="pat" s={16} w={2.2} />Pattern Call · {tfName(row.tf)}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><h1><Words text={row.sym} /></h1><Pill k={s.k}>{row.stage}</Pill>{row.grade ? <Pill>Grade {row.grade}</Pill> : null}</div>
        <p className={q("lede")} style={{ marginTop: 4 }}>{row.name}. {s.ex}</p>
      </div>
      <div className={q("card jl en")} style={{ padding: 12 }}>
        {ch.data && ch.data.length > 5 ? <PriceChart candles={ch.data} levels={levels} accent="--pt" /> : <Spark values={[]} id={sym} height={200} />}
        <p className={q("note")} style={{ padding: "8px 6px 2px" }}>Dashed line: the ceiling at {px(row.level)}.</p>
      </div>
      <div className={q("g2")}>
        <div className={q("list kv en")}>
          <span>Ceiling price</span><b className={q("num")}>{px(row.level)}</b>
          <span>Price now</span><b className={q("num")}>{px(row.price)}</b>
          <span>Distance</span><b className={q("num")}>{gapTxt(row)}</b>
          {isFinite(row.stop) ? <><span>Exit if it falls to<small>Stop loss</small></span><b className={q("num dn")}>{px(row.stop)}</b></> : null}
          {isFinite(row.target) ? <><span>Take profit at</span><b className={q("num up")}>{px(row.target)}</b></> : null}
          {row.pattern ? <><span>Pattern</span><b>{row.pattern}</b></> : null}
        </div>
        <section className={q("sec en")}>
          <Sh t="How often this worked" />
          <div className={q("card pad")}>
            {row.conf && isFinite(row.conf.win) ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}><span className={q("dot")} style={{ background: row.conf.label === "Validated edge" ? "var(--up)" : "var(--warn)" }} />{row.conf.label === "Validated edge" ? "Proven in testing" : row.conf.label}</div>
                <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                  <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 7 }}><span className={q("mu")}>Similar setups that made money</span><b className={q("num")}>{row.conf.win.toFixed(0)}%</b></div><div className={q("bar")} style={{ ["--w" as any]: row.conf.win + "%", ["--c" as any]: "var(--up)" }}><i /></div></div>
                  <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 7 }}><span className={q("mu")}>Reached the full profit target</span><b className={q("num")}>{row.conf.hit.toFixed(0)}%</b></div><div className={q("bar")} style={{ ["--w" as any]: row.conf.hit + "%", ["--c" as any]: "var(--pt)" }}><i /></div></div>
                </div>
                <p className={q("mu")} style={{ margin: "16px 0 0", fontSize: 15 }}>Average {sgn(row.conf.avgPct)} per trade after costs, over {row.conf.n.toLocaleString("en-IN")} similar setups.</p>
              </>
            ) : <p className={q("quote")} style={{ margin: 0 }}>{row.stage === "Near" ? "Odds apply once it breaks out. Until then, just watch." : row.stage === "Retest" ? "Retests have not shown a proven edge in our tests. Watch only." : row.conf?.text || "Too early to judge. No odds yet."}</p>}
          </div>
        </section>
      </div>
      <section className={q("sec en")}><Sh t="What to do" /><div className={q("card pad")}><Why items={todo[row.stage]} color="var(--pt)" /></div></section>
      {row.notes.length ? <section className={q("sec en")}><Sh t="What the scanner saw" /><div className={q("card pad")}><Why items={row.notes.map((n) => n.charAt(0).toUpperCase() + n.slice(1) + ".")} color="var(--dim)" icon="clock" /></div></section> : null}
      {live ? <button className={q("btn w acc en")} style={{ ["--acc" as any]: "var(--ai)" }} onClick={() => go(`/calls/${sym}`)}><Icon n="ai" s={17} w={2.2} /> Open the AI call on {sym}</button> : null}
      <MiniXray sym={sym} go={go} />
      <p className={q("note")}>Not investment advice.</p>
    </div>
  );
}
