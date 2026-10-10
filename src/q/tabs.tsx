import React, { useEffect, useMemo, useRef, useState } from "react";
import { q, px, sgn, num, inr, RM } from "./core";
import {
  useLoad, loadTerminal, loadPatterns, loadEdge, loadDiscovery, searchStocks, loadCandles, loadQuote, loadReport,
  actionInfo, marketStatus, getHoldings, setHoldings, scoreTone, type Call, type ClosedCall, type PatternRow, type Stage, type Holding,
} from "./data";
import { Icon, Chev, Ring, Rail, Pill, Sh, Count, Hero, ListSkeleton, ErrorBox, Spark } from "./ui";

export type Go = (path: string) => void;
const firstSentence = (s: string) => (String(s || "").match(/^[^.!?]+[.!?]/) || [s])[0] || "";

/* ================= HOME ================= */
export function TopCall({ c, go, win, n }: { c: Call; go: Go; win: number; n: number }) {
  const a = actionInfo(c.action), ch = c.entry > 0 ? (c.now / c.entry - 1) * 100 : NaN;
  return (
    <article className={q("card top press jl")} role="button" tabIndex={0} onClick={() => go(`/calls/${c.sym}`)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && go(`/calls/${c.sym}`)} aria-label={`Open the plan for ${c.sym}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}><Pill k={a.k}>{a.t}</Pill><Pill>{c.strategy.replace(/[^\w\s.-]/g, "").trim()}</Pill></div>
          <div className={q("sym")} style={c.sym.length > 8 ? { fontSize: "clamp(22px,6.6vw,30px)" } : undefined}>{c.sym}</div>
          <div className={q("t2")} style={{ fontSize: 15 }}>{c.name}</div>
        </div>
        <div className={q("rt")}>
          <small className={q("dim")} style={{ fontSize: 12 }}>Price now</small>
          <b className={q("num")} style={{ fontSize: 20 }}>{px(c.now)}</b>
          {isFinite(ch) ? <small className={q("num " + (ch >= 0 ? "up" : "dn"))}>{sgn(ch)} since the call</small> : null}
        </div>
      </div>
      {c.why ? <p className={q("quote")}>{firstSentence(c.why)}</p> : null}
      <div className={q("lv3")}>
        <div><small>Buy near</small><b className={q("num")}>{px(c.entry)}</b></div>
        <div><small>Exit if it falls to</small><b className={q("num dn")}>{px(c.stop)}</b></div>
        <div><small>Take profit at</small><b className={q("num up")}>{px(c.target)}</b></div>
      </div>
      <Rail lo={c.stop} hi={c.target} mark={c.entry} now={c.now} ll="Exit" rl="Profit" ml="Bought" />
      <div className={q("foot")}>
        <span>{isFinite(win) ? <><b>{win.toFixed(0)}%</b> of {n.toLocaleString("en-IN")} past AI trades made money</> : "AI call with a stop and a target"}</span>
        <span className={q("lnk")} style={{ ["--acc" as any]: "var(--ai)", flex: "none" }}>Full plan<Icon n="chev" s={15} w={2.6} /></span>
      </div>
    </article>
  );
}
export function Home({ go }: { go: Go }) {
  const t = useLoad("terminal", loadTerminal);
  const p = useLoad("patterns", loadPatterns);
  const ms = marketStatus();
  const top = t.data ? t.data.toBuy[0] || t.data.active[0] : undefined;
  const more = t.data ? [...t.data.toBuy, ...t.data.active].filter((c, i, a) => c.sym !== top?.sym && a.findIndex((x) => x.sym === c.sym) === i).slice(0, 3) : [];
  const st = t.data?.stats;
  const prod = (icon: string, col: string, name: string, txt: string, meta: string, to: string) => (
    <button className={q("row prod")} onClick={() => go(to)}>
      <span className={q("ico")} style={{ ["--c" as any]: col }}><Icon n={icon} s={21} w={2.1} /></span>
      <div className={q("grow")}><h3>{name}</h3><p>{txt}</p><div className={q("meta")} style={{ ["--c" as any]: col }}>{meta}</div></div>
      <Chev />
    </button>
  );
  return (
    <div className={q("inner")} style={{ ["--acc" as any]: "var(--ax)" }}>
      <Hero art="home" artOpts={{ ai: top ? `${top.sym} near ${px(top.entry)}` : undefined }} label="Today"
        ey={<span className={q("live")}><i style={ms.open ? { background: "var(--up)" } : undefined} />{ms.text}</span>}
        h="Find what is worth buying today." hl={["worth", "buying"]}
        lede="QuantSync does the research for you. It checks the company, reads the chart and looks at years of history, then shows you the few trades worth your money.">
        <div className={q("hstats hx")} style={{ ["--i" as any]: 9 }}>
          <div><Count v={st?.stocks ?? NaN} /><small>stocks checked every day</small></div>
          <div><Count v={t.data ? t.data.active.length : NaN} /><small>open AI calls</small></div>
          <div><Count v={st?.winRate ?? NaN} fmt="pct" /><small>of past AI trades made money</small></div>
        </div>
      </Hero>
      <section className={q("sec en")}>
        <Sh t="Today’s top call" small={t.data?.updatedAt ? "Updated " + t.data.updatedAt.slice(0, 16) : undefined} />
        {t.loading ? <div className={q("sk")} style={{ height: 380, borderRadius: 22 }} /> : t.error ? <ErrorBox text={t.error} onRetry={t.reload} /> :
          top ? <TopCall c={top} go={go} win={st!.winRate} n={st!.closedN} /> : <div className={q("card empty")}>No open AI call today. The AI only calls when a setup passes its rules.</div>}
      </section>
      <section className={q("sec en")}>
        <Sh t="Three ways to find a trade" />
        <div className={q("list jl")}>
          {prod("xray", "var(--ax)", "Stock X-Ray", "Is it a good company? Search any stock and get one health score from 0 to 100.", "Start with any name you know", "/xray")}
          {prod("ai", "var(--ai)", "AI Calls", "When to buy and when to sell. Every call shows where to get out if it goes wrong.", t.data ? `${t.data.active.length} open calls · avg ${sgn(st!.avgPct)} per closed trade` : "Live calls from the AI engine", "/calls")}
          {prod("pat", "var(--pt)", "Pattern Calls", "For chart lovers. Breakouts found in every chart, ranked by how often they worked before.", p.data ? `${p.data.counts.Near} stocks close to a breakout` : "Breakouts ranked by odds", "/patterns")}
          {prod("pie", "var(--pf)", "Portfolio", "Type in what you own. We check each stock and warn you early.", "Saved on this device", "/portfolio")}
        </div>
      </section>
      {more.length ? (
        <section className={q("sec en")}>
          <Sh t="Also on today’s list" />
          <div className={q("list jl")}>
            {more.map((c) => { const a = actionInfo(c.action); return (
              <button key={c.sym} className={q("row ind")} onClick={() => go(`/calls/${c.sym}`)}>
                <span className={q("av")}>{c.sym.slice(0, 2)}</span>
                <div className={q("grow")}><div className={q("t1")}>{c.sym}<Pill k={a.k}>{a.t}</Pill></div><div className={q("t2")}>{c.strategy} · buy near {px(c.entry)}</div></div>
                <Chev />
              </button>); })}
          </div>
        </section>
      ) : null}
      <p className={q("note en")} style={{ textAlign: "center" }}>For learning and research. Not investment advice.</p>
    </div>
  );
}

/* ================= STOCK X-RAY ================= */
export function XRay({ go }: { go: Go }) {
  const [qq, setQq] = useState("");
  const [res, setRes] = useState<any[] | null>(null);
  const [open, setOpen] = useState(false);
  const inp = useRef<HTMLInputElement>(null);
  const disc = useLoad("discovery", loadDiscovery);
  useEffect(() => {
    const v = qq.trim();
    if (!v) { setRes(null); return; }
    const id = setTimeout(() => { searchStocks(v).then((r: any) => setRes(Array.isArray(r) ? r.slice(0, 6) : []), () => setRes([])); }, 180);
    return () => clearTimeout(id);
  }, [qq]);
  useEffect(() => { /* typing hints */
    const el = inp.current; if (!el || RM) return;
    const hints = ["Search a company", "Try TRENT", "Try Reliance", "Try “bank”", "Try Infosys"]; let hi = 0, ci = 0, del = false, tm: any;
    const tick = () => {
      if (document.activeElement === el || el.value) { el.placeholder = "Search a company"; tm = setTimeout(tick, 900); return; }
      const w = hints[hi];
      if (!del) { ci++; if (ci >= w.length) { del = true; el.placeholder = w; tm = setTimeout(tick, 1600); return; } }
      else { ci--; if (ci <= 0) { del = false; hi = (hi + 1) % hints.length; } }
      el.placeholder = w.slice(0, ci) + (ci < w.length ? "▏" : ""); tm = setTimeout(tick, del ? 28 : 62);
    };
    tm = setTimeout(tick, 1600);
    return () => clearTimeout(tm);
  }, []);
  const shelves = disc.data ? [["solvency", "Strong balance sheets", "Little or no debt"], ["velocity", "Rising right now", "Price above its short-term trend"], ["trending", "Most watched", "Active setups and big-fund interest"]] : [];
  const pick = (s: string) => { setOpen(false); go(`/xray/${s}`); };
  return (
    <div className={q("inner")} style={{ ["--acc" as any]: "var(--ax)" }}>
      <Hero art="xray" label="Stock X-Ray" icon="xray" ey="Stock X-Ray" h="Is it a good company? Find out in seconds." hl={["good", "company?"]}
        lede="Search any NSE stock. X-Ray checks its trend, momentum, buying activity and business quality, then gives one health score from 0 to 100.">
        <div className={q("srch hx")} style={{ ["--i" as any]: 10, marginTop: 18 }}>
          <label className={q("sbox")}>
            <Icon n="search" s={22} w={2.3} />
            <span className={q("sr")}>Search a company</span>
            <input ref={inp} type="search" autoComplete="off" placeholder="Search a company" value={qq}
              onChange={(e) => { setQq(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 180)}
              onKeyDown={(e) => { if (e.key === "Enter") { const s = res && res[0] ? res[0].symbol : qq.trim().toUpperCase(); if (s) pick(s); } }} />
          </label>
          {open && res ? (
            <div className={q("sug")}>
              {res.length ? res.map((r) => (
                <button key={r.symbol} className={q("row ind")} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(r.symbol)}>
                  <span className={q("av")}>{String(r.symbol).slice(0, 2)}</span>
                  <div className={q("grow")}><div className={q("t1")}>{r.symbol}</div><div className={q("t2")}>{r.name || r.symbol}{r.price ? " · " + px(r.price) : ""}</div></div><Chev />
                </button>
              )) : <div className={q("row")}><div className={q("grow")}><div className={q("t1")}>No match</div><div className={q("t2")}>Try the NSE symbol, for example TRENT.</div></div></div>}
            </div>
          ) : null}
        </div>
        <div className={q("chips hx")} style={{ ["--i" as any]: 11, marginTop: 12 }}>
          {["TRENT", "RELIANCE", "HDFCBANK", "INFY", "TATASTEEL", "BEL"].map((s) => <button key={s} className={q("chip")} onClick={() => go(`/xray/${s}`)}>{s}</button>)}
        </div>
      </Hero>
      <section className={q("sec en")}>
        <Sh t="What one X-Ray tells you" />
        <div className={q("steps")}>
          <div><i>1</i><b>Health score</b><small>Trend, momentum, buying and quality in one number.</small></div>
          <div><i>2</i><b>Ten years</b><small>Sales, profit, cash and dividends.</small></div>
          <div><i>3</i><b>Who owns it</b><small>Promoters, big funds and the public.</small></div>
        </div>
      </section>
      {disc.loading ? <ListSkeleton n={2} /> : null}
      {shelves.map(([k, title, sub]) => {
        const stocks = (disc.data as any)?.[k]?.stocks || [];
        if (!stocks.length) return null;
        return (
          <section key={k} className={q("sec en")}>
            <Sh t={title} small={sub} />
            <div className={q("scroller")}>
              {stocks.map((s: any) => (
                <button key={s.symbol} className={q("fcard press")} onClick={() => go(`/xray/${s.symbol}`)}>
                  <span className={q("av")}>{String(s.symbol).slice(0, 2)}</span>
                  <div><b>{s.symbol}</b><small>{s.price}</small></div>
                  <span className={q("pill " + (s.stance === "BULLISH" ? "buy" : s.stance === "BEARISH" ? "sell" : ""))} style={{ alignSelf: "flex-start", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{String(s.stanceLabel || s.stance).split("·")[0].trim()}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
      <p className={q("note")}>X-Ray is research, not a trade call. It tells you how much to trust the company behind a chart.</p>
    </div>
  );
}

/* ================= AI CALLS ================= */
function CallCard({ c, go }: { c: Call; go: Go }) {
  const a = actionInfo(c.action), ch = c.entry > 0 ? (c.now / c.entry - 1) * 100 : NaN;
  return (
    <button className={q("card pad press jl en")} style={{ display: "block", width: "100%", textAlign: "left" }} onClick={() => go(`/calls/${c.sym}`)}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div className={q("grow")}><div className={q("t1")} style={{ fontSize: 18 }}>{c.sym}<Pill k={a.k}>{a.t}</Pill></div><div className={q("t2")}>{c.name} · {c.strategy}</div></div>
        <div className={q("rt")}><b className={q("num")}>{px(c.now)}</b>{isFinite(ch) ? <small className={q("num " + (ch >= 0 ? "up" : "dn"))}>{sgn(ch)}</small> : null}</div>
      </div>
      <Rail lo={c.stop} hi={c.target} mark={c.entry} now={c.now} ll={"Exit " + px(c.stop)} rl={"Profit " + px(c.target)} ml="Bought" />
      <div className={q("odds")}><span>Opened {c.entryDate || "recently"} · day {c.days}</span><b>Conviction {isFinite(c.conviction) ? Math.round(c.conviction) : "—"}</b></div>
    </button>
  );
}
function ClosedRow({ c, go }: { c: ClosedCall; go: Go }) {
  return (
    <button className={q("row ind")} onClick={() => go(`/calls/closed/${encodeURIComponent(c.id)}`)}>
      <span className={q("ico sm")} style={{ ["--c" as any]: c.isWin ? "var(--up)" : "var(--dn)" }}><Icon n={c.isWin ? "check" : "x"} s={17} w={2.6} /></span>
      <div className={q("grow")}><div className={q("t1")}>{c.sym}</div><div className={q("t2")}>{c.reason} · {c.entryDate} to {c.exitDate}</div></div>
      <div className={q("rt")}><b className={q("num " + (c.isWin ? "up" : "dn"))}>{sgn(c.roiPct)}</b><small className={q("dim")}>{c.days} days</small></div>
    </button>
  );
}
export function Calls({ go }: { go: Go }) {
  const t = useLoad("terminal", loadTerminal);
  const [tab, setTab] = useState(0);
  const [lim, setLim] = useState(30);
  const st = t.data?.stats;
  return (
    <div className={q("inner")} style={{ ["--acc" as any]: "var(--ai)" }}>
      <Hero art="calls" label="AI Calls" icon="ai" ey="AI Calls" h="Know when to buy, and when to sell." hl={["buy,", "sell."]}
        lede="Our AI tests several strategies on years of NSE history and only calls the ones that held up. Every call tells you where to buy, where to get out if it goes wrong, and where to take profit.">
        <div className={q("hstats hx")} style={{ ["--i" as any]: 10, marginTop: 18 }}>
          <div><Count v={st?.winRate ?? NaN} fmt="pct" /><small>of closed trades made money</small></div>
          <div><Count v={st?.avgPct ?? NaN} fmt="spct" /><small>average result per trade</small></div>
          <div><Count v={st?.closedN ?? NaN} /><small>closed trades so far</small></div>
        </div>
        <p className={q("note hx")} style={{ ["--i" as any]: 11, marginTop: 10 }}>From the AI engine’s own closed trades, after costs. Past results do not promise future ones.</p>
      </Hero>
      <div className={q("seg en")} role="group" aria-label="Which calls" style={{ ["--n" as any]: 2 }}>
        <span className={q("knob")} style={{ width: "calc((100% - 6px)/2)", transform: `translateX(${tab * 100}%)`, transition: "transform .5s cubic-bezier(.3,1.25,.5,1)" }} />
        <button aria-pressed={tab === 0} onClick={() => setTab(0)}>Open calls{t.data ? " · " + t.data.active.length : ""}</button>
        <button aria-pressed={tab === 1} onClick={() => setTab(1)}>Closed{t.data ? " · " + t.data.closed.length : ""}</button>
      </div>
      {t.loading ? <ListSkeleton /> : t.error ? <ErrorBox text={t.error} onRetry={t.reload} /> : tab === 0 ? (
        t.data!.active.length ? <div className={q("g2")}>{t.data!.active.map((c) => <CallCard key={c.sym} c={c} go={go} />)}</div> : <div className={q("card empty")}>No open calls right now.</div>
      ) : (
        <>
          <div className={q("proof jl en")}>
            <div><b className={q("num up")}>{sgn(st!.avgWinPct)}</b><small>average winning trade</small></div>
            <div><b className={q("num dn")}>{sgn(st!.avgLossPct)}</b><small>average losing trade</small></div>
            <div><b className={q("num")}>{isFinite(st!.profitFactor) ? st!.profitFactor.toFixed(2) : "—"}</b><small>₹ won for every ₹1 lost</small></div>
          </div>
          <div className={q("list jl en")}>{t.data!.closed.slice(0, lim).map((c) => <ClosedRow key={c.id} c={c} go={go} />)}</div>
          {lim < t.data!.closed.length ? <button className={q("btn soft w")} onClick={() => setLim(lim + 40)}>Show more</button> : null}
        </>
      )}
    </div>
  );
}

/* ================= PATTERN CALLS ================= */
function useInView(ref: React.RefObject<Element>) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el || v) return;
    if (!("IntersectionObserver" in window)) { setV(true); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (setV(true), io.disconnect())), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, v]);
  return v;
}
export const STG: Record<Stage, { k: string; say: string; ex: string }> = {
  Breakout: { k: "buy", say: "Closed above its ceiling", ex: "Price just closed above a level it could not cross before." },
  Near: { k: "hold", say: "Just under its ceiling", ex: "Price is close to the level. Be ready, not in." },
  Retest: { k: "warn", say: "Back at the old ceiling", ex: "Price broke out, then came back to the old level." },
  Forming: { k: "", say: "Still taking shape", ex: "A ceiling is forming. Nothing to do yet." },
  Other: { k: "", say: "", ex: "" },
};
export const tfName = (tf: string) => (tf.startsWith("W") ? "Weekly chart" : tf.startsWith("M") ? "Monthly chart" : "Daily chart");
export const gapTxt = (p: PatternRow) => { if (!(p.level > 0)) return ""; const g = (p.price / p.level - 1) * 100; return g >= 0 ? sgn(g) + " above" : Math.abs(g).toFixed(1) + "% below"; };
function PatternCard({ p, go }: { p: PatternRow; go: Go }) {
  const ref = useRef<HTMLButtonElement>(null);
  const seen = useInView(ref as any);
  const [vals, setVals] = useState<number[]>([]);
  useEffect(() => { if (seen) loadCandles(p.sym, 60).then((c: any[]) => setVals(c.map((x) => x.c)), () => setVals([])); }, [seen, p.sym]);
  const s = STG[p.stage], gap = p.level > 0 ? (p.price / p.level - 1) * 100 : 0;
  return (
    <button ref={ref} className={q("card pcard press jl en")} onClick={() => go(`/patterns/${p.sym}${p.tf.startsWith("D") ? "" : "?tf=" + p.tf}`)}>
      <div className={q("top2")}>
        <div className={q("grow")}><div className={q("t1")} style={{ fontSize: 18 }}>{p.sym}<Pill k={s.k}>{p.stage}</Pill><Pill>{tfName(p.tf).replace(" chart", "")}</Pill></div><div className={q("t2")}>{s.say}{p.pattern ? " · " + p.pattern : ""}</div></div>
        <div className={q("rt")}><b className={q("num")}>{px(p.price)}</b><small className={q("num " + (gap >= 0 ? "up" : "mu"))}>{gapTxt(p)}</small></div>
      </div>
      <Spark values={vals} level={p.level} id={p.sym + p.tf} />
      <div className={q("odds")}>
        {p.conf && isFinite(p.conf.win) ? (<><span><span className={q("dot")} style={{ background: p.conf.label === "Validated edge" ? "var(--up)" : "var(--warn)", marginRight: 7 }} />{p.conf.label === "Validated edge" ? "Proven in testing" : p.conf.label}</span><b>{p.conf.win.toFixed(0)}% made money · avg {sgn(p.conf.avgPct)}</b></>)
          : <span>{p.stage === "Near" ? "Odds apply once it breaks out. Until then, watch." : p.stage === "Retest" ? "Retests have not shown a proven edge yet. Watch only." : p.stage === "Forming" ? "Too early to judge." : p.conf?.label || "No measured odds for this setup."}</span>}
      </div>
    </button>
  );
}
export function Patterns({ go }: { go: Go }) {
  const p = useLoad("patterns", loadPatterns);
  const e = useLoad("edge", loadEdge);
  const [f, setF] = useState<Stage | "All">("All");
  const [lim, setLim] = useState(20);
  const list = useMemo(() => (p.data ? p.data.rows.filter((r) => f === "All" || r.stage === f) : []), [p.data, f]);
  const W = e.data?.W;
  return (
    <div className={q("inner")} style={{ ["--acc" as any]: "var(--pt)" }}>
      <Hero art="patterns" label="Pattern Calls" icon="pat" ey="Pattern Calls" h="Love charts? Catch breakouts early." hl={["breakouts"]}
        lede="We scan every liquid NSE chart for a price ceiling about to break, then show how often the same pattern worked before.">
        <div className={q("steps hx")} style={{ ["--i" as any]: 9, marginTop: 18 }}>
          <div><i>1</i><b>Spot</b><small>A price the stock keeps failing to cross.</small></div>
          <div><i>2</i><b>Match</b><small>Compared with thousands of past setups.</small></div>
          <div><i>3</i><b>Rank</b><small>Real odds shown. Weak setups flagged.</small></div>
        </div>
      </Hero>
      {W ? (
        <section className={q("sec en")}>
          <Sh t="Weekly breakouts, measured" small={W.verdict === "VALIDATED" ? "Proven in testing" : "Not yet proven"} />
          <div className={q("proof")}>
            <div><Count v={W.win} fmt="pct" /><small>made money</small></div>
            <div><Count v={W.avgPct} fmt="spct" /><small>average per trade</small></div>
            <div><Count v={W.n} /><small>past breakouts checked</small></div>
          </div>
        </section>
      ) : null}
      <div className={q("chips en")} role="group" aria-label="Filter by stage">
        {(["All", "Breakout", "Near", "Retest", "Forming"] as const).map((k) => (
          <button key={k} className={q("chip")} aria-pressed={f === k} onClick={() => { setF(k); setLim(20); }}>
            {k}{k !== "All" && p.data ? <b className={q("num")}> {p.data.counts[k]}</b> : null}
          </button>
        ))}
      </div>
      {f !== "All" ? <p className={q("note")}>{STG[f].ex}</p> : null}
      {p.loading ? <ListSkeleton /> : p.error ? <ErrorBox text={p.error} onRetry={p.reload} /> : (
        <>
          <div className={q("g2")}>{list.slice(0, lim).map((r) => <PatternCard key={r.sym + r.tf} p={r} go={go} />)}</div>
          {!list.length ? <div className={q("card empty")}>Nothing in this stage today.</div> : null}
          {lim < list.length ? <button className={q("btn soft w")} onClick={() => setLim(lim + 20)}>Show more ({list.length - lim} left)</button> : null}
          <p className={q("note")}>From today’s scan{p.data?.scanDate ? " (" + p.data.scanDate + ")" : ""}.</p>
        </>
      )}
    </div>
  );
}

/* ================= PORTFOLIO ================= */
const PAL = ["var(--p1)", "var(--p2)", "var(--p5)", "var(--p3)", "var(--p4)", "var(--p6)"];
export function Portfolio({ go, onAdd, version }: { go: Go; onAdd: () => void; version: number }) {
  const [hs, setHs] = useState<Holding[]>(() => getHoldings());
  const [edit, setEdit] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const t = useLoad("terminal", loadTerminal);
  useEffect(() => { setHs(getHoldings()); }, [version]);
  useEffect(() => {
    hs.forEach((h) => {
      loadQuote(h.sym).then((qd: any) => setQuotes((o) => ({ ...o, [h.sym]: qd })), () => {});
      loadReport(h.sym).then((r: any) => { const s = num(r?.ui_report?.dna_health_score); if (isFinite(s)) setScores((o) => ({ ...o, [h.sym]: s })); }, () => {});
    });
  }, [hs]);
  const rows = hs.map((h, i) => {
    const qd = quotes[h.sym], p = num(qd?.price), price = isFinite(p) ? p : h.avg, v = price * h.qty, inv = h.avg * h.qty;
    return { i, h, price, v, inv, pl: v - inv, plp: (price / h.avg - 1) * 100, day: isFinite(num(qd?.change_pct)) ? (v * num(qd.change_pct)) / 100 : 0, known: isFinite(p) };
  }).sort((a, b) => b.v - a.v);
  const tv = rows.reduce((a, r) => a + r.v, 0), ti = rows.reduce((a, r) => a + r.inv, 0), day = rows.reduce((a, r) => a + r.day, 0);
  const live = new Set((t.data?.active || []).map((c) => c.sym));
  const checks: [string, string, string, string][] = [];
  if (rows[0] && tv > 0 && rows[0].v / tv > 0.3) checks.push(["warn", "var(--warn)", `One stock is ${((rows[0].v / tv) * 100).toFixed(0)}% of your money`, `A bad day in ${rows[0].h.sym} would hurt a lot.`]);
  const weak = rows.filter((r) => isFinite(scores[r.h.sym]) && scores[r.h.sym] < 45);
  if (weak.length) checks.push(["shield", "var(--dn)", `${weak.map((r) => r.h.sym).join(", ")} ${weak.length > 1 ? "have" : "has"} a weak X-Ray score`, "Check the company before buying more."]);
  const act = rows.filter((r) => live.has(r.h.sym));
  if (act.length) checks.push(["ai", "var(--ai)", `${act.length} of your stocks ${act.length > 1 ? "have" : "has"} a live AI call`, act.map((r) => r.h.sym).join(", ")]);
  if (rows.length && !checks.length) checks.push(["check", "var(--up)", "Nothing flagged", "Your mix looks reasonable."]);
  const remove = (i: number) => { const n = hs.slice(); n.splice(i, 1); setHoldings(n); setHs(n); };
  const seg = tv > 0 ? rows.slice(0, 6).map((r, i) => [(r.v / tv) * 100, PAL[i % 6]]) : [];
  return (
    <div className={q("inner")} style={{ ["--acc" as any]: "var(--pf)" }}>
      <Hero art="portfolio" artOpts={{ seg, value: tv > 0 ? (tv >= 1e5 ? "₹" + (tv / 1e5).toFixed(2) + "L" : inr(tv)) : "Your stocks", sub: rows.length ? rows.length + " HOLDINGS" : "CHECKED DAILY" }}
        label="Portfolio" icon="pie" ey="Portfolio" h="Everything you own, checked every day." hl={["checked"]}
        lede="Add your stocks by hand. We X-Ray each company and tell you if an AI call is live on it. Saved only on this device." />
      {!rows.length ? (
        <div className={q("card pad en")} style={{ textAlign: "center" }}>
          <h3>Add your first stock</h3>
          <p className={q("mu")} style={{ margin: "6px 0 16px", fontSize: 15 }}>Type the symbol, how many shares and the price you paid.</p>
          <button className={q("btn acc")} onClick={onAdd}><Icon n="plus" s={16} w={2.6} /> Add a stock</button>
        </div>
      ) : (
        <>
          <div className={q("card pad jl en")}>
            <p className={q("ey n")} style={{ marginBottom: 6 }}>Current value</p>
            <div className={q("price num")}>{inr(tv)}</div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12, fontSize: 15 }}>
              <span className={q("num " + (tv - ti >= 0 ? "up" : "dn"))}>{(tv - ti >= 0 ? "+" : "−") + inr(Math.abs(tv - ti))} <span className={q("dim")}>total gain</span></span>
              <span className={q("num " + (day >= 0 ? "up" : "dn"))}>{(day >= 0 ? "+" : "−") + inr(Math.abs(day))} <span className={q("dim")}>today</span></span>
            </div>
            <div className={q("own")} style={{ marginTop: 20 }}>{rows.map((r, i) => <i key={r.h.sym} style={{ width: ((r.v / tv) * 100).toFixed(1) + "%", background: PAL[i % 6], transitionDelay: i * 80 + "ms" }} />)}</div>
            <div className={q("lg2")}>{rows.map((r, i) => <span key={r.h.sym}><i style={{ background: PAL[i % 6] }} />{r.h.sym}<b className={q("num")}>{((r.v / tv) * 100).toFixed(0)}%</b></span>)}</div>
          </div>
          <section className={q("sec en")}>
            <Sh t="Daily check" />
            <div className={q("list jl")}>{checks.map((k, i) => (
              <div key={i} className={q("row ind")}><span className={q("ico sm")} style={{ ["--c" as any]: k[1] }}><Icon n={k[0]} s={17} w={2.3} /></span><div className={q("grow")}><div className={q("t1")}>{k[2]}</div><div className={q("t2")}>{k[3]}</div></div></div>
            ))}</div>
          </section>
          <section className={q("sec en")}>
            <Sh t="Your stocks" right={<span style={{ display: "flex", gap: 8 }}><button className={q("btn sm soft")} onClick={() => setEdit(!edit)}>{edit ? "Done" : "Edit"}</button><button className={q("btn sm acc")} onClick={onAdd}><Icon n="plus" s={15} w={2.6} /> Add</button></span>} />
            <div className={q("list jl")}>{rows.map((r) => {
              const sc = scores[r.h.sym], tn = isFinite(sc) ? scoreTone(sc) : null;
              return (
                <div key={r.h.sym} className={q("row ind")}>
                  <span className={q("av")}>{r.h.sym.slice(0, 2)}</span>
                  <button className={q("grow")} style={{ textAlign: "left" }} onClick={() => go(`/xray/${r.h.sym}`)}>
                    <div className={q("t1")}>{r.h.sym}{tn ? <Pill k={tn.k}>X-Ray {Math.round(sc)}</Pill> : null}{live.has(r.h.sym) ? <Pill k="buy">AI call</Pill> : null}</div>
                    <div className={q("t2 num")}>{r.h.qty} shares at {px(r.h.avg)}{r.known ? "" : " · price loading"}</div>
                  </button>
                  <div className={q("rt")}><b className={q("num")}>{inr(r.v)}</b><small className={q("num " + (r.pl >= 0 ? "up" : "dn"))}>{sgn(r.plp)}</small></div>
                  {edit ? <button className={q("x")} style={{ marginLeft: 4, background: "color-mix(in srgb,var(--dn) 16%,transparent)", color: "var(--dn)" }} onClick={() => remove(r.i)} aria-label={"Remove " + r.h.sym}><Icon n="x" s={15} w={2.6} /></button> : null}
                </div>
              );
            })}</div>
          </section>
        </>
      )}
      <p className={q("note")}>Prices are last traded prices from our data feed. Saved only in this browser.</p>
    </div>
  );
}
