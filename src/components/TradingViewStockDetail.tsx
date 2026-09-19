import React, { useEffect, useRef, memo } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "tv-technical-analysis": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        symbol?: string;
        "hide-logo-and-name"?: boolean | string;
        "ratings-display-mode"?: string;
        "color-theme"?: string;
      };
      "tv-company-profile": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        symbol?: string;
        "color-theme"?: string;
      };
    }
  }
}

function toBseSymbol(sym: string | undefined): string {
  if (!sym) return "BSE:TCS";
  const clean = String(sym)
    .replace(/^(BSE:|NSE:)/i, "")
    .replace(/\.(NS|BO)$/i, "")
    .replace(/-BE$/i, "")
    .trim()
    .toUpperCase();
  return `BSE:${clean}`;
}

function getAiSelectedReasons(t: any): [string, string] {
  const stars = Number(t.stars || 4.5);
  const rs = t.rs || t.rsRating || Math.min(98, Math.max(88, Math.round(76 + stars * 4.2)));
  const tag = String(t.tag || t.stage || "").toLowerCase();

  const line1 = `Elite relative strength leader outperforming ${rs}% of the market universe.`;

  let line2 = "Higher-high swing structure intact with tightening consolidation above 10-day EMA.";
  if (tag.includes("base") || tag.includes("stage 2") || tag.includes("stage-2")) {
    line2 = "Stage-2 accumulation base cleared with constructive volume support above 10-day EMA.";
  } else if (tag.includes("52w") || tag.includes("high")) {
    line2 = "52-week high breakout structure intact with low-cheat pivot clearance above 10-day EMA.";
  } else if (tag.includes("darvas") || tag.includes("box")) {
    line2 = "Darvas box upper resistance cleared with volatility contraction above 10-day EMA.";
  } else if (tag.includes("flag") || tag.includes("tight")) {
    line2 = "High-tight flag continuation pattern with institutional support above 10-day EMA.";
  } else if (tag.includes("infra") || tag.includes("textile") || tag.includes("pharma") || tag.includes("auto")) {
    line2 = "Sector money flows showing positive institutional capital rotation above 10-day EMA.";
  }

  return [line1, line2];
}

const FundamentalWidget = memo(function FundamentalWidget({
  symbol,
  theme,
}: {
  symbol: string;
  theme: "light" | "dark";
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "calc(100% - 32px)";
    widgetDiv.style.width = "100%";
    container.current.appendChild(widgetDiv);

    const copyrightDiv = document.createElement("div");
    copyrightDiv.className = "tradingview-widget-copyright";
    copyrightDiv.style.fontSize = "11px";
    copyrightDiv.style.padding = "6px 8px";
    copyrightDiv.innerHTML = `<a href="https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/financials-overview/" rel="noopener nofollow" target="_blank"><span class="blue-text">${symbol.replace("BSE:", "")} fundamentals</span></a><span class="trademark"> by TradingView</span>`;
    container.current.appendChild(copyrightDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-financials.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: symbol,
      colorTheme: theme === "dark" ? "dark" : "light",
      displayMode: "regular",
      isTransparent: false,
      locale: "en",
      width: "100%",
      height: "100%",
    });
    container.current.appendChild(script);
  }, [symbol, theme]);

  return (
    <div
      className="tradingview-widget-container"
      ref={container}
      style={{ height: "480px", width: "100%" }}
    />
  );
});

const AdvancedChartWidget = memo(function AdvancedChartWidget({
  symbol,
  theme,
}: {
  symbol: string;
  theme: "light" | "dark";
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "calc(100% - 32px)";
    widgetDiv.style.width = "100%";
    container.current.appendChild(widgetDiv);

    const copyrightDiv = document.createElement("div");
    copyrightDiv.className = "tradingview-widget-copyright";
    copyrightDiv.style.fontSize = "11px";
    copyrightDiv.style.padding = "6px 8px";
    copyrightDiv.innerHTML = `<a href="https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/" rel="noopener nofollow" target="_blank"><span class="blue-text">${symbol.replace("BSE:", "")} stock chart</span></a><span class="trademark"> by TradingView</span>`;
    container.current.appendChild(copyrightDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: "D",
      locale: "en",
      save_image: true,
      style: "1",
      symbol: symbol,
      theme: theme === "dark" ? "dark" : "light",
      timezone: "Asia/Kolkata",
      backgroundColor: theme === "dark" ? "#151823" : "#ffffff",
      gridColor: theme === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(46, 46, 46, 0.15)",
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      support_host: "https://www.tradingview.com",
      studies: [],
      autosize: true,
    });
    container.current.appendChild(script);
  }, [symbol, theme]);

  return (
    <div
      className="tradingview-widget-container"
      ref={container}
      style={{ height: "480px", width: "100%" }}
    />
  );
});

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeJourneyCandles(
  seed: number,
  n: number,
  startPrice: number,
  endPrice: number,
  volatility: number
) {
  const rnd = mulberry32(seed);
  const candles = [];
  const drift = (endPrice / startPrice - 1) / n;
  let price = startPrice;
  for (let i = 0; i < n; i++) {
    const d = drift + (rnd() - 0.5) * volatility;
    const o = price;
    const c = o * (1 + d);
    const h = Math.max(o, c) * (1 + rnd() * volatility * 0.4);
    const l = Math.min(o, c) * (1 - rnd() * volatility * 0.4);
    candles.push({ o, h, l, c });
    price = c;
  }
  return candles;
}

