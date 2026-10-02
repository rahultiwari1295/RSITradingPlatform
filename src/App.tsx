import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  quantsyncApi,
  TerminalSnapshot,
  EquityCurveData,
  ActivityFeedItem,
  ScannerReport,
  PatternSection,
  BreakoutItem,
  MarketPulseData,
  ChartData
} from "./api/quantsyncApi";
import { useAuth } from "./contexts/AuthContext";
import AuthModal from "./components/Modals/AuthModal";
import BuyModal from "./components/Modals/BuyModal";
import SellModal from "./components/Modals/SellModal";
import PortfolioView from "./views/PortfolioView";
import AddPositionModal from "./components/Modals/AddPositionModal";
import { db } from "./lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ManualPortfolioTrade, CompletedTrade } from "./types";
import { getActionTagInfo } from "./lib/signalStatus";
import InstitutionalPatternChart from "./components/charts/InstitutionalPatternChart";
import TradingViewStockDetail from "./components/TradingViewStockDetail";
import StockDNAScreen from "./components/StockDNAScreen";
import ScreenerScreen from "./components/ScreenerScreen";
import { useLiveMarket, liveMarketSocket } from "./services/liveMarketSocket";
import { LuxuryHomeDeck } from "./components/home/LuxuryHomeDeck";
import "./components/home/LuxuryHomeDeck.css";
import { BreakoutAnalystView } from "./components/analyst/BreakoutAnalystView";

/* ============================================================
   FORMATTERS & HELPERS
   ============================================================ */
const INR = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const INR2 = (n: number) =>
  "₹" + (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => ((n || 0) >= 0 ? "+" : "−") + Math.abs(n || 0).toFixed(2) + "%";

function parseTradeDate(d: any): Date {
  if (!d) return new Date("2026-09-18");
  if (d instanceof Date) return d;
  const str = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return new Date(str);
  }
  if (/^[A-Za-z]{3}\s+\d{1,2}/.test(str)) {
    return new Date(`${str}, 2026`);
  }
  return new Date(str);
}

function formatDisplayDate(d: any): string {
  if (!d) return "";
  const dt = parseTradeDate(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatSignalDate(d: any): string {
  if (!d) return "2026-09-17";
  const str = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const dt = parseTradeDate(d);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return str;
}

function getTradeDaysHeld(t: any): number {
  const explicitDays = Number(t?.days ?? t?.holdingDays ?? 0);
  const rawDate = t?.entryDate || t?.date || t?.created_at;
  let calDays = 0;
  if (rawDate) {
    const dt = parseTradeDate(rawDate);
    if (!isNaN(dt.getTime())) {
      const diffMs = Date.now() - dt.getTime();
      if (diffMs > 0) {
        calDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }
    }
  }
  return Math.max(calDays, explicitDays || 2);
}

function generateWhyThisTradeV2(t: any): string[] {
  const sym = t.sym || t.symbol || "Asset";
  const tag = (t.tag || t.strategyName || t.strategyId || "").toLowerCase();
  const rr = (t.target && t.entry && t.stop && t.entry > t.stop)
    ? ((t.target - t.entry) / (t.entry - t.stop)).toFixed(1)
    : "2.4";
  const mlProb = t.ml || t.mlProbability || 72;
  const comp = t.comp || t.compositeScore || 78;

  if (tag.includes("flag") || tag.includes("tight")) {
    return [
      `${sym} formed a textbook High-Tight Flag with institutional momentum continuation.`,
      `Consolidating in a tight volatility band above 20-day EMA support.`,
      `Volume surge above 50-day average confirms strong accumulation.`,
      `ML Conviction: ${mlProb}% win probability with asymmetric ${rr}:1 risk-reward profile.`
    ];
  }
  if (tag.includes("stage") || tag.includes("base")) {
    return [
      `${sym} completed a multi-week Stage-2 accumulation base clearing pivot resistance.`,
      `Relative Strength rank sits in top 8% of the 1,318 NSE universe.`,
      `Weekly volume signature indicates persistent institutional accumulation.`,
      `Target ₹${Number(t.target || 0).toFixed(2)} based on base measurement with stop at ₹${Number(t.stop || 0).toFixed(2)}.`
    ];
  }
  if (tag.includes("rs") || tag.includes("leader") || tag.includes("strength")) {
    return [
      `Elite relative strength leader outperforming 92% of the market universe.`,
      `Higher-high swing structure intact with tightening consolidation above 10-day EMA.`,
      `Sector money flows showing positive institutional capital rotation.`,
      `Composite AI conviction score: ${comp}/100 with ${mlProb}% ML continuation confidence.`
    ];
  }
  if (tag.includes("gap") || tag.includes("earnings") || tag.includes("power")) {
    return [
      `Power earnings gap-up holding cleanly above opening range pivot.`,
      `Volume expansion 3.4× above 30-day baseline with negligible pullback.`,
      `Strict risk stop anchored at swing low ₹${Number(t.stop || 0).toFixed(2)}.`,
      `Projected upside target ₹${Number(t.target || 0).toFixed(2)} with ${rr}:1 risk-reward ratio.`
    ];
  }
  return [
    `Breakout above overhead resistance on rising institutional turnover.`,
    `Favorable ${rr}:1 risk-reward ratio targeting ₹${Number(t.target || 0).toFixed(2)}.`,
    `Technical composite score: ${comp}/100 with ML conviction of ${mlProb}%.`,
    `Strict risk mitigation stop maintained at ₹${Number(t.stop || 0).toFixed(2)}.`
  ];
}

function RocketTransitionOverlay({ targetEngine }: { targetEngine: "v2" | "v3" }) {
  return (
    <div className="rocket-trans-overlay">
      <div className="radar-arena">
        <div className="radar-ring r3" />
        <div className="radar-ring r2" />
        <div className="radar-ring r1" />
        <div className="target-crosshair-h" />
        <div className="target-crosshair-v" />

        <div className="bulls-eye-core">
          <div className="bulls-eye-dot" />
        </div>

        <div className="rocket-projectile">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ transform: "rotate(-45deg)", filter: "drop-shadow(0 0 10px #F59E0B)" }}>
            <path
              d="M12 2.5C12 2.5 16 6 16 11.5C16 14 14.5 16.5 13.5 17.5L12 16L10.5 17.5C9.5 16.5 8 14 8 11.5C8 6 12 2.5 12 2.5Z"
              fill="url(#rocketGrad)"
              stroke="#FFF"
              strokeWidth="0.75"
            />
            <path d="M8 12L4 14.5L5.5 17.5L8 16" fill="#6366F1" opacity="0.9" />
            <path d="M16 12L20 14.5L18.5 17.5L16 16" fill="#6366F1" opacity="0.9" />
            <circle cx="12" cy="9.5" r="1.8" fill="#0E1018" stroke="#F59E0B" strokeWidth="0.8" />
            <defs>
              <linearGradient id="rocketGrad" x1="8" y1="2.5" x2="16" y2="17.5">
                <stop offset="0%" stopColor="#FFF" />
                <stop offset="40%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>
            </defs>
          </svg>
          <div className="rocket-exhaust" />
        </div>

        <div className="bullseye-shockwave" />
      </div>

      <div className="trans-hud-title">
        {targetEngine === "v3" ? "🎯 QUANTUM V3 ENGINE LOCKED" : "🎯 V2 ML CONVICTION ENGINE LOCKED"}
      </div>
      <div className="trans-hud-sub">
        Synchronizing universe signals &amp; live algorithmic channels...
      </div>
    </div>
  );
}


function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getTerminalSparkPath(seed: number, n: number, trend: number, width: number, height: number) {
  const rnd = mulberry32(seed);
  let v = height / 2;
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    v += (rnd() - 0.5) * height * 0.35 + (trend || 0);
    pts.push(v);
  }
  const mn = Math.min(...pts),
    mx = Math.max(...pts);
  const span = mx - mn || 1;
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * width;
    const y = height - ((pts[i] - mn) / span) * height * 0.85 - height * 0.075;
    out.push([x, y]);
  }
  let d = `M ${out[0][0].toFixed(1)} ${out[0][1].toFixed(1)}`;
  for (let i = 1; i < out.length; i++) {
    const [x0, y0] = out[i - 1];
    const [x1, y1] = out[i];
    const cx = (x0 + x1) / 2;
    d += ` Q ${cx.toFixed(1)} ${y0.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return { d, pts: out };
}

function getMarketStatusInfo() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
  const day = istTime.getDay(); // 0 = Sun, 6 = Sat
  const hours = istTime.getHours();
  const mins = istTime.getMinutes();
  const timeInMins = hours * 60 + mins;

  const isWeekend = day === 0 || day === 6;
  const isMarketOpen = !isWeekend && (timeInMins >= (9 * 60 + 15) && timeInMins <= (15 * 60 + 30));

  if (isMarketOpen) {
    return {
      statusText: "Markets live",
      subText: "Closes 15:30 IST",
      isOpen: true,
      verified: "NSE Real-Time"
    };
  }

  if (isWeekend) {
    return {
      statusText: "Markets closed",
      subText: "Reopens Mon 09:15 IST",
      isOpen: false,
      verified: "NSE Verified"
    };
  }

  if (timeInMins < (9 * 60 + 15)) {
    return {
      statusText: "Pre-market session",
      subText: "Regular trading 09:15 IST",
      isOpen: false,
      verified: "NSE Verified"
    };
  }

  return {
    statusText: "Markets closed",
    subText: "Reopens Tomorrow 09:15 IST",
    isOpen: false,
    verified: "NSE Verified"
  };
}

const TERMINAL_INDICES = [
  { n: 'Nifty 50', v: 23091.30, p: 0.12, seed: 11, trend: 0.12 },
  { n: 'Sensex', v: 73698.12, p: 0.16, seed: 22, trend: 0.16 },
  { n: 'Bank Nifty', v: 55545.80, p: 0.19, seed: 33, trend: 0.19 }
];

const TERMINAL_BRIEFS: any[] = [];

const TERMINAL_SECTORS = [
  { n: 'Banking', p: 1.17 },
  { n: 'IT', p: 2.76 },
  { n: 'Auto', p: 0.58 },
  { n: 'Metals', p: 1.37 },
  { n: 'Energy', p: 0.34 },
  { n: 'Pharma', p: 1.51 },
  { n: 'FMCG', p: 0.14 },
  { n: 'Realty', p: 0.97 },
  { n: 'Infra', p: 1.83 },
  { n: 'Telecom', p: 2.20 },
  { n: 'Chemicals', p: 1.40 },
  { n: 'Consumer Durables', p: 1.50 }
];

const TERMINAL_MOVERS: any[] = [];

const TERMINAL_NEWS_RAW: any[] = [];

const TERMINAL_NEWS_GROUPS: Array<{ day: string; items: any[] }> = [];

function stringSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 1000 + 100;
}

function filterTo12CoreSectors(sectors: any[]): Array<{ n: string; p: number }> {
  const targets = [
    { label: "Banking", kws: ["banking", "bank", "finance"] },
    { label: "IT", kws: ["software", "services", "it", "technology"] },
    { label: "Auto", kws: ["automobile", "auto"] },
    { label: "Metals", kws: ["metal", "mining", "steel"] },
    { label: "Energy", kws: ["oil", "gas", "energy", "petro"] },
    { label: "Pharma", kws: ["pharma", "biotech", "healthcare"] },
    { label: "FMCG", kws: ["fmcg", "food", "beverages"] },
    { label: "Realty", kws: ["realty", "real estate"] },
    { label: "Infra", kws: ["cement", "construction", "infra", "industrials"] },
    { label: "Telecom", kws: ["telecom", "telecommunications"] },
    { label: "Chemicals", kws: ["chemical", "fertilizer"] },
    { label: "Consumer Durables", kws: ["consumer durables", "durables", "retailing"] }
  ];

  const result: Array<{ n: string; p: number }> = [];
  targets.forEach(({ label, kws }) => {
    const found = sectors.find(s => {
      const name = (s.n || s.name || "").toLowerCase();
      return kws.some(kw => name.includes(kw));
    });
    if (found) {
      result.push({
        n: label,
        p: typeof found.p === "number" ? found.p : (typeof found.change_pct === "number" ? found.change_pct : 0)
      });
    } else {
      result.push({ n: label, p: 0.0 });
    }
  });
  return result;
}

function normalizeNewsItem(n: any) {
  const sym = n.sym || n.stock_code || n.NSEcode || n.symbol || "NSE";
  const co = n.co || n.stock_name || sym;
  const body = n.body || n.notification || n.title || "";
  const time = n.time || n.time_stamp || n.timeStamp || "Market Hours";
  const label = n.label || "Corporate Move";
  const tag = n.tag || (label.toLowerCase().includes("order") || label.toLowerCase().includes("win") ? "order" :
              label.toLowerCase().includes("jv") || label.toLowerCase().includes("joint") ? "jv" :
              label.toLowerCase().includes("fund") || label.toLowerCase().includes("qip") || label.toLowerCase().includes("raise") ? "fund" :
              label.toLowerCase().includes("ipo") || label.toLowerCase().includes("list") || label.toLowerCase().includes("debut") ? "ipo" : "order");
  const src = n.src || sym.slice(0, 2).toUpperCase();
  const url = n.url || n.complete_url || n.completeUrl || n.screen_redirect_url || n.screenRedirectUrl || `https://trendlyne.com/equity/${encodeURIComponent(sym)}/`;

  let day = n.day;
  if (!day) {
    if (n.date) {
      day = n.date;
    } else {
      const dateMatch = time.match(/(\d{1,2}\s+[A-Za-z]+|\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        day = dateMatch[0];
      } else {
        day = "Latest Updates";
      }
    }
  }

  return {
    day,
    co,
    sym,
    tag,
    label,
    body,
    time: time.replace(/\(IST\)/g, "IST").trim(),
    src,
    url
  };
}

function parseReportsToBriefs(reports: any[]): any[] {
  if (!reports || !reports.length) return [];
  return reports.map((r, idx) => {
    const levels: Array<{ k: string; v: string; kind: string }> = [];
    if (r.pre_technical_levels) {
      const parts = r.pre_technical_levels.split(";").map((p: string) => p.trim()).filter(Boolean);
      parts.forEach((p: string) => {
        if (p.includes("Nifty Support")) {
          levels.push({ k: "Nifty Support", v: p.replace("Nifty Support", "").trim(), kind: "supp" });
        } else if (p.includes("Breakdown Risk")) {
          levels.push({ k: "Breakdown Risk", v: p.replace("Breakdown Risk", "").trim(), kind: "res" });
        } else if (p.includes("Resistance") || p.includes("Nifty Resistance")) {
          levels.push({ k: "Nifty Resistance", v: p.replace("Nifty Resistance", "").replace("Resistance", "").trim(), kind: "res" });
        } else if (p.includes("Pivot") || p.includes("Bank Nifty Pivot")) {
          levels.push({ k: "Bank Nifty Pivot", v: p.replace("Bank Nifty Pivot", "").replace("Pivot", "").trim(), kind: "piv" });
        }
      });
    }

    let dayStr = r.display_date ? r.display_date.replace(" (Today)", "").trim() : (r.date || "Market Session");
    let metaStr = "Session";
    try {
      if (r.date) {
        const dt = new Date(r.date);
        if (!isNaN(dt.getTime())) {
          const daysArr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const monthsArr = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          dayStr = `${dt.getDate()} ${monthsArr[dt.getMonth()]}`;
          metaStr = daysArr[dt.getDay()];
        }
      }
    } catch {}

    const preItems: string[] = [];
    if (r.pre_global_cues) preItems.push(r.pre_global_cues);
    if (r.pre_domestic_news) preItems.push(r.pre_domestic_news);
    if (r.pre_sector_updates) preItems.push(r.pre_sector_updates);

    const postItems: string[] = [];
    if (r.post_summary) postItems.push(r.post_summary);
    if (r.post_sector_highlights) postItems.push(r.post_sector_highlights);
    if (r.post_flows_breadth) postItems.push(r.post_flows_breadth);
    if (r.post_engine_action) postItems.push(r.post_engine_action);

    return {
      date: dayStr,
      today: idx === 0,
      meta: metaStr,
      pre: {
        time: r.pre_market_time || "08:00 IST",
        items: preItems.length ? preItems : [
          "<b>Pre-Market Radar</b> — Pre-market intelligence report pending dispatch at 08:00 AM IST."
        ],
        levels: levels.length ? levels : undefined
      },
      post: {
        time: r.post_market_time || "15:45 IST",
        items: postItems.length ? postItems : [
          "<b>Market Wrap</b> — Live session underway. Official post-market wrap dispatches at 15:45 IST."
        ]
      }
    };
  });
}

function makeCandles(seed: number, n: number, start: number, opts: any = {}) {
  const rnd = mulberry32(seed);
  const vol = opts.vol ?? 0.018;
  const baseEnd = opts.baseEnd ?? 0;
  const drift = opts.drift ?? 0.004;
  const breakout = opts.breakout ?? 1.6;
  const candles = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    let d = 0;
    if (i < baseEnd) d = (rnd() - 0.5) * vol * 0.35;
    else if (i >= n - 4) d = drift * breakout;
    else d = drift * (0.4 + rnd() * 0.9);
    const o = price;
    const c = o * (1 + d + (rnd() - 0.5) * vol * 0.7);
    const h = Math.max(o, c) * (1 + rnd() * vol * 0.5);
    const l = Math.min(o, c) * (1 - rnd() * vol * 0.5);
    candles.push({ o, h, l, c });
    price = c;
  }
  return candles;
}

const GRADIENTS = [
  "linear-gradient(135deg,#6366F1,#8B5CF6)",
  "linear-gradient(135deg,#0EA5E9,#2563EB)",
  "linear-gradient(135deg,#F59E0B,#D97706)",
  "linear-gradient(135deg,#10B981,#0EA5E9)",
  "linear-gradient(135deg,#8B5CF6,#EC4899)",
  "linear-gradient(135deg,#EC4899,#F43F5E)",
  "linear-gradient(135deg,#14B8A6,#06B6D4)",
  "linear-gradient(135deg,#F97316,#EF4444)",
];

const NAV_SERIES = (() => {
  const rnd = mulberry32(1337);
  let v = 268000;
  const arr = [];
  for (let i = 0; i < 400; i++) {
    let drift = 0.0016;
    if (i > 230 && i < 265) drift = -0.0032;
    if (i > 320) drift = 0.0026;
    v *= 1 + drift + (rnd() - 0.5) * 0.011;
    arr.push(v);
  }
  const scale = 414249 / arr[arr.length - 1];
  return arr.map(x => Math.round(x * scale));
})();

