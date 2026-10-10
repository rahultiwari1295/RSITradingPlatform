import React, { useEffect, useMemo, useRef, useState } from "react";
import { quantsyncApi } from "../api/quantsyncApi";
import { entryPriceFor, rewardRisk, timeframeLabel, getBreakoutClassification } from "../lib/setupEngine";

/**
 * Full stock page for the Radar screen. Replaces the old floating sheet AND the separate
 * "Analyst view": chart, plan, position sizing, model conviction, technical health, interactive chart.
 * Opened as a real history entry, so browser back / edge-swipe returns to the Radar list.
 */

type Setup = Record<string, any>;

interface Props {
  stock: Setup;
  theme: "dark" | "light";
  colors: { bg: string; ink: string; mu: string; acc: string; gn: string; rd: string; am: string };
  verdict: { w: string; c: string };
  why: string;
  stats: any | null; // pattern track record
  gate: any | null; // ML quality gate for the pattern
  closing: boolean;
  onBack: () => void;
  onOpenDna: () => void;
}

const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmt0 = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const num = (v: any): number | null => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));

export default function RadarStockPage({ stock, theme, colors, verdict, why, stats, gate, closing, onBack, onOpenDna }: Props) {
  const s = stock;
  const sym = String(s.symbol || "").trim().toUpperCase().replace(/^(BSE:|NSE:)/i, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [candles, setCandles] = useState<any[]>([]);
  const [chartState, setChartState] = useState<"loading" | "ready" | "error">("loading");
  const [hover, setHover] = useState<any | null>(null);
  const [riskCapital, setRiskCapital] = useState("10000");
  const [alertOn, setAlertOn] = useState(false);
  const [tvOn, setTvOn] = useState(false);
  const [tvTf, setTvTf] = useState<"D" | "W" | "M">(() => {
    const t = String(s.timeframe || "").toUpperCase();
    return t === "MONTHLY" ? "M" : t === "WEEKLY" ? "W" : "D";
  });
  const tvRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState("");

  // ── data (own fetches so the list stays light)
  useEffect(() => {
    let alive = true;
    setDetail(null);
    quantsyncApi
      .getStockDetail(sym, String(s.timeframe || ""))
      .then((d) => alive && setDetail(d))
      .catch(() => {});
    setChartState("loading");
    quantsyncApi
      .getChartData(sym, 90)
      .then((cd) => {
        if (!alive) return;
        const c = (cd && cd.candles) || [];
        if (c.length) {
          setCandles(c.map((x: any) => ({ o: Number(x.open), h: Number(x.high), l: Number(x.low), c: Number(x.close), time: x.time })));
          setChartState("ready");
        } else setChartState("error");
      })
      .catch(() => alive && setChartState("error"));
    return () => {
      alive = false;
    };
  }, [sym]);

  // ── compact header after the hero scrolls away
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const on = () => setCompact(el.scrollTop > 150);
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);

  // ── edge-swipe back (works in installed/standalone mode where there is no native gesture)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let sx = 0, sy = 0, dx = 0, tracking = false, locked = false;
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      tracking = t.clientX < 26;
      locked = false;
      sx = t.clientX;
      sy = t.clientY;
      dx = 0;
    };
    const move = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      const mx = t.clientX - sx, my = t.clientY - sy;
      if (!locked) {
        if (Math.abs(my) > Math.abs(mx) + 6) { tracking = false; return; }
        if (mx > 8) locked = true;
      }
      if (locked) {
        dx = Math.max(0, mx);
        el.style.transition = "none";
        el.style.transform = `translateX(${dx}px)`;
      }
    };
    const end = () => {
      if (!tracking || !locked) return;
      el.style.transition = "transform .3s cubic-bezier(.2,.9,.25,1)";
      if (dx > 90) {
        el.style.transform = `translateX(100%)`;
        onBack();
      } else el.style.transform = "";
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    el.addEventListener("touchend", end, { passive: true });
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
    };
  }, [onBack]);

  // ── interactive chart (TradingView), loaded on demand
  useEffect(() => {
    if (!tvOn || !tvRef.current) return;
    const host = tvRef.current;
    host.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "tradingview-widget-container";
    wrap.style.height = "100%";
    wrap.style.width = "100%";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = "100%";
    inner.style.width = "100%";
    wrap.appendChild(inner);
    const light = theme === "light";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      allow_symbol_change: false, calendar: false, details: false, hide_side_toolbar: true, hide_top_toolbar: false, hide_legend: false, hotlist: false,
      interval: tvTf, locale: "en", save_image: false, style: "1", symbol: `BSE:${sym}`, theme: light ? "light" : "dark", timezone: "Asia/Kolkata",
      backgroundColor: light ? "#FFFFFF" : "#0C0E14", gridColor: light ? "rgba(0,0,0,0.05)" : "rgba(242,242,242,0.06)",
      withdateranges: false, support_host: "https://www.tradingview.com", studies: ["RSI@tv-basicstudies", "MASimple@tv-basicstudies"], autosize: true,
    });
    wrap.appendChild(script);
    host.appendChild(wrap);
  }, [tvOn, tvTf, sym, theme]);

  // ── derived numbers
  const cmp = num(s.curr_price) || 0;
  const bk = num(s.breakout_level) || 0;
  const sl = num(s.stop_loss) || 0;
  const tg = num(s.target_1) || 0;
  const diff = bk > 0 ? ((cmp - bk) / bk) * 100 : 0;
  const ent = entryPriceFor(s);
  const rr = rewardRisk(s);
  const cls = getBreakoutClassification(s);
  const toTarget = tg > 0 && cmp > 0 ? ((tg - cmp) / cmp) * 100 : null;
  const toStop = sl > 0 && cmp > 0 ? ((sl - cmp) / cmp) * 100 : null;

  const low52 = num(detail?.w52_low), high52 = num(detail?.w52_high);
  const range52 = cmp && low52 != null && high52 != null && high52 > low52 ? Math.max(3, Math.min(97, Math.round(((cmp - low52) / (high52 - low52)) * 100))) : null;
  const rsi = num(detail?.rsi) ?? num(s.rsi);
  const ema20 = num(detail?.ema20), ema50 = num(detail?.ema50), ema200 = num(detail?.ema200);
  const vol = num(detail?.volume_ratio_20d) ?? num(s.volume_ratio_20d);
  const r1 = num(detail?.resistance_1), r2 = num(detail?.resistance_2), s1 = num(detail?.support_1);
  const ml = detail?.ml_decision;
  const fp = detail?.fingerprint_analysis;

  const good: string[] = Array.isArray(detail?.why_buy_reasons) ? detail.why_buy_reasons : [];
  const bad: string[] = Array.isArray(detail?.why_avoid_reasons) ? detail.why_avoid_reasons : [];
  if (!good.length) {
    if (vol != null && vol >= 1.5) good.push(`Heavy buying: volume is ${vol.toFixed(1)}× its 20-day average.`);
    if (stats && Number(stats.win_rate_pct) >= 50) good.push(`This pattern has won ${Number(stats.win_rate_pct).toFixed(0)}% of ${stats.resolved} past trades.`);
    if (rsi != null && rsi >= 55 && rsi <= 70) good.push(`Momentum is healthy (RSI ${rsi.toFixed(0)}).`);
  }
  if (!bad.length) {
    if (rsi != null && rsi > 70) bad.push(`Stretched: RSI ${rsi.toFixed(0)} means it may need to cool off.`);
    if (r1 != null && r1 > cmp) bad.push(`Sellers may appear near ₹${fmt(r1, 1)}.`);
    if (sl > 0) bad.push(`The setup is wrong if it closes below ₹${fmt(sl, 1)}.`);
  }

  const sizing = useMemo(() => {
    const r = Math.max(0, Number(riskCapital.replace(/\D/g, "")) || 0);
    const rps = sl > 0 && ent > sl ? ent - sl : 0;
    const qty = rps > 0 ? Math.floor(r / rps) : 0;
    return { qty, cap: qty * ent, profit: qty * (tg > ent ? tg - ent : 0), loss: qty * rps };
  }, [riskCapital, ent, sl, tg]);

  const share = async () => {
    const text = `📊 ${sym} — ${verdict.w}\nPrice ₹${fmt(cmp)} · Trigger ₹${fmt(bk, 1)} · Stop ₹${fmt(sl, 1)} · Target ₹${fmt(tg, 1)}${rr > 0 ? ` · ${rr.toFixed(1)}× reward vs risk` : ""}\n${why}`;
    try {
      if ((navigator as any).share) await (navigator as any).share({ text });
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    } catch (_) {}
  };

  const pill = (t: string, c?: string) => <span className="rsp-pill" style={c ? { color: c } : undefined}>{t}</span>;
  const kv = (k: React.ReactNode, v: React.ReactNode, last = false) => (
    <div className="rdr-kv" style={last ? { borderBottom: "none" } : undefined}>
      <span>{k}</span>
      <b className="rdr-num">{v}</b>
    </div>
  );
  const sec = (title: string, i: number, body: React.ReactNode, hint?: string) => (
    <section className="rsp-rise" style={{ ["--i" as any]: i }}>
      <div className="rdr-lab">{title}{hint ? <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500, marginLeft: 8, color: "var(--dim)" }}>{hint}</span> : null}</div>
      {body}
    </section>
  );

  // ── our own chart (fast, with stop/target zones)
  const chart = () => {
    if (chartState === "loading") return <div className="rdr-chartmsg">Loading chart…</div>;
    if (chartState === "error" || !candles.length) return <div className="rdr-chartmsg">Chart data unavailable</div>;
    const N = candles.length, W = 340, H = 200, pt = 12, pb = 10, pl = 6, pr = 54;
    const ch = H - pt - pb, cw = W - pl - pr;
    const lo = Math.min(...candles.map((b) => b.l), sl > 0 ? sl : Infinity) * 0.99;
    const hi = Math.max(...candles.map((b) => b.h), tg > 0 ? tg : 0) * 1.01;
    const rg = hi - lo || 1;
    const Y = (v: number) => pt + ch - ((Math.min(hi, Math.max(lo, v)) - lo) / rg) * ch;
    const X = (i: number) => pl + (i / (N - 1 || 1)) * cw;
    const bw = Math.max(2, Math.min(6, (cw / N) * 0.65));
    const ln = (v: number, c: string, t: string) =>
      v > 0 ? (
        <g>
          <line x1={pl} x2={W - pr + 4} y1={Y(v)} y2={Y(v)} stroke={c} strokeWidth="1" strokeDasharray="3 4" />
          <text x={W - 2} y={Y(v) + 3} textAnchor="end" fill={c} fontSize="9.5" fontWeight="700">{t}</text>
        </g>
      ) : null;
    return (
      <>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", display: "block", touchAction: "pan-y" }}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const x = Math.max(0, Math.min(r.width, e.clientX - r.left));
            setHover(candles[Math.min(N - 1, Math.floor((x / r.width) * N))]);
          }}
          onPointerLeave={() => setHover(null)}
        >
          {sl > 0 && bk > sl && <rect x={pl} y={Y(bk)} width={W - pr - pl + 4} height={Math.max(0, Y(sl) - Y(bk))} fill={colors.rd} opacity="0.09" />}
          {tg > bk && bk > 0 && <rect x={pl} y={Y(tg)} width={W - pr - pl + 4} height={Math.max(0, Y(bk) - Y(tg))} fill={colors.gn} opacity="0.09" />}
          {ln(bk, colors.acc, "Trigger")}
          {ln(sl, colors.rd, "Stop")}
          {ln(tg, colors.gn, "Target")}
          {candles.map((b, i) => {
            const c = b.c >= b.o ? colors.gn : colors.rd;
            const yT = Y(Math.max(b.o, b.c)), yB = Y(Math.min(b.o, b.c));
            return (
              <g key={i} className="rdr-cand" style={{ ["--c" as any]: i * 0.5 }}>
                <line x1={X(i)} x2={X(i)} y1={Y(b.h)} y2={Y(b.l)} stroke={c} strokeWidth="1" />
                <rect x={X(i) - bw / 2} y={yT} width={bw} height={Math.max(1.5, yB - yT)} fill={c} rx="0.8" />
              </g>
            );
          })}
          {cmp > 0 && (
            <g>
              <line x1={pl} x2={W - pr + 4} y1={Y(cmp)} y2={Y(cmp)} stroke={colors.ink} strokeWidth="0.8" opacity="0.6" />
              <rect x={W - pr + 5} y={Y(cmp) - 8} width={48} height={16} rx="4" fill={colors.ink} />
              <text x={W - pr + 29} y={Y(cmp) + 3.5} textAnchor="middle" fill={colors.bg} fontSize="10" fontWeight="800">{cmp.toFixed(1)}</text>
            </g>
          )}
        </svg>
        <div style={{ fontSize: 11, color: colors.mu, marginTop: 6, minHeight: 16 }}>
          {hover ? (
            <span>
              <b>{hover.time}</b> · O {hover.o.toFixed(1)} · H {hover.h.toFixed(1)} · L {hover.l.toFixed(1)} · C{" "}
              <span style={{ color: hover.c >= hover.o ? colors.gn : colors.rd, fontWeight: 700 }}>{hover.c.toFixed(1)}</span>
            </span>
          ) : (
            "Touch or drag across the chart to inspect sessions"
          )}
        </div>
      </>
    );
  };

  const gradeColor = ml ? (ml.conviction_grade === "ELITE" ? colors.gn : ml.conviction_grade === "STRONG" ? colors.acc : ml.conviction_grade === "NEUTRAL" ? colors.am : colors.rd) : colors.mu;
  const stat = (label: string, value: React.ReactNode, color?: string) => (
    <div className="rsp-stat">
      <div className="rsp-stat-l">{label}</div>
      <div className="rsp-stat-v rdr-num" style={color ? { color } : undefined}>{value}</div>
    </div>
  );

  return (
    <div ref={rootRef} className={`rsp${closing ? " closing" : ""}`}>
      <style>{RSP_CSS}</style>
      <div className="rsp-bar">
        <button className="rsp-back" onClick={onBack} aria-label="Back to Radar">
          <svg width="11" height="18" viewBox="0 0 11 18" fill="none"><path d="M9.5 1.5 2 9l7.5 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>Radar</span>
        </button>
        <div className={`rsp-mini${compact ? " on" : ""}`}>
          <b>{sym}</b>
          <span className="rdr-num">₹{fmt(cmp)}</span>
        </div>
        <button className="rsp-share" onClick={share} aria-label="Share">⤴</button>
      </div>

      <div className="rsp-wrap">
        {/* Hero */}
        <section className="rsp-rise rsp-hero" style={{ ["--i" as any]: 0 }}>
          <div className="rsp-eyebrow">
            {String(s.sector || "Equities")}
            {Number(s.is_fno) === 1 || s.is_fno === true ? " · F&O" : ""}
          </div>
          <div className="rsp-sym">{sym}</div>
          <div className="rsp-co">{s.company_name || detail?.company_name || sym}</div>
          <div className="rsp-priceRow">
            <div className="rsp-price rdr-num">₹{fmt(cmp)}</div>
            <div className="rsp-chg rdr-num" style={{ color: diff >= 0 ? colors.gn : colors.rd }}>
              {diff >= 0 ? "+" : ""}{diff.toFixed(1)}% <span>vs trigger</span>
            </div>
          </div>
          <div className="rsp-verdictRow">
            <span className="rdr-vtag" style={{ color: verdict.c, background: `${verdict.c}24` }}>{verdict.w}</span>
            {pill(String(s.pattern_type || "").split("·")[0].trim() || "Setup")}
            {pill(timeframeLabel(s.timeframe))}
          </div>
          <div className="rsp-why">{why}</div>
          {range52 != null && (
            <div className="rsp-range">
              <div className="rsp-range-h"><span>52-week range</span><span className="rdr-num">{range52}% of range</span></div>
              <div className="rsp-range-t"><i style={{ width: `${range52}%` }} /><b style={{ left: `${range52}%` }} /></div>
              <div className="rsp-range-l rdr-num"><span>₹{fmt(low52, 1)}</span><span>₹{fmt(high52, 1)}</span></div>
            </div>
          )}
        </section>

        {sec("Chart", 1, <div className="rdr-sbox" style={{ padding: "12px 10px 8px", marginTop: 0 }}>{chart()}</div>)}

        {sec("Key levels", 2, (
          <div className="rsp-levels">
            <div><span>Trigger</span><b className="rdr-num" style={{ color: colors.acc }}>₹{fmt(bk, 1)}</b></div>
            <div><span>Aim for</span><b className="rdr-num" style={{ color: colors.gn }}>₹{fmt(tg, 1)}</b><em className="rdr-num">{toTarget != null ? `${toTarget >= 0 ? "+" : ""}${toTarget.toFixed(1)}%` : ""}</em></div>
            <div><span>Exit at</span><b className="rdr-num" style={{ color: colors.rd }}>₹{fmt(sl, 1)}</b><em className="rdr-num">{toStop != null ? `${toStop.toFixed(1)}%` : ""}</em></div>
          </div>
        ))}

        {sec("Your plan", 3, (
          <div className="rdr-sbox" style={{ marginTop: 0 }}>
            {kv(s._tradeType === "RADAR" ? "Buy above" : "Buy around", <span style={{ color: colors.acc }}>₹{ent ? ent.toFixed(1) : "—"}</span>)}
            {kv("Exit if it falls to", <span style={{ color: colors.rd }}>₹{sl ? sl.toFixed(1) : "—"}</span>)}
            {kv("Aim for", <span style={{ color: colors.gn }}>₹{tg ? tg.toFixed(1) : "—"}</span>)}
            {kv("Reward vs risk", rr > 0 ? `${rr.toFixed(1)}×` : "—", true)}
          </div>
        ))}

        {sec("How much to buy", 4, (
          <div className="rdr-sbox" style={{ marginTop: 0 }}>
            <div className="rdr-kv">
              <span>Most you're willing to lose</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span>₹</span>
                <input className="rdr-input rdr-num" type="text" inputMode="numeric" value={riskCapital} onChange={(e) => setRiskCapital(e.target.value.replace(/\D/g, ""))} />
              </div>
            </div>
            {kv("Quantity", `${sizing.qty.toLocaleString("en-IN")} shares`)}
            {kv("Money needed", `₹${fmt0(sizing.cap)}`)}
            {kv("If target / if stopped", <span><b style={{ color: colors.gn }}>+₹{fmt0(sizing.profit)}</b> / <b style={{ color: colors.rd }}>−₹{fmt0(sizing.loss)}</b></span>, true)}
          </div>
        ))}

        {(good.length > 0 || bad.length > 0) && sec("The case", 5, (
          <div className="rsp-case">
            {good.length > 0 && (
              <div className="rsp-case-card good">
                <div className="rsp-case-h" style={{ color: colors.gn }}>What's working</div>
                {good.slice(0, 4).map((t, i) => <div key={i} className="rsp-case-i"><i style={{ background: colors.gn }} />{t}</div>)}
              </div>
            )}
            {bad.length > 0 && (
              <div className="rsp-case-card bad">
                <div className="rsp-case-h" style={{ color: colors.rd }}>What could go wrong</div>
                {bad.slice(0, 4).map((t, i) => <div key={i} className="rsp-case-i"><i style={{ background: colors.rd }} />{t}</div>)}
              </div>
            )}
          </div>
        ))}

        {sec("Why we like it", 6, (
          <div className="rdr-sbox" style={{ marginTop: 0 }}>
            {kv("Position vs trigger", cls.hasPivot ? `${cls.diffPct >= 0 ? "+" : ""}${cls.diffPct.toFixed(2)}%` : "—")}
            {Number(s.dna_score) > 0 && kv("Setup strength", `${Math.round(Number(s.dna_score))} / 100`)}
            {stats && kv("Past results of this pattern", <span style={{ color: Number(stats.win_rate_pct) >= 50 ? colors.gn : colors.am }}>{Number(stats.win_rate_pct).toFixed(0)}% won · {stats.resolved} trades</span>)}
            {stats && kv("Average result", `${Number(stats.avg_pnl_pct) >= 0 ? "+" : ""}${Number(stats.avg_pnl_pct).toFixed(1)}%`)}
            {gate && kv("Quality check", `${gate.survival_verdict || "—"}${gate.post_win_rate !== undefined ? ` · ${Number(gate.post_win_rate).toFixed(0)}% after filter` : ""}`)}
            {num(s.adx14) != null && kv("Trend strength", Number(s.adx14).toFixed(0))}
            {kv("Timeframe", timeframeLabel(s.timeframe), true)}
          </div>
        ))}

        {ml && sec("Model confidence", 7, (
          <div className="rdr-sbox" style={{ marginTop: 0, padding: 16 }}>
            <div className="rdr-row" style={{ alignItems: "center" }}>
              <div style={{ fontSize: 13, color: "var(--mu)" }}>Trained on past setups</div>
              <span className="rdr-vtag" style={{ color: gradeColor, background: `${gradeColor}24` }}>{ml.conviction_grade}</span>
            </div>
            <div className="rsp-stats">
              {stat("Win probability", ml.win_probability_pct, colors.gn)}
              {stat("Expected value", `${Number(ml.expected_value_pct) > 0 ? "+" : ""}${ml.expected_value_pct}%`, Number(ml.expected_value_pct) >= 0 ? colors.gn : colors.rd)}
              {stat("Pattern match", fp?.top_similarity_pct || "—", colors.acc)}
              {stat("Look-alikes that won", fp?.twin_historical_win_rate_pct != null ? `${fp.twin_historical_win_rate_pct}%` : "—", colors.am)}
            </div>
            {Array.isArray(fp?.top_historical_twins) && fp.top_historical_twins.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "var(--mu)", fontWeight: 700, marginBottom: 6 }}>CLOSEST PAST LOOK-ALIKES</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {fp.top_historical_twins.slice(0, 3).map((tw: any, i: number) => (
                    <span key={i} className="rsp-twin" style={{ color: tw.realized_win ? colors.gn : colors.rd, borderColor: tw.realized_win ? `${colors.gn}55` : `${colors.rd}55` }}>
                      {tw.symbol} · {String(tw.date || "").slice(0, 7)} · {tw.similarity_pct} match · {tw.mfe_gain_pct > 0 ? `+${tw.mfe_gain_pct}% peak` : `${tw.mfe_gain_pct}%`}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 12 }}>Past results are information, not a promise of future returns.</div>
          </div>
        ))}

        {(rsi != null || ema20 != null || vol != null) && sec("Technical health", 8, (
          <div className="rsp-tech">
            {rsi != null && (
              <div className="rsp-pod">
                <div className="rsp-pod-h"><span>Momentum (RSI)</span><b style={{ color: rsi >= 60 ? colors.gn : rsi <= 40 ? colors.rd : colors.am }}>{rsi >= 70 ? "Stretched" : rsi >= 60 ? "Strong" : rsi <= 40 ? "Weak" : "Balanced"}</b></div>
                <div className="rsp-pod-v rdr-num">{rsi.toFixed(1)}</div>
                <div className="rsp-bar-t"><i style={{ width: `${Math.max(5, Math.min(95, rsi))}%`, background: `linear-gradient(90deg,${colors.rd},${colors.am},${colors.gn})` }} /></div>
              </div>
            )}
            {vol != null && (
              <div className="rsp-pod">
                <div className="rsp-pod-h"><span>Buying interest</span><b style={{ color: vol >= 1.5 ? colors.gn : colors.mu }}>{vol >= 1.5 ? "Heavy" : vol < 1 ? "Light" : "Normal"}</b></div>
                <div className="rsp-pod-v rdr-num">{vol.toFixed(1)}×</div>
                <div className="rsp-bar-t"><i style={{ width: `${Math.min(100, Math.max(8, vol * 25))}%`, background: colors.acc }} /></div>
              </div>
            )}
            {(ema20 != null || ema50 != null || ema200 != null) && (
              <div className="rsp-pod">
                <div className="rsp-pod-h"><span>Moving averages</span><b style={{ color: colors.mu }}>{detail?.ema_alignment === "BULL_STACK" ? "Bullish stack" : "Price vs average"}</b></div>
                {([["20", ema20], ["50", ema50], ["200", ema200]] as [string, number | null][]).map(([k, v]) => v != null && (
                  <div key={k} className="rdr-kv" style={{ padding: "8px 0", fontSize: 13 }}>
                    <span>{k}-day</span>
                    <b className="rdr-num">₹{fmt(v, 1)} <span style={{ color: cmp >= v ? colors.gn : colors.rd }}>{cmp >= v ? "above" : "below"}</span></b>
                  </div>
                ))}
              </div>
            )}
            {(r1 != null || r2 != null || s1 != null) && (
              <div className="rsp-pod">
                <div className="rsp-pod-h"><span>Support &amp; resistance</span></div>
                {r2 != null && kv("Resistance 2", `₹${fmt(r2, 1)}`)}
                {r1 != null && kv("Resistance 1", `₹${fmt(r1, 1)}`)}
                {s1 != null && kv("Support 1", `₹${fmt(s1, 1)}`, true)}
              </div>
            )}
          </div>
        ))}

        {sec("Interactive chart", 9, (
          <div className="rdr-sbox" style={{ marginTop: 0, padding: 12 }}>
            {!tvOn ? (
              <button className="rdr-btn2" style={{ margin: 0 }} onClick={() => setTvOn(true)}>Open full interactive chart</button>
            ) : (
              <>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {(["D", "W", "M"] as const).map((t) => (
                    <button key={t} className={`rdr-chip${tvTf === t ? " on" : ""}`} onClick={() => setTvTf(t)}>{t === "D" ? "1D" : t === "W" ? "1W" : "1M"}</button>
                  ))}
                </div>
                <div ref={tvRef} style={{ height: 420, borderRadius: 14, overflow: "hidden" }} />
              </>
            )}
          </div>
        ))}

        <div className="rsp-rise" style={{ ["--i" as any]: 10 }}>
          <button className="rdr-cta" onClick={onOpenDna}>Open full DNA report</button>
          <button className="rdr-btn2" onClick={share}>Share this setup</button>
          <button className="rdr-btn2" style={{ color: alertOn ? colors.gn : undefined }} onClick={() => { setAlertOn(true); setToast(`Alert set at ₹${fmt(bk, 1)}`); setTimeout(() => setToast(""), 2200); }}>
            {alertOn ? "✓ Price alert active" : `Alert me at ₹${fmt(bk, 1)}`}
          </button>
          <div style={{ fontSize: 11, color: "var(--dim)", textAlign: "center", margin: "18px 8px 0" }}>Not investment advice. Setups are scanner output; always size to risk you can afford.</div>
        </div>
        <div style={{ height: 60 }} />
      </div>
      {toast && <div className="rsp-toast">{toast}</div>}
    </div>
  );
}