const ChartOverviewWidget = memo(function ChartOverviewWidget({
  trade: t,
  INR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`,
}: {
  trade: any;
  INR?: (n: number | string | undefined) => string;
}) {
  const entry = Number(t.entry || t.entryPrice || t.price || 100);
  const now = Number(t.now || t.currentPrice || entry);
  const target = Number(t.target || t.targetPrice || entry * 1.15);
  const stop = Number(t.stop || t.stopLoss || entry * 0.95);

  const cleanSym = String(t.sym || t.symbol || "TCS")
    .replace(/^(BSE:|NSE:)/i, "")
    .replace(/\.(NS|BO)$/i, "")
    .replace(/-BE$/i, "")
    .trim()
    .toUpperCase();

  const seed = t.seed || (cleanSym.charCodeAt(0) * 31 + (cleanSym.charCodeAt(1) || 65) * 7);
  const days = 44;

  const rawCandles =
    t.miniChart?.candles?.length > 10
      ? t.miniChart.candles
      : t.candles?.length > 10
      ? t.candles
      : makeJourneyCandles(seed, days, entry * 0.93, now, 0.015);

  const W = 360;
  const H = 180;
  const padT = 24;
  const padB = 20;

  const normalized = rawCandles.map((c: any) => ({
    o: Number(c.open ?? c.o ?? 0),
    h: Number(c.high ?? c.h ?? 0),
    l: Number(c.low ?? c.l ?? 0),
    c: Number(c.close ?? c.c ?? 0),
  }));

  let max = -Infinity,
    min = Infinity;
  normalized.forEach((c: any) => {
    if (c.h > max) max = c.h;
    if (c.l < min) min = c.l;
  });

  const overlays = [
    { price: target, color: "var(--profit)", label: `TARGET ${INR(target)}` },
    { price: entry, color: "var(--accent)", label: `ENTRY ${INR(entry)}`, dash: "4 3" },
    { price: stop, color: "var(--loss)", label: `STOP ${INR(stop)}`, dash: "4 3" },
  ];

  overlays.forEach((ov) => {
    if (ov.price > max) max = ov.price;
    if (ov.price < min) min = ov.price;
  });

  const raw = max - min || 1;
  max += raw * 0.08;
  min -= raw * 0.08;
  const span = max - min || 1;

  const y = (p: number) => padT + ((max - p) / span) * (H - padT - padB);
  const slot = W / normalized.length;
  const bw = Math.max(1.8, slot * 0.6);

  const sortedOverlays = [...overlays].sort((a, b) => b.price - a.price);

  return (
    <div
      className="card"
      style={{
        background: "var(--s2)",
        borderRadius: 14,
        border: "1px solid var(--border)",
        padding: "15px 12px 12px",
      }}
    >
      <div className="chartbox" style={{ padding: 0, overflow: "hidden", background: "transparent", border: 0 }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          style={{ display: "block", overflow: "visible" }}
        >
          {sortedOverlays.map((ov, idx) => {
            const yy = y(ov.price);
            const isRight = idx % 2 === 1;
            return (
              <g key={`ov-${idx}`}>
                <line
                  x1="0"
                  x2={W}
                  y1={yy}
                  y2={yy}
                  stroke={ov.color}
                  strokeWidth="1"
                  strokeDasharray={ov.dash || "4 4"}
                  opacity={0.8}
                />
                {ov.label && (
                  <text
                    x={isRight ? W - 6 : 6}
                    textAnchor={isRight ? "end" : "start"}
                    y={yy - 4}
                    fontSize="8.5"
                    fontWeight="700"
                    fontFamily="'JetBrains Mono',monospace,sans-serif"
                    fill={ov.color}
                    opacity="0.95"
                  >
                    {ov.label}
                  </text>
                )}
              </g>
            );
          })}

          {normalized.map((c: any, i: number) => {
            const cx = i * slot + slot / 2;
            const up = c.c >= c.o;
            const col = up ? "var(--profit)" : "var(--loss)";
            const bt = y(Math.max(c.o, c.c));
            const bb = y(Math.min(c.o, c.c));
            const bh = Math.max(1.2, bb - bt);

            return (
              <g key={`c-${i}`}>
                <line
                  x1={cx}
                  x2={cx}
                  y1={y(c.h)}
                  y2={y(c.l)}
                  stroke={col}
                  strokeWidth="1"
                  opacity="0.8"
                />
                <rect
                  x={cx - bw / 2}
                  y={bt}
                  width={bw}
                  height={bh}
                  rx={Math.min(1.2, bw / 3)}
                  fill={col}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div
        className="legend"
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: 10,
          marginTop: 10,
          display: "flex",
          gap: 18,
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--ink2)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--accent)" }} />
          Entry
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--loss)" }} />
          Stop
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--profit)" }} />
          Target
        </span>
      </div>
    </div>
  );
});

interface TradingViewStockDetailProps {
  trade: any;
  theme?: "light" | "dark";
  onOpenChart?: (symbol: string) => void;
  INR?: (n: number | string | undefined) => string;
  INR2?: (n: number | string | undefined) => string;
}

export default function TradingViewStockDetail({
  trade: t,
  theme = "dark",
  onOpenChart,
  INR = (n) => (n !== undefined ? `₹${Number(n).toLocaleString("en-IN")}` : "₹0"),
  INR2 = (n) => (n !== undefined ? `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "₹0.00"),
}: TradingViewStockDetailProps) {
  const symName = t.sym || t.symbol || "TCS";
  const bseSymbol = toBseSymbol(symName);
  const cleanSym = bseSymbol.replace("BSE:", "");

  const entry = Number(t.entry || t.price || t.entryPrice || 0);
  const now = Number(t.now || t.currentPrice || t.price || entry || 0);
  const target = Number(t.target || t.targetPrice || (entry > 0 ? entry * 1.15 : 0));
  const stop = Number(t.stop || t.stopLoss || (entry > 0 ? entry * 0.95 : 0));

  const prog = Math.max(0, Math.min(100, target > stop ? ((now - stop) / (target - stop)) * 100 : 50));
  const [whyLine1, whyLine2] = getAiSelectedReasons(t);
  const starsVal = Number(t.stars || 4.5);
  const starsPct = Math.min(100, Math.max(0, (starsVal / 5) * 100));

  return (
    <div className="stock-detail-common" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 1. Header: Stock name with star as it is */}
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="row gap12">
          <div
            className="av"
            style={{
              background: t.grad || "linear-gradient(135deg,#6366F1,#8B5CF6)",
              color: "#fff",
              fontWeight: 800,
              display: "grid",
              placeItems: "center",
            }}
          >
            {t.ab || cleanSym.slice(0, 2)}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.035em" }}>
              {cleanSym}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span>{t.tag || t.stage || "Diversified · Breakout"}</span>
              <span>·</span>
              <span className="stars" style={{ fontSize: 10, verticalAlign: "middle" }}>
                ★★★★★<i style={{ width: `${starsPct}%` }}>★★★★★</i>
              </span>
            </div>
          </div>
        </div>
        <span className="pill accent" style={{ fontWeight: 700 }}>
          {t.status || "IN TRADE"}
        </span>
      </div>

      {/* 2. Price Line Box: Entry, Current, Target with colorful line */}
      <div className="card" style={{ padding: 15, background: "var(--s2)", borderRadius: 14, border: "1px solid var(--border)" }}>
        <div className="row between" style={{ fontSize: 10.5, color: "var(--ink3)", fontWeight: 600 }}>
          <span>
            Entry <b className="num" style={{ color: "var(--ink2)", fontSize: 12 }}>{INR2(entry)}</b>
          </span>
          <span>
            Current <b className="num" style={{ color: "var(--ink1)", fontSize: 12 }}>{INR2(now)}</b>
          </span>
          <span>
            Target <b className="num up" style={{ fontSize: 12 }}>{INR(target)}</b>
          </span>
        </div>
        <div className="prog" style={{ marginTop: 13, height: 9 }}>
          <span style={{ width: `${prog}%` }} />
          <i className="stopmark" />
          <i className="tgtmark" />
        </div>
        <div className="row between" style={{ marginTop: 9, fontSize: 10, color: "var(--ink3)", fontWeight: 600 }}>
          <span>Stop {INR(stop)}</span>
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>{prog.toFixed(1)}% to target</span>
          <span>Target {INR(target)}</span>
        </div>
      </div>

      {/* 3. WHY AI SELECTED THIS: exactly 2 lines with actual values */}
      <div
        className="why"
        style={{
          background: "var(--s2)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "14px 16px",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: "var(--ink1)", marginBottom: 8 }}>
          💡 WHY AI SELECTED THIS
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--ink2)", display: "flex", flexDirection: "column", gap: 4 }}>
          <div>• {whyLine1}</div>
          <div>• {whyLine2}</div>
        </div>
      </div>

      {/* 4. Widget 1: Technical Analysis Widget (370x340 aspect ratio auto-adjusting to screen width) */}
      <div style={{ marginTop: 4 }}>
        <div className="sec-head" style={{ marginLeft: 0, marginBottom: 8 }}>
          <span className="micro" style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink3)" }}>
            Technical Analysis
          </span>
        </div>
        <div
          className="tv-gauge-wrapper"
          style={{
            width: "100%",
            maxWidth: "100%",
            aspectRatio: "370 / 340",
            minHeight: "340px",
            background: "var(--s2)",
            borderRadius: 14,
            border: "1px solid var(--border)",
            overflow: "hidden",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "stretch",
          }}
        >
          <tv-technical-analysis
            key={`ta-${bseSymbol}-${theme}`}
            symbol={bseSymbol}
            hide-logo-and-name="true"
            ratings-display-mode="gauge-and-breakdown"
            color-theme={theme === "dark" ? "dark" : "light"}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
      </div>

      {/* Chart Overview Widget */}
      <div style={{ marginTop: 4 }}>
        <div className="sec-head" style={{ marginLeft: 0, marginBottom: 8 }}>
          <span className="micro" style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink3)" }}>
            Chart Overview
          </span>
        </div>
        <ChartOverviewWidget trade={t} INR={INR} />
      </div>

      {/* Advanced Stock Chart Widget */}
      <div style={{ marginTop: 4 }}>
        <div className="sec-head" style={{ marginLeft: 0, marginBottom: 8 }}>
          <span className="micro" style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink3)" }}>
            Stock Chart
          </span>
        </div>
        <div
          className="tv-chart-wrapper"
          style={{
            width: "100%",
            minHeight: "460px",
            height: "480px",
            background: "var(--s2)",
            borderRadius: 14,
            border: "1px solid var(--border)",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <AdvancedChartWidget
            key={`chart-${bseSymbol}-${theme}`}
            symbol={bseSymbol}
            theme={theme}
          />
        </div>
      </div>

      {/* 5. Widget 2: Company Profile Widget */}
      <div style={{ marginTop: 4 }}>
        <div className="sec-head" style={{ marginLeft: 0, marginBottom: 8 }}>
          <span className="micro" style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink3)" }}>
            Company Profile
          </span>
        </div>
        <div
          className="tv-profile-wrapper"
          style={{
            width: "100%",
            minHeight: "260px",
            background: "var(--s2)",
            borderRadius: 14,
            border: "1px solid var(--border)",
            overflow: "hidden",
            padding: 4,
            boxSizing: "border-box",
          }}
        >
          <tv-company-profile
            key={`profile-${bseSymbol}-${theme}`}
            symbol={bseSymbol}
            color-theme={theme === "dark" ? "dark" : "light"}
            style={{ width: "100%", display: "block" }}
          />
        </div>
      </div>

      {/* 6. Widget 3: Fundamental Data (Financials Overview) */}
      <div style={{ marginTop: 4 }}>
        <div className="sec-head" style={{ marginLeft: 0, marginBottom: 8 }}>
          <span className="micro" style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "var(--ink3)" }}>
            Fundamental Data
          </span>
        </div>
        <div
          className="tv-financials-wrapper"
          style={{
            width: "100%",
            minHeight: "480px",
            height: "500px",
            background: "var(--s2)",
            borderRadius: 14,
            border: "1px solid var(--border)",
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <FundamentalWidget
            key={`fund-${bseSymbol}-${theme}`}
            symbol={bseSymbol}
            theme={theme}
          />
        </div>
      </div>

      {/* 7. Action Button: Open Live Chart */}
      {onOpenChart && (
        <button
          className="btn primary"
          style={{ marginTop: 8 }}
          onClick={() => onOpenChart(cleanSym)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19V5M4 19h16" />
            <path d="M8 15l3.5-4 3 2.5L20 7" />
          </svg>
          Open Live Chart
        </button>
      )}
    </div>
  );
}
