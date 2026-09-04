import React, { useState, useMemo } from "react";
import {
  LayoutDashboard,
  Zap,
  Briefcase,
  History,
  Wallet,
  TrendingUp,
  Target,
  ArrowRight,
  ShoppingCart,
  LineChart,
  Star,
  Clock,
  Brain,
  ShieldCheck,
} from "lucide-react";
import {
  ToBuySignal,
  InTradeTrade,
  ClosedTrade,
  StrategySummary,
  ManualPortfolioTrade,
  CompletedTrade,
  TerminalKPIs,
  TotalSummary,
} from "../types";

import InstitutionalHeader from "../components/institutional/InstitutionalHeader";
import EquityGrowthChart from "../components/institutional/EquityGrowthChart";
import StrategyAttributionMatrix from "../components/institutional/StrategyAttributionMatrix";
import ClosedTradesLedger from "../components/institutional/ClosedTradesLedger";
import ActiveSignalsView from "../components/institutional/ActiveSignalsView";
import PortfolioView from "./PortfolioView";

interface InstitutionalViewProps {
  toBuySignals: ToBuySignal[];
  inTradeTrades: InTradeTrade[];
  closedTrades: ClosedTrade[];
  strategies: StrategySummary[];
  portfolio: ManualPortfolioTrade[];
  completedHistory: CompletedTrade[];
  kpis?: TerminalKPIs | null;
  totalSummary?: TotalSummary | null;
  onOpenChart: (symbol: string) => void;
  onOpenBuyModal: (symbol: string, price: number, strategy?: string) => void;
  onOpenSellModal?: (trade: ManualPortfolioTrade) => void;
  lastSyncedAt?: string | null;
  isSyncing?: boolean;
  engineVersion?: "v2" | "v3";
  onVersionChange?: (version: "v2" | "v3") => void;
}

type TabKey = "overview" | "active" | "history" | "portfolio";

const tabs: { key: TabKey; label: string; icon: React.ElementType; color: string; activeColor: string }[] = [
  { key: "overview", label: "Home", icon: LayoutDashboard, color: "text-slate-600 dark:text-slate-400", activeColor: "bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs" },
  { key: "active", label: "Active Signals", icon: Briefcase, color: "text-slate-600 dark:text-slate-400", activeColor: "bg-cyan-500 text-white shadow-sm shadow-cyan-500/25" },
  { key: "history", label: "Closed Signals", icon: History, color: "text-slate-600 dark:text-slate-400", activeColor: "bg-amber-500 text-white shadow-sm shadow-amber-500/25" },
  { key: "portfolio", label: "My Portfolio", icon: Wallet, color: "text-slate-600 dark:text-slate-400", activeColor: "bg-indigo-500 text-white shadow-sm shadow-indigo-500/25" },
];

