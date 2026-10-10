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
  const [view, setView] = useState<"tactical" | "macro" | "monthly">(() => {
    const t = String(s.timeframe || "").toUpperCase();
    return t === "MONTHLY" || t === "1M" ? "monthly" : t === "WEEKLY" || t === "1W" ? "macro" : "tactical";
  });
  const [dnaSrc, setDnaSrc] = useState("");
  const [dnaLoading, setDnaLoading] = useState(true);
  const [dnaError, setDnaError] = useState(false);
  const [dnaKey, setDnaKey] = useState(0);
  const [invest, setInvest] = useState("10000");
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

  // ── server-rendered pattern chart (trendlines, base, pivot) — same renderer as the DNA report
  useEffect(() => {
    let cancelled = false;
    setDnaLoading(true);
    setDnaError(false);
    const q = `view=${view}&theme=${theme}${dnaKey > 0 ? "&force=true" : ""}&t=${Date.now()}`;
    const primary = `/api/dna/chart/${sym}?${q}`;
    const fallback = `https://quantsync-api.duckdns.org:8443/api/dna/chart/${sym}?${q}`;
    const fail = () => {
      if (!cancelled) {
        setDnaError(true);
        setDnaLoading(false);
      }
    };
    const ok = (src: string) => () => {
      if (!cancelled) {
        setDnaSrc(src);
        setDnaLoading(false);
      }
    };
    const tryFallback = () => {
      const fb = new Image();
      fb.onload = ok(fallback);
      fb.onerror = fail;
      fb.src = fallback;
    };
    const img = new Image();
    const timer = setTimeout(tryFallback, 4500);
    img.onload = () => { clearTimeout(timer); ok(primary)(); };
    img.onerror = () => { clearTimeout(timer); tryFallback(); };
    img.src = primary;
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sym, view, theme, dnaKey]);

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

  const calc = useMemo(() => {
    const amt = Math.max(0, Number(invest.replace(/\D/g, "")) || 0);
    const qty = ent > 0 ? Math.floor(amt / ent) : 0;
    const used = qty * ent;
    const profit = tg > ent ? qty * (tg - ent) : 0;
    const loss = sl > 0 && ent > sl ? qty * (ent - sl) : 0;
    return {
      amt, qty, used, left: amt - used, profit, loss,
      profitPct: tg > ent && ent > 0 ? ((tg - ent) / ent) * 100 : 0,
      lossPct: sl > 0 && ent > sl ? ((ent - sl) / ent) * 100 : 0,
    };
  }, [invest, ent, sl, tg]);

  const share = async () => {
    const text = `📊 ${sym} — ${verdict.w}\nPrice ₹${fmt(cmp)} · Trigger ₹${fmt(bk, 1)} · Stop ₹${fmt(sl, 1)} · Target ₹${fmt(tg, 1)}${rr > 0 ? ` · ${rr.toFixed(1)}× reward vs risk` : ""}\n${why}`;
    try {
      if ((navigator as any).share) await (navigator as any).share({ text });
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    } catch (_) {}
  };

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

  // ── fallback price chart (only when the pattern chart is not ready)
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
            if (!(r.width > 0)) return;
            const x = Math.max(0, Math.min(r.width, e.clientX - r.left));
            const idx = Math.max(0, Math.min(N - 1, Math.floor((x / r.width) * N)));
            setHover(candles[idx] || null);
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
              <g key={i}>
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
              <b>{hover.time}</b> · O {Number(hover.o).toFixed(1)} · H {Number(hover.h).toFixed(1)} · L {Number(hover.l).toFixed(1)} · C{" "}
              <span style={{ color: hover.c >= hover.o ? colors.gn : colors.rd, fontWeight: 700 }}>{Number(hover.c).toFixed(1)}</span>
            </span>
          ) : (
            "Touch or drag across the chart to inspect sessions"
          )}
        </div>
      </>
    );
  };

  // ── price bar (stop → trigger → target with today's price)
  const ruler = () => {
    const pts = [sl, bk, tg, cmp].filter((v) => v > 0);
    if (pts.length < 2 || !(bk > 0)) return null;
    const lo = Math.min(...pts) * 0.99, hi = Math.max(...pts) * 1.01;
    const P = (v: number) => Math.max(3, Math.min(97, ((v - lo) / (hi - lo)) * 100));
    return (
      <div className="rdr-ruler" style={{ marginTop: 18 }}>
        <div className="rdr-rt">
          {sl > 0 && <i style={{ left: `${P(sl)}%`, width: `${P(bk) - P(sl)}%`, background: "rgba(251,113,133,.5)" }} />}
          {tg > 0 && <i style={{ left: `${P(bk)}%`, width: `${P(tg) - P(bk)}%`, background: "rgba(52,211,153,.5)" }} />}
        </div>
        <div className="rdr-rd" style={{ left: `${P(cmp)}%` }} />
      </div>
    );
  };

  const gradeColor = ml ? (ml.conviction_grade === "ELITE" ? colors.gn : ml.conviction_grade === "STRONG" ? colors.acc : ml.conviction_grade === "NEUTRAL" ? colors.am : colors.rd) : colors.mu;
  const winPct = stats ? Math.max(0, Math.min(100, Number(stats.win_rate_pct))) : null;
  const tile = (label: string, value: React.ReactNode, note?: React.ReactNode, color?: string, bar?: { pct: number; bg: string }) => (
    <div className="rsp-tile">
      <div className="rsp-tile-l">{label}</div>
      <div className="rsp-tile-v rdr-num" style={color ? { color } : undefined}>{value}</div>
      {note ? <div className="rsp-tile-n">{note}</div> : null}
      {bar ? <div className="rsp-bar-t"><i style={{ width: `${bar.pct}%`, background: bar.bg }} /></div> : null}
    </div>
  );
  const above = [ema20, ema50, ema200].filter((v) => v != null && cmp >= (v as number)).length;
  const emaCount = [ema20, ema50, ema200].filter((v) => v != null).length;
  const accent = verdict.c;

  return (
    <div ref={rootRef} className={`rsp${closing ? " closing" : ""}`} style={{ ["--vc" as any]: accent }}>
      <style>{RSP_CSS}</style>
      <div className="rsp-bar">
        <div className={`rsp-mini${compact ? " on" : ""}`}>
          <b>{sym}</b>
          <span className="rdr-num">₹{fmt(cmp)} <i style={{ color: diff >= 0 ? colors.gn : colors.rd, fontStyle: "normal" }}>{diff >= 0 ? "+" : ""}{diff.toFixed(1)}%</i></span>
        </div>
        <button className="rsp-share" onClick={share} aria-label="Share">⤴</button>
      </div>

      <div className="rsp-wrap">
        {/* Identity — compact so the chart is the first big thing */}
        <section className="rsp-rise rsp-id" style={{ ["--i" as any]: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div className="rsp-eyebrow">{String(s.sector || "Equities")}{Number(s.is_fno) === 1 || s.is_fno === true ? " · F&O" : ""} · {timeframeLabel(s.timeframe)}</div>
            <div className="rsp-sym">{sym}</div>
            <div className="rsp-co">{s.company_name || detail?.company_name || sym}</div>
          </div>
          <div style={{ textAlign: "right", flex: "0 0 auto" }}>
            <div className="rsp-price rdr-num">₹{fmt(cmp)}</div>
            <div className="rsp-chg rdr-num" style={{ color: diff >= 0 ? colors.gn : colors.rd }}>{diff >= 0 ? "+" : ""}{diff.toFixed(1)}% <span>vs trigger</span></div>
          </div>
        </section>

        {/* 1. Chart (hero) */}
        <section className="rsp-rise rsp-chartcard" style={{ ["--i" as any]: 1 }}>
          <div className="rsp-tfrow">
            <div className="rsp-tf" role="group" aria-label="Chart timeframe">
              {([["tactical", "1D"], ["macro", "1W"], ["monthly", "1M"]] as const).map(([k, l]) => (
                <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)} aria-pressed={view === k}>{l}</button>
              ))}
            </div>
            <span className="rsp-hint">Pattern &amp; trendlines</span>
            <button className="rsp-reload" onClick={() => setDnaKey((k) => k + 1)} aria-label="Reload chart">↻</button>
          </div>
          <div className="rsp-stage">
            {dnaLoading && <div className="rsp-stage-load"><i />Drawing pattern &amp; trendlines…</div>}
            {!dnaError && dnaSrc && <img src={dnaSrc} alt={`${sym} pattern chart`} className={dnaLoading ? "reloading" : ""} />}
            {dnaError && (
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 12, color: "var(--mu)", marginBottom: 8 }}>Pattern chart is not ready yet. Showing price chart.</div>
                {chart()}
              </div>
            )}
          </div>
          <div className="rsp-legend">
            <span><i style={{ background: colors.gn }} />Target <b className="rdr-num">₹{fmt(tg, 1)}</b></span>
            <span><i style={{ background: colors.acc }} />Trigger <b className="rdr-num">₹{fmt(bk, 1)}</b></span>
            <span><i style={{ background: colors.rd }} />Stop <b className="rdr-num">₹{fmt(sl, 1)}</b></span>
          </div>
        </section>

        {/* 2. The decision */}
        <section className="rsp-rise rsp-decision" style={{ ["--i" as any]: 2 }}>
          <div className="rsp-dec-top">
            <span className="rdr-vtag" style={{ color: verdict.c, background: `${verdict.c}26`, fontSize: 15, padding: "6px 14px" }}>{verdict.w}</span>
            {rr > 0 && <span className="rsp-rr rdr-num">{rr.toFixed(1)}× reward vs risk</span>}
          </div>
          <div className="rsp-why">{why}</div>
          {ruler()}
          <div className="rsp-levels">
            <div><span>{s._tradeType === "RADAR" ? "Buy above" : "Buy around"}</span><b className="rdr-num" style={{ color: colors.acc }}>₹{fmt(ent, 1)}</b></div>
            <div><span>Aim for</span><b className="rdr-num" style={{ color: colors.gn }}>₹{fmt(tg, 1)}</b><em className="rdr-num">{toTarget != null ? `${toTarget >= 0 ? "+" : ""}${toTarget.toFixed(1)}%` : ""}</em></div>
            <div><span>Exit at</span><b className="rdr-num" style={{ color: colors.rd }}>₹{fmt(sl, 1)}</b><em className="rdr-num">{toStop != null ? `${toStop.toFixed(1)}%` : ""}</em></div>
          </div>
        </section>

        {/* 3. Invest calculator */}
        {sec("If you invest", 3, (
          <div className="rdr-sbox" style={{ marginTop: 0 }}>
            <div className="rdr-kv">
              <span>Amount you can invest</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span>₹</span>
                <input className="rdr-input rdr-num" type="text" inputMode="numeric" value={invest} onChange={(e) => setInvest(e.target.value.replace(/\D/g, ""))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
              {[10000, 25000, 50000, 100000].map((v) => (
                <button key={v} className={`rdr-chip${calc.amt === v ? " on" : ""}`} onClick={() => setInvest(String(v))}>{v >= 100000 ? "₹1 lakh" : `₹${v / 1000}k`}</button>
              ))}
            </div>
            {calc.qty > 0 ? (
              <>
                {kv("You can buy", `${calc.qty.toLocaleString("en-IN")} share${calc.qty === 1 ? "" : "s"} at ₹${fmt(ent, 1)}`)}
                {kv("Money used", `₹${fmt0(calc.used)}`)}
                {kv("If it reaches the target", <span style={{ color: colors.gn }}>+₹{fmt0(calc.profit)} <small>(+{calc.profitPct.toFixed(1)}%)</small></span>)}
                {kv("If it hits the stop-loss", <span style={{ color: colors.rd }}>−₹{fmt0(calc.loss)} <small>(−{calc.lossPct.toFixed(1)}%)</small></span>, true)}
              </>
            ) : (
              <div className="rdr-kv" style={{ borderBottom: "none", color: "var(--mu)" }}>
                {calc.amt > 0 ? `One share costs ₹${fmt(ent, 1)}. Enter at least that to see a result.` : "Enter an amount to see profit and loss."}
              </div>
            )}
          </div>
        ), "profit and loss at the target and the stop")}

        {/* 4. Evidence */}
        {(stats || ml || gate) && sec("Can you trust it?", 4, (
          <div className="rsp-evidence">
            {stats && winPct != null && (
              <div className="rsp-ev-row">
                <div className="rsp-ring" style={{ background: `conic-gradient(${winPct >= 50 ? colors.gn : colors.am} ${winPct}%, var(--glass2) 0)` }}>
                  <div><b className="rdr-num">{winPct.toFixed(0)}%</b><span>won</span></div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="rsp-ev-t">This pattern's track record</div>
                  <div className="rsp-ev-s">{stats.resolved} similar setups · average {Number(stats.avg_pnl_pct) >= 0 ? "+" : ""}{Number(stats.avg_pnl_pct).toFixed(1)}% per trade{gate?.survival_verdict ? ` · quality check: ${gate.survival_verdict}` : ""}</div>
                </div>
              </div>
            )}
            {ml && (
              <div className="rsp-ml">
                <div className="rdr-row" style={{ alignItems: "center" }}>
                  <div className="rsp-ev-t">Model confidence</div>
                  <span className="rdr-vtag" style={{ color: gradeColor, background: `${gradeColor}26` }}>{ml.conviction_grade}</span>
                </div>
                <div className="rsp-stats">
                  <div><span>Win probability</span><b className="rdr-num" style={{ color: colors.gn }}>{ml.win_probability_pct}</b></div>
                  <div><span>Expected value</span><b className="rdr-num" style={{ color: Number(ml.expected_value_pct) >= 0 ? colors.gn : colors.rd }}>{Number(ml.expected_value_pct) > 0 ? "+" : ""}{ml.expected_value_pct}%</b></div>
                  <div><span>Pattern match</span><b className="rdr-num" style={{ color: colors.acc }}>{fp?.top_similarity_pct || "—"}</b></div>
                  <div><span>Look-alikes that won</span><b className="rdr-num" style={{ color: colors.am }}>{fp?.twin_historical_win_rate_pct != null ? `${fp.twin_historical_win_rate_pct}%` : "—"}</b></div>
                </div>
                {Array.isArray(fp?.top_historical_twins) && fp.top_historical_twins.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {fp.top_historical_twins.slice(0, 3).map((tw: any, i: number) => (
                      <span key={i} className="rsp-twin" style={{ color: tw.realized_win ? colors.gn : colors.rd, borderColor: tw.realized_win ? `${colors.gn}66` : `${colors.rd}66` }}>
                        {tw.symbol} · {String(tw.date || "").slice(0, 7)} · {tw.mfe_gain_pct > 0 ? `+${tw.mfe_gain_pct}%` : `${tw.mfe_gain_pct}%`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ), "history, not a promise")}

        {/* 5. The case */}
        {(good.length > 0 || bad.length > 0) && sec("The case", 5, (
          <div className="rsp-case">
            {good.length > 0 && (
              <div className="rsp-case-card" style={{ ["--cc" as any]: colors.gn }}>
                <div className="rsp-case-h" style={{ color: colors.gn }}>What's working</div>
                {good.slice(0, 4).map((t, i) => <div key={i} className="rsp-case-i"><i style={{ background: colors.gn }} />{t}</div>)}
              </div>
            )}
            {bad.length > 0 && (
              <div className="rsp-case-card" style={{ ["--cc" as any]: colors.rd }}>
                <div className="rsp-case-h" style={{ color: colors.rd }}>What could go wrong</div>
                {bad.slice(0, 4).map((t, i) => <div key={i} className="rsp-case-i"><i style={{ background: colors.rd }} />{t}</div>)}
              </div>
            )}
          </div>
        ))}

        {/* 6. Health check */}
        {(rsi != null || vol != null || emaCount > 0 || range52 != null) && sec("Health check", 6, (
          <>
            <div className="rsp-tiles">
              {rsi != null && tile("Momentum (RSI)", rsi.toFixed(0), rsi >= 70 ? "Stretched" : rsi >= 60 ? "Strong" : rsi <= 40 ? "Weak" : "Balanced", rsi >= 60 && rsi < 70 ? colors.gn : rsi >= 70 ? colors.am : rsi <= 40 ? colors.rd : undefined, { pct: Math.max(5, Math.min(95, rsi)), bg: `linear-gradient(90deg,${colors.rd},${colors.am},${colors.gn})` })}
              {vol != null && tile("Buying interest", `${vol.toFixed(1)}×`, vol >= 1.5 ? "Heavy" : vol < 1 ? "Light" : "Normal", vol >= 1.5 ? colors.gn : undefined, { pct: Math.min(100, Math.max(8, vol * 25)), bg: colors.acc })}
              {emaCount > 0 && tile("Trend", `${above}/${emaCount}`, `above ${emaCount === 3 ? "20, 50 & 200-day" : "key"} averages`, above === emaCount ? colors.gn : above === 0 ? colors.rd : colors.am, { pct: (above / emaCount) * 100, bg: colors.gn })}
              {range52 != null && tile("52-week range", `${range52}%`, `₹${fmt0(low52)} – ₹${fmt0(high52)}`, undefined, { pct: range52, bg: `linear-gradient(90deg,${colors.acc},${colors.rd === "x" ? "" : "#8B5CF6"})` })}
            </div>
            {(r1 != null || r2 != null || s1 != null) && (
              <div className="rdr-sbox" style={{ marginTop: 10 }}>
                {r2 != null && kv("Resistance 2", `₹${fmt(r2, 1)}`)}
                {r1 != null && kv("Resistance 1", `₹${fmt(r1, 1)}`)}
                {s1 != null && kv("Support 1", `₹${fmt(s1, 1)}`, true)}
              </div>
            )}
          </>
        ))}

        {/* 7. Interactive chart (on demand) */}
        {sec("Interactive chart", 7, (
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

        <div className="rsp-rise" style={{ ["--i" as any]: 8 }}>
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
.rsp{position:absolute;inset:0;z-index:40;overflow-y:auto;overflow-x:hidden;background:var(--bg);color:var(--ink);overscroll-behavior:contain;scrollbar-width:none;animation:rspin .5s cubic-bezier(.2,.9,.25,1) both;font-family:inherit}
.rdr-root.light .rsp{background:linear-gradient(180deg,#E3E8F7,#EEF1FA 45%,#E9EDF8)}
.rsp::-webkit-scrollbar{display:none}
.rsp.closing{animation:rspout .32s cubic-bezier(.4,0,.8,.4) both}
@keyframes rspin{from{transform:translateX(100%)}to{transform:none}}
@keyframes rspout{from{transform:none}to{transform:translateX(100%)}}
.rsp *{box-sizing:border-box;min-width:0}
.rsp:before{content:"";position:absolute;left:0;right:0;top:0;height:420px;background:radial-gradient(60% 70% at 25% 0,color-mix(in srgb,var(--vc,#7C8CFF) 30%,transparent),transparent 70%),radial-gradient(50% 60% at 92% 8%,rgba(167,139,250,.22),transparent 70%);pointer-events:none}
.rsp-bar{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 14px 4px;min-height:44px;pointer-events:none}
.rsp-bar>*{pointer-events:auto}
.rsp-share{width:38px;height:38px;border-radius:50%;background:var(--glass);border:1px solid var(--line);color:var(--ink);font-size:16px;cursor:pointer;box-shadow:var(--sh);margin-left:auto}
.rsp-mini{position:absolute;left:50%;transform:translate(-50%,6px);display:flex;flex-direction:column;align-items:center;line-height:1.15;opacity:0;transition:all .3s;pointer-events:none;padding:5px 14px;border-radius:14px;background:var(--glass);border:1px solid var(--line);box-shadow:var(--sh)}
.rsp-mini.on{opacity:1;transform:translate(-50%,0)}
.rsp-mini b{font-size:14px;font-weight:780}.rsp-mini span{font-size:12px;color:var(--mu)}
.rsp-wrap{position:relative;max-width:620px;margin:0 auto;padding:0 16px}
.rsp-rise{animation:rdrrise .7s cubic-bezier(.2,.9,.25,1) both;animation-delay:calc(var(--i,0)*60ms + 200ms)}
.rsp-id{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;padding:0 4px 14px}
.rsp-eyebrow{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);font-weight:700}
.rsp-sym{font-size:clamp(26px,8vw,34px);font-weight:820;letter-spacing:-.035em;line-height:1.05;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsp-co{font-size:13px;color:var(--mu);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rsp-price{font-size:clamp(24px,7.5vw,32px);font-weight:800;letter-spacing:-.03em;white-space:nowrap}
.rsp-chg{font-size:13.5px;font-weight:700;white-space:nowrap}.rsp-chg span{font-weight:500;color:var(--mu);font-size:11.5px}
.rsp-chartcard,.rsp-decision{border-radius:26px;background:linear-gradient(165deg,var(--glass2),var(--glass));border:1px solid var(--line);box-shadow:var(--sh);padding:12px;margin-bottom:14px}
.rdr-root.light .rsp-chartcard,.rdr-root.light .rsp-decision{background:linear-gradient(165deg,#fff 45%,#F1F3FF)}
.rsp-decision{position:relative;overflow:hidden;padding:18px 18px 16px}
.rsp-decision:after{content:"";position:absolute;right:-40px;top:-50px;width:210px;height:180px;background:radial-gradient(closest-side,color-mix(in srgb,var(--vc,#7C8CFF) 32%,transparent),transparent);pointer-events:none}
.rsp-decision>*{position:relative;z-index:1}
.rsp-dec-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.rsp-rr{font-size:12.5px;font-weight:700;color:var(--mu);padding:5px 11px;border-radius:99px;background:var(--glass2);border:1px solid var(--line)}
.rsp-why{font-size:15px;line-height:1.5;color:var(--ink);opacity:.82;margin-top:12px}
.rsp-tfrow{display:flex;align-items:center;gap:10px;margin:2px 2px 10px}
.rsp-hint{font-size:11.5px;color:var(--mu);flex:1;text-align:right}
.rsp-tf{display:inline-flex;padding:3px;border-radius:99px;background:var(--glass2);border:1px solid var(--line)}
.rsp-tf button{border:none;background:none;color:var(--mu);font-size:13px;font-weight:700;padding:6px 16px;border-radius:99px;cursor:pointer}
.rsp-tf button.on{background:linear-gradient(150deg,var(--acc),var(--acc2));color:#fff;box-shadow:0 6px 14px -6px var(--acc)}
.rsp-reload{width:32px;height:32px;border-radius:50%;border:1px solid var(--line);background:var(--glass);color:var(--mu);cursor:pointer;font-size:16px}
.rsp-stage{position:relative;min-height:240px;border-radius:16px;overflow:hidden;background:var(--glass2)}
.rsp-stage img{width:100%;display:block;transition:opacity .3s}.rsp-stage img.reloading{opacity:.35}
.rsp-stage-load{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-size:12.5px;color:var(--mu);z-index:2}
.rsp-stage-load i{width:26px;height:26px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--acc);animation:rspspin 1s linear infinite}
@keyframes rspspin{to{transform:rotate(360deg)}}
.rsp-legend{display:flex;gap:14px;flex-wrap:wrap;margin:12px 4px 2px;font-size:12px;color:var(--mu)}
.rsp-legend i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
.rsp-legend b{color:var(--ink);margin-left:4px}
.rsp-levels{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:6px}
.rsp-levels>div{padding:11px 10px;border-radius:16px;background:var(--glass2);border:1px solid var(--line)}
.rdr-root.light .rsp-levels>div{background:#F4F6FF}
.rsp-levels span{display:block;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--mu);font-weight:700}
.rsp-levels b{display:block;font-size:16px;margin-top:5px;font-weight:780}
.rsp-levels em{display:block;font-style:normal;font-size:11.5px;color:var(--mu);margin-top:2px}
.rsp-evidence{display:grid;gap:10px}
.rsp-ev-row,.rsp-ml{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:20px;background:linear-gradient(165deg,var(--glass2),var(--glass));border:1px solid var(--line);box-shadow:var(--sh)}
.rsp-ml{display:block}
.rsp-ring{flex:0 0 66px;width:66px;height:66px;border-radius:50%;display:grid;place-items:center}
.rsp-ring>div{width:52px;height:52px;border-radius:50%;background:var(--bg2);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05}
.rsp-ring b{font-size:15px;font-weight:800}.rsp-ring span{font-size:9.5px;color:var(--mu)}
.rsp-ev-t{font-size:14.5px;font-weight:720}
.rsp-ev-s{font-size:12.5px;color:var(--mu);margin-top:3px;line-height:1.4}
.rsp-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.rsp-stats>div{padding:10px 12px;border-radius:14px;background:var(--glass2);border:1px solid var(--line)}
.rdr-root.light .rsp-stats>div{background:#F4F6FF}
.rsp-stats span{display:block;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--mu);font-weight:700}
.rsp-stats b{display:block;font-size:19px;font-weight:800;margin-top:3px}
.rsp-twin{font-size:11px;padding:4px 9px;border-radius:99px;border:1px solid;font-weight:650}
.rsp-case{display:grid;gap:10px}
.rsp-case-card{position:relative;overflow:hidden;padding:14px 16px;border-radius:20px;background:linear-gradient(165deg,var(--glass2),var(--glass));border:1px solid var(--line);box-shadow:var(--sh)}
.rsp-case-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--cc)}
.rsp-case-h{font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:750;margin-bottom:6px}
.rsp-case-i{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.45;padding:5px 0}
.rsp-case-i i{flex:0 0 7px;height:7px;border-radius:50%;margin-top:7px}
.rsp-tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rsp-tile{padding:14px;border-radius:20px;background:linear-gradient(165deg,var(--glass2),var(--glass));border:1px solid var(--line);box-shadow:var(--sh)}
.rsp-tile-l{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--mu);font-weight:700}
.rsp-tile-v{font-size:26px;font-weight:800;margin-top:6px;letter-spacing:-.02em}
.rsp-tile-n{font-size:12px;color:var(--mu);margin:2px 0 10px}
.rsp-bar-t{height:6px;border-radius:3px;background:var(--glass2);overflow:hidden}
.rdr-root.light .rsp-bar-t{background:rgba(48,58,130,.10)}
.rsp-bar-t i{display:block;height:100%;border-radius:3px}
.rsp-toast{position:fixed;left:50%;bottom:30px;transform:translateX(-50%);padding:11px 18px;border-radius:99px;background:var(--ink);color:var(--bg);font-size:13px;font-weight:650;z-index:80;animation:rdrfade .2s both}
@media (prefers-reduced-motion:reduce){.rsp,.rsp-rise{animation-duration:.01ms!important}}
`;