const RSP_CSS = `
.rsp{position:fixed;inset:0;z-index:70;overflow-y:auto;overflow-x:hidden;background:var(--bg);color:var(--ink);overscroll-behavior:contain;scrollbar-width:none;animation:rspin .5s cubic-bezier(.2,.9,.25,1) both;font-family:inherit}
.rsp::-webkit-scrollbar{display:none}
.rsp.closing{animation:rspout .32s cubic-bezier(.4,0,.8,.4) both}
@keyframes rspin{from{transform:translateX(100%)}to{transform:none}}
@keyframes rspout{from{transform:none}to{transform:translateX(100%)}}
.rsp *{box-sizing:border-box;min-width:0}
.rsp:before{content:"";position:absolute;left:0;right:0;top:0;height:380px;background:radial-gradient(60% 70% at 25% 0,rgba(124,140,255,.25),transparent 70%),radial-gradient(50% 60% at 90% 10%,rgba(167,139,250,.16),transparent 70%);pointer-events:none}
.rsp-bar{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:max(14px,env(safe-area-inset-top)) 14px 10px;background:linear-gradient(var(--bg) 60%,transparent);backdrop-filter:blur(10px)}
.rsp-back{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 14px 0 11px;border-radius:99px;background:var(--glass);border:1px solid var(--line);color:var(--acc);font-size:15px;font-weight:650;cursor:pointer}
.rsp-share{width:38px;height:38px;border-radius:50%;background:var(--glass);border:1px solid var(--line);color:var(--ink);font-size:16px;cursor:pointer}
.rsp-mini{display:flex;flex-direction:column;align-items:center;line-height:1.15;opacity:0;transform:translateY(6px);transition:all .3s;pointer-events:none}
.rsp-mini.on{opacity:1;transform:none}
.rsp-mini b{font-size:14px;font-weight:780}.rsp-mini span{font-size:12px;color:var(--mu)}
.rsp-wrap{position:relative;max-width:620px;margin:0 auto;padding:0 18px}
.rsp-rise{animation:rdrrise .7s cubic-bezier(.2,.9,.25,1) both;animation-delay:calc(var(--i,0)*60ms + 220ms)}
.rsp-hero{padding:8px 4px 6px}
.rsp-eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--mu);font-weight:700}
.rsp-sym{font-size:clamp(32px,10vw,46px);font-weight:820;letter-spacing:-.04em;line-height:1.05;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsp-co{font-size:14px;color:var(--mu);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsp-priceRow{display:flex;align-items:baseline;gap:12px;margin-top:16px;flex-wrap:wrap}
.rsp-price{font-size:clamp(30px,9vw,40px);font-weight:800;letter-spacing:-.03em}
.rsp-chg{font-size:15px;font-weight:700}.rsp-chg span{font-weight:500;color:var(--mu);font-size:12.5px}
.rsp-verdictRow{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:14px}
.rsp-pill{padding:4px 10px;border-radius:99px;background:var(--glass);border:1px solid var(--line);font-size:11.5px;font-weight:650;color:var(--mu);white-space:nowrap}
.rsp-why{font-size:15px;line-height:1.5;color:var(--mu);margin-top:12px}
.rsp-range{margin-top:20px;padding:14px 16px;border-radius:18px;background:var(--glass);border:1px solid var(--line)}
.rsp-range-h{display:flex;justify-content:space-between;font-size:12px;color:var(--mu);font-weight:600}
.rsp-range-t{position:relative;height:6px;border-radius:3px;background:var(--glass2);margin:12px 0 8px}
.rsp-range-t i{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:linear-gradient(90deg,var(--acc),var(--acc2))}
.rsp-range-t b{position:absolute;top:-5px;width:16px;height:16px;margin-left:-8px;border-radius:50%;background:#fff;border:4px solid var(--acc);box-shadow:0 3px 10px rgba(0,0,0,.4)}
.rsp-range-l{display:flex;justify-content:space-between;font-size:12px;color:var(--dim)}
.rsp-levels{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.rsp-levels>div{padding:14px 12px;border-radius:18px;background:linear-gradient(165deg,var(--glass2),var(--glass));border:1px solid var(--line);box-shadow:var(--sh)}
.rsp-levels span{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mu);font-weight:700}
.rsp-levels b{display:block;font-size:17px;margin-top:6px;font-weight:780}
.rsp-levels em{display:block;font-style:normal;font-size:11.5px;color:var(--mu);margin-top:2px}
.rsp-case{display:grid;gap:10px}
.rsp-case-card{padding:14px 16px;border-radius:18px;background:var(--glass);border:1px solid var(--line)}
.rsp-case-h{font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:750;margin-bottom:8px}
.rsp-case-i{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.45;color:var(--ink);padding:5px 0}
.rsp-case-i i{flex:0 0 7px;height:7px;border-radius:50%;margin-top:7px}
.rsp-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.rsp-stat{padding:10px 12px;border-radius:14px;background:var(--glass2);border:1px solid var(--line)}
.rsp-stat-l{font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--mu);font-weight:700}
.rsp-stat-v{font-size:19px;font-weight:800;margin-top:3px}
.rsp-twin{font-size:11px;padding:4px 9px;border-radius:99px;border:1px solid;font-weight:650}
.rsp-tech{display:grid;gap:10px}
.rsp-pod{padding:14px 16px;border-radius:18px;background:var(--glass);border:1px solid var(--line)}
.rsp-pod-h{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--mu);font-weight:650}
.rsp-pod-v{font-size:26px;font-weight:800;margin:6px 0 8px;letter-spacing:-.02em}
.rsp-bar-t{height:6px;border-radius:3px;background:var(--glass2);overflow:hidden}
.rsp-bar-t i{display:block;height:100%;border-radius:3px}
.rsp-toast{position:fixed;left:50%;bottom:30px;transform:translateX(-50%);padding:11px 18px;border-radius:99px;background:var(--ink);color:var(--bg);font-size:13px;font-weight:650;z-index:80;animation:rdrfade .2s both}
@media (prefers-reduced-motion:reduce){.rsp,.rsp-rise{animation-duration:.01ms!important}}
`;