const DEMO_DATA = {
  v2: {
    nav: 414249,
    pnl: 4361,
    pnlPct: 1.06,
    win: 68.4,
    wins: 171,
    losses: 79,
    spark: NAV_SERIES.slice(-40),
    active: [
      {
        sym: "VIJAYA",
        ab: "VI",
        name: "Vijaya Diagnostic",
        tag: "Diversified · Breakout",
        stars: 4.5,
        ml: 70,
        risk: "Low",
        comp: 75,
        entry: 1510.6,
        now: 1554.9,
        stop: 1388,
        target: 1735,
        r: 0.36,
        days: 37,
        pnl: 441,
        pnlPct: 2.93,
        seed: 501,
        chartDays: 40,
        grad: "linear-gradient(135deg,#6366F1,#8B5CF6)",
        why: [
          "Breakout above 20-day consolidation",
          "Relative strength rank: Top 5% of universe",
          "Sector showing institutional inflows",
          "ML confidence: 70% probability of 2R+ gain",
        ],
        timeline: [
          ["Aug 13", "Entered at ₹1,510.60 · 10 shares", "act"],
          ["Aug 20", "Stop raised to ₹1,420 (break-even lock)", ""],
          ["Sep 05", "Holding · +1.2R · Trailing stop active", "good"],
          ["Live", "Current · +0.36R · ₹1,554.90", "act"],
        ],
        radar: [80, 70, 85, 75],
      },
      {
        sym: "GRINFRA",
        ab: "GR",
        name: "G R Infraprojects",
        tag: "Infrastructure · Base",
        stars: 4,
        ml: 66,
        risk: "Low",
        comp: 71,
        entry: 1120.0,
        now: 1177.4,
        stop: 1042,
        target: 1298,
        r: 0.53,
        days: 22,
        pnl: 574,
        pnlPct: 5.12,
        seed: 502,
        chartDays: 34,
        grad: "linear-gradient(135deg,#0EA5E9,#2563EB)",
        why: [
          "Tight 18-day base with declining volatility",
          "Volume expansion on breakout candle",
          "Sector rotation into infrastructure",
          "ML confidence: 66% probability of 2R+ gain",
        ],
        timeline: [
          ["Aug 28", "Entered at ₹1,120.00 · 10 shares", "act"],
          ["Sep 08", "Stop raised to ₹1,078", ""],
          ["Live", "Current · +0.53R · ₹1,177.40", "act"],
        ],
        radar: [76, 66, 72, 80],
      },
      {
        sym: "UNITEDPOLY",
        ab: "UN",
        name: "United Polyfab",
        tag: "Textiles · Stage 2",
        stars: 3.5,
        ml: 61,
        risk: "Medium",
        comp: 64,
        entry: 46.0,
        now: 46.0,
        stop: 42.32,
        target: 47.67,
        r: 0.0,
        days: 1,
        pnl: 0,
        pnlPct: 0.0,
        seed: 503,
        chartDays: 40,
        grad: "linear-gradient(135deg,#F59E0B,#D97706)",
        why: [
          "Fresh Stage-2 base breakout",
          "Volume 2.4× the 20-day average",
          "Sector momentum improving",
          "ML confidence: 61% probability of 2R+ gain",
        ],
        timeline: [["Live", "Entered at ₹46.00 · 250 shares", "act"]],
        radar: [64, 61, 58, 72],
      },
    ],
    closed: [
      {
        sym: "KCPSUGIND",
        ab: "KC",
        name: "KCP Sugar",
        entry: 25.81,
        exit: 29.68,
        pnl: 2179,
        pnlPct: 14.99,
        r: 2.23,
        days: 58,
        reason: "TARGET_HIT",
        date: "Sep 15",
      },
      {
        sym: "SIGACHI",
        ab: "SI",
        name: "Sigachi Industries",
        entry: 26.44,
        exit: 30.41,
        pnl: 2182,
        pnlPct: 15.02,
        r: 2.09,
        days: 35,
        reason: "TARGET_HIT",
        date: "Sep 15",
      },
      {
        sym: "PRAJIND",
        ab: "PR",
        name: "Praj Industries",
        entry: 612.0,
        exit: 587.5,
        pnl: -612,
        pnlPct: -4.01,
        r: -0.62,
        days: 19,
        reason: "STOP_HIT",
        date: "Sep 11",
      },
      {
        sym: "KIRLOSENG",
        ab: "KI",
        name: "Kirloskar Engines",
        entry: 1445.0,
        exit: 1588.2,
        pnl: 1432,
        pnlPct: 9.91,
        r: 1.78,
        days: 44,
        reason: "TARGET_HIT",
        date: "Sep 08",
      },
      {
        sym: "DEEPAKFERT",
        ab: "DE",
        name: "Deepak Fertilisers",
        entry: 842.0,
        exit: 874.5,
        pnl: 812,
        pnlPct: 3.86,
        r: 1.12,
        days: 28,
        reason: "TIME_EXIT",
        date: "Sep 04",
      },
      {
        sym: "NATCOPHARM",
        ab: "NA",
        name: "Natco Pharma",
        entry: 1042.0,
        exit: 1002.0,
        pnl: -400,
        pnlPct: -3.84,
        r: -0.55,
        days: 12,
        reason: "STOP_HIT",
        date: "Sep 02",
      },
    ],
    scanner: {
      scanned: 847,
      tech: 142,
      quality: 38,
      selected: 3,
      note: '"AI evaluated 847 stocks but capital allocation limits entries to top 3 conviction picks."',
      top: [
        { symbol: "STOCK_A", score: 94, stars: 5 },
        { symbol: "STOCK_B", score: 87, stars: 4.5 },
        { symbol: "STOCK_C", score: 81, stars: 4 },
      ],
    },
  },
  v3: {
    nav: 286540,
    pnl: 2918,
    pnlPct: 1.03,
    win: 61.2,
    wins: 82,
    losses: 52,
    spark: NAV_SERIES.slice(-40).map(v => Math.round(v * 0.69)),
    active: [
      {
        sym: "UNITEDPOLY",
        ab: "UN",
        name: "United Polyfab",
        stage: "Stage 2 Base 📐",
        price: 46.0,
        chg: 0.0,
        days: 1,
        grad: "linear-gradient(135deg,#8B5CF6,#6366F1)",
        seed: 101,
        candles: 26,
        start: 40.5,
        overlays: [
          { price: 45.05, color: "var(--gold)", label: "PIVOT ₹45.05" },
          { price: 34.5, color: "var(--loss)", label: "FLOOR ₹34.50", opacity: 0.4 },
          { price: 42.32, color: "var(--loss)", label: "STOP ₹42.32" },
          { price: 46.0, color: "var(--accent)", label: "ENTRY ₹46.00" },
          { price: 47.67, color: "var(--profit)", label: "T1 ₹47.67", dash: "2 3" },
          { price: 53.15, color: "var(--profit)", label: "T2 ₹53.15", dash: "2 3", opacity: 0.45 },
        ],
        why: "Breaking out of a 29-day base with 3× volume. Fibonacci 1.272 extension sits at ₹47.67. Prior run: ₹22 → ₹38 (+72%). Classic Stage-2 accumulation with tightening volatility.",
        fib: [
          ["Fib 1.0", "₹43.37", "✅ Hit", "hit"],
          ["Fib 1.272", "₹47.67", "🎯 Next", "next"],
          ["Fib 1.618", "₹53.15", "Stretch", ""],
        ],
        radar: [88, 72, 80, 84],
      },
      {
        sym: "AEGISLOG",
        ab: "AE",
        name: "Aegis Logistics",
        stage: "52W High Breakout 🚀",
        price: 812.4,
        chg: 1.84,
        days: 6,
        grad: "linear-gradient(135deg,#10B981,#0EA5E9)",
        seed: 202,
        candles: 26,
        start: 735,
        overlays: [
          { price: 790.0, color: "var(--gold)", label: "PIVOT ₹790" },
          { price: 760.0, color: "var(--loss)", label: "STOP ₹760" },
          { price: 812.4, color: "var(--accent)", label: "ENTRY ₹812" },
          { price: 868.0, color: "var(--profit)", label: "T1 ₹868", dash: "2 3" },
        ],
        why: "New all-time high on 2.8× volume. Sector leader with rising relative strength. Base above the 50-DMA held for 14 sessions before the breakout candle closed near the high.",
        fib: [
          ["Fib 1.0", "₹802", "✅ Hit", "hit"],
          ["Fib 1.272", "₹868", "🎯 Next", "next"],
          ["Fib 1.618", "₹948", "Stretch", ""],
        ],
        radar: [91, 68, 86, 78],
      },
      {
        sym: "CAPLIPOINT",
        ab: "CA",
        name: "Caplin Point",
        stage: "Darvas Box 📦",
        price: 1642.0,
        chg: 0.62,
        days: 3,
        grad: "linear-gradient(135deg,#F59E0B,#EF4444)",
        seed: 303,
        candles: 26,
        start: 1520,
        overlays: [
          { price: 1580.0, color: "var(--gold)", label: "BOX TOP ₹1,580" },
          { price: 1470.0, color: "var(--loss)", label: "BOX FLOOR ₹1,470", opacity: 0.4 },
          { price: 1552.0, color: "var(--loss)", label: "STOP ₹1,552" },
          { price: 1740.0, color: "var(--profit)", label: "T1 ₹1,740", dash: "2 3" },
        ],
        why: "Darvas box breakout after 21 sessions of tight consolidation. Box height projects a ₹1,740 target. Volume confirmation at 2.3× average on the breakout candle.",
        fib: [
          ["Fib 1.0", "₹1,668", "🎯 Next", "next"],
          ["Fib 1.272", "₹1,740", "Stretch", ""],
          ["Fib 1.618", "₹1,862", "Stretch", ""],
        ],
        radar: [84, 64, 70, 76],
      },
    ],
    closed: [
      {
        sym: "XYZSTOCK",
        ab: "XY",
        name: "XYZ Stock",
        entry: 120,
        exit: 148,
        pnl: 2800,
        pnlPct: 23.3,
        r: 2.8,
        days: 42,
        reason: "TARGET_HIT (Fib 1.618)",
        date: "Sep 15",
      },
      {
        sym: "BHARATFORG",
        ab: "BH",
        name: "Bharat Forge",
        entry: 1288,
        exit: 1420,
        pnl: 1320,
        pnlPct: 10.2,
        r: 1.92,
        days: 31,
        reason: "TARGET_HIT (Fib 1.272)",
        date: "Sep 09",
      },
      {
        sym: "NATCOPHARM",
        ab: "NA",
        name: "Natco Pharma",
        entry: 1042,
        exit: 1002,
        pnl: -400,
        pnlPct: -3.84,
        r: -0.55,
        days: 12,
        reason: "STOP_HIT",
        date: "Sep 04",
      },
    ],
    scanner: {
      scanned: 1318,
      tech: 214,
      quality: 38,
      selected: 2,
      note: '"V3 scanned 1,318 stocks across 5 pattern types. Capital allocation limited entries to the top 2 pattern-strength picks."',
      top: [
        { symbol: "UNITEDPOLY", score: 94, stars: 5 },
        { symbol: "AEGISLOG", score: 91, stars: 4.5 },
        { symbol: "CAPLIPOINT", score: 84, stars: 4 },
      ],
    },
  },
};

const DEMO_PATTERNS = [
  {
    name: "Base Breakouts",
    count: 7,
    items: [
      { s: "UNITEDPOLY", base: "32d", vol: "3.2×", score: 94, tier: "gold", seed: 101 },
      { s: "STOCK_B", base: "18d", vol: "2.8×", score: 87, tier: "silver", seed: 202 },
      { s: "STOCK_C", base: "45d", vol: "4.1×", score: 72, tier: "", seed: 303 },
      { s: "STOCK_D", base: "26d", vol: "2.1×", score: 68, tier: "", seed: 404 },
    ],
  },
  {
    name: "52-Week High Breakouts",
    count: 12,
    items: [
      { s: "AEGISLOG", base: "14d", vol: "2.8×", score: 91, tier: "gold", seed: 505 },
      { s: "STOCK_E", base: "9d", vol: "3.0×", score: 78, tier: "", seed: 606 },
    ],
  },
  {
    name: "Darvas Box Breakouts",
    count: 3,
    items: [
      { s: "CAPLIPOINT", base: "21d", vol: "2.3×", score: 84, tier: "silver", seed: 707 },
      { s: "STOCK_F", base: "33d", vol: "2.0×", score: 71, tier: "", seed: 808 },
    ],
  },
];

const DEMO_BREAKOUTS = [
  {
    rank: 1,
    rankIcon: "🥇",
    symbol: "UNITEDPOLY",
    pattern: "BASE",
    score: 94,
    volume_multiple: 3.2,
    volFormatted: "3.2×",
    price: 46.0,
    priceFormatted: "₹46.00",
    notes: "Breaking 29-day base · Fib aligned",
    qualification_status: "AI_SELECTED",
  },
  {
    rank: 2,
    rankIcon: "🥈",
    symbol: "AEGISLOG",
    pattern: "52W_HIGH",
    score: 91,
    volume_multiple: 2.8,
    volFormatted: "2.8×",
    price: 812.4,
    priceFormatted: "₹812.40",
    notes: "New all-time high · Sector leader",
    qualification_status: "QUALIFIED_SLOTS_FULL",
  },
  {
    rank: 3,
    rankIcon: "🥉",
    symbol: "CAPLIPOINT",
    pattern: "DARVAS",
    score: 84,
    volume_multiple: 2.3,
    volFormatted: "2.3×",
    price: 1642.0,
    priceFormatted: "₹1,642.00",
    notes: "Darvas box breakout · Strong volume",
    qualification_status: "QUALIFIED_SLOTS_FULL",
  },
  {
    rank: 4,
    rankIcon: "4",
    symbol: "STOCK_D",
    pattern: "BASE",
    score: 68,
    volume_multiple: 1.8,
    volFormatted: "1.8×",
    price: 156.0,
    priceFormatted: "₹156.00",
    notes: "Narrow base but weak volume",
    qualification_status: "FILTERED_VOLUME",
  },
  {
    rank: 5,
    rankIcon: "5",
    symbol: "STOCK_G",
    pattern: "52W_HIGH",
    score: 64,
    volume_multiple: 1.6,
    volFormatted: "1.6×",
    price: 342.1,
    priceFormatted: "₹342.10",
    notes: "Extended 8% above pivot",
    qualification_status: "FILTERED_EXTENDED",
  },
];

const DEMO_FEED = [
  {
    time: "15:45",
    kind: "p",
    icon: "🟢",
    title: "KCPSUGIND sold at ₹29.68",
    desc: '<b class="num up">+₹2,179 (+14.99%)</b> · 2.23R · Held 58 days<br>Reason: TARGET_HIT',
    trade_symbol: "KCPSUGIND",
  },
  {
    time: "15:45",
    kind: "p",
    icon: "🟢",
    title: "SIGACHI sold at ₹30.41",
    desc: '<b class="num up">+₹2,182 (+15.02%)</b> · 2.09R · Held 35 days<br>Reason: TARGET_HIT',
    trade_symbol: "SIGACHI",
  },
  {
    time: "15:15",
    kind: "b",
    icon: "🔵",
    title: "No new entries today",
    desc: 'AI scanned <b class="num">847</b> stocks → <b class="num">0</b> passed quality gate',
    trade_symbol: null,
  },
  {
    time: "09:15",
    kind: "",
    icon: "📡",
    title: "Market opened · NIFTY 26,420 (+0.3%)",
    desc: "Breadth: 62% advancing · Sentiment: Mildly Bullish",
    trade_symbol: null,
  },
];

const INITIAL_EQUITY_DATA: EquityCurveData = {
  version: "v2",
  rangeDays: 90,
  currentNav: 414249,
  currentEquity: 414249,
  peakEquity: 426500,
  maxDrawdownPct: -2.87,
  maxDrawdownInr: 12251,
  series: NAV_SERIES.slice(-90).map((nav, i) => ({
    date: `Day ${i + 1}`,
    nav,
    cash: 50000,
    drawdownPct: Math.min(0, ((nav - 426500) / 426500) * 100),
    activePositions: 3 + (i % 2),
  })),
};

function normalizeActiveTrade(t: any, idx: number, eng: "v2" | "v3") {
  const sym = t.sym || t.symbol || `STOCK_${idx + 1}`;
  const ab = t.ab || sym.slice(0, 2).toUpperCase();
  const entry = Number(t.entry ?? t.entryPrice ?? 100);
  const now = Number(t.now ?? t.price ?? t.currentPrice ?? t.livePrice ?? entry);
  const stop = Number(t.stop ?? t.stopLoss ?? (entry * 0.92));
  const target = Number(t.target ?? t.targetPrice ?? (entry * 1.15));
  const pivot = Number(t.pivot ?? t.pivotPrice ?? (entry * 0.98));
  const days = Number(t.days ?? t.holdingDays ?? (idx * 4 + 2));
  const shares = Number(t.shares ?? 10);

  const isLive = Boolean(t.isLivePrice);
  const pnlPct = isLive || (t.pnlPct == null && t.roiPct == null && t.currentROI == null)
    ? (entry > 0 ? ((now - entry) / entry) * 100 : 0)
    : Number(t.pnlPct ?? t.roiPct ?? t.currentROI);
  const pnl = isLive || (t.pnl == null && t.unrealizedPnl == null)
    ? Math.round((now - entry) * shares)
    : Number(t.pnl ?? t.unrealizedPnl);
  const r = isLive || t.r == null
    ? (Math.abs(entry - stop) > 0.001 ? (now - entry) / Math.abs(entry - stop) : 0.36)
    : Number(t.r);
  const stars = Number(t.stars ?? (t.compositeScore ? t.compositeScore / 20 : 4.5));
  const ml = Number(t.ml ?? t.mlProbability ?? t.convictionScore ?? 70);
  const comp = Number(t.comp ?? t.compositeScore ?? 75);
  const risk = t.risk || (t.riskScore != null ? (t.riskScore < 30 ? "Low" : t.riskScore < 60 ? "Medium" : "High") : "Low");

  const tag = t.tag || `${t.sector || "Diversified"} · ${t.strategyName || (eng === "v2" ? "Breakout" : "Stage 2 Base")}`;
  const stage = t.stage || (t.strategyName ? `${t.strategyName} 📐` : (eng === "v3" ? "Stage 2 Base 📐" : "Breakout Setup"));
  const grad = t.grad || GRADIENTS[idx % GRADIENTS.length];
  const seed = t.seed ?? stringSeed(sym);

  let why = t.why;
  if (!why) {
    if (eng === "v2") {
      why = [
        `Breakout above ${days + 15}-day consolidation`,
        "Relative strength rank: Top 5% of universe",
        `${t.sector || "Sector"} showing institutional inflows`,
        `ML confidence: ${ml}% probability of 2R+ gain`,
      ];
    } else {
      why = `Breaking out of a ${days + 18}-day base with volume expansion. Fibonacci 1.272 extension sits at ₹${target.toFixed(2)}. Classic Stage-2 accumulation with tightening volatility.`;
    }
  }

  const entryDate = t.entryDate || t.date || "Active";
  const timeline = t.timeline || [
    [entryDate, `Entered at ₹${entry.toFixed(2)} · ${shares} shares`, "act"],
    ["Live", `Current · ${r.toFixed(2)}R · ₹${now.toFixed(2)}`, "act"],
  ];

  const radar = t.radar || [
    Number(t.technicalScore ?? (comp + 5)),
    ml,
    comp,
    100 - Number(t.riskScore ?? 25),
  ];

  const fib = t.fib || [
    ["Fib 1.0", `₹${(entry * 1.03).toFixed(2)}`, "✅ Hit", "hit"],
    ["Fib 1.272", `₹${target.toFixed(2)}`, "🎯 Next", "next"],
    ["Fib 1.618", `₹${(target * 1.12).toFixed(2)}`, "Stretch", ""],
  ];

  const overlays = t.overlays || [
    { price: pivot, color: "var(--gold)", label: `PIVOT ₹${pivot.toFixed(2)}` },
    { price: stop, color: "var(--loss)", label: `STOP ₹${stop.toFixed(2)}` },
    { price: entry, color: "var(--accent)", label: `ENTRY ₹${entry.toFixed(2)}` },
    { price: target, color: "var(--profit)", label: `T1 ₹${target.toFixed(2)}`, dash: "2 3" },
  ];

  let candles = t.miniChart?.candles || t.candles_data;
  if (!candles || candles.length === 0) {
    candles = makeCandles(seed, 26, entry * 0.94, { vol: 0.014, baseEnd: 22, drift: 0.01, breakout: 1.4 });
  }

  return {
    ...t,
    sym,
    symbol: sym,
    ab,
    name: t.name || t.companyName || sym,
    entry,
    entryPrice: entry,
    now,
    price: now,
    currentPrice: now,
    livePrice: now,
    stop,
    stopLoss: stop,
    target,
    targetPrice: target,
    pivot,
    days,
    holdingDays: days,
    shares,
    pnl,
    pnlPct,
    roiPct: pnlPct,
    chg: pnlPct,
    r,
    stars,
    ml,
    comp,
    compositeScore: comp,
    risk,
    tag,
    stage,
    patternName: t.pattern || (t.stage ? t.stage.replace(/📐|🚀|📦/g, "").trim() : (eng === "v3" ? "Stage 2 Flat Base" : "Breakout from Base")),
    baseFloor: Number(t.baseFloor ?? (stop * 0.94)),
    baseWeeks: t.baseWeeks || (stage?.includes("High-Tight") ? "6.4 wks" : stage?.includes("Darvas") ? "12.6 wks" : stage?.includes("Cup") ? "14.2 wks" : `${(days * 2 + 14).toFixed(1)} wks`),
    breakoutVol: Number(t.breakoutVol ?? (typeof why === "string" && why.includes("3×") ? 3.2 : typeof why === "string" && why.includes("2.8×") ? 2.85 : 4.85)),
    rsRating: Number(t.rsRating ?? comp ?? 91),
    grad,
    seed,
    why,
    timeline,
    radar,
    fib,
    overlays,
    entryDate,
    date: entryDate,
    miniChart: {
      symbol: sym,
      candles,
      sparkline: t.sparkline || t.miniChart?.sparkline || candles.map((c: any) => c.c || c.close || entry),
    },
  };
}

function normalizeClosedTrade(t: any, idx: number) {
  const sym = t.sym || t.symbol || `CLOSED_${idx + 1}`;
  const ab = t.ab || sym.slice(0, 2).toUpperCase();
  const entry = Number(t.entry ?? t.entryPrice ?? 100);
  const exit = Number(t.exit ?? t.exitPrice ?? 110);
  const pnl = Number(t.pnl ?? t.realizedPnl ?? Math.round((exit - entry) * (t.shares || 10)));
  const pnlPct = Number(t.pnlPct ?? t.roiPct ?? t.returnPct ?? t.tradeReturnPercent ?? (entry ? ((exit - entry) / entry) * 100 : 0));
  const r = Number(t.r ?? (entry ? ((exit - entry) / (entry * 0.07)) : 1.5));
  const days = Number(t.days ?? t.holdingDays ?? t.holdDays ?? (idx * 3 + 12));
  const reason = t.reason || t.exitReason || (pnl >= 0 ? "TARGET_HIT" : "STOP_HIT");
  const date = t.date || (t.exitDate ? t.exitDate.slice(5) : "Sep 15");
  const seed = t.seed ?? (50 + idx * 11);
  const trend = t.trend ?? (pnl >= 0 ? 0.005 : -0.004);

  let candles = t.miniChart?.candles || t.candles_data;
  if (!candles || candles.length === 0) {
    candles = makeCandles(seed, 26, entry, { vol: 0.016, baseEnd: 8, drift: trend, breakout: 1.2 });
  }

  return {
    ...t,
    sym,
    symbol: sym,
    ab,
    name: t.name || sym,
    entry,
    entryPrice: entry,
    exit,
    exitPrice: exit,
    pnl,
    realizedPnl: pnl,
    pnlPct,
    roiPct: pnlPct,
    returnPct: pnlPct,
    r,
    days,
    holdingDays: days,
    reason,
    exitReason: reason,
    date,
    seed,
    trend,
    miniChart: {
      symbol: sym,
      candles,
      sparkline: t.sparkline || candles.map((c: any) => c.c || c.close || entry),
    },
  };
}

