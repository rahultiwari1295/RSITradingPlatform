/* Pattern picker: choose a chart pattern, then see every stock making it today (live scan).
   Cards, odds and wording match the live Pattern Calls screen; the picker on top is new. */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { q, px, num } from "../../q/core";
import { useLoad, loadPatterns, loadEdge, loadCandles, type PatternRow, type Stage } from "../../q/data";
import { fitPattern, geoFromLines, type Geo } from "../../q/pattern";
import { Count, ErrorBox, ListSkeleton, Pill, Sh, Spark } from "../../q/ui";
import { STG, gapTxt, tfName, type Go } from "../../q/tabs";
import { normalizePatternId, PATTERN_OPTIONS } from "../../lib/setupEngine";
import { sgn } from "../../q/core";

const INFO: Record<string, { say: string; pts: string }> = {
  BREAKOUT_RALLY: { say: "Price just pushed through a ceiling on strong volume.", pts: "2,26 18,24 30,25 46,18 60,19 80,6" },
  HORIZONTAL_RANGE: { say: "A long, flat resting range. The ceiling is the level to watch.", pts: "2,20 14,10 26,22 38,10 50,22 62,10 80,12" },
  PULLBACK: { say: "An uptrend that dipped back to its 50-day average.", pts: "2,26 20,14 34,8 46,18 56,16 80,4" },
  DOUBLE_BOTTOM: { say: "Fell to the same floor twice, then turned up.", pts: "2,6 18,26 32,12 46,26 64,6 80,4" },
  VCP_SQUEEZE: { say: "Swings are getting smaller before a possible move.", pts: "2,4 14,26 26,8 38,22 50,12 62,18 74,15 80,15" },
  TRIANGLE: { say: "Highs and lows squeezing together toward a point.", pts: "2,4 16,24 28,9 40,21 52,13 62,18 80,15" },
  CUP_HANDLE: { say: "A rounded bottom, then a small pause near the top.", pts: "2,6 14,18 30,26 46,18 58,6 66,12 74,8 80,4" },
  INV_HEAD_SHOULDERS: { say: "Three dips, the middle one deepest, then a rise.", pts: "2,6 12,20 22,10 36,28 50,10 60,20 70,8 80,3" },
};
const Glyph = ({ id }: { id: string }) => (
  <svg viewBox="0 0 82 32" width="82" height="32" aria-hidden="true" className="lab-glyph">
    <polyline points={INFO[id]?.pts ?? "2,16 80,16"} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function Card({ p, go }: { p: PatternRow; go: Go }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [seen, setSeen] = useState(false);
  const [vals, setVals] = useState<number[]>([]), [geo, setGeo] = useState<Geo | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el || typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setSeen(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!seen) return;
    loadCandles(p.sym, 90).then((c: any[]) => { const w = c.slice(-70); setVals(w.map((x) => x.c)); setGeo(geoFromLines(p.raw?.trendlines || p.raw?.pattern_lines, w) || fitPattern(w, p.pattern, p.level)); }, () => setVals([]));
  }, [seen, p]);
  const s = STG[p.stage], gap = p.level > 0 ? (p.price / p.level - 1) * 100 : 0;
  return (
    <button ref={ref} className={q("card pcard press jl")} onClick={() => go(`/patterns/${p.sym}${p.tf.startsWith("D") ? "" : "?tf=" + p.tf}`)}>
      <div className={q("top2")}>
        <div className={q("grow")}><div className={q("t1")} style={{ fontSize: 18 }}>{p.sym}<Pill k={s.k}>{p.stage}</Pill><Pill>{tfName(p.tf).replace(" chart", "")}</Pill></div><div className={q("t2")}>{s.say}{p.pattern ? " · " + p.pattern : ""}</div></div>
        <div className={q("rt")}><b className={q("num")}>{px(p.price)}</b><small className={q("num " + (gap >= 0 ? "up" : "mu"))}>{gapTxt(p)}</small></div>
      </div>
      <Spark values={vals} level={p.level} id={p.sym + p.tf} geo={geo} />
      <div className={q("odds")}>
        {p.conf && isFinite(p.conf.win)
          ? <><span><span className={q("dot")} style={{ background: p.conf.label === "Validated edge" ? "var(--up)" : "var(--warn)", marginRight: 7 }} />{p.conf.label === "Validated edge" ? "Proven in testing" : p.conf.label}</span><b>{p.conf.win.toFixed(0)}% made money · avg {sgn(p.conf.avgPct)}</b></>
          : <span>{p.stage === "Near" ? "Odds apply once it breaks out. Until then, watch." : p.stage === "Retest" ? "Retests have not shown a proven edge yet. Watch only." : p.stage === "Forming" ? "Too early to judge." : p.conf?.label || "No measured odds for this setup."}</span>}
      </div>
    </button>
  );
}

