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
  BellRing,
  Sun,
  Moon
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

  // Theme support
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark" || 
           (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  // Toggle theme class on body/html
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

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

  // Main data synchronizer — requests direct Wix Studio secure endpoint first, falls back to server proxies on CORS/network blockages
  const fetchTerminalData = async () => {
    setLoading(true);
    let result: any = null;
    let fallbackUsed = false;

    try {
      // Direct high-fidelity secure Wix fetch block as explicitly requested
      const directRes = await fetch("https://rahultiwari1295.wixstudio.com/angelapi/_functions/terminalData", {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });
      if (directRes.ok) {
        result = await directRes.json();
      } else {
        throw new Error(`Direct Wix fetch failed with status: ${directRes.status}`);
      }
    } catch (err: any) {
      console.warn("Direct path fetch encountered standard sandboxed iframe block or CORS rule. Triggering proxy fallback...", err.message);
      try {
        const proxyRes = await fetch("/api/terminal-data");
        result = await proxyRes.json();
        fallbackUsed = true;
      } catch (proxyErr: any) {
        console.error("handshake failure:", proxyErr);
        setDataSource("failed");
        setErrorInfo(proxyErr.message || "Endpoint unreachable across direct and proxy servers");
      }
    }

    if (result && result.success) {
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
      setDataSource(fallbackUsed ? "live" : "live");
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
    } else if (result) {
      setDataSource("failed");
      setErrorInfo(result.error || "Wix returned unsuccessful connection parameters");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTerminalData();
  }, []);

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

  // --- TAB COHORT INSIGHTS & UPPER CALCULATIONS CALCULATED DYNAMICALLY ---
  
  // Tab 1: Ongoing Trades Insights
  const profitableActiveCount = filteredOngoingTrades.filter(t => t.currentRoi > 0).length;
  const inDrawdownActiveCount = filteredOngoingTrades.filter(t => t.currentRoi < 0).length;
  const avgActiveRoi = filteredOngoingTrades.length > 0
    ? filteredOngoingTrades.reduce((sum, t) => sum + (t.currentRoi || 0), 0) / filteredOngoingTrades.length
    : 0;

  // Tab 2: Near Setup Insights
  const upcomingSetupCount = filteredNearSetups.filter(u => u.tradeState === "SETUP").length;
  const upcomingWatchingCount = filteredNearSetups.filter(u => u.tradeState === "WATCHING").length;
  const upcomingStrongCount = filteredNearSetups.filter(u => u.quality === "STRONG" || u.holdStrength === "STRONG").length;
  const upcomingAvgScore = filteredNearSetups.length > 0
    ? filteredNearSetups.reduce((sum, item) => sum + (item.tradeStateScore || 0), 0) / filteredNearSetups.length
    : 0;

  // Tab 3: Live Portfolio Asset Sheets
  const totalInvested = filteredPortfolio.reduce((sum, p) => sum + (p.investedValue || 0), 0);
  const totalCurrent = filteredPortfolio.reduce((sum, p) => sum + (p.currentValue || 0), 0);
  const totalPnlAmount = totalCurrent - totalInvested;
  const totalPnlPercentage = totalInvested > 0 ? (totalPnlAmount / totalInvested) * 100 : 0;
  const portfolioWinnerCount = filteredPortfolio.filter(p => p.pnl > 0).length;
  const portfolioLoserCount = filteredPortfolio.filter(p => p.pnl < 0).length;

  // Tab 4: Backtest Logs Insights
  const backtestCount = filteredBacktests.length;
  const backtestWinnerCount = filteredBacktests.filter(b => b.result === "WIN").length;
  const backtestLoserCount = filteredBacktests.filter(b => b.result === "LOSS").length;
  const backtestWinrate = backtestCount > 0 ? (backtestWinnerCount / backtestCount) * 100 : 0;
  const backtestAvgReturn = backtestCount > 0
    ? filteredBacktests.reduce((sum, b) => sum + (b.tradeReturnPct || 0), 0) / backtestCount
    : 0;

  // --- COMPUTE DYNAMIC DOCK-LEVEL STATS BASED ON SELECTIONS ---
  const calculateDynamicKPIOverview = () => {
    // If standard mode (no filters applied) we can confidently display base kpis response
    if (strengthFilter === "ALL" && !searchQuery) {
      return {
        ...kpis,
        setupCount: nearSetup.length,
        inTradeCount: ongoingTrades.length,
        totalSignals: kpis.totalSignals || (ongoingTrades.length + nearSetup.length + backtestLog.length),
        closedTrades: kpis.closedTrades || backtestLog.length,
        openTrades: kpis.openTrades || ongoingTrades.length
      };
    }

    // Dynamic Recalculations across filtered results
    const backtestWins = filteredBacktests.filter(b => b.result === "WIN").length;
    const computedWinRate = filteredBacktests.length > 0 
      ? (backtestWins / filteredBacktests.length) * 100 
      : (filteredOngoingTrades.length > 0 
          ? (filteredOngoingTrades.filter(t => t.currentRoi > 0).length / filteredOngoingTrades.length) * 100 
          : kpis.winRate);

    const strongLogs = filteredBacktests.filter(b => b.entryQuality === "STRONG" || b.strength === "STRONG");
    const strongWins = strongLogs.filter(b => b.result === "WIN").length;
    const computedWinRateStrong = strongLogs.length > 0 ? (strongWins / strongLogs.length) * 100 : kpis.winRateStrong;

    const computedAvgReturn = filteredBacktests.length > 0 
      ? (filteredBacktests.reduce((sum, b) => sum + (b.tradeReturnPct || 0), 0) / filteredBacktests.length)
      : (filteredOngoingTrades.length > 0
          ? (filteredOngoingTrades.reduce((sum, t) => sum + (t.currentRoi || 0), 0) / filteredOngoingTrades.length)
          : kpis.avgReturn);

    return {
      totalSignals: filteredOngoingTrades.length + filteredNearSetups.length + filteredBacktests.length,
      closedTrades: filteredBacktests.length,
      openTrades: filteredOngoingTrades.length,
      winRate: computedWinRate,
      winRateStrong: computedWinRateStrong,
      liveWinRate: computedWinRate,
      avgReturn: computedAvgReturn,
      avgReturnStrong: computedAvgReturn,
      expectancy: computedAvgReturn,
      setupCount: filteredNearSetups.length,
      watchingCount: filteredNearSetups.filter(s => s.tradeState === "WATCHING").length,
      inTradeCount: filteredOngoingTrades.length,
      bestTrade: kpis.bestTrade,
      worstTrade: kpis.worstTrade,
      exitReasonBreakdown: kpis.exitReasonBreakdown
    };
  };

  const dynamicKPIs = calculateDynamicKPIOverview();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* System Status Connectivity Ribbon — Sleek, ultra-compact on mobile */}
      <div className="bg-slate-900 dark:bg-slate-950 text-slate-300 px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs flex flex-row items-center justify-between gap-1.5 border-b border-slate-800 dark:border-slate-900 overflow-hidden select-none">
        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-mono tracking-wide truncate">
            API SYSTEM CONNECT: <span className="text-emerald-400 font-bold uppercase">{dataSource} Wix Signal Function</span>
          </span>
          {errorInfo && (
            <span className="text-red-400 text-[9px] truncate max-w-[100px] sm:max-w-md font-mono hidden sm:inline">
              ({errorInfo})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 font-mono text-[9px] sm:text-[11px] text-slate-400 shrink-0">
          <span className="hidden sm:inline">Server Time: 2026-06-20 IST</span>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <span className="text-slate-300 font-semibold font-mono uppercase bg-emerald-950/40 dark:bg-emerald-900/10 px-1 py-0.5 rounded border border-emerald-900/30">AngelOne Auto: ACTIVE</span>
        </div>
      </div>

      {/* Modern High-Fidelity Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200/80 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors duration-150">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-2 sm:py-3 md:py-0 md:h-16 gap-2">
            
            {/* Logo and App Title */}
            <div className="flex items-center justify-between md:justify-start gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-linear-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-none shrink-0">
                  <Activity className="w-4.5 h-4.5 sm:w-5 sm:h-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h1 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-slate-50 tracking-tight truncate leading-none">RahulTrading</h1>
                    <span className="text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/55 text-indigo-700 dark:text-indigo-400 border border-indigo-100/60 dark:border-indigo-900/40 font-mono uppercase shrink-0">V3.5 ENGINE</span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wide mt-0.5 hidden sm:block">Unified Algorithmic Trade Suite</p>
                </div>
              </div>

              {/* Dark mode switcher on phone layout */}
              <div className="flex items-center gap-2 md:hidden">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-xs"
                  title="Toggle Theme"
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Filter and Switch controls, optimized for mobile alignment */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Dynamic Action-Based Search Box */}
              <div className="relative flex-1 md:flex-initial">
                <Search className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8.5 pr-2.5 py-1.5 w-full md:w-52 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-slate-150 focus:outline-none focus:ring-2 focus:ring-indigo-550/20 focus:bg-white dark:focus:bg-slate-800/80 transition-all font-semibold"
                />
              </div>

              {/* Sync Button */}
              <button
                onClick={fetchTerminalData}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-xs font-bold text-indigo-750 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60 transition-all shadow-3xs cursor-pointer disabled:opacity-50 shrink-0 select-none"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{loading ? "Syncing..." : "Force Sync"}</span>
              </button>

              {/* Theme switcher on desktop */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="hidden md:flex items-center justify-center p-1.5 h-8.5 w-8.5 rounded-lg bg-slate-100 dark:bg-slate-850 text-gray-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer shadow-3xs border border-transparent dark:border-slate-800"
                title="Toggle Scheme Mode"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        
        {/* Metric Cards Grid Component with Dynamic selection figures */}
        <KPICards 
          kpis={dynamicKPIs} 
          activeCount={filteredOngoingTrades.length} 
          setupCount={filteredNearSetups.length} 
        />

        {/* Interactive Workspace Area: Tab Table Controls & TradingView Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          
          {/* Left Column: Wix Managed Tables (8 Columns) */}
          <div className="lg:col-span-8 flex flex-col gap-3 sm:gap-4">
            
            {/* Table Control Hub */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200/80 dark:border-slate-800/80 shadow-3xs overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-900/30">
                
                {/* Segmented controls / Navigation Tabs — horizontally scrollable or tight grip */}
                <div className="flex p-0.5 gap-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700 w-full xl:w-auto overflow-x-auto scrollbar-none select-none">
                  <button
                    onClick={() => setActiveTab("active")}
                    className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-md text-[11px] sm:text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer text-center whitespace-nowrap ${
                      activeTab === "active"
                        ? "bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-400 shadow-3xs"
                        : "text-gray-500 hover:text-gray-950 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white/40 dark:hover:bg-slate-700/30"
                    }`}
                  >
                    🚀 Active ({filteredOngoingTrades.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("setup")}
                    className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-md text-[11px] sm:text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer text-center whitespace-nowrap ${
                      activeTab === "setup"
                        ? "bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-400 shadow-3xs"
                        : "text-gray-500 hover:text-gray-950 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white/40 dark:hover:bg-slate-700/30"
                    }`}
                  >
                    👁️ Setup ({filteredNearSetups.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("portfolio")}
                    className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-md text-[11px] sm:text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer text-center whitespace-nowrap ${
                      activeTab === "portfolio"
                        ? "bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-400 shadow-3xs"
                        : "text-gray-500 hover:text-gray-950 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white/40 dark:hover:bg-slate-700/30"
                    }`}
                  >
                    🏆 Portfolio ({filteredPortfolio.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("backtest")}
                    className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-md text-[11px] sm:text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer text-center whitespace-nowrap ${
                      activeTab === "backtest"
                        ? "bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-400 shadow-3xs"
                        : "text-gray-500 hover:text-gray-950 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white/40 dark:hover:bg-slate-700/30"
                    }`}
                  >
                    📜 Backtests ({filteredBacktests.length})
                  </button>
                </div>

                {/* Sub Dropdown Strength Select Filters */}
                <div className="flex items-center gap-2 justify-between w-full xl:w-auto border-t border-gray-150 dark:border-slate-800 pt-2 xl:border-t-0 xl:pt-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase font-mono tracking-wider">Quality Threshold:</span>
                  <select
                    value={strengthFilter}
                    onChange={(e) => setStrengthFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs py-1 px-2.5 sm:py-1.5 select-none focus:outline-none focus:ring-2 focus:ring-indigo-550/25 shadow-3xs hover:border-gray-300 dark:hover:border-slate-700 font-bold text-gray-700 dark:text-slate-300 transition-colors"
                  >
                    <option value="ALL">All Strengths</option>
                    <option value="STRONG">🟢 Strong / High</option>
                    <option value="MEDIUM">🟡 Medium</option>
                    <option value="WEAK">⚪ Weak</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Tab Insights Panel */}
              <div className="px-3 py-2 sm:px-4 sm:py-3 bg-linear-to-r from-slate-50 to-indigo-50/10 dark:from-slate-900 dark:to-slate-900/30 border-b border-gray-100 dark:border-slate-800 flex flex-wrap gap-2 sm:gap-4 items-center justify-between text-[11px] sm:text-xs text-gray-600 dark:text-slate-400 font-mono">
                {activeTab === "active" && (
                  <>
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
                      <span className="font-bold text-indigo-950 dark:text-indigo-450">🚀 ACTIVE STREAMS:</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Gain: <strong className="text-emerald-700 dark:text-emerald-455 font-bold">{profitableActiveCount}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Loss: <strong className="text-rose-700 dark:text-rose-455 font-bold">{inDrawdownActiveCount}</strong>
                      </span>
                      <span className="text-slate-400">|</span>
                      <span>
                        Avg Float ROI: <strong className={avgActiveRoi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}>
                          {avgActiveRoi >= 0 ? "+" : ""}{avgActiveRoi.toFixed(2)}%
                        </strong>
                      </span>
                    </div>
                  </>
                )}

                {activeTab === "setup" && (
                  <>
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
                      <span className="font-bold text-indigo-950 dark:text-indigo-450">👁️ SETUP INTERCEPT:</span>
                      <span>
                        ALERT: <strong className="text-amber-800 dark:text-amber-450 font-bold">{upcomingSetupCount}</strong>
                      </span>
                      <span>
                        WATCH: <strong className="text-purple-800 dark:text-purple-400 font-bold">{upcomingWatchingCount}</strong>
                      </span>
                      <span className="text-slate-400">|</span>
                      <span>
                        Strong: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{upcomingStrongCount}</strong>
                      </span>
                    </div>
                  </>
                )}

                {activeTab === "portfolio" && (
                  <>
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 w-full justify-between">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <span className="font-bold text-emerald-950 dark:text-emerald-450">🏆 HOLDINGS:</span>
                        <span>
                          Invested: <strong className="text-slate-800 dark:text-slate-300 font-bold">₹{totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</strong>
                        </span>
                        <span>
                          Margin PnL: <strong className={`font-bold ${totalPnlAmount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                            {totalPnlAmount >= 0 ? "+" : ""}₹{totalPnlAmount.toLocaleString("en-IN", { maximumFractionDigits: 1 })} ({totalPnlAmount >= 0 ? "+" : ""}{totalPnlPercentage.toFixed(2)}%)
                          </strong>
                        </span>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 font-semibold text-[10px]">
                        <span className="text-emerald-750 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-150 dark:border-emerald-900/30">Win: {portfolioWinnerCount}</span>
                        <span className="text-rose-705 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded border border-rose-150 dark:border-rose-900/30">Loss: {portfolioLoserCount}</span>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "backtest" && (
                  <>
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
                      <span className="font-bold text-indigo-950 dark:text-indigo-450">📜 CLOSED SIGS:</span>
                      <span>
                        Exits: <strong className="text-slate-800 dark:text-slate-300 font-bold">{backtestCount}</strong>
                      </span>
                      <span>
                        Avg Return: <strong className={`font-bold ${backtestAvgReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                          {backtestAvgReturn >= 0 ? "+" : ""}{backtestAvgReturn.toFixed(2)}%
                        </strong>
                      </span>
                      <span className="text-slate-400">|</span>
                      <span>
                        W Rate: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{backtestWinrate.toFixed(1)}%</strong>
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Table Render Arena — Desktop standard Tables + Phone Card lists */}
              <div className="min-h-[440px]">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-28 gap-3 bg-white dark:bg-slate-900">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 dark:text-slate-500 text-xs font-mono select-none">Syncing Wix Core Data stream...</p>
                  </div>
                ) : (
                  <>
                    {/* ================= DESKTOP STYLED VIEWS (Hidden on Phone Viewports) ================= */}
                    <div className="hidden md:block">
                      {activeTab === "active" && (
                        filteredOngoingTrades.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-20 text-center">
                            <BookOpen className="w-10 h-10 text-gray-300 dark:text-slate-700 mb-3" />
                            <h4 className="font-bold text-gray-700 dark:text-slate-300 text-sm">No ongoing trades match filters</h4>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-sm font-mono">Relax parameters or try syncing again.</p>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-gray-200/60 dark:border-slate-800 font-mono text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider select-none">
                                <th className="px-4 py-3">Symbol / Base Info</th>
                                <th className="px-4 py-3">Entry Details</th>
                                <th className="px-4 py-3 text-right">Entry / LTP Prices</th>
                                <th className="px-4 py-3 text-right">Current ROI / Peak MFE</th>
                                <th className="px-4 py-3 text-right hidden lg:table-cell">Trigger Targets</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {filteredOngoingTrades.map((item) => {
                                const isSelected = selectedSymbol === item.symbol;
                                const isPositive = item.currentRoi >= 0;
                                return (
                                  <tr
                                    key={item.tradeId}
                                    className={`group transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/20 cursor-pointer ${
                                      isSelected ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""
                                    }`}
                                    onClick={() => setSelectedSymbol(item.symbol)}
                                  >
                                    <td className="px-4 py-3.5">
                                      <div className="flex flex-col text-left">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm font-mono tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {item.symbol}
                                          </span>
                                          {item.isLive && (
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-sm bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 animate-pulse border border-red-200 dark:border-red-900 uppercase font-mono">
                                              LIVE
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-gray-450 dark:text-slate-500 font-mono mt-0.5">
                                          ID: {item.tradeId}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 font-mono text-xs">
                                      <div className="flex flex-col">
                                        <span className="text-gray-700 dark:text-slate-300 font-semibold">
                                          Date: {formatCompactDate(item.entryDate)}
                                        </span>
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                                          RSI Gap: +{item.entryRsiGap?.toFixed(1) || "0.0"} | Quality: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{item.entryQuality}</span>
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono">
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-800 dark:text-slate-300">
                                          Entry: <strong className="text-gray-950 dark:text-slate-100 font-sans">₹{item.entryPrice.toFixed(2)}</strong>
                                        </span>
                                        <span className="text-[10px] mt-0.5 text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-950/20 px-1 py-0.5 rounded inline-block text-right">
                                          LTP: ₹{item.currentLtp.toFixed(2)}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono">
                                      <div className="flex flex-col items-end">
                                        <span className={`text-sm font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                                          {isPositive ? "▲ +" : "▼ "}{item.currentRoi.toFixed(2)}%
                                        </span>
                                        <span className="text-[9px] text-gray-400 mt-0.5">
                                          MFE Peak: <strong className="text-emerald-600 dark:text-emerald-450">+{item.mfePeak?.toFixed(1) || "0"}%</strong>
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono text-[10px] hidden lg:table-cell">
                                      <div className="flex flex-col text-right">
                                        <span className="text-slate-550 dark:text-slate-400">
                                          SL Barrier: <strong className="text-red-600 dark:text-red-400">₹{item.stopLoss?.toFixed(1) || "N/A"}</strong>
                                        </span>
                                        <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-sans">
                                          Action: <strong className="text-indigo-600 dark:text-indigo-400">{item.suggestedAction || "HOLD"}</strong>
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => setSelectedSymbol(item.symbol)}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                          isSelected
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                            : "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
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
                      )}

                      {activeTab === "setup" && (
                        filteredNearSetups.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-20 text-center">
                            <BookOpen className="w-10 h-10 text-gray-300 dark:text-slate-700 mb-3" />
                            <h4 className="font-bold text-gray-700 dark:text-slate-300 text-sm">No setup opportunities loaded</h4>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-sm font-mono">Parameters are solid.</p>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-gray-200/60 dark:border-slate-800 font-mono text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider select-none">
                                <th className="px-4 py-3">Symbol / Company Name</th>
                                <th className="px-4 py-3 text-center">Trade State</th>
                                <th className="px-4 py-3 text-right">LTP Price</th>
                                <th className="px-4 py-3 text-right">RSI Gap / Trend</th>
                                <th className="px-4 py-3 text-center hidden md:table-cell">Setup Score</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {filteredNearSetups.map((item) => {
                                const isSelected = selectedSymbol === item.symbol;
                                const isRising = item.dailyRsiTrend === "RISING";
                                return (
                                  <tr
                                    key={`setup-${item.symbol}`}
                                    className={`group transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/20 cursor-pointer ${
                                      isSelected ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""
                                    }`}
                                    onClick={() => setSelectedSymbol(item.symbol)}
                                  >
                                    <td className="px-4 py-3.5">
                                      <div className="flex flex-col text-left">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm font-mono tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {item.symbol}
                                          </span>
                                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase font-mono ${
                                            item.quality === "STRONG"
                                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                                              : "bg-slate-100 dark:bg-slate-800 text-slate-705 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/60"
                                          }`}>
                                            {item.quality} QUALITY
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 tracking-tight truncate max-w-[190px] mt-0.5">
                                          {item.name}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-center">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono ${
                                        item.tradeState === "SETUP"
                                          ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-250 dark:border-amber-900"
                                          : "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-400 border border-purple-250 dark:border-purple-900"
                                      }`}>
                                        ● {item.tradeState}
                                      </span>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono font-semibold">
                                      <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-900/10 px-1.5 py-0.5 rounded inline-block text-right">
                                        ₹{item.ltp?.toFixed(2) || "0.00"}
                                      </span>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono text-xs">
                                      <div className="flex flex-col text-right">
                                        <span className="text-gray-800 dark:text-slate-200 font-semibold">
                                          Gap: {item.rsiGapFromSMA?.toFixed(2) || "0.0"} RSI
                                        </span>
                                        <span className={`text-[10px] items-center gap-0.5 mt-0.5 ${
                                          isRising ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-450"
                                        }`}>
                                          {item.dailyRsiTrend || "FLAT"}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-center hidden md:table-cell font-mono">
                                      <span className="text-xs font-bold leading-none py-0.5 px-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded">
                                        Score: {item.tradeStateScore || "0"}
                                      </span>
                                    </td>

                                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => setSelectedSymbol(item.symbol)}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                          isSelected
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                            : "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
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
                      )}

                      {activeTab === "portfolio" && (
                        filteredPortfolio.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-20 text-center">
                            <BookOpen className="w-10 h-10 text-gray-300 dark:text-slate-700 mb-3" />
                            <h4 className="font-bold text-gray-700 dark:text-slate-300 text-sm">No portfolio items loaded</h4>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-sm font-mono">Sync your account signal database.</p>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-gray-200/60 dark:border-slate-800 font-mono text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider select-none">
                                <th className="px-4 py-3">Asset Quantity</th>
                                <th className="px-4 py-3 text-right">Average / LTP Prices</th>
                                <th className="px-4 py-3 text-right">Invested Value</th>
                                <th className="px-4 py-3 text-right">Net Return Pnl</th>
                                <th className="px-4 py-3 text-center hidden sm:table-cell">Algo Recommendation</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {filteredPortfolio.map((item) => {
                                const isSelected = selectedSymbol === item.symbol;
                                const isPositive = item.pnl >= 0;
                                return (
                                  <tr
                                    key={`portfolio-${item.symbol}`}
                                    className={`group transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/20 cursor-pointer ${
                                      isSelected ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""
                                    }`}
                                    onClick={() => setSelectedSymbol(item.symbol)}
                                  >
                                    <td className="px-4 py-3.5">
                                      <div className="flex flex-col text-left">
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm font-mono tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                          {item.symbol}
                                        </span>
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-0.5">
                                          Holdings: {item.qty} Shares
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono">
                                      <div className="flex flex-col text-right">
                                        <span className="text-xs text-gray-700 dark:text-slate-300">
                                          Buy: ₹{item.avgBuyPrice?.toFixed(1) || "0.0"}
                                        </span>
                                        <span className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold mt-0.5">
                                          LTP: ₹{item.ltp?.toFixed(1) || "0.0"}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono font-semibold">
                                      <div className="flex flex-col">
                                        <span className="text-gray-950 dark:text-slate-200 font-sans text-xs">
                                          ₹{item.investedValue?.toLocaleString("en-IN", { maximumFractionDigits: 1 }) || "0"}
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5 font-light">
                                          Value: ₹{item.currentValue?.toLocaleString("en-IN", { maximumFractionDigits: 1 }) || "0"}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono">
                                      <div className="flex flex-col items-end">
                                        <span className={`text-sm font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
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
                                            ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700"
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
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                            : "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
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
                      )}

                      {activeTab === "backtest" && (
                        filteredBacktests.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-20 text-center">
                            <BookOpen className="w-10 h-10 text-gray-300 dark:text-slate-700 mb-3" />
                            <h4 className="font-bold text-gray-700 dark:text-slate-300 text-sm">No historical logs found</h4>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-gray-200/60 dark:border-slate-800 font-mono text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider select-none">
                                <th className="px-4 py-3">Symbol / Trade Reference</th>
                                <th className="px-4 py-3">Chronology (In / Out)</th>
                                <th className="px-4 py-3 text-right">Acquired / Selling Prices</th>
                                <th className="px-4 py-3 text-right">Terminal Exit Return</th>
                                <th className="px-4 py-3 text-center hidden md:table-cell">Trigger Reason</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {filteredBacktests.map((item) => {
                                const isSelected = selectedSymbol === item.symbol;
                                const isWin = item.result === "WIN" || item.tradeReturnPct >= 0;
                                return (
                                  <tr
                                    key={item.tradeId}
                                    className={`group transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/20 cursor-pointer ${
                                      isSelected ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""
                                    }`}
                                    onClick={() => setSelectedSymbol(item.symbol)}
                                  >
                                    <td className="px-4 py-3.5">
                                      <div className="flex flex-col text-left font-mono">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {item.symbol}
                                          </span>
                                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                                            isWin 
                                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                                              : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-450 border border-rose-200 dark:border-rose-900"
                                          }`}>
                                            {item.result || (isWin ? "WIN" : "LOSS")}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500">
                                          Ref: {item.tradeId}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 font-mono text-xs text-gray-550 dark:text-slate-350">
                                      <div className="flex flex-col">
                                        <span>
                                          In: {formatCompactDate(item.entryDate)}
                                        </span>
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                                          Out: {formatCompactDate(item.exitDate)}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono">
                                      <div className="flex flex-col">
                                        <span className="text-xs text-gray-705 dark:text-slate-300">
                                          Buy: ₹{item.entryPrice.toFixed(2)}
                                        </span>
                                        <span className="text-[10px] text-slate-450 mt-0.5">
                                          Sold: ₹{item.exitPrice?.toFixed(2) || "N/A"}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono">
                                      <div className="flex flex-col items-end">
                                        <span className={`text-xs font-bold ${isWin ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                                          {isWin ? "▲ +" : "▼ "}{item.tradeReturnPct?.toFixed(2) || "0"}%
                                        </span>
                                        <span className="text-[9px] text-gray-400 dark:text-slate-500 mt-0.5 font-sans">
                                          Max MFE: +{item.maxFavorablePct?.toFixed(1) || "0.0"}%
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-center hidden md:table-cell font-mono select-none">
                                      <span className="inline-block py-0.5 px-2 bg-slate-150 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-sm text-[10px] uppercase font-bold">
                                        {item.exitReason?.replace(/_/g, " ")}
                                      </span>
                                    </td>

                                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => setSelectedSymbol(item.symbol)}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                          isSelected
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                            : "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
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
                      )}
                    </div>

                    {/* ================= DYNAMIC MOBILE CARDS VIEW (Optimized strictly for Phone displays) ================= */}
                    <div className="block md:hidden divide-y divide-gray-100 dark:divide-slate-800 border-t dark:border-slate-800 select-none">
                      
                      {activeTab === "active" && (
                        filteredOngoingTrades.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900">
                            <BookOpen className="w-8 h-8 text-gray-300 dark:text-slate-700 mb-2" />
                            <p className="text-xs text-gray-450 font-mono">No active trades match descriptors</p>
                          </div>
                        ) : (
                          filteredOngoingTrades.map((item) => {
                            const isSelected = selectedSymbol === item.symbol;
                            const isPositive = item.currentRoi >= 0;
                            return (
                              <div
                                key={item.tradeId}
                                onClick={() => setSelectedSymbol(item.symbol)}
                                className={`p-3.5 flex flex-col gap-2 cursor-pointer transition-colors ${
                                  isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "bg-white dark:bg-slate-900"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-950 dark:text-slate-50 text-sm font-mono">
                                      {item.symbol}
                                    </span>
                                    {item.isLive && (
                                      <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-sm bg-red-100 dark:bg-red-955 text-red-700 dark:text-red-400 animate-pulse uppercase font-mono border border-red-200 dark:border-red-900/60">
                                        LIVE
                                      </span>
                                    )}
                                  </div>
                                  <span className={`text-base font-bold font-mono ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                                    {isPositive ? "▲ +" : "▼ "}{item.currentRoi.toFixed(2)}%
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-y-1.5 text-xs font-mono text-gray-500 dark:text-slate-400">
                                  <div>
                                    Buy: <strong className="text-gray-900 dark:text-slate-200 font-sans">₹{item.entryPrice.toFixed(2)}</strong>
                                  </div>
                                  <div className="text-right">
                                    LTP: <strong className="text-indigo-650 dark:text-indigo-400 font-sans">₹{item.currentLtp.toFixed(2)}</strong>
                                  </div>
                                  <div>
                                    SL: <strong className="text-rose-600 dark:text-rose-400 font-sans">₹{item.stopLoss?.toFixed(1) || "N/A"}</strong>
                                  </div>
                                  <div className="text-right">
                                    Quality: <strong className="text-indigo-600 dark:text-indigo-300">{item.entryQuality}</strong>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-dashed border-gray-150 dark:border-slate-800">
                                  <span className="text-[10px] text-gray-400 dark:text-slate-550 font-mono">ID: {item.tradeId} • Gap: +{item.entryRsiGap?.toFixed(1)}</span>
                                  <button className="text-[10.5px] font-bold text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-0.5">
                                    Weekly Chart &rarr;
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )
                      )}

                      {activeTab === "setup" && (
                        filteredNearSetups.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900">
                            <BookOpen className="w-8 h-8 text-gray-300 dark:text-slate-700 mb-2" />
                            <p className="text-xs text-gray-450 font-mono">No bounces identified</p>
                          </div>
                        ) : (
                          filteredNearSetups.map((item) => {
                            const isSelected = selectedSymbol === item.symbol;
                            const isRising = item.dailyRsiTrend === "RISING";
                            return (
                              <div
                                key={`setup-mob-${item.symbol}`}
                                onClick={() => setSelectedSymbol(item.symbol)}
                                className={`p-3.5 flex flex-col gap-2 cursor-pointer transition-colors ${
                                  isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "bg-white dark:bg-slate-900"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-950 dark:text-slate-50 text-sm font-mono">
                                    {item.symbol}
                                  </span>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider font-mono ${
                                    item.tradeState === "SETUP"
                                      ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-250 dark:border-amber-900"
                                      : "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-400 border border-purple-250 dark:border-purple-900"
                                  }`}>
                                    ● {item.tradeState}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight font-medium truncate max-w-xs">
                                  {item.name}
                                </p>
                                
                                <div className="grid grid-cols-2 gap-y-1 text-xs font-mono text-gray-500 dark:text-slate-400">
                                  <div>
                                    LTP: <strong className="text-slate-900 dark:text-slate-200 font-sans">₹{item.ltp?.toFixed(2) || "0.00"}</strong>
                                  </div>
                                  <div className="text-right">
                                    RSI Gap: <strong className="text-slate-950 dark:text-slate-150">{item.rsiGapFromSMA?.toFixed(2) || "0.0"}</strong>
                                  </div>
                                  <div>
                                    Quality: <span className="font-bold text-emerald-600 dark:text-emerald-450">{item.quality}</span>
                                  </div>
                                  <div className="text-right">
                                    Score: <strong className="text-indigo-600 dark:text-indigo-400 font-sans">{item.tradeStateScore || "0"}</strong>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )
                      )}

                      {activeTab === "portfolio" && (
                        filteredPortfolio.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900">
                            <BookOpen className="w-8 h-8 text-gray-300 dark:text-slate-700 mb-2" />
                            <p className="text-xs text-gray-450 font-mono">No portfolio items loaded</p>
                          </div>
                        ) : (
                          filteredPortfolio.map((item) => {
                            const isSelected = selectedSymbol === item.symbol;
                            const isPositive = item.pnl >= 0;
                            return (
                              <div
                                key={`portfolio-mob-${item.symbol}`}
                                onClick={() => setSelectedSymbol(item.symbol)}
                                className={`p-3.5 flex flex-col gap-2 cursor-pointer transition-colors ${
                                  isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "bg-white dark:bg-slate-900"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-bold text-slate-950 dark:text-slate-50 text-sm font-mono">
                                      {item.symbol}
                                    </span>
                                    <p className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">Shares: {item.qty}</p>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-sm font-bold block ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                                      {isPositive ? "▲ +" : "▼ "}₹{Math.abs(item.pnl).toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                                    </span>
                                    <span className={`text-[11px] font-bold ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                                      ({isPositive ? "+" : ""}{item.currentRoi?.toFixed(2)}%)
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-y-1 text-xs font-mono text-gray-500 dark:text-slate-400 pt-1.5 border-t border-dashed border-gray-150 dark:border-slate-800">
                                  <div>
                                    Cost Avg: <strong className="text-slate-950 dark:text-slate-100 font-sans">₹{item.avgBuyPrice?.toFixed(1)}</strong>
                                  </div>
                                  <div className="text-right">
                                    LTP: <strong className="text-indigo-650 dark:text-indigo-400 font-sans">₹{item.ltp?.toFixed(1)}</strong>
                                  </div>
                                  <div>
                                    Invested: <strong className="text-slate-900 dark:text-slate-300">₹{item.investedValue?.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</strong>
                                  </div>
                                  <div className="text-right">
                                    Action: <span className="text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[10px]">{item.signal?.recommendation || "HOLD"}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )
                      )}

                      {activeTab === "backtest" && (
                        filteredBacktests.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900">
                            <BookOpen className="w-8 h-8 text-gray-300 dark:text-slate-700 mb-2" />
                            <p className="text-xs text-gray-450 font-mono">No simulation loops found</p>
                          </div>
                        ) : (
                          filteredBacktests.map((item) => {
                            const isSelected = selectedSymbol === item.symbol;
                            const isWin = item.result === "WIN" || item.tradeReturnPct >= 0;
                            return (
                              <div
                                key={`back-mob-${item.tradeId}`}
                                onClick={() => setSelectedSymbol(item.symbol)}
                                className={`p-3.5 flex flex-col gap-2 cursor-pointer transition-colors ${
                                  isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "bg-white dark:bg-slate-900"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-950 dark:text-slate-50 text-sm font-mono">
                                      {item.symbol}
                                    </span>
                                    <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-sm uppercase ${
                                      isWin 
                                        ? "bg-emerald-100 dark:bg-emerald-955 text-emerald-800 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900"
                                        : "bg-rose-100 dark:bg-rose-955 text-rose-800 dark:text-rose-400 border border-rose-250 dark:border-rose-900"
                                    }`}>
                                      {item.result || (isWin ? "WIN" : "LOSS")}
                                    </span>
                                  </div>
                                  <span className={`text-sm font-bold font-mono ${isWin ? "text-emerald-600" : "text-rose-550"}`}>
                                    {isWin ? "▲ +" : "▼ "}{item.tradeReturnPct?.toFixed(2)}%
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-y-1.5 text-xs font-mono text-gray-500 dark:text-slate-400">
                                  <div>
                                    Buy: <strong className="text-slate-900 dark:text-slate-200 font-sans">₹{item.entryPrice.toFixed(2)}</strong>
                                  </div>
                                  <div className="text-right">
                                    Sold: <strong className="text-slate-905 dark:text-slate-200 font-sans">₹{item.exitPrice?.toFixed(2) || "N/A"}</strong>
                                  </div>
                                  <div>
                                    In: <span className="text-slate-700 dark:text-slate-350">{formatCompactDate(item.entryDate)}</span>
                                  </div>
                                  <div className="text-right">
                                    Out: <span className="text-slate-700 dark:text-slate-350">{formatCompactDate(item.exitDate)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )
                      )}

                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Weekly Charting Stage (4 Columns) */}
          <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6">
            <div className="h-[360px] sm:h-[520px]">
              <TradingViewWidget symbol={selectedSymbol} theme={darkMode ? "dark" : "light"} />
            </div>
          </div>
          
        </div>

        {/* Dynamic Decoupled Wix API Documentation Block */}
        <div className="bg-linear-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/10 p-4 sm:p-5 rounded-xl border border-indigo-100 dark:border-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 transition-colors duration-155">
          <div className="space-y-1">
            <h4 className="font-semibold text-indigo-950 dark:text-indigo-300 text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse" />
              Unified Decoupled API Integration
            </h4>
            <p className="text-xs text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed max-w-3xl">
              This system is fully synchronized with your live Wix-administered ecosystem at: <code className="bg-white/70 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px] dark:text-slate-200">_functions/terminalData</code>. The metrics, setups, open-trades, closed logs, and actual asset holdings are cleanly structured with absolute separation across all views.
            </p>
          </div>
          <a
            href="https://rahultiwari1295.wixstudio.com/angelportfolio/_functions/terminalData"
            target="_blank"
            referrerPolicy="no-referrer"
            className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-indigo-200/60 dark:border-indigo-900/40 rounded-lg text-xs font-semibold text-indigo-805 dark:text-indigo-400 inline-flex items-center gap-1.5 shadow-3xs cursor-pointer select-none"
          >
            Terminal JSON Resource
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </main>

      {/* Footer Disclaimer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-gray-200/80 dark:border-slate-800 p-4 mt-auto transition-colors duration-155">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-1 font-mono text-[10px] text-gray-400 dark:text-slate-500">
          <p>© 2026 AngelOne Unified Terminal Logic. All Rights Reserved.</p>
          <p>Managed via dynamic Wix Studio backend APIs and high-frequency Node gateways.</p>
        </div>
      </footer>

    </div>
  );
}