export default function InstitutionalView({
  toBuySignals = [],
  inTradeTrades = [],
  closedTrades = [],
  strategies = [],
  portfolio = [],
  completedHistory = [],
  kpis,
  totalSummary,
  onOpenChart,
  onOpenBuyModal,
  onOpenSellModal,
  lastSyncedAt,
  isSyncing = false,
  engineVersion = "v2",
  onVersionChange,
}: InstitutionalViewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [activeSubFilter, setActiveSubFilter] = useState<"ALL" | "FRESH_BUYS" | "RUNNING">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Aggregate stats from live data
  const nClosed = (kpis as any)?.totalTradesClosed ?? (kpis as any)?.totalTrades ?? closedTrades.length;
  const wins = closedTrades.filter((t) => (t.returnPct ?? 0) >= 0);
  const winRate = (kpis as any)?.winRate ?? (closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0);
  const profitFactor = (kpis as any)?.profitFactor ?? 0;
  const totalReturn = (kpis as any)?.totalReturnPct ?? closedTrades.reduce((acc, t) => acc + (t.returnPct || 0), 0);

  // Top fresh buys for Home preview
  const topFreshBuys = useMemo(() => {
    return [...toBuySignals]
      .filter(s => (s.action || "BUY_NOW").toUpperCase() === "BUY_NOW" || (s.action || "").toUpperCase() === "BUY")
      .sort((a, b) => (b.mlProbability || 0) - (a.mlProbability || 0))
      .slice(0, 4);
  }, [toBuySignals]);

  // Top active runners for Home preview
  const topRunners = useMemo(() => {
    return [...inTradeTrades]
      .sort((a, b) => (b.currentROI || 0) - (a.currentROI || 0))
      .slice(0, 4);
  }, [inTradeTrades]);

  // Tab counts
  const totalActiveCount = toBuySignals.length + inTradeTrades.length;

  return (
    <div className="space-y-5 pb-8 animate-fade-in">
      {/* 1. Header with KPIs */}
      <InstitutionalHeader
        activeCount={inTradeTrades.length}
        toBuyCount={toBuySignals.length}
        closedCount={nClosed}
        winRate={winRate}
        profitFactor={profitFactor}
        totalReturn={totalReturn}
        lastSyncedAt={lastSyncedAt}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 2. Primary 4-Tab Navigation */}
      <div className="flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-white/[0.06]" style={{ boxShadow: 'var(--shadow-sm)' }}>
          {tabs.map(({ key, label, icon: Icon, color, activeColor }) => {
            const count = key === "active" ? totalActiveCount
              : key === "history" ? closedTrades.length
              : key === "portfolio" ? portfolio.length
              : null;

            return (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  if (key === "active") setActiveSubFilter("ALL");
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap qs-btn-press ${
                  activeTab === key ? activeColor : `${color} hover:text-slate-900 dark:hover:text-white`
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {count !== null && count > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-px rounded-full ${
                    activeTab === key ? "bg-white/20 text-white" : "bg-slate-200/60 dark:bg-white/10 opacity-70"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tab Contents */}

      {/* ─── TAB 1: HOME (EXECUTIVE DASHBOARD) ─── */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Engine Selector Bar (V2 vs V3) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] backdrop-blur-xl">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${engineVersion === "v3" ? "bg-violet-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {engineVersion === "v3" ? "QuantSync-V3 (NextGen State Machine)" : "QuantSync-V2 (Institutional Production)"}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase font-mono ${engineVersion === "v3" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"}`}>
                    Live Angel API
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {engineVersion === "v3"
                    ? "Streaming from terminalDataV3 endpoint with weekly/daily state transition model."
                    : "Streaming from terminalData VPS endpoint with active portfolio & trailing stops."}
                </p>
              </div>
            </div>

            {/* Switch Buttons */}
            {onVersionChange && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/[0.04] self-start sm:self-auto shrink-0">
                <button
                  onClick={() => onVersionChange("v2")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    engineVersion === "v2"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-white/[0.06]"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${engineVersion === "v2" ? "bg-emerald-500" : "bg-slate-400"}`} />
                  V2 Engine
                </button>
                <button
                  onClick={() => onVersionChange("v3")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    engineVersion === "v3"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-white/[0.06]"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${engineVersion === "v3" ? "bg-violet-500" : "bg-slate-400"}`} />
                  V3 Engine
                </button>
              </div>
            )}
          </div>

          {/* Realized Cumulative Equity Growth */}
          {(closedTrades.length > 0 || completedHistory.length > 0) ? (
            <EquityGrowthChart
              closedTrades={closedTrades}
              completedHistory={completedHistory}
            />
          ) : (
            <div className="rounded-2xl p-6 text-center bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06]">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {engineVersion === "v3" ? "QuantSync V3 Engine Active" : "No Closed Trades Yet"}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {engineVersion === "v3"
                  ? "Connected to Angel V3 API (1,355 stocks evaluated). Live closed trades and equity performance will appear here as trades complete."
                  : "Closed trade history will populate once positions exit."}
              </p>
            </div>
          )}

          {/* Action Center: Fresh Buys vs Active Runners Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Fresh Buys Highlight */}
            <div className="rounded-2xl p-4 bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <Zap className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Fresh Buy Triggers
                    </h3>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      {toBuySignals.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Latest 1–5 days</span>
                </div>

                {topFreshBuys.length > 0 ? (
                  <div className="space-y-2">
                    {topFreshBuys.map((item) => {
                      const sym = item.symbol;
                      const price = Number(item.currentPrice || item.entryPrice || 0);
                      const triggerPrice = Number(item.entryPrice || price);
                      const slippage = item.currentROI ?? (triggerPrice > 0 ? ((price - triggerPrice) / triggerPrice) * 100 : 0);
                      const ml = item.mlProbability ? (item.mlProbability > 1 ? item.mlProbability : item.mlProbability * 100) : null;

                      return (
                        <div
                          key={sym}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] hover:border-emerald-500/30 transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[11px] flex items-center justify-center shrink-0">
                              {sym.slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{sym}</span>
                                <span className="px-1.5 py-px rounded-md text-[8px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                  BUY NOW
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {item.strategyName || "Breakout"} · Trigger ₹{triggerPrice.toFixed(1)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="font-black text-xs text-slate-900 dark:text-white font-mono">
                                ₹{price.toFixed(1)}
                              </div>
                              <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                {slippage >= 0 ? "+" : ""}{slippage.toFixed(1)}% slip
                              </div>
                            </div>

                            <button
                              onClick={() => onOpenBuyModal(sym, price, item.strategyName)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer shadow-xs shadow-emerald-500/20"
                            >
                              Buy
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No fresh buy signals triggered today.</p>
                )}
              </div>

              <button
                onClick={() => {
                  setActiveSubFilter("FRESH_BUYS");
                  setActiveTab("active");
                }}
                className="mt-3 w-full py-2 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>View All {toBuySignals.length} Fresh Signals</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right: Active Runners Highlight */}
            <div className="rounded-2xl p-4 bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] backdrop-blur-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Top Active Runners
                    </h3>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                      {inTradeTrades.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Open strategy trades</span>
                </div>

                {topRunners.length > 0 ? (
                  <div className="space-y-2">
                    {topRunners.map((item) => {
                      const sym = item.symbol;
                      const ep = Number(item.entryPrice || 0);
                      const lp = Number(item.currentPrice || ep);
                      const roi = Number(item.currentROI ?? (ep > 0 ? ((lp - ep) / ep) * 100 : 0));
                      const isUp = roi >= 0;
                      const days = item.holdingDays || 1;

                      return (
                        <div
                          key={sym}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] hover:border-cyan-500/30 transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold font-mono text-[11px] flex items-center justify-center shrink-0">
                              {sym.slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{sym}</span>
                                {roi >= 10 && (
                                  <span className="px-1.5 py-px rounded-md text-[8px] font-black uppercase bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                                    RUNNER
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {item.strategyName || "Momentum"} · {days}d held
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="font-black text-xs text-slate-900 dark:text-white font-mono">
                                ₹{lp.toFixed(1)}
                              </div>
                              <div className={`text-[10px] font-mono font-bold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {isUp ? "+" : ""}{roi.toFixed(1)}% ROI
                              </div>
                            </div>

                            <button
                              onClick={() => onOpenChart(sym)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                              title="View Chart"
                            >
                              <LineChart className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No active positions currently running.</p>
                )}
              </div>

              <button
                onClick={() => {
                  setActiveSubFilter("RUNNING");
                  setActiveTab("active");
                }}
                className="mt-3 w-full py-2 rounded-xl text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>View All {inTradeTrades.length} Active Positions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Strategy Attribution Performance Matrix */}
          {strategies.length > 0 && (
            <StrategyAttributionMatrix strategies={strategies} />
          )}
        </div>
      )}

      {/* ─── TAB 2: ACTIVE SIGNALS (UNIFIED IN-TRADE & FRESH BUYS) ─── */}
      {activeTab === "active" && (
        <div className="animate-fade-in-up">
          <ActiveSignalsView
            toBuySignals={toBuySignals}
            inTradeTrades={inTradeTrades}
            portfolio={portfolio}
            onOpenChart={onOpenChart}
            onOpenBuyModal={onOpenBuyModal}
            onOpenSellModal={onOpenSellModal}
            initialFilter={activeSubFilter}
          />
        </div>
      )}

      {/* ─── TAB 3: CLOSED SIGNALS (HISTORY & AUDITED TRACK RECORD) ─── */}
      {activeTab === "history" && (
        <div className="space-y-6 animate-fade-in-up">
          <ClosedTradesLedger
            closedTrades={closedTrades}
            onOpenChart={onOpenChart}
          />
          {(closedTrades.length > 0 || completedHistory.length > 0) && (
            <EquityGrowthChart
              closedTrades={closedTrades}
              completedHistory={completedHistory}
            />
          )}
        </div>
      )}

      {/* ─── TAB 4: MY PORTFOLIO (USER'S PERSONAL TRADES & P&L) ─── */}
      {activeTab === "portfolio" && (
        <div className="animate-fade-in-up">
          <PortfolioView
            portfolio={portfolio}
            completedHistory={completedHistory}
            closedTrades={closedTrades}
            onOpenBuyModal={onOpenBuyModal}
            onOpenSellModal={(trade) => onOpenSellModal && onOpenSellModal(trade)}
            onOpenChart={onOpenChart}
          />
        </div>
      )}
    </div>
  );
}