const STAGES = ["All", "Breakout", "Near", "Retest", "Forming"] as const;

export function PatternPicker({ go }: { go: Go }) {
  const p = useLoad("patterns", loadPatterns);
  const e = useLoad("edge", loadEdge);
  const [pat, setPat] = useState<string>("ALL");
  const [stage, setStage] = useState<Stage | "All">("All");
  const [lim, setLim] = useState(20);
  const resRef = useRef<HTMLDivElement>(null);
  const rows = p.data?.rows ?? [];
  const byPat = useMemo(() => rows.map((r) => ({ r, id: normalizePatternId(r.raw?.pattern_type || r.pattern) })), [rows]);
  const counts = useMemo(() => { const c: Record<string, number> = {}; byPat.forEach((x) => { c[x.id] = (c[x.id] || 0) + 1; }); return c; }, [byPat]);
  const inPat = useMemo(() => byPat.filter((x) => pat === "ALL" || x.id === pat).map((x) => x.r), [byPat, pat]);
  const stageCounts = useMemo(() => { const c: Record<string, number> = { All: inPat.length }; inPat.forEach((r) => { c[r.stage] = (c[r.stage] || 0) + 1; }); return c; }, [inPat]);
  const list = useMemo(() => inPat.filter((r) => stage === "All" || r.stage === stage), [inPat, stage]);
  const W = e.data?.W;
  const choose = (id: string) => {
    setPat(id); setStage("All"); setLim(20);
    requestAnimationFrame(() => resRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const known = PATTERN_OPTIONS.filter((o) => counts[o.id]);
  const label = pat === "ALL" ? "All patterns" : PATTERN_OPTIONS.find((o) => o.id === pat)?.label ?? "Pattern";
  return (
    <div className={q("inner")} style={{ ["--acc" as any]: "var(--pt)" }}>
      <header className="lab-ph">
        <p className="lab-ey">Patterns</p>
        <h1>Pick a chart pattern</h1>
        <p className="lab-lede">We scan every liquid NSE chart. Choose a pattern to see which stocks are making it right now.</p>
      </header>
      <div className="lab-pgrid" role="list">
        <button role="listitem" className={"lab-ptile all" + (pat === "ALL" ? " on" : "")} aria-pressed={pat === "ALL"} onClick={() => choose("ALL")}>
          <b>All patterns</b><span>Everything found today</span><i className="num">{p.data ? rows.length : "…"}</i>
        </button>
        {PATTERN_OPTIONS.map((o) => (
          <button key={o.id} role="listitem" className={"lab-ptile" + (pat === o.id ? " on" : "") + (p.data && !counts[o.id] ? " off" : "")} aria-pressed={pat === o.id} onClick={() => choose(o.id)}>
            <Glyph id={o.id} /><b>{o.label}</b><span>{INFO[o.id]?.say}</span><i className="num">{p.data ? counts[o.id] || 0 : "…"}</i>
          </button>
        ))}
      </div>
      {W ? (
        <section className={q("sec")}>
          <Sh t="Weekly breakouts, measured" small={W.verdict === "VALIDATED" ? "Proven in testing" : "Not yet proven"} />
          <div className={q("proof")}>
            <div><Count v={W.win} fmt="pct" /><small>made money</small></div>
            <div><Count v={W.avgPct} fmt="spct" /><small>average per trade</small></div>
            <div><Count v={W.n} /><small>past breakouts checked</small></div>
          </div>
        </section>
      ) : null}
      <div ref={resRef} className="lab-res">
        <Sh t={label} small={p.data ? `${list.length} ${list.length === 1 ? "stock" : "stocks"}` : ""} />
        <div className={q("chips")} role="group" aria-label="Filter by stage">
          {STAGES.map((k) => (
            <button key={k} className={q("chip")} aria-pressed={stage === k} onClick={() => { setStage(k); setLim(20); }}>
              {k}{p.data ? <b className={q("num")}> {stageCounts[k] || 0}</b> : null}
            </button>))}
        </div>
        {stage !== "All" ? <p className={q("note")}>{STG[stage].ex}</p> : null}
        {p.loading ? <ListSkeleton /> : p.error ? <ErrorBox text={p.error} onRetry={p.reload} /> : (
          <>
            <div className={q("g2")}>{list.slice(0, lim).map((r) => <Card key={r.sym + r.tf} p={r} go={go} />)}</div>
            {!list.length ? <div className={q("card empty")}>Nothing here today. Try another pattern or stage.</div> : null}
            {lim < list.length ? <button className={q("btn soft w")} onClick={() => setLim(lim + 20)}>Show more ({list.length - lim} left)</button> : null}
            <p className={q("note")}>From today’s scan{p.data?.scanDate ? " (" + p.data.scanDate + ")" : ""}.</p>
          </>
        )}
      </div>
    </div>
  );
}
