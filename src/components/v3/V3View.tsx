import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Activity, TrendingUp, TrendingDown, BarChart2,
  RefreshCw, ChevronRight, Award, Target, Zap,
  BookOpen, Clock, Shield
} from "lucide-react";
import { V3ActiveTrade, V3ClosedTrade, V3KPIs, V3TerminalData } from "../../types-v3";
import V3ActiveCard from "./V3ActiveCard";

interface V3ViewProps {
  onOpenChart?: (symbol: string) => void;
  isSyncing?: boolean;
  onRequestSync?: () => void;
}

// Closed trade row with embedded sparkline
function V3ClosedRow({ trade, onOpenChart }: { trade: V3ClosedTrade; onOpenChart?: (s: string) => void }) {
  const ep = Number(trade.entryPrice ?? 0);
  const xp = Number(trade.exitPrice ?? ep);
  const roi = Number(trade.roiPct ?? trade.returnPct ?? (ep > 0 ? ((xp - ep) / ep * 100) : 0));
  const isWin = roi >= 0;
  const sparkline = trade.sparkline ?? trade.miniChart?.sparkline ?? [];

  // SVG sparkline
  const spkSvg = useMemo(() => {
    if (sparkline.length < 2) return null;
    const mn = Math.min(...sparkline), mx = Math.max(...sparkline), rng = mx - mn || 1;
    const w = 64, h = 28;
    const pts = sparkline.map((v, i) => {
      const x = (i / (sparkline.length - 1)) * (w - 4) + 2;
      const y = h - 4 - ((v - mn) / rng) * (h - 8);
      return `${x},${y}`;
    }).join(" ");
    return { pts, w, h, color: isWin ? "#10B981" : "#EF4444" };
  }, [sparkline, isWin]);

  return (
    <div
      className="v3-closed-row group"
      onClick={() => onOpenChart?.(trade.symbol)}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="v3-symbol-badge-sm flex-shrink-0">
          <span className="text-[9px] font-black text-white">{trade.symbol.slice(0, 2)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-bold text-white truncate">{trade.symbol}</div>
          <div className="text-[9px] text-white/35 font-medium flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {trade.holdingDays ?? "—"}d • {trade.exitReason ?? trade.strategyName ?? ""}
          </div>
        </div>
      </div>

      {/* Sparkline */}
      {spkSvg && (
        <svg width={spkSvg.w} height={spkSvg.h} className="flex-shrink-0">
          <polyline
            points={spkSvg.pts}
            fill="none"
            stroke={spkSvg.color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
        </svg>
      )}

      {/* ROI */}
      <div className={`text-[13px] font-black tabular flex-shrink-0 ${isWin ? "text-emerald-400" : "text-red-400"}`}>
        {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
      </div>

      {/* Win/Loss badge */}
      <div
        className={`text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-md flex-shrink-0 ${isWin
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
          : "bg-red-500/15 text-red-400 border border-red-500/25"
        }`}
      >
        {isWin ? "WIN" : "LOSS"}
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0 group-hover:text-white/50 transition-colors" />
    </div>
  );
}

// KPI Tile
function V3KpiTile({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string; value: string; sub?: string;
  icon?: React.ElementType; color: string; trend?: "up" | "down" | null;
}) {
  return (
    <div className="v3-kpi-tile">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9.5px] text-white/40 font-semibold tracking-wide uppercase">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color, opacity: 0.7 }} />}
      </div>
      <div className="text-[22px] font-black tabular leading-none" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-[9px] text-white/35 font-medium mt-1">{sub}</div>}
    </div>
  );
}

export default function V3View({ onOpenChart, isSyncing, onRequestSync }: V3ViewProps) {
  const [tab, setTab] = useState<"active" | "closed">("active");
  const [terminalData, setTerminalData] = useState<V3TerminalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const fetchV3Data = async () => {
    setLoading(true);
    setError(null);
    try {
      const urls = [
        "/api/v3/terminalData",
        "/api/terminal-data?version=v3",
        "https://quantsync-api.duckdns.org:8443/api/v3/terminalData",
      ];
      let data: V3TerminalData | null = null;
      for (const url of urls) {
        try {
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (res.ok) { data = await res.json(); break; }
        } catch { /* try next */ }
      }
      if (data) {
        setTerminalData(data);
        setLastSync(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } else {
        setError("Unable to reach QuantSync-V3 engine. Showing cached state.");
      }
    } catch (e: any) {
      setError(e.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchV3Data(); }, []);

  const activeTrades = (terminalData as any)?.active ?? terminalData?.inTradeTrades ?? [];
  const closedTrades = (terminalData as any)?.closed ?? terminalData?.closedTrades ?? [];
  const kpis = terminalData?.kpis ?? {};

  const wins = closedTrades.filter(t => {
    const roi = Number(t.roiPct ?? t.returnPct ?? 0);
    return roi >= 0;
  });
  const losses = closedTrades.filter(t => {
    const roi = Number(t.roiPct ?? t.returnPct ?? 0);
    return roi < 0;
  });
  const winRate = closedTrades.length > 0
    ? Math.round((wins.length / closedTrades.length) * 100)
    : Number(kpis.winRate ?? 0);

  const totalReturn = Number(kpis.totalReturnPct ?? 0);
  const pf = Number(kpis.profitFactor ?? 0);

  return (
    <div className="v3-view">

      {/* ── V3 HERO HEADER ── */}
      <div className="v3-hero-header mb-5">
        <div className="v3-hero-bg" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="v3-engine-badge">
                <Zap className="w-3 h-3" />
                <span>V3 ENGINE</span>
              </div>
              <div className="v3-live-dot" />
            </div>
            <h2 className="text-[20px] font-black text-white tracking-tight leading-tight">
              Fibonacci Breakout
            </h2>
            <p className="text-[11px] text-purple-300/70 font-medium mt-0.5">
              Weekly Swing · Base Breakout · RS Leader
            </p>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-white/35 font-medium mb-1">
              {lastSync ? `Synced ${lastSync}` : "Syncing…"}
            </div>
            <button
              onClick={fetchV3Data}
              disabled={loading}
              className="v3-sync-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-2 mt-4 relative z-10">
          <V3KpiTile
            label="Active"
            value={String(activeTrades.length)}
            sub={`/ 25 slots`}
            icon={Activity}
            color="#8B5CF6"
          />
          <V3KpiTile
            label="Win Rate"
            value={`${winRate}%`}
            sub={`${wins.length}W ${losses.length}L`}
            icon={Award}
            color="#10B981"
          />
          <V3KpiTile
            label="P·Factor"
            value={pf > 0 ? pf.toFixed(2) : "—"}
            sub="gross ratio"
            icon={BarChart2}
            color="#A78BFA"
          />
          <V3KpiTile
            label="Total ROI"
            value={`${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(1)}%`}
            sub="inception"
            icon={TrendingUp}
            color={totalReturn >= 0 ? "#34D399" : "#F87171"}
          />
        </div>
      </div>

      {/* ── TAB SWITCHER ── */}
      <div className="v3-tab-bar mb-4">
        {(["active", "closed"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`v3-tab-btn ${tab === t ? "active" : ""}`}
          >
            {t === "active" ? (
              <><Activity className="w-3.5 h-3.5" /> Active ({activeTrades.length})</>
            ) : (
              <><BookOpen className="w-3.5 h-3.5" /> Closed ({closedTrades.length})</>
            )}
          </button>
        ))}
      </div>

      {/* ── LOADING / ERROR ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="v3-spinner" />
          <span className="text-[12px] text-purple-300/60 font-medium">Loading V3 Engine Data…</span>
        </div>
      )}

      {!loading && error && (
        <div className="v3-error-card">
          <Shield className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <div className="text-[12px] font-bold text-white/80">Connection Issue</div>
            <div className="text-[10px] text-white/40 mt-0.5">{error}</div>
          </div>
          <button onClick={fetchV3Data} className="v3-retry-btn ml-auto">Retry</button>
        </div>
      )}

      {/* ── ACTIVE POSITIONS ── */}
      {!loading && tab === "active" && (
        <>
          {activeTrades.length === 0 ? (
            <div className="v3-empty-state">
              <div className="v3-empty-icon"><BarChart2 className="w-7 h-7 text-purple-400/40" /></div>
              <div className="text-[14px] font-bold text-white/30 mt-3">No Active V3 Positions</div>
              <div className="text-[11px] text-white/20 font-medium mt-1">
                V3 scans at 15:15 & 15:45 IST daily
              </div>
            </div>
          ) : (
            <div className="v3-cards-grid">
              {activeTrades.map((trade, i) => (
                <V3ActiveCard
                  key={trade.tradeId ?? trade.symbol}
                  trade={trade}
                  index={i}
                  onOpenChart={onOpenChart}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CLOSED TRADES ── */}
      {!loading && tab === "closed" && (
        <>
          {closedTrades.length === 0 ? (
            <div className="v3-empty-state">
              <div className="v3-empty-icon"><BookOpen className="w-7 h-7 text-purple-400/40" /></div>
              <div className="text-[14px] font-bold text-white/30 mt-3">No Closed V3 Trades Yet</div>
              <div className="text-[11px] text-white/20 font-medium mt-1">
                Exits appear here after 15:45 settlement
              </div>
            </div>
          ) : (
            <div className="v3-closed-list">
              {/* Summary bar */}
              <div className="v3-closed-summary">
                <div className="text-[11px] text-white/40 font-semibold">
                  {closedTrades.length} Trades · {winRate}% Win Rate
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-400">{wins.length}W</span>
                  <span className="text-white/20 text-[10px]">·</span>
                  <span className="text-[11px] font-bold text-red-400">{losses.length}L</span>
                </div>
              </div>
              {closedTrades.map((trade, i) => (
                <V3ClosedRow
                  key={trade.tradeId ?? `${trade.symbol}_${i}`}
                  trade={trade}
                  onOpenChart={onOpenChart}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