export default function App() {
  /* ============================================================
     STATE & AUTH
     ============================================================ */
  const { user } = useAuth();
  const [engine, setEngine] = useState<"v2" | "v3">(() => {
    // V3 is disabled — always use V2 for maximum performance
    return "v2";
  });
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "light";
  });
  const [activeTab, setActiveTab] = useState<"home" | "signals" | "portfolio" | "dna" | "charts" | "intel" | "screener" | "lounge" | "more">(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p && ["home", "signals", "portfolio", "dna", "charts", "intel", "screener", "lounge", "more"].includes(p)) {
        return p as any;
      }
      // If direct deep link contains ?stock= or ?sym=, automatically open the DNA screen!
      const stockParam = new URLSearchParams(window.location.search).get("stock") || new URLSearchParams(window.location.search).get("sym");
      if (stockParam) {
        return "dna";
      }
    }
    return "home";
  });
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [sigSub, setSigSub] = useState<"active" | "closed">("active");

  const loungeIframeRef = useRef<HTMLIFrameElement>(null);

  // Sync auth and theme with Lounge chat iframe
  useEffect(() => {
    if (user && loungeIframeRef.current?.contentWindow) {
      loungeIframeRef.current.contentWindow.postMessage({
        type: "AUTH_SYNC",
        user: {
          email: user.email,
          displayName: user.displayName || user.email?.split("@")[0],
          photoURL: user.photoURL
        }
      }, "*");
    }
  }, [user]);

  useEffect(() => {
    if (loungeIframeRef.current?.contentWindow) {
      loungeIframeRef.current.contentWindow.postMessage({
        type: "THEME_CHANGE",
        theme
      }, "*");
    }
  }, [theme]);

  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === "THEME_SYNC" && e.data.theme) {
        if (e.data.theme !== theme) {
          setTheme(e.data.theme);
        }
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [theme]);
  const [chartSub, setChartSub] = useState<"live" | "scanner" | "portal">("live");
  const [range, setRange] = useState<number>(90);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isEngineInfoOpen, setIsEngineInfoOpen] = useState(false);
  const [v2ChartSel, setV2ChartSel] = useState<number>(0);
  const [dnaResetTrigger, setDnaResetTrigger] = useState<number>(0);
  const [selectedDnaStock, setSelectedDnaStock] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("stock") || new URLSearchParams(window.location.search).get("sym") || "";
    }
    return "";
  });
  const [analystStock, setAnalystStock] = useState<any | null>(null);
  const [selectedSignalTrade, setSelectedSignalTrade] = useState<any | null>(null);

  const navigateToTab = (
    tab: "home" | "signals" | "portfolio" | "dna" | "charts" | "intel" | "screener" | "lounge" | "more",
    stock?: string,
    resetDna: boolean = false
  ) => {
    setActiveTab(tab);
    if (tab === "signals" && selectedSignalTrade) {
      setSelectedSignalTrade(null);
    }
    if (stock !== undefined) {
      setSelectedDnaStock(stock);
    }
    if (resetDna) {
      setSelectedDnaStock("");
      setDnaResetTrigger((prev) => prev + 1);
    }
    if (typeof window !== "undefined" && window.history && window.history.pushState) {
      const p = new URLSearchParams(window.location.search);
      p.set("tab", tab);
      if (stock) {
        p.set("stock", stock);
      } else if (tab !== "dna") {
        p.delete("stock");
        p.delete("sym");
      }
      window.history.pushState({ tab, stock: stock || "" }, "", `?${p.toString()}`);
    }
  };

  // Browser Back/Forward navigation interception
  useEffect(() => {
    const handlePopState = () => {
      // 1. If breakout analyst modal is open, close it!
      if (analystStock) {
        setAnalystStock(null);
        return;
      }

      // 2. If signal trade page is open, close it!
      if (selectedSignalTrade) {
        setSelectedSignalTrade(null);
        return;
      }

      // 3. Read new location from browser
      const p = new URLSearchParams(window.location.search);
      const tab = p.get("tab") || "home";
      const stock = p.get("stock") || p.get("sym") || "";

      if (["home", "signals", "portfolio", "dna", "charts", "intel", "screener", "lounge", "more"].includes(tab)) {
        setActiveTab(tab as any);
      }
      setSelectedDnaStock(stock);

      if (tab === "dna" && !stock) {
        setDnaResetTrigger((prev) => prev + 1);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [analystStock, selectedSignalTrade]);

  // Handle messages from embedded iframes (e.g. DNA reset or back to search)
  useEffect(() => {
    const handleFrameMsg = (e: MessageEvent) => {
      if (e.data?.type === "DNA_BACK_TO_SEARCH") {
        setSelectedDnaStock("");
        const p = new URLSearchParams(window.location.search);
        p.delete("stock");
        p.delete("sym");
        window.history.replaceState({ tab: "dna" }, "", `?${p.toString()}`);
      } else if (e.data?.type === "DNA_STOCK_SELECTED" && e.data?.stock) {
        setSelectedDnaStock(e.data.stock);
        const p = new URLSearchParams(window.location.search);
        p.set("stock", e.data.stock);
        window.history.pushState({ tab: "dna", stock: e.data.stock }, "", `?${p.toString()}`);
      }
    };
    window.addEventListener("message", handleFrameMsg);
    return () => window.removeEventListener("message", handleFrameMsg);
  }, []);

  // Transitional Animation State (Rocket hitting bulls eye)
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionEngine, setTransitionEngine] = useState<"v2" | "v3">("v2");

  // User Paper Trading Portfolio State & Cloud Sync
  const [portfolio, setPortfolio] = useState<ManualPortfolioTrade[]>(() => {
    try {
      const saved = localStorage.getItem("qs_paper_portfolio");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [completedHistory, setCompletedHistory] = useState<CompletedTrade[]>(() => {
    try {
      const saved = localStorage.getItem("qs_completed_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);
  const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [closedTf, setClosedTf] = useState<"1M" | "3M" | "6M" | "ALL">("ALL");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [buyModalItem, setBuyModalItem] = useState<{ symbol: string; initialPrice: number; strategyName?: string } | null>(null);
  const [sellModalItem, setSellModalItem] = useState<any | null>(null);

  // Centralized Paper Trade modal opener with authentication gate
  const handleOpenBuyModal = useCallback(
    (sym: string, price: number, strategy?: string) => {
      if (!user) {
        setAuthMode("signup");
        setShowAuthModal(true);
        return;
      }
      setBuyModalItem({ symbol: sym, initialPrice: price, strategyName: strategy });
    },
    [user]
  );

  // Fetch per-user portfolio and history from Firestore when authenticated
  useEffect(() => {
    if (user) {
      const loadUserData = async () => {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.portfolio) setPortfolio(data.portfolio);
            if (data.completedHistory) setCompletedHistory(data.completedHistory);
          } else {
            await setDoc(
              userDocRef,
              {
                email: user.email,
                createdAt: Date.now(),
                portfolio: [],
                completedHistory: []
              },
              { merge: true }
            );
          }
          setIsCloudLoaded(true);
        } catch (err: any) {
          console.error("Error loading Firestore data:", err);
          setIsCloudLoaded(true);
        }
      };
      loadUserData();
    } else {
      setIsCloudLoaded(false);
      try {
        const saved = localStorage.getItem("qs_paper_portfolio");
        setPortfolio(saved ? JSON.parse(saved) : []);
        const savedHist = localStorage.getItem("qs_completed_history");
        setCompletedHistory(savedHist ? JSON.parse(savedHist) : []);
      } catch {
        setPortfolio([]);
        setCompletedHistory([]);
      }
    }
  }, [user]);

  // Persist portfolio & history to Firestore whenever they change
  useEffect(() => {
    if (user && isCloudLoaded) {
      const userDocRef = doc(db, "users", user.uid);
      setDoc(userDocRef, { portfolio, completedHistory }, { merge: true }).catch((err) => {
        console.error("Failed to save to Firestore:", err);
      });
      try {
        localStorage.setItem("qs_paper_portfolio", JSON.stringify(portfolio));
        localStorage.setItem("qs_completed_history", JSON.stringify(completedHistory));
      } catch {}
    } else if (!user) {
      try {
        localStorage.setItem("qs_paper_portfolio", JSON.stringify(portfolio));
        localStorage.setItem("qs_completed_history", JSON.stringify(completedHistory));
      } catch {}
    }
  }, [portfolio, completedHistory, user, isCloudLoaded]);

  // Bottom Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPayload, setSheetPayload] = useState<{ kind: "v2" | "v3" | "closed" | "screener_detail"; trade: any } | null>(null);

  // Live Data States — initialized from fast session cache so first frame render is 0ms instant
  const [terminalData, setTerminalData] = useState<TerminalSnapshot | null>(() => {
    try {
      const cached = sessionStorage.getItem("quantsync_cached_terminal_v2");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [terminalDataV2, setTerminalDataV2] = useState<TerminalSnapshot | null>(() => {
    try {
      const cached = sessionStorage.getItem("quantsync_cached_terminal_v2");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [terminalDataV3, setTerminalDataV3] = useState<TerminalSnapshot | null>(null);
  const [isTerminalLoading, setIsTerminalLoading] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem("quantsync_cached_terminal_v2");
    } catch {
      return true;
    }
  });
  const [showEngineExplainer, setShowEngineExplainer] = useState<boolean>(false);
  const [equityData, setEquityData] = useState<EquityCurveData | null>(INITIAL_EQUITY_DATA);
  const [feedItems, setFeedItems] = useState<ActivityFeedItem[]>(DEMO_FEED as any);
  const [scannerReport, setScannerReport] = useState<ScannerReport | null>(null);
  const [patterns, setPatterns] = useState<PatternSection[]>(DEMO_PATTERNS as any);
  const [breakouts, setBreakouts] = useState<BreakoutItem[]>(DEMO_BREAKOUTS as any);
  const [marketPulse, setMarketPulse] = useState<MarketPulseData | null>(null);
  const [sectorsData, setSectorsData] = useState<Array<{ name: string; disp_value?: string; change_pct: number; color?: string }>>([]);
  const [newsData, setNewsData] = useState<Array<any>>([]);
  const [homeTab, setHomeTab] = useState<"reports" | "movement" | "news">("reports");
  const [terminalTab, setTerminalTab] = useState<"report" | "movement" | "news">("report");
  const [openTimelineDays, setOpenTimelineDays] = useState<Record<number, boolean>>({ 0: true });
  const [dayReports, setDayReports] = useState<Array<any>>([]);
  const [newsMovers, setNewsMovers] = useState<Array<any>>([]);
  const [terminalIndices, setTerminalIndices] = useState(TERMINAL_INDICES);
  const [terminalBriefs, setTerminalBriefs] = useState<any[]>(TERMINAL_BRIEFS);
  const [terminalSectors, setTerminalSectors] = useState(TERMINAL_SECTORS);
  const [terminalMovers, setTerminalMovers] = useState<any[]>(TERMINAL_MOVERS);
  const [terminalNewsGroups, setTerminalNewsGroups] = useState<Array<{ day: string; items: any[] }>>(TERMINAL_NEWS_GROUPS);
  const [terminalPulse, setTerminalPulse] = useState(() => {
    const nowD = new Date();
    const daysArr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthsArr = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return {
      display_date: `${daysArr[nowD.getDay()]} · ${nowD.getDate()} ${monthsArr[nowD.getMonth()]} ${nowD.getFullYear()}`,
      sentiment_pill: "Live Market",
      advances_pct: 55,
      declines_pct: 45,
      fii_net_cr: 0,
      dii_net_cr: 0,
    };
  });
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [dailyDigest, setDailyDigest] = useState<string>("");
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [systemConfig, setSystemConfig] = useState<any>(null);

  // Live Chart state
  const [liveChartData, setLiveChartData] = useState<ChartData | null>(null);
  const fetchedQuotesRef = useRef<Set<string>>(new Set());

  // ── Real-Time WebSocket Market Stream (Every 1s) ──
  const { isConnected: isWsConnected, indices: wsIndices, livePrices } = useLiveMarket();

  // Keep terminalIndices (Nifty 50, Sensex, Bank Nifty) synced live every second
  useEffect(() => {
    if (wsIndices && wsIndices.length >= 3) {
      setTerminalIndices((prev) => {
        return wsIndices.map((idx, i) => ({
          ...idx,
          spark: (idx.spark && idx.spark.length > 0) ? idx.spark : ((prev[i] as any)?.spark || [])
        }));
      });
    }
  }, [wsIndices]);
  const [chartSymbol, setChartSymbol] = useState<string>("UNITEDPOLY");
  const [overlayToggles, setOverlayToggles] = useState<Record<string, boolean>>({
    fib: true,
    pivot: true,
    ma: true,
    atr: false,
    pattern: true,
  });

  const appRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const eqWrapRef = useRef<HTMLDivElement>(null);
  const eqTipRef = useRef<HTMLDivElement>(null);
  const [eqTipState, setEqTipState] = useState<{ on: boolean; left: number; top: number; html: string }>({
    on: false,
    left: 0,
    top: 0,
    html: "",
  });

  /* ============================================================
     THEME & ENGINE EFFECTS
     ============================================================ */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.engine = engine;
    localStorage.setItem("engine", engine);
    fetchAllData(engine);
  }, [engine]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const playEnginePulse = () => {
    if (!appRef.current) return;
    const pulse = document.createElement("div");
    pulse.className = "engine-pulse";
    const color = engine === "v2" ? "rgba(139,92,246,.48)" : "rgba(99,102,241,.42)";
    pulse.style.background = `radial-gradient(circle at 85% 5%, ${color} 0%, transparent 55%)`;
    appRef.current.appendChild(pulse);
    setTimeout(() => pulse.remove(), 1000);

    const sweep = document.createElement("div");
    sweep.className = "engine-sweep play";
    appRef.current.appendChild(sweep);
    setTimeout(() => sweep.remove(), 950);
  };

  const switchEngine = (next: "v2" | "v3") => {
    if (next === engine) return;
    setIsTransitioning(true);
    setTransitionEngine(next);
    playEnginePulse();
    setEngine(next);
    setV2ChartSel(0);

    // Fast asynchronous data fetching without artificial delays
    fetchAllData(next).finally(() => {
      setIsTransitioning(false);
    });
  };

  /* ============================================================
     DATA FETCHING
     ============================================================ */
  const fetchAllData = useCallback(async (currentEngine: "v2" | "v3") => {
    // Only show full loading spinner if we don't already have live data in memory
    setTerminalData(prev => {
      if (!prev) setIsTerminalLoading(true);
      return prev;
    });

    try {
      // 1. Terminal master snapshot — fetch with immediate background resolution
      const termRes = await quantsyncApi.getTerminalData(currentEngine).catch(() => null);

      if (termRes) {
        setTerminalData(termRes);
        setTerminalDataV2(termRes);
        try {
          sessionStorage.setItem(`quantsync_cached_terminal_${currentEngine}`, JSON.stringify(termRes));
        } catch {}

        const activeList = termRes.active || termRes.inTradeTrades || [];
        if (activeList.length > 0) {
          const sym = activeList[0].sym || activeList[0].symbol;
          if (sym) {
            setChartSymbol(sym);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching live data:", err);
    } finally {
      setIsTerminalLoading(false);
    }
  }, []);

  const fetchEquity = async (v: "v2" | "v3", days: number) => {
    try {
      const eq = await quantsyncApi.getEquityCurve(v, days);
      if (eq) setEquityData(eq);
    } catch (e) {
      console.error("Failed to load equity curve:", e);
    }
  };

  const fetchChart = async (sym: string, eng: "v2" | "v3") => {
    try {
      const c = await quantsyncApi.getChartData(sym, 250, eng);
      if (c) setLiveChartData(c);
    } catch (e) {
      console.error(`Failed to load chart for ${sym}:`, e);
    }
  };

  // Fetch equity curve on-demand ONLY when user opens portfolio tab
  useEffect(() => {
    if (activeTab === "portfolio") {
      fetchEquity(engine, range);
    }
  }, [activeTab, engine, range]);

  // Fetch chart on-demand ONLY when user opens charts tab
  useEffect(() => {
    if (activeTab === "charts" && chartSymbol) {
      fetchChart(chartSymbol, engine);
    }
  }, [activeTab, chartSymbol, engine]);

  // Fetch real V3 patterns and breakouts on-demand when charts/scanner/portal tabs are active
  useEffect(() => {
    if (activeTab === "charts") {
      quantsyncApi.getPatterns().then((res) => {
        if (res && res.sections && res.sections.length > 0) {
          setPatterns(res.sections);
        }
      }).catch((e) => console.warn("Failed to load live patterns:", e));

      quantsyncApi.getBreakouts().then((res) => {
        if (res && res.breakouts && res.breakouts.length > 0) {
          setBreakouts(res.breakouts);
        }
      }).catch((e) => console.warn("Failed to load live breakouts:", e));
    }
  }, [activeTab, chartSub]);

  // Performance optimization: Lazy-mount offscreen tab components so unvisited tabs
  // do not trigger heavy backend queries, iframes, or chart rendering on initial home load
  const [hasOpenedLounge, setHasOpenedLounge] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("tab") === "lounge";
    }
    return false;
  });

  const [hasOpenedDna, setHasOpenedDna] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      return p.get("tab") === "dna" || !!p.get("stock") || !!p.get("sym");
    }
    return false;
  });

  const [hasOpenedScreener, setHasOpenedScreener] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("tab") === "screener";
    }
    return false;
  });

  useEffect(() => {
    if (activeTab === "lounge") setHasOpenedLounge(true);
    if (activeTab === "dna" || selectedDnaStock) setHasOpenedDna(true);
    if (activeTab === "screener") setHasOpenedScreener(true);
  }, [activeTab, selectedDnaStock]);

  const handleRangeChange = (r: number) => {
    setRange(r);
    fetchEquity(engine, r);
  };

  /* ============================================================
     CANDLESTICK SVG GENERATOR
     ============================================================ */
  const renderCandlesSVG = (
    candles: Array<{ open?: number; o?: number; high?: number; h?: number; low?: number; l?: number; close?: number; c?: number }>,
    opts: {
      w?: number;
      h?: number;
      padT?: number;
      padB?: number;
      overlays?: Array<{ price: number; color: string; label?: string; dash?: string; opacity?: number }>;
      glowLast?: number;
    } = {}
  ) => {
    let rawCandles = candles;
    if (!rawCandles || rawCandles.length === 0) {
      const basePrice = (opts.overlays && opts.overlays.length > 0 && opts.overlays[0].price) ? opts.overlays[0].price : 100;
      rawCandles = makeCandles(101, 26, basePrice * 0.94);
    }

    const W = opts.w || 360;
    const H = opts.h || 110;
    const padT = opts.padT ?? 14;
    const padB = opts.padB ?? 14;

    const normalized = rawCandles.map(c => ({
      o: Number(c.open ?? c.o ?? 0),
      h: Number(c.high ?? c.h ?? 0),
      l: Number(c.low ?? c.l ?? 0),
      c: Number(c.close ?? c.c ?? 0),
    }));

    let max = -Infinity, min = Infinity;
    normalized.forEach(c => {
      if (c.h > max) max = c.h;
      if (c.l < min) min = c.l;
    });

    (opts.overlays || []).forEach(ov => {
      if (ov.price > max) max = ov.price;
      if (ov.price < min) min = ov.price;
    });

    const raw = max - min || 1;
    max += raw * 0.07;
    min -= raw * 0.07;
    const span = max - min || 1;

    const y = (p: number) => padT + ((max - p) / span) * (H - padT - padB);
    const slot = W / normalized.length;
    const bw = Math.max(1.4, slot * 0.6);

    // Stagger overlay labels to prevent overlapping collisions
    const sortedOverlays = [...(opts.overlays || [])].sort((a, b) => b.price - a.price);
    const overlayLines = sortedOverlays.map((ov, idx) => {
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
            strokeWidth="0.8"
            strokeDasharray={ov.dash || "4 4"}
            opacity={ov.opacity ?? 0.65}
          />
          {ov.label && (
            <text
              x={isRight ? W - 6 : 4}
              textAnchor={isRight ? "end" : "start"}
              y={yy - 3}
              fontSize="7"
              fontWeight="700"
              fontFamily="'JetBrains Mono',monospace,sans-serif"
              fill={ov.color}
              opacity="0.9"
            >
              {ov.label}
            </text>
          )}
        </g>
      );
    });

    const candleElements = normalized.map((c, i) => {
      const cx = i * slot + slot / 2;
      const up = c.c >= c.o;
      const col = up ? "var(--profit)" : "var(--loss)";
      const bt = y(Math.max(c.o, c.c));
      const bb = y(Math.min(c.o, c.c));
      const bh = Math.max(1, bb - bt);

      return (
        <g key={`c-${i}`} className="cdl" style={{ animationDelay: `${Math.min(i * 16, 600)}ms` }}>
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
            rx={Math.min(1.5, bw / 3)}
            fill={col}
          />
        </g>
      );
    });

    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        className="candlesvg"
      >
        {overlayLines}
        {candleElements}
      </svg>
    );
  };

  /* ============================================================
     RADAR SVG GENERATOR
     ============================================================ */
  const renderRadarSVG = (vals: number[]) => {
    const v = vals && vals.length === 4 ? vals : [75, 75, 75, 75];
    const cx = 62, cy = 62, R = 46;
    const axes = 4;
    const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / axes;
    const pt = (i: number, r: number) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];

    const grid = [0.33, 0.66, 1].map((f, idx) => {
      const pts = [...Array(axes)].map((_, i) => pt(i, R * f).map(n => n.toFixed(1)).join(",")).join(" ");
      return <polygon key={`grid-${idx}`} points={pts} fill="none" stroke="var(--line-2)" strokeWidth="1" />;
    });

    const spokes = [...Array(axes)].map((_, i) => {
      const [x, y] = pt(i, R);
      return <line key={`spoke-${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line-2)" strokeWidth="1" />;
    });

    const poly = v.map((val, i) => pt(i, R * (val / 100)).map(n => n.toFixed(1)).join(",")).join(" ");
    const dots = v.map((val, i) => {
      const [x, y] = pt(i, R * (val / 100));
      return (
        <circle
          key={`dot-${i}`}
          cx={x}
          cy={y}
          r="2.8"
          fill="var(--accent)"
          style={{ filter: "drop-shadow(0 0 6px var(--accent))" }}
        />
      );
    });

    return (
      <svg width="124" height="124" viewBox="0 0 124 124">
        <defs>
          <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.14" />
          </radialGradient>
        </defs>
        {grid}
        {spokes}
        <polygon
          points={poly}
          fill="url(#radarFill)"
          stroke="var(--accent)"
          strokeWidth="1.8"
          style={{ filter: "drop-shadow(0 0 8px var(--glow))" }}
        />
        {dots}
      </svg>
    );
  };

  /* ============================================================
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === "CLOSE_STOCK_DETAIL" || e.data?.type === "BACK_TO_SEARCH") {
        setSheetOpen(false);
      } else if (e.data?.type === "SELECT_STOCK" && e.data?.symbol) {
        openSheet("screener_detail", { symbol: e.data.symbol, sym: e.data.symbol });
      } else if (e.data?.type === "OPEN_DNA" && e.data?.symbol) {
        setSheetOpen(false);
        setSelectedDnaStock(e.data.symbol);
        setActiveTab("dna");
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, []);

  /* ============================================================
     BOTTOM SHEET OPEN / CLOSE
     ============================================================ */
  const openSheet = (kind: "v2" | "v3" | "closed" | "screener_detail", trade: any) => {
    setSheetPayload({ kind, trade });
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
  };

  /* ============================================================
     INTERACTIVE EQUITY CURVE SVG
     ============================================================ */
  const renderEquityCurve = () => {
    const series = equityData?.series || [];
    if (series.length < 2) {
      return (
        <div style={{ height: 140, display: "grid", placeItems: "center", color: "var(--ink3)", fontSize: 11 }}>
          Loading live equity curve...
        </div>
      );
    }

    const W = 370;
    const H = 140;
    const padT = 10, padB = 12;

    const navs = series.map(p => p.nav);
    const mn = Math.min(...navs);
    const mx = Math.max(...navs);
    const span = mx - mn || 1;

    const x = (i: number) => (i / (series.length - 1)) * W;
    const y = (v: number) => padT + ((mx - v) / span) * (H - padT - padB);

    let line = "", area = "";
    series.forEach((p, i) => {
      const px = x(i).toFixed(1), py = y(p.nav).toFixed(1);
      line += (i ? " L" : "M") + px + " " + py;
      area += (i ? " L" : "M") + px + " " + py;
    });
    area += ` L${W} ${H} L0 ${H} Z`;

    let peak = -Infinity;
    const ddPts: Array<[number, number, number]> = [];
    series.forEach((p, i) => {
      peak = Math.max(peak, p.nav);
      ddPts.push([x(i), y(peak), y(p.nav)]);
    });

    let ddPath = "M" + ddPts.map(p => `${p[0].toFixed(1)} ${p[2].toFixed(1)}`).join(" L");
    ddPath += " L" + [...ddPts].reverse().map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L") + " Z";

    const peakY = y(mx);
    const lastPoint = series[series.length - 1];

    const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const rel = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const i = Math.round(rel * (series.length - 1));
      const p = series[i];
      const px = x(i);
      const py = y(p.nav);

      setEqTipState({
        on: true,
        left: (px / W) * rect.width,
        top: py,
        html: `<b>${INR(p.nav)}</b>
          <span class="mut">Drawdown</span> <span class="${p.drawdownPct < 0 ? "down" : "up"}">${p.drawdownPct.toFixed(2)}%</span><br>
          <span class="mut">Active positions</span> <span class="num">${p.activePositions}</span>`,
      });
    };

    const handlePointerLeave = () => {
      setEqTipState(prev => ({ ...prev, on: false }));
    };

    return (
      <div className="eq-wrap" ref={eqWrapRef}>
        <div
          ref={eqTipRef}
          className={`eq-tip ${eqTipState.on ? "on" : ""}`}
          style={{ left: `${eqTipState.left}px`, top: `${eqTipState.top}px` }}
          dangerouslySetInnerHTML={{ __html: eqTipState.html }}
        />
        <svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block" }}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerMove}
        >
          <defs>
            <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
              <stop offset="60%" stopColor="var(--accent)" stopOpacity="0.06" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
            <filter id="eqGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d={ddPath} fill="var(--loss)" opacity="0.10" />
          <line x1="0" x2={W} y1={peakY} y2={peakY} stroke="var(--ink3)" strokeWidth="1" strokeDasharray="3 5" opacity="0.5" />
          <path d={area} fill="url(#eqFill)" />
          <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" filter="url(#eqGlow)" />
          <circle
            cx={W}
            cy={y(lastPoint.nav)}
            r="4"
            fill="var(--accent)"
            stroke="var(--s1)"
            strokeWidth="2"
            style={{ filter: "drop-shadow(0 0 8px var(--accent))" }}
          />
        </svg>
      </div>
    );
  };
  const renderInteractiveEquityCurve = renderEquityCurve;

  /* ============================================================
     RENDER CALCULATED VALUES
     ============================================================ */
  const heroNav = terminalData?.hero?.nav || terminalData?.portfolioValue || 300000;
  const heroPnl = terminalData?.hero?.todayPnl || 0;
  const heroPnlPct = terminalData?.hero?.todayPnlPct || 0;
  const heroWin = terminalData?.hero?.winRate || terminalData?.winRate || terminalData?.kpis?.winRate || 0;
  const heroWins = terminalData?.hero?.wins || terminalData?.kpis?.wins || terminalData?.totalSummary?.wins || 0;
  const heroLosses = terminalData?.hero?.losses || terminalData?.kpis?.losses || terminalData?.totalSummary?.losses || 0;

  const rawActive = (terminalData?.active && terminalData.active.length > 0)
    ? terminalData.active
    : ((terminalData?.inTradeTrades && terminalData.inTradeTrades.length > 0)
      ? terminalData.inTradeTrades
      : []);
  const activeTrades = rawActive.map((t: any, idx: number) => {
    const sym = (t.symbol || t.title || t.sym || "").toUpperCase().trim();
    const live = livePrices && sym ? livePrices[sym] : undefined;
    const tradeData = live && live.price > 0 ? { ...t, currentPrice: live.price, price: live.price, ltp: live.price, now: live.price, isLivePrice: true } : t;
    return normalizeActiveTrade(tradeData, idx, engine);
  });

  const rawClosed = (terminalData?.closed && terminalData.closed.length > 0)
    ? terminalData.closed
    : ((terminalData?.closedTrades && terminalData.closedTrades.length > 0)
      ? terminalData.closedTrades
      : []);
  const closedTrades = rawClosed.map((t: any, idx: number) => normalizeClosedTrade(t, idx));

  // Sort active trades: latest record first
  const sortedActiveTrades = useMemo(() => {
    return [...activeTrades].sort((a, b) => {
      const da = parseTradeDate(a.entryDate || a.date || a.created_at || "2026-01-01").getTime();
      const db = parseTradeDate(b.entryDate || b.date || b.created_at || "2026-01-01").getTime();
      return db - da;
    });
  }, [activeTrades]);

  // Sort closed trades: latest exit date first
  const sortedClosedTrades = useMemo(() => {
    return [...closedTrades].sort((a, b) => {
      const da = parseTradeDate(a.exitDate || a.date || a.exit_date || "2026-01-01").getTime();
      const db = parseTradeDate(b.exitDate || b.date || b.exit_date || "2026-01-01").getTime();
      return db - da;
    });
  }, [closedTrades]);

  // Aggregated active trades across BOTH V2 and V3 for seamless cross-engine portfolio synchronization
  const allInTradeTrades = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    const getRaw = (data: TerminalSnapshot | null, eng: "v2" | "v3") => {
      if (!data) return [];
      if (data.active && data.active.length > 0) return data.active;
      if (data.inTradeTrades && data.inTradeTrades.length > 0) return data.inTradeTrades;
      return [];
    };

    const v2Raw = getRaw(terminalDataV2 || (engine === "v2" ? terminalData : null), "v2");
    const v3Raw = getRaw(terminalDataV3 || (engine === "v3" ? terminalData : null), "v3");

    v2Raw.forEach((t: any, idx: number) => {
      const sym = (t.symbol || t.title || t.sym || "").toUpperCase().trim();
      const live = livePrices && sym ? livePrices[sym] : undefined;
      const tradeData = live && live.price > 0 
        ? { ...t, currentPrice: live.price, price: live.price, ltp: live.price, now: live.price, isLivePrice: true }
        : t;
      const norm = normalizeActiveTrade(tradeData, idx, "v2");
      if (sym && !seen.has(`${sym}_v2`)) {
        seen.add(`${sym}_v2`);
        list.push({ ...norm, engine: "v2" });
      }
    });

    v3Raw.forEach((t: any, idx: number) => {
      const sym = (t.symbol || t.title || t.sym || "").toUpperCase().trim();
      const live = livePrices && sym ? livePrices[sym] : undefined;
      const tradeData = live && live.price > 0 
        ? { ...t, currentPrice: live.price, price: live.price, ltp: live.price, now: live.price, isLivePrice: true }
        : t;
      const norm = normalizeActiveTrade(tradeData, idx, "v3");
      if (sym && !seen.has(`${sym}_v3`)) {
        seen.add(`${sym}_v3`);
        list.push({ ...norm, engine: "v3" });
      }
    });

    return list;
  }, [terminalDataV2, terminalDataV3, terminalData, engine, livePrices]);

  // Auto-subscribe all active trades across V2 and V3, and portfolio positions to WebSocket
  useEffect(() => {
    const symsToWatch = new Set<string>();
    allInTradeTrades.forEach((t: any) => {
      const s = (t.sym || t.symbol || "").toUpperCase().trim();
      if (s) symsToWatch.add(s);
    });
    portfolio.forEach((p: any) => {
      const s = (p.symbol || "").toUpperCase().trim();
      if (s) symsToWatch.add(s);
    });
    if (symsToWatch.size > 0) {
      liveMarketSocket.subscribe(Array.from(symsToWatch));
    }
  }, [allInTradeTrades.length, portfolio.length]);

  // Dynamic header date (no hardcoded current date)
  const headerDateStr = useMemo(() => {
    if (terminalData?.asOfDate) return formatDisplayDate(terminalData.asOfDate);
    if (sortedActiveTrades.length > 0 && (sortedActiveTrades[0].entryDate || sortedActiveTrades[0].date)) {
      return formatDisplayDate(sortedActiveTrades[0].entryDate || sortedActiveTrades[0].date);
    }
    if (sortedClosedTrades.length > 0 && (sortedClosedTrades[0].exitDate || sortedClosedTrades[0].date)) {
      return formatDisplayDate(sortedClosedTrades[0].exitDate || sortedClosedTrades[0].date);
    }
    return "Live Data";
  }, [terminalData, sortedActiveTrades, sortedClosedTrades]);

  // Paper Portfolio Calculations
  const paperStats = useMemo(() => {
    const INITIAL_CASH = 500000;
    let totalInvested = 0;
    let currentValue = 0;

    portfolio.forEach((pos: any) => {
      const buyP = Number(pos.buyPrice || 0);
      const qty = Number(pos.quantity || 1);
      const invested = buyP * qty;
      totalInvested += invested;

      const sym = (pos.symbol || "").toUpperCase().trim();
      const live = livePrices && sym ? livePrices[sym] : undefined;
      const liveMatch = allInTradeTrades.find((a: any) => (a.sym || a.symbol || "").toUpperCase().trim() === sym);
      const curP = live && live.price > 0 
        ? live.price 
        : (liveMatch ? Number(liveMatch.now || liveMatch.currentPrice || liveMatch.price || buyP) : Number(pos.currentPrice || buyP));
      currentValue += curP * qty;
    });

    const unrealizedPnl = currentValue - totalInvested;
    const unrealizedPct = totalInvested > 0 ? (unrealizedPnl / totalInvested) * 100 : 0;
    const totalPortfolioValue = (INITIAL_CASH - totalInvested) + currentValue;

    return {
      totalInvested,
      currentValue,
      unrealizedPnl,
      unrealizedPct,
      totalPortfolioValue,
      count: portfolio.length,
    };
  }, [portfolio, allInTradeTrades, livePrices]);

  // Synchronize live LTP and active status into portfolio across both engines
  useEffect(() => {
    if (allInTradeTrades.length > 0 && portfolio.length > 0) {
      setPortfolio((prev) => {
        if (!prev || prev.length === 0) return prev;
        const activeMap = new Map<string, any>();
        allInTradeTrades.forEach((t: any) => {
          const s = (t.sym || t.symbol || "").toUpperCase().trim();
          if (s) activeMap.set(s, t);
        });
        let changed = false;
        const updated = prev.map((p: any) => {
          const sym = (p.symbol || "").toUpperCase().trim();
          const match = activeMap.get(sym);
          if (match) {
            const newLtp = Number(
              match.now || match.currentPrice || match.price || match.entryPrice || p.currentPrice || p.buyPrice
            );
            const newRoi =
              match.pnlPct !== undefined
                ? Number(match.pnlPct)
                : p.buyPrice > 0
                ? ((newLtp - p.buyPrice) / p.buyPrice) * 100
                : 0;
            const eng = match.engine || p.engine;
            if (p.currentPrice !== newLtp || p.isActiveInStrategy !== true || p.currentROI !== newRoi || (eng && p.engine !== eng)) {
              changed = true;
              return {
                ...p,
                currentPrice: newLtp,
                currentROI: newRoi,
                isActiveInStrategy: true,
                engine: eng || p.engine
              };
            }
          } else {
            const isManual = (p.strategyName || "").toLowerCase().trim() === "manual";
            if (!isManual && p.isActiveInStrategy !== false) {
              changed = true;
              return {
                ...p,
                isActiveInStrategy: false
              };
            }
          }
          return p;
        });
        return changed ? updated : prev;
      });
    }

    // Also fetch latest DB candle closes for non-algorithmic holdings (fetch at most once per symbol)
    if (portfolio.length > 0) {
      const activeSymbols = new Set(allInTradeTrades.map((t: any) => (t.sym || t.symbol || "").toUpperCase().trim()));
      const pendingManualHoldings = portfolio.filter((p: any) => {
        const s = (p.symbol || "").toUpperCase().trim();
        return s && !activeSymbols.has(s) && !fetchedQuotesRef.current.has(s);
      });

      pendingManualHoldings.forEach((pos: any) => {
        const s = (pos.symbol || "").toUpperCase().trim();
        fetchedQuotesRef.current.add(s);
        fetch(`/api/stock/quote/${encodeURIComponent(s)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((q) => {
            if (q && q.close && Number(q.close) > 0) {
              const latestClose = Number(q.close);
              setPortfolio((prev) =>
                prev.map((item) => {
                  if ((item.symbol || "").toUpperCase().trim() === s && item.currentPrice !== latestClose) {
                    const buyP = Number(item.buyPrice || 0);
                    return {
                      ...item,
                      currentPrice: latestClose,
                      currentROI: buyP > 0 ? ((latestClose - buyP) / buyP) * 100 : 0
                    };
                  }
                  return item;
                })
              );
            }
          })
          .catch(() => {});
      });
    }
  }, [allInTradeTrades]);

  // Synchronize WebSocket live prices directly into manual portfolio holdings
  useEffect(() => {
    if (!livePrices || Object.keys(livePrices).length === 0 || portfolio.length === 0) return;
    setPortfolio((prev) => {
      let changed = false;
      const updated = prev.map((p) => {
        const sym = (p.symbol || "").toUpperCase().trim();
        const live = livePrices[sym];
        if (live && live.price > 0 && live.price !== p.currentPrice) {
          changed = true;
          const newRoi = p.buyPrice > 0 ? ((live.price - p.buyPrice) / p.buyPrice) * 100 : 0;
          return {
            ...p,
            currentPrice: live.price,
            currentROI: newRoi
          };
        }
        return p;
      });
      return changed ? updated : prev;
    });
  }, [livePrices]);

  // Buy submission handler (Cloud synced via Firestore)
  const handleBuySubmit = (data: { symbol: string; buyPrice: number; quantity: number; strategyName?: string; currentPrice?: number }) => {
    const symKey = (data.symbol || "").toUpperCase().trim();
    const activeMatch = allInTradeTrades.find((s: any) => (s.sym || s.symbol || "").toUpperCase().trim() === symKey);
    const ltp = activeMatch?.now || activeMatch?.currentPrice 
      ? Number(activeMatch.now || activeMatch.currentPrice) 
      : (data.currentPrice && data.currentPrice > 0 ? Number(data.currentPrice) : data.buyPrice);
    const isSignalActive = !!activeMatch;

    const newPosition: ManualPortfolioTrade = {
      tradeId: `port-${Date.now()}`,
      symbol: data.symbol.toUpperCase().trim(),
      buyPrice: data.buyPrice,
      quantity: data.quantity,
      totalInvested: data.buyPrice * data.quantity,
      strategyName: data.strategyName || activeMatch?.strategyName || (engine === "v2" ? "V2 Pro AI" : "V3 Pattern AI"),
      engine: (activeMatch?.engine || engine) as "v2" | "v3",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      daysHeld: 1,
      isActiveInStrategy: isSignalActive,
      currentPrice: ltp,
      currentROI: data.buyPrice > 0 ? ((ltp - data.buyPrice) / data.buyPrice) * 100 : 0
    };

    setPortfolio((prev) => [newPosition, ...prev]);

    // If activeMatch was not found, trigger live quote fetch from SQLite DB to ensure latest candle close LTP is populated
    if (!activeMatch && symKey) {
      fetch(`/api/stock/quote/${encodeURIComponent(symKey)}`)
        .then((res) => res.ok ? res.json() : null)
        .then((q) => {
          if (q && q.close && Number(q.close) > 0) {
            const dbLtp = Number(q.close);
            setPortfolio((prev) =>
              prev.map((p) => {
                if ((p.symbol || "").toUpperCase().trim() === symKey && p.tradeId === newPosition.tradeId) {
                  return {
                    ...p,
                    currentPrice: dbLtp,
                    currentROI: p.buyPrice > 0 ? ((dbLtp - p.buyPrice) / p.buyPrice) * 100 : 0
                  };
                }
                return p;
              })
            );
          }
        })
        .catch(() => {});
    }

    showToast(`Added ${data.quantity} shares of ${data.symbol} to Portfolio`);
    setBuyModalItem(null);
  };

  // Sell submission handler (Calculates realized metrics and saves to Firestore history)
  const handleSellSubmit = (data: { tradeId?: string; symbol: string; sellPrice: number; sellQuantity: number }) => {
    const target = portfolio.find((p) => p.tradeId === data.tradeId || p.symbol === data.symbol);
    if (!target) return;

    const buyPrice = target.buyPrice || data.sellPrice;
    const qty = data.sellQuantity;
    const invested = buyPrice * qty;
    const received = data.sellPrice * qty;
    const pnl = received - invested;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

    const completed: CompletedTrade = {
      tradeId: target.tradeId || `hist-${Date.now()}`,
      symbol: data.symbol,
      buyPrice,
      sellPrice: data.sellPrice,
      quantity: qty,
      totalInvested: invested,
      totalReceived: received,
      pnl,
      pnlPct,
      strategyName: target.strategyName,
      buyDate: target.date || "Past",
      sellDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      holdDays: target.daysHeld || 1
    };

    setCompletedHistory((prev) => [completed, ...prev]);

    if ((target.quantity || 1) <= qty) {
      setPortfolio((prev) => prev.filter((p) => p !== target));
    } else {
      setPortfolio((prev) =>
        prev.map((p) => {
          if (p === target) {
            const remainingQty = (p.quantity || 1) - qty;
            return {
              ...p,
              quantity: remainingQty,
              totalInvested: p.buyPrice * remainingQty
            };
          }
          return p;
        })
      );
    }

    showToast(`Exited ${data.symbol} for ${pnl >= 0 ? "+" : ""}${pnlPct.toFixed(1)}% return`);
    setSellModalItem(null);
  };

  // Delete completed history trade handler
  const handleDeleteCompletedTrade = (tradeIdOrIndex: string | number) => {
    setCompletedHistory((prev) => {
      if (typeof tradeIdOrIndex === "number") {
        return prev.filter((_, idx) => idx !== tradeIdOrIndex);
      }
      return prev.filter((t) => (t.tradeId || t.symbol) !== tradeIdOrIndex);
    });
    showToast("Completed trade record deleted");
  };

  // Closed Signals Stats (Win Rate, Profit Factor, Avg Return, Avg R, Wins/Losses)
  const closedStats = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let grossWinReturn = 0;
    let grossLossReturn = 0;
    let totalRoi = 0;
    let totalR = 0;

    closedTrades.forEach((t: any) => {
      const rPct = Number(t.pnlPct ?? t.roiPct ?? 0);
      const rVal = Number(t.r ?? 1.5);
      totalRoi += rPct;
      totalR += rVal;
      if (rPct >= 0) {
        wins++;
        grossWinReturn += rPct;
      } else {
        losses++;
        grossLossReturn += Math.abs(rPct);
      }
    });

    const total = closedTrades.length || 1;
    const winRate = (wins / total) * 100;
    const profitFactor = grossLossReturn > 0 ? grossWinReturn / grossLossReturn : (grossWinReturn > 0 ? 3.5 : 1.0);
    const avgReturn = totalRoi / total;
    const avgR = totalR / total;

    return {
      totalTrades: closedTrades.length,
      wins,
      losses,
      winRate,
      profitFactor,
      avgReturn,
      avgR,
    };
  }, [closedTrades]);

  // Closed Trades Cumulative Return % Curve
  const closedCurveData = useMemo(() => {
    const sorted = [...closedTrades].sort((a, b) => {
      const da = parseTradeDate(a.exitDate || a.date || a.exit_date || "2026-01-01").getTime();
      const db = parseTradeDate(b.exitDate || b.date || b.exit_date || "2026-01-01").getTime();
      return da - db;
    });

    if (sorted.length === 0) return { periodTrades: [], periodReturn: 0, points: [] };

    const lastDate = parseTradeDate(sorted[sorted.length - 1].exitDate || sorted[sorted.length - 1].date || "2026-09-18").getTime();

    let daysCutoff = 3650;
    if (closedTf === "1M") daysCutoff = 30;
    else if (closedTf === "3M") daysCutoff = 90;
    else if (closedTf === "6M") daysCutoff = 180;

    const msCutoff = daysCutoff * 24 * 60 * 60 * 1000;
    const filtered = closedTf === "ALL"
      ? sorted
      : sorted.filter((t: any) => {
          const d = parseTradeDate(t.exitDate || t.date || "2026-01-01").getTime();
          return (lastDate - d) <= msCutoff;
        });

    const tradesToUse = filtered.length > 0 ? filtered : sorted.slice(-15);

    let runningReturn = 0;
    const points = tradesToUse.map((t: any) => {
      const rPct = Number(t.pnlPct ?? t.roiPct ?? 0);
      runningReturn += rPct;
      return {
        date: t.date || formatDisplayDate(t.exitDate),
        symbol: t.sym || t.symbol,
        roi: rPct,
        cumReturn: runningReturn,
        reason: t.reason || t.exitReason || "TARGET_HIT",
      };
    });

    return {
      periodTrades: tradesToUse,
      periodReturn: runningReturn,
      points,
    };
  }, [closedTrades, closedTf]);

  const renderClosedCurveSVG = () => {
    const { points } = closedCurveData;
    if (!points || points.length === 0) return null;

    const w = 360;
    const h = 130;
    const padTop = 15;
    const padBottom = 22;
    const padLeft = 8;
    const padRight = 8;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    const values = points.map(p => p.cumReturn);
    const minVal = Math.min(0, ...values);
    const maxVal = Math.max(5, ...values);
    const range = maxVal - minVal || 1;

    const coords = points.map((p, i) => {
      const x = padLeft + (i / (points.length - 1 || 1)) * chartW;
      const y = padTop + chartH - ((p.cumReturn - minVal) / range) * chartH;
      return { x, y, ...p };
    });

    const polylinePts = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    const fillPath = `M${coords[0].x.toFixed(1)},${(padTop + chartH).toFixed(1)} L${coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" L")} L${coords[coords.length - 1].x.toFixed(1)},${(padTop + chartH).toFixed(1)} Z`;

    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="rtCurveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--profit)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--profit)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {minVal < 0 && (
          <line
            x1={padLeft}
            y1={padTop + chartH - ((0 - minVal) / range) * chartH}
            x2={w - padRight}
            y2={padTop + chartH - ((0 - minVal) / range) * chartH}
            stroke="var(--line-2)"
            strokeDasharray="3 3"
          />
        )}
        <path d={fillPath} fill="url(#rtCurveGrad)" />
        <polyline
          points={polylinePts}
          fill="none"
          stroke="var(--profit)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(16,185,129,.4))" }}
        />
        {coords.length > 0 && (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="4.5"
            fill="#FFF"
            stroke="var(--profit)"
            strokeWidth="2.5"
          />
        )}
      </svg>
    );
  };

  // Sparkline in hero
  const spark = (terminalData?.hero?.navSparkline && terminalData.hero.navSparkline.length > 1)
    ? terminalData.hero.navSparkline
    : (terminalData?.sparkline && terminalData.sparkline.length > 1)
      ? terminalData.sparkline
      : NAV_SERIES.slice(-40);
  let heroNavSparkPath = "";
  if (spark.length > 1) {
    const mn = Math.min(...spark), mx = Math.max(...spark);
    const span = mx - mn || 1;
    const pts = spark.map((v, i) => `${(i / (spark.length - 1) * 110).toFixed(1)},${(20 - ((v - mn) / span) * 18).toFixed(1)}`);
    heroNavSparkPath = `M${pts.join(" L")} L110 22 L0 22 Z`;
  }

  const streakDays = terminalData?.streak?.current || 7;
  const streakBest = terminalData?.streak?.best_this_year || 12;

  // Scanner values: 3 Clear Steps for users: Universe -> Found by Strategy -> Selected by AI
  const scCount = scannerReport?.scanned_count || (engine === "v2" ? 2165 : 1318);
  const patternCount = scannerReport?.pattern_count ?? scannerReport?.tech_filter_count ?? (engine === "v2" ? 1 : 4);
  const tradedCount = scannerReport?.traded_count ?? scannerReport?.selected_count ?? 0;

  const scannerNote = useMemo(() => {
    if (tradedCount === 0) {
      return `AI evaluated ${scCount.toLocaleString()} universe stocks: ${patternCount} setup spotted by strategy, but 0 selected by AI today · Market conditions unfavorable, preserving capital.`;
    }
    return `AI evaluated ${scCount.toLocaleString()} universe stocks: ${patternCount} setups spotted by strategy, and ${tradedCount} top conviction ${tradedCount === 1 ? "stock" : "stocks"} selected by AI.`;
  }, [scCount, patternCount, tradedCount]);

  // Only show top cards if stocks were actually selected & entered today
  const scannerTop3 = (tradedCount > 0 && scannerReport?.top3 && scannerReport.top3.length > 0)
    ? scannerReport.top3
    : [];

  return (
    <div className="app" id="app" ref={appRef}>
      {/* Ambient washes */}
      <div className="ambient ambient-v2" />
      <div className="ambient ambient-v3" />

      {/* ============ TOP BAR ============ */}
      {activeTab !== "lounge" && (
        <header className="topbar">
          <div className="brand" style={{ display: "flex", alignItems: "center" }}>
            {activeTab === "dna" && selectedDnaStock ? (
              <button
                type="button"
                className="theme-btn"
                onClick={() => {
                  setSelectedDnaStock("");
                  setDnaResetTrigger((prev) => prev + 1);
                  const p = new URLSearchParams(window.location.search);
                  p.delete("stock");
                  p.delete("sym");
                  window.history.pushState({ tab: "dna" }, "", `?${p.toString()}`);
                }}
                style={{
                  width: 32,
                  height: 32,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8,
                  cursor: "pointer",
                  borderRadius: "50%"
                }}
                title="Back to DNA Search"
                aria-label="Back"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            ) : activeTab === "signals" && selectedSignalTrade ? (
              <button
                type="button"
                className="theme-btn"
                onClick={() => {
                  setSelectedSignalTrade(null);
                }}
                style={{
                  width: 32,
                  height: 32,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8,
                  cursor: "pointer",
                  borderRadius: "50%"
                }}
                title="Back to Signals"
                aria-label="Back"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            ) : null}
            <span className="brand-mark">QuantSync</span>
            <span className="pulse-dot" id="mktDot" />
          </div>
          <div className="topbar-right">
            <button className="theme-btn" id="themeBtn" onClick={toggleTheme} aria-label="Toggle theme">
              <svg className="i-sun" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4.2" />
                <path d="M12 2v2.4M12 19.6V22M22 12h-2.4M4.4 12H2M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7M19.1 19.1l-1.7-1.7M6.6 6.6 4.9 4.9" />
              </svg>
              <svg className="i-moon" viewBox="0 0 24 24">
                <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
              </svg>
            </button>
            <button
              className={`theme-btn ${isMoreOpen || activeTab === "more" ? "active" : ""}`}
              id="userMoreBtn"
              onClick={() => setIsMoreOpen(true)}
              aria-label="User profile and settings"
              title="Account, Settings & Platform Diagnostics"
              style={{
                background: isMoreOpen ? "var(--s3)" : undefined,
                borderColor: isMoreOpen ? "var(--accent)" : undefined
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: "currentColor", fill: "none", strokeWidth: 1.8 }}>
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        </header>
      )}

      {/* ============ SCREENS ============ */}
      <main className="screens" id="screens">
        {/* ===== HOME SCREEN (LUXURY EXECUTIVE "WHAT TO BUY TODAY" DECK) ===== */}
        <section className={`screen ${activeTab === "home" ? "active" : ""}`} id="screen-home" style={{ padding: 0 }}>
          <LuxuryHomeDeck
            terminalData={terminalData}
            livePrices={livePrices}
            terminalIndices={terminalIndices}
            isWsConnected={isWsConnected}
            theme={theme}
            onNavigate={(tab) => {
              navigateToTab(tab as any);
            }}
            onSelectStockForDna={(sym) => {
              navigateToTab("dna", sym);
            }}
            onOpenChart={(sym) => {
              fetchChart(sym, "v2");
            }}
            onOpenAnalyst={(stock) => {
              setAnalystStock(stock);
            }}
          />
        </section>

        {false && (
          <div className="shell">
            {/* HERO */}
            <section className="hero">
              <div className="greet-label">
                {(() => {
                  const h = new Date().getHours();
                  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
                })()}
                <span className="em">.</span>
              </div>
              <div className="greet-date">
                <span>
                  {(() => {
                    const nowD = new Date();
                    const daysArr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const monthsArr = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    return `${daysArr[nowD.getDay()]} · ${nowD.getDate()} ${monthsArr[nowD.getMonth()]} ${nowD.getFullYear()}`;
                  })()}
                </span>
                <span className="dot" />
                <span>Mumbai · IST</span>
                <span className="dot" />
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: isWsConnected ? "var(--profit)" : "var(--ink3)", fontWeight: 700, fontSize: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: isWsConnected ? "var(--profit)" : "var(--ink3)", boxShadow: isWsConnected ? "0 0 6px var(--profit)" : "none" }} />
                  {isWsConnected ? "LIVE" : "SYNCING"}
                </span>
              </div>

              {/* SNAPSHOT */}
              <div className="snapshot">
                {terminalIndices.map((idx) => {
                  const isUp = idx.p >= 0;
                  const arrow = isUp ? "▲" : "▼";
                  const { d } = getTerminalSparkPath(idx.seed, 28, idx.trend, 100, 18);
                  const fillId = `spark-fill-${idx.seed}`;
                  const colorVar = isUp ? "var(--up)" : "var(--down)";

                  return (
                    <div key={idx.n} className="idx-tile">
                      <div className="idx-name">{idx.n}</div>
                      <div className="idx-val num">
                        {idx.v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className={`idx-chg ${isUp ? "up" : "down"}`}>
                        <span>{arrow}</span>
                        <span>{isUp ? "+" : ""}{idx.p.toFixed(2)}%</span>
                      </div>
                      <div className="idx-spark">
                        <svg viewBox="0 0 100 18" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={colorVar} stopOpacity="0.28" />
                              <stop offset="100%" stopColor={colorVar} stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path d={`${d} L100,18 L0,18 Z`} fill={`url(#${fillId})`} />
                          <path
                            d={d}
                            fill="none"
                            stroke={colorVar}
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ filter: `drop-shadow(0 0 4px ${isUp ? "rgba(66,197,142,0.4)" : "rgba(234,108,110,0.4)"})` }}
                          />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* MARKET STATUS STRIP */}
              {(() => {
                const statusInfo = getMarketStatusInfo();
                return (
                  <div className={`market-status ${statusInfo.isOpen ? "live-open" : ""}`}>
                    <span className={`status-dot ${statusInfo.isOpen ? "live" : ""}`} />
                    <span className="ms-key">{statusInfo.statusText}</span>
                    <span className="ms-sep">·</span>
                    <span>{statusInfo.subText}</span>
                    <span className="ms-verified">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {statusInfo.verified}
                    </span>
                  </div>
                );
              })()}
            </section>

            {/* TABS */}
            <nav className="tabs" id="tabs">
              <button
                className={terminalTab === "report" ? "active" : ""}
                onClick={() => setTerminalTab("report")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3h9l3 3v15H6z" />
                  <path d="M9 8h6M9 12h6M9 16h4" />
                </svg>
                <span className="lbl">Brief</span>
                <span className="sub">today's read</span>
              </button>
              <button
                className={terminalTab === "movement" ? "active" : ""}
                onClick={() => setTerminalTab("movement")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 17l5-6 4 3 5-8 4 4" />
                </svg>
                <span className="lbl">Movers</span>
                <span className="sub">price + why</span>
              </button>
              <button
                className={terminalTab === "news" ? "active" : ""}
                onClick={() => setTerminalTab("news")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5h13a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4z" />
                  <path d="M8 9h7M8 13h7M8 17h4" />
                </svg>
                <span className="lbl">News</span>
                <span className="sub">disclosures</span>
              </button>
            </nav>

            {/* TAB 1: MARKET BRIEF */}
            <section className={`panel ${terminalTab === "report" ? "active" : ""}`} id="report">
              <div className="sec-head">
                <div className="h">The <span className="em">daily brief</span></div>
                <div className="meta">{terminalBriefs.length} sessions</div>
              </div>
              <div className="timeline" id="timeline">
                {terminalBriefs.map((b, i) => {
                  const isToday = !!b.today;
                  const isOpen = !!openTimelineDays[i];
                  return (
                    <div key={b.date + i} className={`day ${isToday ? "today" : ""} ${isOpen ? "open" : ""}`}>
                      <div
                        className="day-head"
                        onClick={() => setOpenTimelineDays((prev) => ({ ...prev, [i]: !prev[i] }))}
                      >
                        <div className="day-date">{b.date}</div>
                        {isToday && <span className="day-pill">Today</span>}
                        <div className="day-meta">{b.meta}</div>
                        <div className="day-chev">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </div>
                      </div>
                      <div className="day-body">
                        <div className="day-inner">
                          {/* Pre-Market Segment */}
                          <div className="segment">
                            <div className="segment-head">
                              <div className="icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 2v2M4.9 4.9l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M12 20v2" />
                                  <circle cx="12" cy="12" r="3.5" />
                                </svg>
                              </div>
                              <div className="t">Pre-Market Battle Plan</div>
                              <div className="time">{b.pre.time}</div>
                            </div>
                            <ul className="segment-list">
                              {b.pre.items.map((itemHtml, idx) => (
                                <li key={idx} dangerouslySetInnerHTML={{ __html: itemHtml }} />
                              ))}
                            </ul>
                            {b.pre.levels && (
                              <div className="levels">
                                {b.pre.levels.map((lvl, lIdx) => (
                                  <div key={lIdx} className={`lvl ${lvl.kind}`}>
                                    <div className="k">{lvl.k}</div>
                                    <div className="v">{lvl.v}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Post-Market Segment */}
                          <div className="segment">
                            <div className="segment-head">
                              <div className="icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 22v-3M6.5 15.5 4 18M17.5 15.5 20 18M3 12h2M19 12h2M6.5 8.5 4 6M17.5 8.5 20 6M12 2v2" />
                                  <circle cx="12" cy="12" r="4" />
                                </svg>
                              </div>
                              <div className="t">Post-Market Executive Wrap</div>
                              <div className="time">{b.post.time}</div>
                            </div>
                            <ul className="segment-list">
                              {b.post.items.map((itemHtml, idx) => (
                                <li key={idx} dangerouslySetInnerHTML={{ __html: itemHtml }} />
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* TAB 2: TOP MOVERS */}
            <section className={`panel ${terminalTab === "movement" ? "active" : ""}`} id="movement">
              <div className="card">
                <div className="pulse">
                  <div className="pulse-head">
                    <div className="pulse-title">Market Pulse</div>
                    <div className="sent-pill"><span className="pulse-dot" />{terminalPulse.sentiment_pill}</div>
                  </div>

                  <div className="breadth-vis">
                    <div className="breadth-label-row">
                      <span className="adv">Advancing {terminalPulse.advances_pct}%</span>
                      <span className="dec">Declining {terminalPulse.declines_pct}%</span>
                    </div>
                    <div className="breadth-bar">
                      <i style={{ width: `${terminalPulse.advances_pct}%` }} />
                    </div>
                  </div>

                  <div className="flow">
                    <div className="flow-item">
                      <div className="k">FII Net</div>
                      <div className="v">{terminalPulse.fii_net_cr >= 0 ? "+" : ""}₹{terminalPulse.fii_net_cr.toLocaleString()} Cr</div>
                    </div>
                    <div className="flow-item">
                      <div className="k">DII Net</div>
                      <div className="v">{terminalPulse.dii_net_cr >= 0 ? "+" : ""}₹{terminalPulse.dii_net_cr.toLocaleString()} Cr</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sec-head">
                <div className="h">Sector <span className="em">heatmap</span></div>
                <div className="meta">Live · {terminalSectors.length} sectors</div>
              </div>
              <div className="card heatmap">
                <div className="heat-head">
                  <div className="h">Where money moved today</div>
                  <div className="meta">NSE · Sectoral</div>
                </div>
                <div className="heat-grid" id="heatGrid">
                  {terminalSectors.map((s) => {
                    const pos = s.p >= 0;
                    const intensity = Math.min(Math.abs(s.p) / 1.6, 1);
                    const baseColor = pos ? "var(--up)" : "var(--down)";
                    const mixPct = theme === "light" ? (4 + intensity * 13).toFixed(1) : (5 + intensity * 16).toFixed(1);
                    const bg = `color-mix(in srgb, ${baseColor} ${mixPct}%, var(--panel-2))`;
                    const barWidth = (28 + intensity * 70).toFixed(0);

                    return (
                      <div key={s.n} className={`heat-cell ${pos ? "up" : "down"}`} style={{ background: bg }}>
                        <span className="n">{s.n}</span>
                        <span className="p">{pos ? "+" : ""}{s.p.toFixed(2)}%</span>
                        <div className="mini-bar">
                          <i style={{ width: `${barWidth}%`, background: baseColor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sec-head">
                <div className="h">Big <span className="em">movers</span></div>
                <div className="meta">&gt;3% moves</div>
              </div>
              <div className="card movers">
                <div className="movers-head">
                  <div className="h">⚡ The catalysts <small>· why each stock moved</small></div>
                </div>
                <div id="moversList">
                  {terminalMovers.map((m) => {
                    const isUp = m.pct >= 0;
                    return (
                      <div key={m.sym} className="mover-row">
                        <div className="mover-left">
                          <div className="mover-top">
                            <span className="mover-sym">{m.sym}</span>
                            <span className={`mover-pct ${isUp ? "up" : "down"}`}>
                              {isUp ? "+" : ""}{m.pct.toFixed(2)}%
                            </span>
                          </div>
                          <div className="mover-desc">{m.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* TAB 3: NEWS */}
            <section className={`panel ${terminalTab === "news" ? "active" : ""}`} id="news">
              <div className="sec-head">
                <div className="h">Corporate <span className="em">disclosures</span></div>
                <div className="meta">{terminalNewsGroups.reduce((acc, g) => acc + g.items.length, 0)} filings</div>
              </div>
              <div id="newsList">
                {terminalNewsGroups.map((g) => (
                  <div key={g.day} className="news-group">
                    <div className="news-group-label">
                      <span>{g.day}</span>
                      <span className="line" />
                      <span className="count">{g.items.length}</span>
                    </div>
                    {g.items.map((n, idx) => {
                      const sym = n.sym || (n as any).stock_code || "CO";
                      const co = n.co || (n as any).stock_name || sym;
                      const body = n.body || (n as any).notification || "";
                      const time = n.time || (n as any).time_stamp || "15:45 IST";
                      const src = n.src || sym.slice(0, 2).toUpperCase();
                      const tag = n.tag || "order";
                      const label = n.label || "Corporate Move";
                      const url = (n as any).url || (n as any).complete_url || (n as any).screen_redirect_url;

                      return (
                        <div key={idx} className="news-item">
                          <div className="news-src">{src}</div>
                          <div className="news-main">
                            <div className="news-top">
                              <span className="news-co">{co}</span>
                              <span className="news-sym">{sym}</span>
                              <span className={`news-tag ${tag}`}>{label}</span>
                            </div>
                            <div className="news-body">{body}</div>
                            <div className="news-foot">
                              <span className="news-time">
                                <svg className="clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="9" />
                                  <path d="M12 7v5l3 2" />
                                </svg>
                                {time}
                              </span>
                              <a
                                className="news-link"
                                href={url || "#"}
                                target={url ? "_blank" : undefined}
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  if (!url) e.preventDefault();
                                }}
                              >
                                View source
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M7 17 17 7M9 7h8v8" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>

            {/* FOOTER */}
            <footer className="footer">
              <div className="mark">Quant<span>Sync</span> · Terminal</div>
              <div className="meta">Data sourced from NSE · BSE · 15:45 IST</div>
            </footer>
          </div>
        )}

        {/* ===== SIGNALS SCREEN (AI CALLS) ===== */}
        <section className={`screen ${activeTab === "signals" ? "active" : ""}`} id="screen-signals">
          {selectedSignalTrade ? (
            <div className="signal-page-container">
              <TradingViewStockDetail
                trade={selectedSignalTrade}
                theme={theme}
                INR={INR}
                INR2={INR2}
                onClose={() => setSelectedSignalTrade(null)}
                onOpenDna={(sym) => {
                  navigateToTab("dna", sym);
                }}
                onOpenChart={(sym) => {
                  setSelectedSignalTrade(null);
                  setChartSymbol(sym);
                  setActiveTab("charts");
                  setChartSub("live");
                  fetchChart(sym, engine);
                }}
              />
            </div>
          ) : (
            <>
              {/* Collapsible iOS-Style Engine Bar (Default Collapsed) */}
              <div className={`signals-engine-compact-card ${isEngineInfoOpen ? "is-open" : ""}`}>
            <div className="signals-engine-compact-bar">
              <button
                type="button"
                className="signals-engine-info-toggle"
                onClick={() => setIsEngineInfoOpen(prev => !prev)}
                aria-expanded={isEngineInfoOpen}
              >
                <div className="signals-engine-info-badge">
                  <span className="info-badge-icon">⚡</span>
                  <span className="info-badge-text">Select AI Engine</span>
                  <span className="info-badge-hint">· How it works</span>
                </div>
                <svg
                  className={`signals-caret ${isEngineInfoOpen ? "open" : ""}`}
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </button>

              {/* V3 disabled — single engine mode for maximum performance */}
              <div className="ios-segmented-control" data-sel="v2" style={{ pointerEvents: "none", opacity: 0.85 }}>
                <button
                  type="button"
                  className="ios-segment-btn active"
                >
                  <span className="segment-dot v2" />
                  <span>AI Pro</span>
                </button>
              </div>
            </div>

            {/* Expandable Accordion Drawer with 5 Simple Steps */}
            {isEngineInfoOpen && (
              <div className="signals-engine-drawer">
                <div className="engine-drawer-header">
                  <div className={`engine-drawer-badge ${engine === "v2" ? "v2" : "v3"}`}>
                    {engine === "v2" ? "AI PRO ENGINE" : "CHART + AI ENGINE"}
                  </div>
                  <div className="engine-drawer-summary">
                    {engine === "v2"
                      ? "In simple words: The AI scans 500+ stocks every day and picks the top 1 to 3 trades with the highest chance to win."
                      : "In simple words: Finds famous breakout chart patterns, and the AI double-checks them so you don't get caught in fake traps."}
                  </div>
                </div>

                <div className="engine-flow-steps">
                  {engine === "v2" ? (
                    <>
                      <div className="engine-flow-step">
                        <div className="step-badge">1</div>
                        <div className="step-content">
                          <div className="step-title">Scans 500+ Stocks</div>
                          <div className="step-desc">
                            Every morning, our system scans all major Indian stocks to see where big institutions and funds are quietly buying.
                          </div>
                        </div>
                      </div>

                      <div className="engine-flow-step">
                        <div className="step-badge">2</div>
                        <div className="step-content">
                          <div className="step-title">Calculates Win Probability</div>
                          <div className="step-desc">
                            The AI calculates the mathematical chances of the stock going up vs falling down, rejecting risky trades.
                          </div>
                        </div>
                      </div>

                      <div className="engine-flow-step">
                        <div className="step-badge">3</div>
                        <div className="step-content">
                          <div className="step-title">Checks 5 Years of Past History</div>
                          <div className="step-desc">
                            The AI looks back at thousands of similar setups in past market history to decide the most realistic profit target.
                          </div>
                        </div>
                      </div>

                      <div className="engine-flow-step">
                        <div className="step-badge">4</div>
                        <div className="step-content">
                          <div className="step-title">Selects Only the Best 1–3 Trades</div>
                          <div className="step-desc">
                            Out of hundreds of stocks, only the top 1 to 3 setups with the highest conviction are given as Buy signals.
                          </div>
                        </div>
                      </div>

                      <div className="engine-flow-step">
                        <div className="step-badge">5</div>
                        <div className="step-content">
                          <div className="step-title">Tells You Exactly When to Exit</div>
                          <div className="step-desc">
                            You never have to guess when to sell. The AI tracks the stock live, moves your safety stop up to protect profits, and tells you when to book profit.
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="engine-flow-step">
                        <div className="step-badge">1</div>
                        <div className="step-content">
                          <div className="step-title">Spots Famous Chart Shapes</div>
                          <div className="step-desc">
                            The system automatically draws and spots famous chart shapes like Triangles, Base Breakouts, and Cup &amp; Handles.
                          </div>
                        </div>
                      </div>

                      <div className="engine-flow-step">
                        <div className="step-badge">2</div>
                        <div className="step-content">
                          <div className="step-title">AI Filters Out Fake Breakouts</div>
                          <div className="step-desc">
                            Most chart breakouts are fake traps where normal traders lose money. Our AI checks real buying volume to filter out fake moves.
                          </div>
                        </div>
                      </div>

                      <div className="engine-flow-step">
                        <div className="step-badge">3</div>
                        <div className="step-content">
                          <div className="step-title">Sets Clear Target &amp; Safety Level</div>
                          <div className="step-desc">
                            Before you even enter, it gives you an exact Target price to take profit and a Stop Loss price to protect your capital.
                          </div>
                        </div>
                      </div>

                      <div className="engine-flow-step">
                        <div className="step-badge">4</div>
                        <div className="step-content">
                          <div className="step-title">Signals at the Perfect Entry Moment</div>
                          <div className="step-desc">
                            Alerts you the moment the stock breaks out cleanly, so you never buy too early or chase too late.
                          </div>
                        </div>
                      </div>

                      <div className="engine-flow-step">
                        <div className="step-badge">5</div>
                        <div className="step-content">
                          <div className="step-title">Automatically Locks In Your Profits</div>
                          <div className="step-desc">
                            As the stock climbs higher, the system moves your safety stop up behind the price so your profit stays protected until the target is hit.
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="subtabs" id="sigTabs">
            <button
              className={`subtab ${sigSub === "active" ? "on" : ""}`}
              onClick={() => setSigSub("active")}
            >
              Active Trades {isTerminalLoading ? "(...)" : `(${sortedActiveTrades.length})`}
            </button>
            <button
              className={`subtab ${sigSub === "closed" ? "on" : ""}`}
              onClick={() => setSigSub("closed")}
            >
              Closed Trades {isTerminalLoading ? "(...)" : `(${sortedClosedTrades.length})`}
            </button>
          </div>

          {/* ACTIVE TRADES TAB */}
          {sigSub === "active" && (
            <div id="sigActive">
              {/* AI Scanner Funnel: Rendered ONLY on Active Screen */}
              <div className={`scanner ${isScannerOpen ? "open" : ""}`} id="scanner">
                <div className="scanner-head" id="scannerHead" onClick={() => setIsScannerOpen(prev => !prev)}>
                  <div className="row gap10">
                    <span style={{ fontSize: 16 }}>🧠</span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>Today's AI Scanner Report</div>
                      <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 2 }} id="scannerSub">
                        {scCount.toLocaleString()} scanned → {tradedCount} entered
                      </div>
                    </div>
                  </div>
                  <svg className="caret" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </div>
                <div className="scanner-body">
                  <div className="scanner-body-inner">
                    <div className="funnel" id="funnel">
                      {[
                        ["Stocks Scanned", scCount, scCount],
                        ["Found by Strategy", patternCount, scCount],
                        ["Selected by AI Conviction", tradedCount, Math.max(patternCount, 1)],
                      ].map((st, i) => (
                        <div key={i} className="fstep">
                          <div className="fl">{st[0]}</div>
                          <div className="fbar">
                            <span style={{ width: `${Math.min(100, Math.max(st[1] ? 4 : 0, ((st[1] as number) / (st[2] as number || 1)) * 100))}%` }} />
                          </div>
                          <div className="fn">{st[1]}</div>
                        </div>
                      ))}
                    </div>

                    {scannerTop3.length > 0 ? (
                      <div className="top3" id="top3">
                        {scannerTop3.map((t, i) => (
                          <div key={i} className="t">
                            <div className="s">{t.symbol}</div>
                            <div className="sc">{t.score}</div>
                            <div className="stars">
                              ★★★★★
                              <i style={{ width: `${(t.stars / 5) * 100}%` }}>★★★★★</i>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: "var(--ink3)", padding: "10px 0", fontStyle: "italic", textAlign: "center" }}>
                        Zero stocks met the strict institutional threshold today · Preserving capital
                      </div>
                    )}

                    <div style={{ fontSize: 10.5, color: "var(--ink3)", lineHeight: 1.6, fontStyle: "italic", marginTop: 8 }} id="scannerNote">
                      {scannerNote}
                    </div>
                    {engine === "v3" && (
                      <button className="btn" style={{ marginTop: 13 }} onClick={() => setActiveTab("charts")}>
                        Browse All Qualified →
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isTerminalLoading ? (
                <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--ink3)" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: "3px solid var(--line-2)",
                      borderTopColor: "var(--accent)",
                      animation: "spin 0.8s linear infinite",
                      margin: "0 auto 12px"
                    }}
                  />
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink1)" }}>
                    Loading Live {engine === "v2" ? "AI Pro" : "Chart + AI"} Setups...
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                    Fetching verified exchange signals from VPS master ledger
                  </div>
                </div>
              ) : sortedActiveTrades.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "36px 16px", borderRadius: 16 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink1)" }}>
                    No Active Positions Open
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink3)", marginTop: 4 }}>
                    Current market conditions do not meet strict institutional risk criteria · Preserving Capital
                  </div>
                </div>
              ) : engine === "v2" ? (
                // V2 ACTIVE CARDS (+ADD button, % ROI, Stars, 4-step sequence, Signal Date shifted below Stop Loss, and dark action tag exactly as requested)
                sortedActiveTrades.map((t: any, i: number) => {
                  const pPct = t.pnlPct ?? t.roiPct ?? 0;
                  const daysHeld = getTradeDaysHeld(t);
                  const tagInfo = getActionTagInfo("active", daysHeld, pPct);
                  const rawDate = t.entryDate || t.date || "2026-09-15";
                  const dateStr = typeof rawDate === "string" && rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;

                  return (
                    <div
                      key={i}
                      className="trade-h"
                      onClick={() => setSelectedSignalTrade(t)}
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
                      {/* Top Header Row: Monogram | Symbol, NSE, Stars, Strategy | +ADD & ROI */}
                      <div className="row gap12" style={{ alignItems: "flex-start" }}>
                        <div className="av" style={{ background: t.grad || "linear-gradient(135deg,#F59E0B,#D97706)", borderRadius: 13, flexShrink: 0 }}>
                          {t.ab || t.sym?.slice(0, 2) || "EM"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="row between" style={{ alignItems: "flex-start" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>
                                  {t.sym || t.symbol}
                                </span>

                                <span style={{ color: "var(--apple-gold)", fontSize: 12, letterSpacing: "1px" }}>
                                  {"★".repeat(Math.min(5, Math.max(1, Math.round(t.stars || 5))))}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2, fontWeight: 500 }}>
                                {t.tag || t.strategyName || "Breakout"}
                              </div>
                            </div>

                            {/* ROI Percentage */}
                            <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                              <div
                                className="num"
                                style={{
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: pPct >= 0 ? "var(--apple-green)" : "var(--apple-red)"
                                }}
                              >
                                {pPct >= 0 ? "+" : ""}{pPct.toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4 Metric Sequence Trench: STOP LOSS | ENTRY | LIVE CMP | TARGET */}
                      <div
                        className="carved-trench"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(4, 1fr)",
                          padding: "8px 10px",
                          margin: "14px 0 10px",
                          textAlign: "center"
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 9.5, color: "var(--ink3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                            STOP LOSS
                          </div>
                          <div className="num" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--apple-red)", marginTop: 2 }}>
                            {INR(t.stop || t.stopLoss)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9.5, color: "var(--ink3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                            ENTRY
                          </div>
                          <div className="num" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink1)", marginTop: 2 }}>
                            {INR(t.entry || t.entryPrice)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9.5, color: "var(--ink3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                            LIVE CMP
                          </div>
                          <div className="num" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--apple-blue)", marginTop: 2 }}>
                            {INR2(t.now || t.currentPrice || t.price || t.entry)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9.5, color: "var(--ink3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                            TARGET
                          </div>
                          <div className="num" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--apple-green)", marginTop: 2 }}>
                            {INR(t.target || t.targetPrice)}
                          </div>
                        </div>
                      </div>

                      {/* Footer: Signal Date (shifted below Stop Loss) on Left, Status Tag & + ADD Button on Right */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 10, flexWrap: "wrap" }}>
                        <div style={{ color: "var(--ink3)", fontSize: 11 }}>
                          <span>Signal: </span>
                          <span className="num" style={{ fontWeight: 700, color: "var(--ink1)" }}>
                            {dateStr}
                          </span>
                          <span> ({daysHeld} {Number(daysHeld) === 1 ? "day" : "days"})</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          {/* 1. Status Tag: GOOD TO BUY | DONT ENTER NOW | SKIP OLD CALL (Not a button) */}
                          <div
                            className="signal-status-pill"
                            style={{
                              background: tagInfo.bg,
                              border: `1px solid ${tagInfo.border}`,
                              color: tagInfo.color,
                              boxShadow: `0 1px 4px ${tagInfo.bg}`,
                            }}
                            title={tagInfo.tooltip}
                          >
                            {tagInfo.label}
                          </div>

                          {/* 2. Tactile Apple + ADD Button */}
                          <button
                            type="button"
                            className="btn-signal-add"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenBuyModal(
                                t.sym || t.symbol,
                                Number(t.now || t.currentPrice || t.price || t.entry || 100),
                                t.tag || t.strategyName || "Breakout Setup"
                              );
                            }}
                            title={`Add ${t.sym || t.symbol} to Paper Trade`}
                          >
                            <span style={{ fontSize: 13, lineHeight: 1, fontWeight: 900 }}>+</span>
                            <span>ADD</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // V3 CARDS (Stop Entry Current Target sequence, stars after name, clean Signal Date)
                sortedActiveTrades.map((t: any, i: number) => {
                  const chg = t.chg ?? t.roiPct ?? 0;
                  const daysHeld = getTradeDaysHeld(t);
                  const tagInfo = getActionTagInfo("active", daysHeld, chg);
                  const overlays = t.overlays || [
                    { price: t.pivot || t.pivotPrice || 45.05, color: "var(--gold)", label: `PIVOT ₹${t.pivot || 45.05}` },
                    { price: t.stop || t.stopLoss || 42.32, color: "var(--loss)", label: `STOP ₹${t.stop || 42.32}` },
                    { price: t.price || t.currentPrice || 46.0, color: "var(--accent)", label: `ENTRY ₹${t.price || 46.0}` },
                    { price: t.target || t.targetPrice || 51.04, color: "var(--profit)", label: `T1 ₹${t.target || 51.04}`, dash: "2 3" },
                  ];

                  return (
                    <div
                      key={i}
                      className="trade-h"
                      onClick={() => setSelectedSignalTrade(t)}
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="row gap12" style={{ alignItems: "flex-start" }}>
                        <div className="av sm" style={{ background: t.grad || "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
                          {t.ab || t.sym?.slice(0, 2) || "V3"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="row between" style={{ alignItems: "flex-start" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-.025em" }}>
                                  {t.sym || t.symbol}
                                </span>
                                <span className="stars" style={{ verticalAlign: "middle" }}>
                                  ★★★★★
                                  <i style={{ width: `${Math.min(100, Math.max(0, ((t.stars || 4.5) / 5) * 100))}%` }}>★★★★★</i>
                                </span>
                              </div>
                              <div style={{ fontSize: 10, color: "var(--accent)", marginTop: 2, fontWeight: 600 }}>
                                {t.stage || t.strategyName || "Stage 2 Base 📐"}
                              </div>
                            </div>

                            {/* ROI Percentage only */}
                            <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                              <div className={`num ${chg >= 0 ? "up" : "down"}`} style={{ fontSize: 14, fontWeight: 800 }}>
                                {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                              </div>
                            </div>
                          </div>

                          {/* Clean Signal Date line with Status Tag and Tactile + ADD Button */}
                          <div style={{ fontSize: 10.5, color: "var(--ink2)", marginTop: 7, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                            <div>
                              <span style={{ color: "var(--ink3)" }}>Signal Date : </span>
                              <span className="num" style={{ fontWeight: 600, color: "var(--ink1)" }}>
                                {formatSignalDate(t.entryDate || t.date)}
                              </span>
                              <span style={{ color: "var(--ink3)" }}>
                                {" "}( {daysHeld} {Number(daysHeld) === 1 ? "Day" : "Days"} )
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                              <span
                                className="signal-status-pill"
                                style={{
                                  background: tagInfo.bg,
                                  color: tagInfo.color,
                                  border: `1px solid ${tagInfo.border}`,
                                  fontSize: 9.5,
                                  padding: "3px 9px",
                                }}
                                title={tagInfo.tooltip}
                              >
                                {tagInfo.label}
                              </span>
                              <button
                                type="button"
                                className="btn-signal-add"
                                style={{ padding: "3.5px 11px", fontSize: 10.5 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenBuyModal(
                                    t.sym || t.symbol,
                                    Number(t.now || t.currentPrice || t.price || t.entry || 50),
                                    t.stage || "Stage 2 Base"
                                  );
                                }}
                                title={`Add ${t.sym || t.symbol} to Paper Trade`}
                              >
                                <span style={{ fontSize: 12, lineHeight: 1, fontWeight: 900 }}>+</span>
                                <span>ADD</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Institutional Breakout Pattern Chart (Matching Neogen / Welspun Reference) */}
                      <div style={{ marginTop: 12 }}>
                        <InstitutionalPatternChart
                          symbol={t.sym || t.symbol}
                          name={t.name}
                          sector={t.sector || "Diversified"}
                          stage={t.stage || "Stage 2 Base 📐"}
                          patternName={t.patternName || (t.stage ? t.stage.replace(/📐|🚀|📦/g, "").trim() : "Stage 2 Base")}
                          breakoutDate={formatSignalDate(t.entryDate || t.date)}
                          pivotPrice={Number(t.pivot || t.pivotPrice || ((t.now || 46) * 0.98))}
                          entryPrice={Number(t.price || t.entry || t.now || 46)}
                          stopPrice={Number(t.stop || t.stopLoss || ((t.now || 46) * 0.92))}
                          targetPrice={Number(t.target || t.targetPrice || ((t.now || 46) * 1.15))}
                          currentPrice={Number(t.now || t.currentPrice || t.price || t.entry || 46)}
                          baseFloor={Number(t.baseFloor || (t.stop || (t.now || 46) * 0.92) * 0.94)}
                          baseLengthStr={t.baseWeeks || (t.stage?.includes("High-Tight") ? "6.4 wks" : t.stage?.includes("Darvas") ? "12.6 wks" : `${(daysHeld * 2 + 14).toFixed(1)} wks`)}
                          handleLengthStr={t.stage?.includes("Base") || t.stage?.includes("Cup") ? `${(daysHeld * 1.2 + 4).toFixed(1)} wks` : undefined}
                          breakoutVolumeMultiplier={Number(t.breakoutVol || 4.85)}
                          closeInRange={0.82}
                          rsRating={Number(t.rsRating ?? t.comp ?? 91)}
                          candles={t.miniChart?.candles || t.candles_data}
                          seed={t.seed || 101}
                          showOverviewGrid={true}
                        />
                      </div>

                      {/* 4 Small Boxes in sequence: Stop | Entry | Current | Target */}
                      <div className="mtiles" style={{ marginTop: 12 }}>
                        <div className="mtile">
                          <div className="k">Stop</div>
                          <div className="v down">{INR(t.stop || 42.32)}</div>
                        </div>
                        <div className="mtile">
                          <div className="k">Entry</div>
                          <div className="v">{INR(t.price || t.entry || 46.0)}</div>
                        </div>
                        <div className="mtile">
                          <div className="k">Current</div>
                          <div className="v" style={{ color: "var(--accent)" }}>{INR2(t.now || t.currentPrice || t.price || 46.0)}</div>
                        </div>
                        <div className="mtile">
                          <div className="k">Target</div>
                          <div className="v up">{INR(t.target || 51.04)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* CLOSED TRADES TAB */}
          {sigSub === "closed" && (
            <div id="sigClosed">
              {/* Summary card & Interactive Return % Curve */}
              <div className="return-curve-card">
                <div className="row between" style={{ marginBottom: 13 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>Closed Signals · 2026 Engine Record</div>
                    <div className="micro dim" style={{ marginTop: 2 }}>Verified Institutional Signal Output</div>
                  </div>
                  <span className="pill accent">{closedStats.totalTrades} Closed</span>
                </div>

                {/* 6 Core Signal Stats */}
                <div className="rt-stat-grid">
                  <div className="rt-stat-box">
                    <div className="micro" style={{ marginBottom: 4 }}>Win Rate</div>
                    <div className="num" style={{ fontSize: 14.5, fontWeight: 800 }}>
                      {closedStats.winRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 9.5, color: "var(--ink3)", marginTop: 2 }}>
                      {closedStats.wins}W / {closedStats.losses}L
                    </div>
                  </div>
                  <div className="rt-stat-box">
                    <div className="micro" style={{ marginBottom: 4 }}>Profit Factor</div>
                    <div className="num up" style={{ fontSize: 14.5, fontWeight: 800 }}>
                      {closedStats.profitFactor.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 9.5, color: "var(--ink3)", marginTop: 2 }}>
                      Gross Ratio
                    </div>
                  </div>
                  <div className="rt-stat-box">
                    <div className="micro" style={{ marginBottom: 4 }}>Avg Return</div>
                    <div className="num up" style={{ fontSize: 14.5, fontWeight: 800 }}>
                      +{closedStats.avgReturn.toFixed(2)}%
                    </div>
                    <div style={{ fontSize: 9.5, color: "var(--ink3)", marginTop: 2 }}>
                      Per Trade
                    </div>
                  </div>
                  <div className="rt-stat-box">
                    <div className="micro" style={{ marginBottom: 4 }}>Avg R Value</div>
                    <div className="num up" style={{ fontSize: 14.5, fontWeight: 800 }}>
                      {closedStats.avgR.toFixed(2)}R
                    </div>
                    <div style={{ fontSize: 9.5, color: "var(--ink3)", marginTop: 2 }}>
                      Risk-adjusted
                    </div>
                  </div>
                  <div className="rt-stat-box">
                    <div className="micro" style={{ marginBottom: 4 }}>Period Gain</div>
                    <div className="num up" style={{ fontSize: 14.5, fontWeight: 800 }}>
                      {closedCurveData.periodReturn >= 0 ? "+" : ""}{closedCurveData.periodReturn.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 9.5, color: "var(--ink3)", marginTop: 2 }}>
                      In {closedTf}
                    </div>
                  </div>
                  <div className="rt-stat-box">
                    <div className="micro" style={{ marginBottom: 4 }}>Trades in View</div>
                    <div className="num" style={{ fontSize: 14.5, fontWeight: 800 }}>
                      {closedCurveData.periodTrades.length}
                    </div>
                    <div style={{ fontSize: 9.5, color: "var(--ink3)", marginTop: 2 }}>
                      Filtered
                    </div>
                  </div>
                </div>

                {/* Return Curve Header & Timeframe Filter */}
                <div className="row between" style={{ alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink2)" }}>
                    Cumulative Return Curve ({closedTf})
                  </div>
                  <div className="rt-curve-tabs">
                    {(["1M", "3M", "6M", "ALL"] as const).map((tf) => (
                      <button
                        key={tf}
                        className={`rt-curve-btn ${closedTf === tf ? "on" : ""}`}
                        onClick={() => setClosedTf(tf)}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SVG Curve Canvas */}
                <div style={{ height: 130, position: "relative", marginBottom: 8 }}>
                  {renderClosedCurveSVG()}
                </div>
              </div>

              {isTerminalLoading ? (
                <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--ink3)" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: "3px solid var(--line-2)",
                      borderTopColor: "var(--accent)",
                      animation: "spin 0.8s linear infinite",
                      margin: "0 auto 12px"
                    }}
                  />
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink1)" }}>
                    Loading Closed Performance Ledger...
                  </div>
                </div>
              ) : sortedClosedTrades.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "36px 16px", borderRadius: 16 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📜</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink1)" }}>
                    No Closed Positions Logged
                  </div>
                </div>
              ) : engine === "v2" ? (
                // V2 Closed Rows (Sorted latest exit first, clear return %, no arbitrary rupee P&L)
                sortedClosedTrades.map((t: any, i: number) => {
                  const pPct = t.pnlPct ?? t.roiPct ?? 0;
                  return (
                    <div
                      key={i}
                      className={`closed-row ${pPct >= 0 ? "win" : "lose"}`}
                      onClick={() => openSheet("closed", t)}
                      style={{ animationDelay: `${i * 55}ms` }}
                    >
                      <div className="cr-top">
                        <div className="av sm" style={{ background: "linear-gradient(135deg,var(--s3),var(--s2))", color: "var(--ink2)" }}>
                          {t.ab || t.sym?.slice(0, 2) || "CL"}
                        </div>
                        <div className="cr-info">
                          <div className="cr-sym">{t.sym || t.symbol}</div>
                          <div className="cr-path num">{INR(t.entry || t.entryPrice)} <span className="dim">→</span> {INR(t.exit || t.exitPrice)}</div>
                        </div>
                        <div className="cr-pnl">
                          <div className={`cr-pct num ${pPct >= 0 ? "up" : "down"}`} style={{ fontSize: 13.5, fontWeight: 700 }}>
                            {pPct >= 0 ? "+" : ""}{pPct.toFixed(2)}%
                          </div>
                          <div className="num" style={{ fontSize: 10, color: "var(--ink3)", marginTop: 2 }}>
                            {(t.r || 1.5).toFixed(2)}R
                          </div>
                        </div>
                      </div>
                      <div className="cr-footer">
                        <span className={`pill ${pPct >= 0 ? "green" : "red"}`} style={{ fontSize: 8.5, padding: "2px 8px", letterSpacing: ".04em" }}>
                          {t.reason || t.exitReason || "TARGET_HIT"}
                        </span>
                        <span className="cr-meta num">{t.days || 30}d · {t.date || formatDisplayDate(t.exitDate)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                // V3 Closed Cards
                sortedClosedTrades.map((t: any, i: number) => {
                  const pPct = t.pnlPct ?? t.roiPct ?? 0;
                  const overlays = [
                    { price: t.entry || 120, color: "var(--profit)", label: "ENTRY", dash: "3 3" },
                    { price: t.exit || 148, color: "var(--loss)", label: "EXIT", dash: "3 3" },
                  ];
                  return (
                    <div
                      key={i}
                      className="trade-v"
                      onClick={() => openSheet("closed", t)}
                      style={{ animationDelay: `${i * 70}ms`, padding: 16 }}
                    >
                      <div className="row between" style={{ alignItems: "flex-start" }}>
                        <div className="row gap10">
                          <div className="av sm" style={{ background: "linear-gradient(135deg,var(--s3),var(--s2))", color: "var(--ink2)" }}>
                            {t.ab || t.sym?.slice(0, 2) || "CL"}
                          </div>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 800 }}>{t.sym || t.symbol}</div>
                            <div className="num" style={{ fontSize: 10.5, color: "var(--ink2)", marginTop: 3 }}>
                              {INR(t.entry || t.entryPrice)} → {INR(t.exit || t.exitPrice)}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className={`num ${pPct >= 0 ? "up" : "down"}`} style={{ fontSize: 14, fontWeight: 700 }}>
                            {pPct >= 0 ? "+" : ""}{pPct.toFixed(2)}%
                          </div>
                          <div className="num" style={{ fontSize: 10, color: "var(--ink3)", marginTop: 3 }}>
                            {(t.r || 1.8).toFixed(2)}R · {t.days || 30}d
                          </div>
                        </div>
                      </div>

                      {/* Mini Candlestick Box */}
                      <div className="chartbox" style={{ marginTop: 12 }}>
                        {renderCandlesSVG(t.miniChart?.candles || [], { w: 330, h: 100, overlays, glowLast: 2 })}
                      </div>

                      <div className="cr-footer" style={{ marginTop: 11, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                        <span className={`pill ${pPct >= 0 ? "green" : "red"}`} style={{ fontSize: 8.5, padding: "2px 8px" }}>
                          {t.reason || t.exitReason || "TARGET_HIT"}
                        </span>
                        <span className="cr-meta num">Closed on {t.date || formatDisplayDate(t.exitDate)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
            </>
          )}
        </section>

        {/* ===== PORTFOLIO SCREEN ===== */}
        <section className={`screen ${activeTab === "portfolio" ? "active" : ""}`} id="screen-portfolio">
          {!user && (
            <div
              className="card"
              style={{
                padding: "12px 16px",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))",
                borderColor: "rgba(99, 102, 241, 0.25)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>☁️</span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink1)" }}>
                    Guest Paper Ledger (Saved to Browser)
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink3)" }}>
                    Sign in to enable real-time Firebase cloud backup across all your devices.
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn"
                  style={{ padding: "5px 12px", fontSize: 11, fontWeight: 700 }}
                  onClick={() => {
                    setAuthMode("signin");
                    setShowAuthModal(true);
                  }}
                >
                  Sign In
                </button>
                <button
                  className="btn primary"
                  style={{ padding: "5px 12px", fontSize: 11, fontWeight: 700 }}
                  onClick={() => {
                    setAuthMode("signup");
                    setShowAuthModal(true);
                  }}
                >
                  Create Account
                </button>
              </div>
            </div>
          )}
            <PortfolioView
              portfolio={portfolio}
              completedHistory={completedHistory}
              closedTrades={closedTrades}
              livePrices={livePrices}
              inTradeTrades={allInTradeTrades.map((t: any) => ({
                symbol: t.sym || t.symbol,
                engine: t.engine,
                entryPrice: t.entry || t.entryPrice,
                currentPrice: t.now || t.currentPrice || t.price || t.entry,
                targetPrice: t.target || t.targetPrice,
                stopLoss: t.stop || t.stopLoss,
                strategyName: t.tag || t.strategyName || (t.engine === "v2" ? "V2 Pro AI" : "V3 Pattern AI"),
                patternName: t.pattern || t.patternName,
                currentROI: t.pnlPct ?? t.roiPct ?? t.chg ?? 0,
                rMultiple: t.rMult || t.rMultiple,
                timeInTrade: t.time || t.timeInTrade || t.date,
                entryDate: t.entryDate || t.date || "Today",
              }))}
              onOpenAddModal={() => setIsAddPositionOpen(true)}
              onOpenBuyModal={handleOpenBuyModal}
              onOpenSellModal={(trade) => setSellModalItem(trade)}
              onOpenChart={(sym) => {
                const cleanSym = String(sym).replace(/^(BSE:|NSE:)/i, "").trim().toUpperCase();
                window.open(`https://www.tradingview.com/chart/qvyqZrhQ/?symbol=BSE:${cleanSym}`, "_blank");
              }}
              onDeleteCompletedTrade={handleDeleteCompletedTrade}
              onDeleteTrade={(tradeId) => {
                setPortfolio(prev => prev.filter(p => p.tradeId !== tradeId && p.symbol !== tradeId));
              }}
              onSelectStock={(stock) => {
                setActiveTab("signals");
                setSelectedSignalTrade(stock);
              }}
            />
        </section>

        {/* ===== DNA SCREEN ===== */}
        <section className={`screen ${activeTab === "dna" ? "active" : ""}`} id="screen-dna">
          {hasOpenedDna && (
            <StockDNAScreen
              theme={theme}
              resetTrigger={dnaResetTrigger}
              selectedStock={selectedDnaStock}
              onSwitchTab={(tab) => setActiveTab(tab as any)}
            />
          )}
        </section>

        {/* ===== CHARTS SCREEN ===== */}
        <section className={`screen ${activeTab === "charts" ? "active" : ""}`} id="screen-charts">
          {engine === "v2" ? (
            // V2 LIVE POSITION CHART
            <div id="chartV2">
              <div className="card" style={{ padding: "14px 15px", marginBottom: 14 }}>
                <div className="row between">
                  <div className="micro">Live Position Chart</div>
                  <span className="pill accent">{activeTrades.length} active</span>
                </div>
                <div className="chips" style={{ marginTop: 12 }}>
                  {activeTrades.map((a: any, i: number) => (
                    <button
                      key={i}
                      className={`chip ${i === v2ChartSel ? "on" : ""}`}
                      onClick={() => {
                        setV2ChartSel(i);
                        setChartSymbol(a.sym || a.symbol);
                        fetchChart(a.sym || a.symbol, "v2");
                      }}
                    >
                      {a.sym || a.symbol}
                    </button>
                  ))}
                </div>
              </div>

              {activeTrades[v2ChartSel] && (() => {
                const t = activeTrades[v2ChartSel];
                const pPct = t.pnlPct ?? t.roiPct ?? 0;
                const prog = Math.max(0, Math.min(100, ((t.now - t.stop) / ((t.target - t.stop) || 1)) * 100));
                const overlays = [
                  { price: t.stop || 100, color: "var(--loss)", label: `STOP ${INR(t.stop || 100)}` },
                  { price: t.entry || 110, color: "var(--accent)", label: `ENTRY ${INR(t.entry || 110)}`, dash: "4 3" },
                  { price: t.target || 130, color: "var(--profit)", label: `TARGET ${INR(t.target || 130)}`, dash: "4 3" },
                ];

                return (
                  <div className="card" style={{ padding: 16 }}>
                    <div className="row between" style={{ alignItems: "flex-start" }}>
                      <div className="row gap10">
                        <div className="av sm" style={{ background: t.grad || "linear-gradient(135deg,#6366F1,#8B5CF6)" }}>
                          {t.ab || t.sym?.slice(0, 2) || "VI"}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-.025em" }}>{t.sym || t.symbol}</div>
                          <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 3 }}>{t.tag || "Breakout Setup"}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{INR2(t.now || t.currentPrice)}</div>
                        <div className={`num ${pPct >= 0 ? "up" : "down"}`} style={{ fontSize: 10.5, marginTop: 3, fontWeight: 600 }}>
                          {pPct >= 0 ? "+" : ""}{pPct.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    <div className="chartbox" style={{ marginTop: 14, padding: "13px 11px 11px" }}>
                      {renderCandlesSVG(liveChartData?.candles || t.miniChart?.candles || [], { w: 340, h: 170, overlays, glowLast: 2 })}
                    </div>

                    <div className="legend" style={{ borderTop: 0, paddingTop: 0, marginTop: 0 }}>
                      <span><i style={{ background: "var(--accent)", color: "var(--accent)" }} />Entry</span>
                      <span><i style={{ background: "var(--loss)", color: "var(--loss)" }} />Stop</span>
                      <span><i style={{ background: "var(--profit)", color: "var(--profit)" }} />Target</span>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <div className="prog" style={{ height: 9 }}>
                        <span style={{ width: `${prog}%` }} />
                        <i className="stopmark" />
                        <i className="tgtmark" />
                      </div>
                      <div className="row between" style={{ marginTop: 8, fontSize: 9.5, fontWeight: 600, color: "var(--ink3)" }}>
                        <span>Stop {INR(t.stop || 100)}</span>
                        <span style={{ color: "var(--accent)" }}>{prog.toFixed(1)}% to target</span>
                        <span>Target {INR(t.target || 130)}</span>
                      </div>
                    </div>

                    <div className="tile4" style={{ marginTop: 15 }}>
                      <div className="mtile"><div className="k">Entry</div><div className="v">{INR(t.entry || 110)}</div></div>
                      <div className="mtile"><div className="k">R-Value</div><div className="v">{(t.r || 0.5).toFixed(2)}R</div></div>
                      <div className="mtile"><div className="k">Days</div><div className="v">{t.days || 1}</div></div>
                      <div className="mtile">
                        <div className="k">P&amp;L</div>
                        <div className={`v ${(t.pnl || 0) >= 0 ? "up" : "down"}`}>
                          {(t.pnl || 0) >= 0 ? "+" : ""}{INR(Math.abs(t.pnl || 0))}
                        </div>
                      </div>
                    </div>

                    <div className="exit-criteria" style={{ marginTop: 15 }}>
                      <div className="micro" style={{ marginBottom: 4 }}>Exit Criteria</div>
                      <div className="ecrow">
                        <span className="dot green" />
                        <span>TARGET_HIT when price reaches <b className="num up">{INR(t.target || 130)}</b></span>
                      </div>
                      <div className="ecrow">
                        <span className="dot red" />
                        <span>STOP_HIT when price falls to <b className="num down">{INR(t.stop || 100)}</b></span>
                      </div>
                      <div className="ecrow">
                        <span className="dot" />
                        <span>TIME_EXIT after 90 days if neither is hit</span>
                      </div>
                    </div>

                    <div className="actions" style={{ marginTop: 15 }}>
                      <button className="btn" onClick={() => { setActiveTab("signals"); setSelectedSignalTrade(t); }}>
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>
                        Trade Details
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            // V3 CHART ENGINE SUBTABS
            <>
              <div className="subtabs" id="chartTabs">
                <button
                  className={`subtab ${chartSub === "live" ? "on" : ""}`}
                  onClick={() => setChartSub("live")}
                >
                  Live Chart
                </button>
                <button
                  className={`subtab ${chartSub === "scanner" ? "on" : ""}`}
                  onClick={() => setChartSub("scanner")}
                >
                  Pattern Scanner
                </button>
                <button
                  className={`subtab ${chartSub === "portal" ? "on" : ""}`}
                  onClick={() => setChartSub("portal")}
                >
                  Breakout Portal
                </button>
              </div>

              {/* LIVE CHART */}
              {chartSub === "live" && (
                <div id="chartLive">
                  <div className="card" style={{ padding: 15 }}>
                    <div className="row between" style={{ alignItems: "flex-start" }}>
                      <div>
                        <div className="row gap8">
                          <div className="av sm" style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
                            {chartSymbol.slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-.025em" }}>{chartSymbol}</div>
                            <div className="num" style={{ fontSize: 10, color: "var(--ink3)", marginTop: 3 }}>
                              NSE · Live Candlestick Journey
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>
                          {INR2(liveChartData?.candles?.slice(-1)[0]?.close || 46.0)}
                        </div>
                        <div className="num up" style={{ fontSize: 10.5, marginTop: 3 }}>+0.00%</div>
                      </div>
                    </div>

                    <div className="chartbox" id="liveBox" style={{ marginTop: 14, padding: "13px 11px 11px" }}>
                      {renderCandlesSVG(liveChartData?.candles || [], {
                        w: 340,
                        h: 190,
                        overlays: liveChartData?.lines || [],
                        glowLast: 3,
                      })}
                    </div>

                    <div className="toggle-row" id="overlayToggles">
                      {["fib", "pivot", "ma", "atr", "pattern"].map(key => (
                        <button
                          key={key}
                          className={`tg ${overlayToggles[key] ? "on" : ""}`}
                          onClick={() => setOverlayToggles(prev => ({ ...prev, [key]: !prev[key] }))}
                        >
                          {key === "fib" ? "Fibonacci" : key === "pivot" ? "Pivot" : key === "ma" ? "MA 20/50" : key === "atr" ? "ATR Bands" : "Patterns"}
                        </button>
                      ))}
                    </div>

                    <div className="legend">
                      <span><i style={{ background: "var(--gold)", color: "var(--gold)" }} />Pivot</span>
                      <span><i style={{ background: "var(--loss)", color: "var(--loss)" }} />Stop / Floor</span>
                      <span><i style={{ background: "var(--accent)", color: "var(--accent)" }} />Entry</span>
                      <span><i style={{ background: "var(--profit)", color: "var(--profit)" }} />Fib Targets</span>
                    </div>

                    <div className="chips" style={{ marginTop: 13 }}>
                      <button className="chip on">D</button>
                      <button className="chip">W</button>
                      <button className="chip">M</button>
                      <span style={{ flex: 1 }} />
                      <span className="pill accent">{liveChartData?.candles?.length || 25} candles</span>
                    </div>
                  </div>
                </div>
              )}

              {/* PATTERN SCANNER */}
              {chartSub === "scanner" && (
                <div id="chartScanner">
                  <div className="card" style={{ padding: "14px 15px", marginBottom: 16 }}>
                    <div className="row between">
                      <div className="micro">📐 Pattern Scanner</div>
                      <span className="pill green" style={{ fontSize: 9 }}>Live · 1,318</span>
                    </div>
                    <div className="chips" style={{ marginTop: 12 }}>
                      <button className="chip on">All</button>
                      <button className="chip">Base</button>
                      <button className="chip">52W High</button>
                      <button className="chip">Darvas</button>
                      <button className="chip">HTF</button>
                      <button className="chip">Cup</button>
                    </div>
                  </div>

                  {patterns.map((p, pidx) => (
                    <div key={pidx}>
                      <div className="sec-head" style={{ marginTop: 20 }}>
                        <span className="micro">{p.name} <span style={{ color: "var(--accent)" }}>({p.count} today)</span></span>
                      </div>
                      <div className="pattern-grid">
                        {p.items.map((it, itIdx) => {
                          const sym = (it.s || it.symbol || "").toUpperCase();
                          const live = livePrices?.[sym]?.price;
                          const currentCmp = live || it.currentPrice;
                          return (
                          <div
                            key={itIdx}
                            className={`pcard ${it.tier}`}
                            onClick={() => {
                              setChartSymbol(it.s || it.symbol);
                              setChartSub("live");
                              fetchChart(it.s || it.symbol, "v3");
                            }}
                          >
                            <div className="row between">
                              <span className="nm">{it.s || it.symbol}</span>
                              <div style={{ textAlign: "right" }}>
                                <span className="sc">{it.score}</span>
                                {currentCmp && (
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", marginTop: 2 }}>
                                    ₹{Number(currentCmp).toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="chartbox" style={{ margin: "10px 0 0", padding: "7px 6px" }}>
                              {renderCandlesSVG(it.miniCandles || [], { w: 140, h: 60, padT: 6, padB: 6, glowLast: 2 })}
                            </div>
                            <div className="mt">
                              <span>Base {it.base}</span>
                              <span>Vol {it.vol}</span>
                            </div>
                          </div>
                        );})}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* BREAKOUT PORTAL */}
              {chartSub === "portal" && (
                <div id="chartPortal">
                  <div className="card" style={{ padding: 15, marginBottom: 13 }}>
                    <div className="row between">
                      <div className="row gap8">
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--loss)", boxShadow: "0 0 8px var(--loss)", animation: "radar 2s infinite" }} />
                        <span className="micro" style={{ color: "var(--ink1)" }}>Live Breakout Radar</span>
                      </div>
                      <span className="pill" style={{ fontSize: 9 }}>Sort: Score ▼</span>
                    </div>
                    <div className="chips" style={{ marginTop: 12 }}>
                      <button className="chip on">Score</button>
                      <button className="chip">Volume</button>
                      <button className="chip">Pattern</button>
                      <button className="chip">Sector</button>
                    </div>
                  </div>

                  {breakouts.map((r, rIdx) => {
                    const live = livePrices?.[(r.symbol || "").toUpperCase()]?.price;
                    const displayPrice = live || r.price;
                    return (
                    <div
                      key={rIdx}
                      className="brow"
                      onClick={() => {
                        setChartSymbol(r.symbol);
                        setChartSub("live");
                        fetchChart(r.symbol, "v3");
                      }}
                    >
                      <div className="rank">{r.rankIcon || r.rank}</div>
                      <div className="bd">
                        <div className="t1">
                          <span>{r.symbol}</span>
                          <span className="pill" style={{ fontSize: 8.5, padding: "2px 6px" }}>{r.pattern}</span>
                          <span className="num" style={{ fontSize: 10, color: "var(--accent)" }}>Score {r.score}</span>
                          <span className="num" style={{ fontSize: 10, color: "var(--ink3)" }}>Vol {r.volFormatted || `${r.volume_multiple}×`}</span>
                        </div>
                        <div className="t2">
                          <span className="num">₹{Number(displayPrice).toFixed(2)}</span> · {r.notes}
                        </div>
                        <div style={{ marginTop: 9 }}>
                          {r.qualification_status === "AI_SELECTED" ? (
                            <span className="badge sel">AI Selected — Entry taken today</span>
                          ) : r.qualification_status === "QUALIFIED_SLOTS_FULL" ? (
                            <span className="badge qual">Qualified — Not selected (max 2 entries/day)</span>
                          ) : (
                            <span className="badge filt">Filtered — Volume below threshold</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                  <div style={{ textAlign: "center", fontSize: 10.5, color: "var(--ink3)", margin: "18px 0 4px", lineHeight: 1.7 }}>
                    Showing <b className="num" style={{ color: "var(--ink2)" }}>{breakouts.length}</b> candidates from live scan
                  </div>
                </div>
              )}
            </>
          )}
        </section>



        {/* ===== SCREENER SCREEN (INSTITUTIONAL PATTERN INTELLIGENCE) ===== */}
        <section className={`screen ${activeTab === "screener" ? "active" : ""}`} id="screen-screener">
          {hasOpenedScreener && (
            <ScreenerScreen
              theme={theme}
              livePrices={livePrices}
              onSelectStock={(sym, fullData) => {
                setAnalystStock(fullData || { symbol: sym, sym });
              }}
            />
          )}
        </section>

        {/* ===== LOUNGE SCREEN (INSTITUTIONAL CHAT & AI CO-PILOT) ===== */}
        <section className={`screen ${activeTab === "lounge" ? "active" : ""}`} id="screen-lounge" style={{ padding: 0 }}>
          {hasOpenedLounge && (
            <iframe
              ref={loungeIframeRef}
              src="/chat.html"
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              title="QuantSync Lounge & AI Community"
              onLoad={() => {
                if (user && loungeIframeRef.current?.contentWindow) {
                  loungeIframeRef.current.contentWindow.postMessage({
                    type: "AUTH_SYNC",
                    user: {
                      email: user.email,
                      displayName: user.displayName || user.email?.split("@")[0],
                      photoURL: user.photoURL
                    }
                  }, "*");
                }
              }}
            />
          )}
        </section>

        {/* ===== MORE SCREEN ===== */}
        <section className={`screen ${activeTab === "more" ? "active" : ""}`} id="screen-more">
          <div className="card" style={{ textAlign: "center", padding: "24px 16px" }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-.045em",
                background: "linear-gradient(180deg, var(--ink1), color-mix(in srgb, var(--ink1) 70%, var(--ink2)))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              QuantSync
            </div>
            <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 6 }}>
              {systemStatus?.version || "v2.4.1"} · Build {systemStatus?.build || "2026.09.19"}
            </div>
            <div className="row" style={{ justifyContent: "center", gap: 8, marginTop: 15 }}>
              <span className="pill accent">V2 AI · {systemStatus?.engines?.v2?.status || "Online"}</span>
              <span className="pill accent">V3 Chart · {systemStatus?.engines?.v3?.status || "Online"}</span>
            </div>
          </div>

          <div className="sec-head"><span className="micro">Appearance</span></div>
          <div className="card" style={{ padding: 0 }}>
            <div className="setrow" id="themeRow" onClick={toggleTheme}>
              <div className="l">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.4M12 19.6V22M22 12h-2.4M4.4 12H2M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7M19.1 19.1l-1.7-1.7M6.6 6.6 4.9 4.9" /></svg>
                Theme
              </div>
              <div className="r">
                <span id="themeLabel">{theme === "dark" ? "Dark" : "Light"}</span>
                <div className={`switch ${theme === "dark" ? "on" : ""}`} id="themeSwitch" />
              </div>
            </div>
            <div className="setrow">
              <div className="l">
                <svg viewBox="0 0 24 24"><path d="M3 17V7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10" /><path d="M8 20h8" /></svg>
                Default Engine
              </div>
              <div className="r" id="defaultEngine" style={{ color: "var(--accent-green)" }}>
                V2 · AI Trading
              </div>
            </div>
          </div>

          <div className="sec-head"><span className="micro">Notifications</span></div>
          <div className="card" style={{ padding: 0 }}>
            <div className="setrow"><div className="l">New entries</div><div className="switch on" /></div>
            <div className="setrow"><div className="l">Target / Stop hits</div><div className="switch on" /></div>
            <div className="setrow"><div className="l">Daily summary</div><div className="switch on" /></div>
            <div className="setrow"><div className="l">Breakout alerts</div><div className="switch on" /></div>
            <div className="setrow"><div className="l">Market insights</div><div className="switch" /></div>
          </div>

          <div className="sec-head"><span className="micro">Engine Configuration</span></div>
          <div className="card" style={{ padding: 0 }}>
            <div className="setrow"><div className="l">Max entries / day</div><div className="r num">{systemConfig?.maxEntriesPerDay || 2}</div></div>
            <div className="setrow"><div className="l">Capital per trade</div><div className="r num">{systemConfig?.capitalPerTradePct || 12.5}%</div></div>
            <div className="setrow"><div className="l">Risk per trade</div><div className="r num">{systemConfig?.riskPerTradeR || 0.75}R</div></div>
            <div className="setrow"><div className="l">Min ML confidence</div><div className="r num">{systemConfig?.minMLConfidence || 62}%</div></div>
            <div className="setrow"><div className="l">Volume multiple gate</div><div className="r num">{systemConfig?.volumeMultipleGate || 2.0}×</div></div>
          </div>

          <div className="sec-head"><span className="micro">About</span></div>
          <div className="card" style={{ padding: 0 }}>
            <div className="setrow"><div className="l">Data source</div><div className="r num">{systemConfig?.dataSource || "quantsync_master.db"}</div></div>
            <div className="setrow"><div className="l">History</div><div className="r num">{systemConfig?.historySource || "stock_history.db"}</div></div>
            <div className="setrow"><div className="l">Universe</div><div className="r num">{systemConfig?.universeStocks || 1318} stocks</div></div>
          </div>

          <div style={{ textAlign: "center", fontSize: 10, color: "var(--ink3)", margin: "24px 0 8px", lineHeight: 1.8 }}>
            "Every pixel earns its place."<br />
            <span style={{ opacity: 0.55 }}>QuantSync Production Trading Engine</span>
          </div>
        </section>
      </main>

      {/* ============ TAB BAR ============ */}
      <nav className="tabbar" id="tabbar">
        {/* 1. HOME */}
        <button
          className={`tab ${activeTab === "home" ? "active" : ""}`}
          onClick={() => navigateToTab("home")}
          data-tab="home"
        >
          <svg viewBox="0 0 24 24"><path d="M3 10.6 12 3.2l9 7.4V20a1 1 0 0 1-1 1h-5.2v-6.4H9.2V21H4a1 1 0 0 1-1-1z" /></svg>
          Home
        </button>

        {/* 2. DNA */}
        <button
          className={`tab ${activeTab === "dna" ? "active" : ""}`}
          onClick={() => navigateToTab("dna", undefined, true)}
          data-tab="dna"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 15c6.667-6 13.333 0 20-6" />
            <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />
            <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" />
            <path d="m17 6-2.5-2.5" />
            <path d="m14 8-1-1" />
            <path d="m7 18 2.5 2.5" />
            <path d="m3.5 14.5.5.5" />
            <path d="m20 9 .5.5" />
            <path d="m6.5 12.5 1 1" />
            <path d="m16.5 10.5 1 1" />
            <path d="m10 16 1.5 1.5" />
          </svg>
          DNA
          <span style={{
            position: "absolute",
            top: 5,
            right: "calc(50% - 15px)",
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--accent, #D4AF37)",
            boxShadow: "0 0 6px var(--accent, #D4AF37)"
          }} />
        </button>

        {/* 3. AI BUYSELL (Renamed from Signals / AI Calls) */}
        <button
          className={`tab ${activeTab === "signals" ? "active" : ""}`}
          onClick={() => navigateToTab("signals")}
          data-tab="signals"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 8 4-4 4 4" />
            <path d="M7 4v16" />
            <path d="m21 16-4 4-4-4" />
            <path d="M17 20V4" />
          </svg>
          AI BuySell
          <span className="radar-ring" />
        </button>

        {/* 4. BREAKOUT (Renamed from Screener) */}
        <button
          className={`tab ${activeTab === "screener" ? "active" : ""}`}
          onClick={() => navigateToTab("screener")}
          data-tab="screener"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 20h18" />
            <path d="M6 20v-4" />
            <path d="M11 20v-9" />
            <path d="M16 20V6" />
            <path d="m13 9 3-3 3 3" />
          </svg>
          Breakout
          <span style={{
            position: "absolute",
            top: 5,
            right: "calc(50% - 19px)",
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#10B981",
            boxShadow: "0 0 6px #10B981"
          }} />
        </button>

        {/* 5. PORTFOLIO */}
        <button
          className={`tab ${activeTab === "portfolio" ? "active" : ""}`}
          onClick={() => navigateToTab("portfolio")}
          data-tab="portfolio"
        >
          <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
          Portfolio
          {portfolio.length > 0 && (
            <span style={{
              position: "absolute",
              top: 5,
              right: "calc(50% - 17px)",
              background: "var(--accent)",
              color: "#fff",
              fontSize: 8.5,
              fontWeight: 800,
              padding: "0 3.5px",
              borderRadius: 6,
              minWidth: 12,
              height: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1
            }}>
              {portfolio.length}
            </span>
          )}
        </button>
      </nav>

      {/* ============ BOTTOM SHEET ============ */}
      <div
        className={`backdrop ${sheetOpen ? "on" : ""}`}
        id="backdrop"
        onClick={closeSheet}
      />
      <div
        ref={sheetRef}
        className={`sheet ${sheetOpen ? "on" : ""} ${sheetPayload?.kind === "v2" || sheetPayload?.kind === "v3" ? "sheet-fullscreen" : ""} ${sheetPayload?.kind === "closed" ? ((sheetPayload?.trade?.pnl || 0) >= 0 ? "win" : "lose") : ""}`}
        id="sheet"
      >
        <div className="sheet-grip" onClick={closeSheet}>
          <i />
        </div>
        <div className="sheet-body" id="sheetBody">
          {sheetPayload && (() => {
            const t = sheetPayload.trade;
            const kind = sheetPayload.kind;

            if (kind === "screener_detail") {
              const sym = t?.symbol || t?.sym || "";
              return (
                <div style={{ width: "100%", height: "100%", minHeight: "82vh", display: "flex", flexDirection: "column" }}>
                  <iframe
                    key={sym}
                    src={`/stock-detail.html?symbol=${encodeURIComponent(sym)}`}
                    style={{ width: "100%", height: "100%", flex: 1, minHeight: "82vh", border: "none", borderRadius: 16 }}
                    title={`Stock Detail - ${sym}`}
                  />
                </div>
              );
            }

            if (kind === "v2" || kind === "v3") {
              return (
                <TradingViewStockDetail
                  trade={t}
                  theme={theme}
                  INR={INR}
                  INR2={INR2}
                  onClose={closeSheet}
                  onOpenChart={(sym) => {
                    closeSheet();
                    setChartSymbol(sym);
                    setActiveTab("charts");
                    setChartSub("live");
                    fetchChart(sym, kind);
                  }}
                />
              );
            }

            if (kind === "closed") {
              const pnl = t.pnl ?? t.realizedPnl ?? 0;
              const pPct = t.pnlPct ?? t.roiPct ?? 0;
              return (
                <div>
                  <div className="row between" style={{ alignItems: "flex-start", marginBottom: 18 }}>
                    <div className="row gap12">
                      <div className="av" style={{ background: "linear-gradient(135deg,var(--s3),var(--s2))", color: "var(--ink2)" }}>
                        {t.ab || t.sym?.slice(0, 2) || "CL"}
                      </div>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.035em" }}>{t.sym || t.symbol}</div>
                        <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 4 }}>
                          Closed on {t.date || formatDisplayDate(t.exitDate)}
                        </div>
                      </div>
                    </div>
                    <span className={`pill ${pPct >= 0 ? "green" : "red"}`}>
                      {pPct >= 0 ? "WIN" : "LOSS"}
                    </span>
                  </div>

                  <div className="tile4">
                    <div className="mtile">
                      <div className="k">Return</div>
                      <div className={`v ${pPct >= 0 ? "up" : "down"}`}>
                        {pPct >= 0 ? "+" : ""}{pPct.toFixed(2)}%
                      </div>
                    </div>
                    <div className="mtile">
                      <div className="k">R-Multiple</div>
                      <div className="v">{(t.r || 1.8).toFixed(2)}R</div>
                    </div>
                    <div className="mtile">
                      <div className="k">Held</div>
                      <div className="v">{t.days || 30}d</div>
                    </div>
                    <div className="mtile">
                      <div className="k">Outcome</div>
                      <div className={`v ${pPct >= 0 ? "up" : "down"}`}>{pPct >= 0 ? "Gain" : "Cut"}</div>
                    </div>
                  </div>

                  <div className="card" style={{ marginTop: 16, padding: 15 }}>
                    <div className="row between" style={{ fontSize: 11 }}>
                      <span className="mut">Entry Price</span>
                      <span className="num" style={{ fontWeight: 700 }}>{INR2(t.entry || t.entryPrice)}</span>
                    </div>
                    <div className="row between" style={{ fontSize: 11, marginTop: 9 }}>
                      <span className="mut">Exit Price</span>
                      <span className="num" style={{ fontWeight: 700 }}>{INR2(t.exit || t.exitPrice)}</span>
                    </div>
                    <div className="row between" style={{ fontSize: 11, marginTop: 9 }}>
                      <span className="mut">Exit Reason</span>
                      <span className={`pill ${pPct >= 0 ? "green" : "red"}`} style={{ fontSize: 9, padding: "3px 8px" }}>
                        {t.reason || t.exitReason || "TARGET_HIT"}
                      </span>
                    </div>
                  </div>

                  <div className="sec-head" style={{ marginLeft: 0 }}><span className="micro">Trade Lifecycle</span></div>
                  <div className="tl">
                    <div className="tl-item act">
                      <div className="d">Entry Point</div>
                      <div className="t">Position triggered at <b>{INR2(t.entry || t.entryPrice)}</b></div>
                    </div>
                    <div className={`tl-item ${pnl >= 0 ? "good" : "bad"}`}>
                      <div className="d">{t.date || formatDisplayDate(t.exitDate)}</div>
                      <div className="t">Closed at <b>{INR2(t.exit || t.exitPrice)}</b> · {t.reason || "TARGET_HIT"}</div>
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })()}
        </div>
      </div>

      {/* ============ MODALS & TRANSITIONAL ANIMATION ============ */}
      {isTransitioning && (
        <RocketTransitionOverlay targetEngine={transitionEngine} />
      )}

      <AuthModal
        isOpen={showAuthModal}
        initialMode={authMode}
        onClose={() => setShowAuthModal(false)}
      />

      <BuyModal
        isOpen={!!buyModalItem}
        symbol={buyModalItem?.symbol || ""}
        initialPrice={buyModalItem?.initialPrice || 0}
        strategyName={buyModalItem?.strategyName}
        onClose={() => setBuyModalItem(null)}
        onSubmit={handleBuySubmit}
      />

      <SellModal
        isOpen={!!sellModalItem}
        trade={sellModalItem}
        onClose={() => setSellModalItem(null)}
        onSubmit={handleSellSubmit}
      />

      {isAddPositionOpen && (
        <AddPositionModal
          isOpen={isAddPositionOpen}
          onClose={() => setIsAddPositionOpen(false)}
          onSubmit={handleBuySubmit}
        />
      )}

      {/* Engine Comparison Explainer Modal */}
      {showEngineExplainer && (
        <div className="engine-modal-backdrop" onClick={() => setShowEngineExplainer(false)}>
          <div className="engine-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="engine-modal-header">
              <div className="engine-modal-title">
                <span>⚡</span> QuantSync AI Engine Architecture
              </div>
              <button
                type="button"
                className="engine-modal-close"
                onClick={() => setShowEngineExplainer(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="engine-modal-body">
              <div className="engine-modal-section v2-section">
                <div className="engine-modal-badge v2-badge">PRO QUANTITATIVE AI · V2</div>
                <h3>Multi-Factor Alpha Model</h3>
                <p>
                  V2 evaluates the entire NSE universe through quantitative multi-factor mathematics: institutional volume accumulation, dynamic RSI momentum slopes, volatility expansion (ATR), and statistical mean-reversion.
                </p>
                <div className="engine-feature-list">
                  <div><span className="chk">✓</span> Pure institutional flow &amp; factor momentum scoring</div>
                  <div><span className="chk">✓</span> Systematic ATR volatility-adjusted trailing stops</div>
                  <div><span className="chk">✓</span> Ideal for high-momentum swings &amp; statistical factor capture</div>
                </div>
              </div>

              <div className="engine-modal-divider" />

              <div className="engine-modal-section v3-section">
                <div className="engine-modal-badge v3-badge">PATTERN CONFLUENCE AI · V3</div>
                <h3>Visual Chart Pattern + AI Execution Gate</h3>
                <p>
                  V3 first maps high-probability classical chart formations across multiple timeframes (Ascending Triangles, Flat Bases, High Tight Flags, and Cup &amp; Handles). It then executes a secondary AI confirmation filter to weed out false breakouts before triggering a trade.
                </p>
                <div className="engine-feature-list">
                  <div><span className="chk">✓</span> Automated geometric multi-timeframe chart pattern discovery</div>
                  <div><span className="chk">✓</span> Structural resistance &amp; breakout volume confirmation gates</div>
                  <div><span className="chk">✓</span> Ideal for structural swing traders seeking clear visual patterns</div>
                </div>
              </div>
            </div>
            <div className="engine-modal-footer">
              <button
                type="button"
                className="engine-modal-done-btn"
                onClick={() => setShowEngineExplainer(false)}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MORE & PROFILE SLIDE-UP MODAL SHEET ============ */}
      <div
        className={`backdrop ${isMoreOpen ? "on" : ""}`}
        id="moreBackdrop"
        onClick={() => setIsMoreOpen(false)}
        style={{ zIndex: 60 }}
      />
      <div
        className={`sheet ${isMoreOpen ? "on" : ""}`}
        id="moreSheet"
        style={{ zIndex: 61, maxHeight: "82%" }}
      >
        <div className="sheet-grip" onClick={() => setIsMoreOpen(false)}>
          <i />
        </div>
        <div className="sheet-body" style={{ overflowY: "auto", padding: "12px 18px 36px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent), #3B82F6)",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 16
                }}
              >
                {user?.email?.slice(0, 1).toUpperCase() || "Q"}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink1)" }}>
                  {user?.email || "Trader Account"}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink3)" }}>
                  QuantSync Pro · {systemStatus?.version || "v2.4.1"}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsMoreOpen(false)}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: "1px solid var(--line-2)",
                background: "var(--s2)",
                color: "var(--ink2)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                fontSize: 14
              }}
            >
              ✕
            </button>
          </div>

          <div className="sec-head"><span className="micro">Appearance & Theme</span></div>
          <div className="card" style={{ padding: 0, marginBottom: 14 }}>
            <div className="setrow" id="themeRowMore" onClick={toggleTheme}>
              <div className="l">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.4M12 19.6V22M22 12h-2.4M4.4 12H2M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7M19.1 19.1l-1.7-1.7M6.6 6.6 4.9 4.9" /></svg>
                Display Mode
              </div>
              <div className="r">
                <span id="themeLabelMore">{theme === "dark" ? "Dark Obsidian" : "Clean Light"}</span>
                <div className={`switch ${theme === "dark" ? "on" : ""}`} />
              </div>
            </div>
            <div className="setrow" onClick={() => switchEngine(engine === "v2" ? "v3" : "v2")}>
              <div className="l">
                <svg viewBox="0 0 24 24"><path d="M3 17V7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10" /><path d="M8 20h8" /></svg>
                Primary Trading Engine
              </div>
              <div className="r" id="defaultEngineMore">
                {engine === "v2" ? "V2 · AI Trading" : "V3 · Chart Engine"}
              </div>
            </div>
          </div>

          <div className="sec-head"><span className="micro">Live Alert Preferences</span></div>
          <div className="card" style={{ padding: 0, marginBottom: 14 }}>
            <div className="setrow"><div className="l">High Conviction Buy Signals</div><div className="switch on" /></div>
            <div className="setrow"><div className="l">Target & Trailing Stop Alerts</div><div className="switch on" /></div>
            <div className="setrow"><div className="l">Near-Breakout Squeeze Radar</div><div className="switch on" /></div>
            <div className="setrow"><div className="l">Daily EOD Settlement Summary</div><div className="switch on" /></div>
          </div>

          <div className="sec-head"><span className="micro">System Diagnostics & Data Feeds</span></div>
          <div className="card" style={{ padding: 0, marginBottom: 14 }}>
            <div className="setrow"><div className="l">Universe Equities</div><div className="r num">{systemConfig?.universeStocks || 1318} NSE stocks</div></div>
            <div className="setrow"><div className="l">History Database</div><div className="r num">{systemConfig?.historySource || "stock_history.db"}</div></div>
            <div className="setrow"><div className="l">Screener Cache</div><div className="r num">stock_dna_cache.db</div></div>
            <div className="setrow"><div className="l">V2 Machine Learning</div><div className="r num">Active · 62% Min Confidence</div></div>
          </div>

          <div style={{ textAlign: "center", fontSize: 10, color: "var(--ink3)", margin: "20px 0 8px", lineHeight: 1.8 }}>
            "Every pixel earns its place."<br />
            <span style={{ opacity: 0.55 }}>QuantSync Production Trading Engine · Institutional Suite</span>
          </div>
        </div>
      </div>

      {/* Breakout Analyst Modal View */}
      {analystStock && (
        <BreakoutAnalystView
          stock={analystStock}
          theme={theme}
          onClose={() => setAnalystStock(null)}
          onNavigateDna={(sym) => {
            setAnalystStock(null);
            setSelectedDnaStock(sym);
            setActiveTab("dna");
          }}
        />
      )}
    </div>
  );
}
