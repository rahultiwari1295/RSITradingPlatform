/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  AlertTriangle, 
  Activity, 
  BookOpen, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink,
  TrendingDown,
  Info,
  Sliders,
  BellRing
} from "lucide-react";
import { 
  TerminalKPIs, 
  NearSetupStock, 
  OngoingTrade, 
  BacktestLogRecord, 
  PortfolioStock 
} from "./types";
import KPICards from "./components/KPICards";
import TradingViewWidget from "./components/TradingViewWidget";

export default function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [dataSource, setDataSource] = useState<"live" | "failed">("failed");
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  // Core Wix API state containers
  const [kpis, setKpis] = useState<TerminalKPIs>({
    totalSignals: 0,
    closedTrades: 0,
    openTrades: 0,
    winRate: 0,
    winRateStrong: 0,
    liveWinRate: 0,
    avgReturn: 0,
    avgReturnStrong: 0,
    expectancy: 0,
    setupCount: 0,
    watchingCount: 0,
    inTradeCount: 0,
    bestTrade: null,
    worstTrade: null,
    exitReasonBreakdown: []
  });

  const [nearSetup, setNearSetup] = useState<NearSetupStock[]>([]);
  const [ongoingTrades, setOngoingTrades] = useState<OngoingTrade[]>([]);
  const [backtestLog, setBacktestLog] = useState<BacktestLogRecord[]>([]);
  const [portfolioList, setPortfolioList] = useState<PortfolioStock[]>([]);

  // Navigation Filter States
  const [activeTab, setActiveTab] = useState<"active" | "setup" | "portfolio" | "backtest">("active");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [strengthFilter, setStrengthFilter] = useState<string>("ALL");

  // Format helpers
  const formatCompactDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  // Main data synchronizer linking strictly to Wix terminalData function hook
  const fetchTerminalData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/terminal-data");
      const result = await res.json();
      
      if (result.success) {
        setKpis(result.kpis || {
          totalSignals: 0,
          closedTrades: 0,
          openTrades: 0,
          winRate: 0,
          winRateStrong: 0,
          liveWinRate: 0,
          avgReturn: 0,
          avgReturnStrong: 0,
          expectancy: 0,
          setupCount: 0,
          watchingCount: 0,
          inTradeCount: 0,
          bestTrade: null,
          worstTrade: null,
          exitReasonBreakdown: []
        });

        const nearSetupData = result.nearSetup || [];
        const ongoingTradesData = result.ongoingTrades || [];
        const backtestLogData = result.backtestLog || [];
        const portfolioData = result.portfolio || [];

        setNearSetup(nearSetupData);
        setOngoingTrades(ongoingTradesData);
        setBacktestLog(backtestLogData);
        setPortfolioList(portfolioData);

        setGeneratedAt(result.generatedAt || null);
        setDataSource("live");
        setErrorInfo(null);

        // Pre-select first appropriate stock symbol on chart stage
        if (ongoingTradesData.length > 0) {
          setSelectedSymbol(ongoingTradesData[0].symbol);
        } else if (nearSetupData.length > 0) {
          setSelectedSymbol(nearSetupData[0].symbol);
        } else if (portfolioData.length > 0) {
          setSelectedSymbol(portfolioData[0].symbol);
        } else if (backtestLogData.length > 0) {
          setSelectedSymbol(backtestLogData[0].symbol);
        }
      } else {
        setDataSource("failed");
        setErrorInfo(result.error || "Wix endpoint returned unsuccessful connection payload");
      }
    } catch (err: any) {
      console.error("Wix API integration failure:", err);
      setDataSource("failed");
      setErrorInfo(err.message || "Failed to establish proxy handshake with Wix backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminalData();
  }, []);

  // --- TAB CHORT CALCULATORS FOR DYNAMIC FLOATING METRICS ---
  
  // Tab 1: Ongoing Trades Insights
  const profitableActiveCount = ongoingTrades.filter(t => t.currentRoi > 0).length;
  const inDrawdownActiveCount = ongoingTrades.filter(t => t.currentRoi < 0).length;
  const avgActiveRoi = ongoingTrades.length > 0
    ? ongoingTrades.reduce((sum, t) => sum + (t.currentRoi || 0), 0) / ongoingTrades.length
    : 0;

  // Tab 2: Near Setup Insights
  const upcomingSetupCount = nearSetup.filter(u => u.tradeState === "SETUP").length;
  const upcomingWatchingCount = nearSetup.filter(u => u.tradeState === "WATCHING").length;
  const upcomingStrongCount = nearSetup.filter(u => u.quality === "STRONG" || u.holdStrength === "STRONG").length;
  const upcomingAvgScore = nearSetup.length > 0
    ? nearSetup.reduce((sum, item) => sum + (item.tradeStateScore || 0), 0) / nearSetup.length
    : 0;

  // Tab 3: Live Portfolio Asset Sheets
  const totalInvested = portfolioList.reduce((sum, p) => sum + (p.investedValue || 0), 0);
  const totalCurrent = portfolioList.reduce((sum, p) => sum + (p.currentValue || 0), 0);
  const totalPnlAmount = totalCurrent - totalInvested;
  const totalPnlPercentage = totalInvested > 0 ? (totalPnlAmount / totalInvested) * 100 : 0;
  const portfolioWinnerCount = portfolioList.filter(p => p.pnl > 0).length;
  const portfolioLoserCount = portfolioList.filter(p => p.pnl < 0).length;

  // Tab 4: Backtest Logs Insights
  const backtestCount = backtestLog.length;
  const backtestWinnerCount = backtestLog.filter(b => b.result === "WIN").length;
  const backtestLoserCount = backtestLog.filter(b => b.result === "LOSS").length;
  const backtestWinrate = backtestCount > 0 ? (backtestWinnerCount / backtestCount) * 100 : 0;
  const backtestAvgReturn = backtestCount > 0
    ? backtestLog.reduce((sum, b) => sum + (b.tradeReturnPct || 0), 0) / backtestCount
    : 0;

  // --- STRATEGY & QUERY FILTERING CONTROLLERS ---

  // 1. Ongoing Trades Filters
  const filteredOngoingTrades = ongoingTrades.filter(t => {
    const queryMatches = t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.tradeId.toLowerCase().includes(searchQuery.toLowerCase());
    const strengthMatches = strengthFilter === "ALL" || 
                            t.strength?.toUpperCase() === strengthFilter ||
                            t.entryQuality?.toUpperCase() === strengthFilter;
    return queryMatches && strengthMatches;
  });

  // 2. Near Setup Filters
  const filteredNearSetups = nearSetup.filter(s => {
    const queryMatches = s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const strengthMatches = strengthFilter === "ALL" || 
                            s.quality?.toUpperCase() === strengthFilter ||
                            s.holdStrength?.toUpperCase() === strengthFilter;
    return queryMatches && strengthMatches;
  });

  // 3. Portfolio Filters
  const filteredPortfolio = portfolioList.filter(p => {
    const queryMatches = p.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const strengthMatches = strengthFilter === "ALL" || 
                            p.signal?.holdStrength?.toUpperCase() === strengthFilter;
    return queryMatches && strengthMatches;
  });

  // 4. Backtest Log Filters
  const filteredBacktests = backtestLog.filter(b => {
    const queryMatches = b.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         b.tradeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         b.exitReason?.toLowerCase().includes(searchQuery.toLowerCase());
    const strengthMatches = strengthFilter === "ALL" || 
                            b.strength?.toUpperCase() === strengthFilter ||
                            b.entryQuality?.toUpperCase() === strengthFilter;
    return queryMatches && strengthMatches;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* System Status Connectivity Ribbon */}
      <div className="bg-slate-900 text-slate-300 px-3 py-2 text-[10px] sm:text-xs flex flex-col md:flex-row md:items-center justify-between gap-1.5 border-b border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-mono tracking-wide">
            API SYSTEM CONNECT: <span className="text-emerald-400 font-bold uppercase">{dataSource} Wix Signal Function</span>
          </span>
          {errorInfo && (
            <span className="text-red-400 text-[9px] sm:text-[10px] truncate max-w-[180px] sm:max-w-md font-mono">
              ({errorInfo})
            </span>
          )}
          {generatedAt && (
            <span className="text-slate-500 text-[10px] font-mono hidden lg:inline">
              | Sync Stamp: {new Date(generatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono text-[9px] sm:text-[11px] text-slate-400 justify-between md:justify-end w-full md:w-auto border-t border-slate-800/60 pt-1.5 md:border-t-0 md:pt-0">
          <span>Server Time: 2026-06-20 IST</span>
          <span className="text-slate-700 hidden md:inline">|</span>
          <span className="text-slate-300 font-medium font-mono uppercase">AngelOne Auth: ACTIVE</span>
        </div>
      </div>

      {/* Modern High-Fidelity Header */}
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-3 md:py-0 md:h-16 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 shrink-0">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base md:text-lg font-bold text-gray-900 tracking-tight truncate">RahulTrading Terminal</h1>
                  <span className="text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100/60 font-mono uppercase shrink-0">V3.5 ENGINE</span>
                </div>
                <p className="text-xs text-gray-500 hidden sm:block truncate font-mono uppercase tracking-wide">Unified Algorithmic Trade Suite</p>
                <p className="text-[11px] text-gray-500 block sm:hidden font-mono uppercase tracking-wide">Unified Trade Suite</p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-between md:justify-end w-full md:w-auto">
              {/* Dynamic Action-Based Search Box */}
              <div className="relative w-full sm:w-auto">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 w-full sm:w-60 rounded-lg text-xs bg-slate-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all font-semibold"
                />
              </div>

              <button
                onClick={fetchTerminalData}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 border border-indigo-200 transition-all shadow-3xs cursor-pointer disabled:opacity-50 shrink-0 select-none"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Syncing..." : "Force Sync"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Metric Cards Grid Component with Unified live stats */}
        <KPICards 
          kpis={kpis} 
          activeCount={ongoingTrades.length} 
          setupCount={nearSetup.length} 
        />

        {/* Interactive Workspace Area: Tab Table Controls & TradingView Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Wix Managed Tables (8 Columns) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            {/* Table Control Hub */}
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gray-50/50">
                
                {/* Clean Cohort Navigation Tabs */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap p-1 gap-1 rounded-xl bg-slate-100 border border-slate-200/40 w-full xl:w-auto">
                  <button
                    onClick={() => setActiveTab("active")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer text-center whitespace-nowrap truncate ${
                      activeTab === "active"
                        ? "bg-white text-indigo-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-950 hover:bg-white/40"
                    }`}
                  >
                    🚀 Active Core ({ongoingTrades.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("setup")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer text-center whitespace-nowrap truncate ${
                      activeTab === "setup"
                        ? "bg-white text-indigo-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-950 hover:bg-white/40"
                    }`}
                  >
                    👁️ Near Setup ({nearSetup.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("portfolio")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer text-center whitespace-nowrap truncate ${
                      activeTab === "portfolio"
                        ? "bg-white text-indigo-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-950 hover:bg-white/40"
                    }`}
                  >
                    🏆 Portfolio ({portfolioList.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("backtest")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer text-center whitespace-nowrap truncate ${
                      activeTab === "backtest"
                        ? "bg-white text-indigo-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-950 hover:bg-white/40"
                    }`}
                  >
                    📜 Backtests ({backtestLog.length})
                  </button>
                </div>

                {/* Sub Dropdown Strength Select Filters */}
                <div className="flex items-center gap-2 justify-between w-full xl:w-auto border-t border-gray-150 pt-3 xl:border-t-0 xl:pt-0">
                  <span className="text-[11px] font-bold text-gray-400 uppercase font-mono tracking-wider">Quality Threshold:</span>
                  <select
                    value={strengthFilter}
                    onChange={(e) => setStrengthFilter(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg text-xs py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-3xs hover:border-gray-300 font-bold text-gray-700 transition-colors"
                  >
                    <option value="ALL">All Strengths</option>
                    <option value="STRONG">🟢 Strong / High</option>
                    <option value="MEDIUM">🟡 Medium</option>
                    <option value="WEAK">⚪ Weak</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Tab Insights Panel */}
              <div className="px-4 py-3 bg-linear-to-r from-slate-50 to-indigo-50/10 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between text-xs text-gray-600 font-mono">
                {activeTab === "active" && (
                  <>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="font-bold text-indigo-950">🚀 ACTIVE COPT-STREAMS:</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Gain: <strong className="text-emerald-700 font-bold">{profitableActiveCount}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Loss: <strong className="text-rose-700 font-bold">{inDrawdownActiveCount}</strong>
                      </span>
                      <span className="text-slate-400">|</span>
                      <span>
                        Avg Float ROI: <strong className={avgActiveRoi >= 0 ? "text-emerald-600" : "text-rose-500"}>
                          {avgActiveRoi >= 0 ? "+" : ""}{avgActiveRoi.toFixed(2)}%
                        </strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 hidden sm:inline uppercase">Ongoing Algo Signals</span>
                  </>
                )}

                {activeTab === "setup" && (
                  <>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="font-bold text-indigo-950">👁️ SETUP INTERCEPTORS:</span>
                      <span>
                        ALERT: <strong className="text-amber-800 font-bold">{upcomingSetupCount}</strong>
                      </span>
                      <span>
                        WATCHING: <strong className="text-purple-800 font-bold">{upcomingWatchingCount}</strong>
                      </span>
                      <span className="text-slate-400">|</span>
                      <span>
                        Strong Qualities: <strong className="text-emerald-700 font-bold">{upcomingStrongCount}</strong>
                      </span>
                      <span>
                        Avg Intercept Score: <strong className="text-indigo-600 font-bold">{upcomingAvgScore.toFixed(1)}</strong>
                      </span>
                    </div>
                  </>
                )}

                {activeTab === "portfolio" && (
                  <>
                    <div className="flex flex-wrap items-center gap-4 w-full justify-between">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="font-bold text-emerald-950">🏆 REAL-TIME HOLDINGS PORTFOLIO:</span>
                        <span>
                          Invested: <strong className="text-slate-800 font-bold">₹{totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</strong>
                        </span>
                        <span>
                          Current: <strong className="text-slate-800 font-bold">₹{totalCurrent.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</strong>
                        </span>
                        <span className="text-slate-400 font-light">|</span>
                        <span>
                          Floating Profit: <strong className={`font-bold ${totalPnlAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {totalPnlAmount >= 0 ? "+" : ""}₹{totalPnlAmount.toLocaleString("en-IN", { maximumFractionDigits: 1 })} ({totalPnlAmount >= 0 ? "+" : ""}{totalPnlPercentage.toFixed(2)}%)
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-150">Win: {portfolioWinnerCount}</span>
                        <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-150">Loss: {portfolioLoserCount}</span>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "backtest" && (
                  <>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="font-bold text-indigo-950">📜 CLOSED SIG DECOUPLES:</span>
                      <span>
                        Exits: <strong className="text-slate-800 font-bold">{backtestCount}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        Wins: <strong className="text-emerald-700 font-bold">{backtestWinnerCount}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                        Losses: <strong className="text-rose-700 font-bold">{backtestLoserCount}</strong>
                      </span>
                      <span className="text-slate-400">|</span>
                      <span>
                        Avg Return: <strong className={`font-bold ${backtestAvgReturn >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {backtestAvgReturn >= 0 ? "+" : ""}{backtestAvgReturn.toFixed(2)}%
                        </strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold py-0.5 px-1.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700">
                      W&nbsp;Rate: {backtestWinrate.toFixed(1)}%
                    </span>
                  </>
                )}
              </div>

              {/* Table Render Arena */}
              <div className="overflow-x-auto min-h-[440px]">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-28 gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-xs font-mono select-none">Retrieving and parsing synced clusters from Node proxy...</p>
                  </div>
                ) : activeTab === "active" ? (
                  // ================= TABLE 1: ONGOING ACTIVE TRADES =================
                  filteredOngoingTrades.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center">
                      <BookOpen className="w-10 h-10 text-gray-300 mb-3" />
                      <h4 className="font-bold text-gray-700 text-sm">No ongoing trades match filter thresholds</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm font-mono">Relax parameters or try syncing again.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-200/60 font-mono text-[10px] text-gray-400 font-semibold uppercase tracking-wider select-none">
                          <th className="px-4 py-3">Symbol / Base Info</th>
                          <th className="px-4 py-3">Entry Details</th>
                          <th className="px-4 py-3 text-right">Entry / LTP Prices</th>
                          <th className="px-4 py-3 text-right">Current ROI / Peak MFE</th>
                          <th className="px-4 py-3 text-right hidden lg:table-cell">Trigger Targets</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredOngoingTrades.map((item) => {
                          const isSelected = selectedSymbol === item.symbol;
                          const isPositive = item.currentRoi >= 0;
                          return (
                            <tr
                              key={item.tradeId}
                              className={`group transition-all hover:bg-slate-50/80 cursor-pointer ${
                                isSelected ? "bg-indigo-50/30" : ""
                              }`}
                              onClick={() => setSelectedSymbol(item.symbol)}
                            >
                              <td className="px-4 py-3.5">
                                <div className="flex flex-col text-left">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 text-sm font-mono tracking-tight group-hover:text-indigo-600 transition-colors">
                                      {item.symbol}
                                    </span>
                                    {item.isLive && (
                                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-sm bg-red-100 text-red-700 animate-pulse border border-red-200 uppercase font-mono">
                                        LIVE IN TRADE
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                                    ID: {item.tradeId}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 font-mono text-xs">
                                <div className="flex flex-col">
                                  <span className="text-gray-700 font-semibold">
                                    Date: {formatCompactDate(item.entryDate)}
                                  </span>
                                  <span className="text-[10px] text-gray-400 mt-0.5">
                                    RSI Gap: +{item.entryRsiGap?.toFixed(1) || "0.0"} | Quality: <span className="text-indigo-600 font-bold">{item.entryQuality}</span>
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono">
                                <div className="flex flex-col">
                                  <span className="text-xs text-gray-800">
                                    Entry: <strong className="text-gray-950 font-sans">₹{item.entryPrice.toFixed(2)}</strong>
                                  </span>
                                  <span className="text-[10px] mt-0.5 text-indigo-600 font-bold bg-indigo-50/50 px-1 py-0.5 rounded inline-block text-right">
                                    LTP: ₹{item.currentLtp.toFixed(2)}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono">
                                <div className="flex flex-col items-end">
                                  <span className={`text-sm font-bold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                                    {isPositive ? "▲ +" : "▼ "}{item.currentRoi.toFixed(2)}%
                                  </span>
                                  <span className="text-[9px] text-gray-400 mt-0.5">
                                    MFE Peak: <strong className="text-emerald-600">+{item.mfePeak?.toFixed(1) || "0"}%</strong>
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono text-[10px] hidden lg:table-cell">
                                <div className="flex flex-col text-right">
                                  <span className="text-slate-500">
                                    SL Barrier: <strong className="text-red-600">₹{item.stopLoss?.toFixed(1) || "N/A"}</strong>
                                  </span>
                                  <span className="text-[9px] text-slate-400 mt-0.5 font-sans">
                                    Action: <strong className="text-indigo-600">{item.suggestedAction || "HOLD"}</strong>
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setSelectedSymbol(item.symbol)}
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                    isSelected
                                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm font-sans"
                                      : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                  }`}
                                >
                                  Chart
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                ) : activeTab === "setup" ? (
                  // ================= TABLE 2: SETUP BOUNCE ALERTS =================
                  filteredNearSetups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center">
                      <BookOpen className="w-10 h-10 text-gray-300 mb-3" />
                      <h4 className="font-bold text-gray-700 text-sm">No setup opportunities loaded in this threshold</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm font-mono">Relax parameters or try syncing again.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-200/60 font-mono text-[10px] text-gray-400 font-semibold uppercase tracking-wider select-none">
                          <th className="px-4 py-3">Symbol / Company Name</th>
                          <th className="px-4 py-3 text-center">Trade State</th>
                          <th className="px-4 py-3 text-right">LTP Price</th>
                          <th className="px-4 py-3 text-right">RSI Gap / Trend</th>
                          <th className="px-4 py-3 text-center hidden md:table-cell">Setup Score</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredNearSetups.map((item) => {
                          const isSelected = selectedSymbol === item.symbol;
                          const isRising = item.dailyRsiTrend === "RISING";
                          return (
                            <tr
                              key={`setup-${item.symbol}`}
                              className={`group transition-all hover:bg-slate-50/80 cursor-pointer ${
                                isSelected ? "bg-indigo-50/30" : ""
                              }`}
                              onClick={() => setSelectedSymbol(item.symbol)}
                            >
                              <td className="px-4 py-3.5">
                                <div className="flex flex-col text-left">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 text-sm font-mono tracking-tight group-hover:text-indigo-600 transition-colors">
                                      {item.symbol}
                                    </span>
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase font-mono ${
                                      item.quality === "STRONG"
                                        ? "bg-emerald-105 text-emerald-800 border border-emerald-200"
                                        : "bg-slate-100 text-slate-700"
                                    }`}>
                                      {item.quality} QUALITY
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-gray-400 tracking-tight truncate max-w-[190px] mt-0.5">
                                    {item.name}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono ${
                                  item.tradeState === "SETUP"
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-purple-100 text-purple-800 border border-purple-200"
                                }`}>
                                  ● {item.tradeState}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono font-semibold">
                                <span className="text-indigo-600 font-bold bg-indigo-50/50 px-1.5 py-0.5 rounded inline-block text-right">
                                  ₹{item.ltp?.toFixed(2) || "0.00"}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono text-xs">
                                <div className="flex flex-col text-right">
                                  <span className="text-gray-800 font-semibold">
                                    Gap: {item.rsiGapFromSMA?.toFixed(2) || "0.0"} RSI
                                  </span>
                                  <span className={`text-[10px] items-center gap-0.5 mt-0.5 ${
                                    isRising ? "text-emerald-600" : "text-amber-600"
                                  }`}>
                                    {item.dailyRsiTrend || "FLAT"}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-center hidden md:table-cell font-mono">
                                <span className="text-xs font-bold leading-none py-0.5 px-2 bg-slate-100 text-slate-800 rounded">
                                  Score: {item.tradeStateScore || "0"}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setSelectedSymbol(item.symbol)}
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                    isSelected
                                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm font-sans"
                                      : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                  }`}
                                >
                                  Chart
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                ) : activeTab === "portfolio" ? (
                  // ================= TABLE 3: LIVE PORTFOLIO =================
                  filteredPortfolio.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center">
                      <BookOpen className="w-10 h-10 text-gray-300 mb-3" />
                      <h4 className="font-bold text-gray-700 text-sm">No portfolio items loaded at this moment</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm font-mono">Check if your Wix account signal database is synced.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-200/60 font-mono text-[10px] text-gray-400 font-semibold uppercase tracking-wider select-none">
                          <th className="px-4 py-3">Asset Quantity</th>
                          <th className="px-4 py-3 text-right">Average / LTP Prices</th>
                          <th className="px-4 py-3 text-right">Invested Value</th>
                          <th className="px-4 py-3 text-right">Net Return Pnl</th>
                          <th className="px-4 py-3 text-center hidden sm:table-cell">Algo Recommendation</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredPortfolio.map((item) => {
                          const isSelected = selectedSymbol === item.symbol;
                          const isPositive = item.pnl >= 0;
                          return (
                            <tr
                              key={`portfolio-${item.symbol}`}
                              className={`group transition-all hover:bg-slate-50/80 cursor-pointer ${
                                isSelected ? "bg-indigo-50/30" : ""
                              }`}
                              onClick={() => setSelectedSymbol(item.symbol)}
                            >
                              <td className="px-4 py-3.5">
                                <div className="flex flex-col text-left">
                                  <span className="font-bold text-slate-900 text-sm font-mono tracking-tight group-hover:text-indigo-600 transition-colors">
                                    {item.symbol}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                                    Holdings: {item.qty} Shares
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono">
                                <div className="flex flex-col text-right">
                                  <span className="text-xs text-gray-700">
                                    Buy: ₹{item.avgBuyPrice?.toFixed(1) || "0.0"}
                                  </span>
                                  <span className="text-[10px] text-indigo-650 font-bold mt-0.5">
                                    LTP: ₹{item.ltp?.toFixed(1) || "0.0"}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono font-semibold">
                                <div className="flex flex-col">
                                  <span className="text-gray-950 font-sans text-xs">
                                    ₹{item.investedValue?.toLocaleString("en-IN", { maximumFractionDigits: 1 }) || "0"}
                                  </span>
                                  <span className="text-[10px] text-slate-400 mt-0.5 font-light">
                                    Value: ₹{item.currentValue?.toLocaleString("en-IN", { maximumFractionDigits: 1 }) || "0"}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono">
                                <div className="flex flex-col items-end">
                                  <span className={`text-sm font-bold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                                    {isPositive ? "▲ +" : "▼ "}₹{Math.abs(item.pnl).toFixed(1)}
                                  </span>
                                  <span className={`text-[10.5px] font-bold ${isPositive ? "text-emerald-500" : "text-rose-500"} mt-0.5`}>
                                    ({isPositive ? "+" : ""}{item.currentRoi?.toFixed(2)}%)
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-center hidden sm:table-cell font-mono">
                                <div className="flex flex-col items-center">
                                  <span className={`inline-flex items-center gap-1 py-0.5 px-2 rounded font-bold uppercase text-[9px] ${
                                    item.signal?.recommendation === "HOLD_STRONG"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                      : "bg-slate-100 text-slate-800"
                                  }`}>
                                    {item.signal?.recommendation || "HOLD"}
                                  </span>
                                  <span className="text-[9px] text-gray-400 mt-0.5">
                                    State: {item.signal?.tradeState || "DORMANT"}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setSelectedSymbol(item.symbol)}
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                    isSelected
                                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm font-sans"
                                      : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                  }`}
                                >
                                  Chart
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                ) : (
                  // ================= TABLE 4: BACKTEST LOGS =================
                  filteredBacktests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center">
                      <BookOpen className="w-10 h-10 text-gray-300 mb-3" />
                      <h4 className="font-bold text-gray-700 text-sm">No historical log outputs matching results found</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm font-mono">Check if telemetry has updated correctly.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-200/60 font-mono text-[10px] text-gray-400 font-semibold uppercase tracking-wider select-none">
                          <th className="px-4 py-3">Symbol / Trade Reference</th>
                          <th className="px-4 py-3">Chronology (In / Out)</th>
                          <th className="px-4 py-3 text-right">Acquired / Selling Prices</th>
                          <th className="px-4 py-3 text-right">Terminal Exit Return</th>
                          <th className="px-4 py-3 text-center hidden md:table-cell">Trigger Trigger Reason</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredBacktests.map((item) => {
                          const isSelected = selectedSymbol === item.symbol;
                          const isWin = item.result === "WIN" || item.tradeReturnPct >= 0;
                          return (
                            <tr
                              key={item.tradeId}
                              className={`group transition-all hover:bg-slate-50/80 cursor-pointer ${
                                isSelected ? "bg-indigo-50/30" : ""
                              }`}
                              onClick={() => setSelectedSymbol(item.symbol)}
                            >
                              <td className="px-4 py-3.5">
                                <div className="flex flex-col text-left font-mono">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 text-sm tracking-tight group-hover:text-indigo-600 transition-colors">
                                      {item.symbol}
                                    </span>
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                                      isWin 
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        : "bg-rose-100 text-rose-800 border border-rose-200"
                                    }`}>
                                      {item.result || (isWin ? "WIN" : "LOSS")}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-gray-400">
                                    Ref: {item.tradeId}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 font-mono text-xs text-gray-600">
                                <div className="flex flex-col">
                                  <span>
                                    In: {formatCompactDate(item.entryDate)}
                                  </span>
                                  <span className="text-[10px] text-gray-400 mt-0.5">
                                    Out: {formatCompactDate(item.exitDate)}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono">
                                <div className="flex flex-col">
                                  <span className="text-xs text-gray-700">
                                    Buy: ₹{item.entryPrice.toFixed(2)}
                                  </span>
                                  <span className="text-[10px] text-slate-500 mt-0.5">
                                    Sold: ₹{item.exitPrice?.toFixed(2) || "N/A"}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono">
                                <div className="flex flex-col items-end">
                                  <span className={`text-xs font-bold ${isWin ? "text-emerald-600" : "text-rose-600"}`}>
                                    {isWin ? "▲ +" : "▼ "}{item.tradeReturnPct?.toFixed(2) || "0"}%
                                  </span>
                                  <span className="text-[9px] text-gray-400 mt-0.5 font-sans">
                                    Max MFE: +{item.maxFavorablePct?.toFixed(1) || "0.0"}%
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-center hidden md:table-cell font-mono select-none">
                                <span className="inline-block py-0.5 px-2 bg-slate-100 text-slate-700 rounded-sm text-[10px] uppercase font-bold">
                                  {item.exitReason?.replace(/_/g, " ")}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setSelectedSymbol(item.symbol)}
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                    isSelected
                                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm font-sans"
                                      : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                  }`}
                                >
                                  Chart
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ))}
              </div>
            </div>
          </div>

          {/* Right Column: Weekly Charting Stage (4 Columns) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="h-[520px]">
              <TradingViewWidget symbol={selectedSymbol} />
            </div>
          </div>
          
        </div>

        {/* Dynamic Decoupled Wix API Documentation Block */}
        <div className="bg-linear-to-r from-indigo-50 to-indigo-100/50 p-5 rounded-xl border border-indigo-100 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="font-semibold text-indigo-950 text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Unified Decoupled API Integration
            </h4>
            <p className="text-xs text-indigo-900/80 leading-relaxed max-w-3xl">
              This system is fully synchronized with your live Wix-administered ecosystem at: <code className="bg-white/70 px-1 py-0.5 rounded font-mono text-[11px]">/functions/terminalData</code>. The metrics, setups, open-trades, closed logs, and actual asset holdings are cleanly structured with absolute separation across all views.
            </p>
          </div>
          <a
            href="https://rahultiwari1295.wixstudio.com/angelportfolio/_functions/terminalData"
            target="_blank"
            referrerPolicy="no-referrer"
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-indigo-200/60 rounded-lg text-xs font-semibold text-indigo-800 inline-flex items-center gap-1.5 shadow-3xs cursor-pointer select-none"
          >
            Terminal JSON Resource
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </main>

      {/* Footer Disclaimer */}
      <footer className="bg-white border-t border-gray-200/80 py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-1 font-mono text-[10px] text-gray-400">
          <p>© 2026 AngelOne Unified Terminal Logic. All Rights Reserved.</p>
          <p>Managed via dynamic Wix Studio backend APIs and high-frequency Node gateways.</p>
        </div>
      </footer>

    </div>
  );
}
