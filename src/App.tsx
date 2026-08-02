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
  Sun, 
  Moon,
  Cpu,
  TrendingDown,
  Info
} from "lucide-react";
import { 
  TerminalKPIs, 
  ToBuySignal, 
  InTradeTrade, 
  ClosedTrade,
  ManualPortfolioTrade
} from "./types";
import KPICards from "./components/KPICards";
import ConvictionBadge from "./components/ConvictionBadge";
import StrategyLeaderboard from "./components/StrategyLeaderboard";
import TradingViewWidget from "./components/TradingViewWidget";

const getStrategyAbbreviation = (name?: string) => {
  if (!name) return "UNK";
  if (name === "Capitulation Reversal") return "CR";
  if (name === "Trend Continuation") return "TC";
  if (name === "52-Week High Momentum") return "52W";
  return name;
};

export default function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [dataSource, setDataSource] = useState<"live" | "failed">("failed");
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  // Core Wix API state containers
  const [totalSummary, setTotalSummary] = useState<any>(null);
  const [strategySummary, setStrategySummary] = useState<any[]>([]);
  const [kpis, setKpis] = useState<TerminalKPIs>({
    totalSignals: 0,
    toBuy: 0,
    inTrade: 0,
    closedTradeCount: 0,
    stocksProcessed: 0
  });

  const [toBuySignals, setToBuySignals] = useState<ToBuySignal[]>([]);
  const [inTradeTrades, setInTradeTrades] = useState<InTradeTrade[]>([]);
  const [portfolio, setPortfolio] = useState<InTradeTrade[]>([]);
  const [manualPortfolio, setManualPortfolio] = useState<ManualPortfolioTrade[]>([]);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);

  // UI States for manual portfolio
  const [buyPopupSymbol, setBuyPopupSymbol] = useState<{symbol: string, currentPrice: number} | null>(null);
  const [buyPopupPrice, setBuyPopupPrice] = useState<number | "">("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
  const [activeTradesSort, setActiveTradesSort] = useState<"latest_date" | "oldest_date" | "return_high" | "return_low" | "strategy">("latest_date");
  const [closedTradesSort, setClosedTradesSort] = useState<"in_latest" | "in_oldest" | "out_latest" | "out_oldest" | "return_high" | "return_low">("out_latest");

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

  // Helper to map exit reasons beautifully
  const getExitReasonLabel = (reason: string | null) => {
    if (!reason) return "N/A";
    switch (reason.toUpperCase()) {
      case "MFE_TRAIL_L1":
        return "🎯 Trail Stop";
      case "SMART_EARLY_STOP":
        return "🛡 Early Stop";
      case "STOP_LOSS":
        return "❌ Stop Loss";
      case "TARGET_HIT":
        return "✅ Target Hit";
      case "TIME_EXIT":
        return "⏱ Time Exit";
      default:
        return reason;
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBuySubmit = async () => {
    if (!buyPopupSymbol || buyPopupPrice === "") return;
    
    try {
      const res = await fetch("https://rahultiwari1295.wixstudio.com/angelapi/_functions/addManualPortfolioTrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: buyPopupSymbol.symbol, buyPrice: Number(buyPopupPrice) })
      });
      if (res.ok) {
        showToast(`${buyPopupSymbol.symbol} added to Portfolio`);
        setBuyPopupSymbol(null);
        fetchTerminalData();
      } else {
        showToast("Error adding to portfolio.");
      }
    } catch (e) {
      showToast("Network error.");
    }
  };

  const handleSellConfirm = async (symbol: string) => {
    if (!window.confirm(`Are you sure you want to sell ${symbol}?`)) return;

    try {
      const res = await fetch("https://rahultiwari1295.wixstudio.com/angelapi/_functions/removePortfolioTrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol })
      });
      if (res.ok) {
        showToast(`${symbol} removed from Portfolio`);
        setManualPortfolio(prev => prev.filter(p => p.symbol !== symbol));
      } else {
        showToast("Error removing from portfolio.");
      }
    } catch (e) {
      showToast("Network error.");
    }
  };

  // Main data synchronizer — requests direct Wix Studio secure endpoint first, falls back to server proxies on CORS/network blockages
  const fetchTerminalData = async () => {
    setLoading(true);
    let result: any = null;
    let fallbackUsed = false;

    try {
      // Direct high-fidelity secure Wix fetch block
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
      console.warn("Direct path fetch encountered sandboxed iframe block or CORS rule. Triggering proxy fallback...", err.message);
      try {
        const proxyRes = await fetch("/api/terminal-data");
        result = await proxyRes.json();
        fallbackUsed = true;
      } catch (proxyErr: any) {
        console.error("Handshake failure:", proxyErr);
        setDataSource("failed");
        setErrorInfo(proxyErr.message || "Endpoint unreachable across direct and proxy servers");
      }
    }

    const isSuccess = result && (result.success === true || !!result.generatedAt || !!result.totalSummary);

    if (isSuccess) {
      setTotalSummary(result.totalSummary || null);
      setStrategySummary(result.strategySummary || []);
      setKpis(result.kpis || {
        totalSignals: 0,
        toBuy: 0,
        inTrade: 0,
        closedTradeCount: 0,
        stocksProcessed: 0
      });

      const toBuyData = result.toBuySignals || [];
      const inTradeData = result.inTradeTrades || [];
      const portfolioData = result.portfolio || [];
      const manualPortfolioData = result.manualPortfolio || [];
      const closedData = result.closedTrades || [];

      setToBuySignals(toBuyData);
      setInTradeTrades(inTradeData);
      setPortfolio(portfolioData);
      setManualPortfolio(manualPortfolioData);
      setClosedTrades(closedData);

      setGeneratedAt(result.generatedAt || null);
      setDataSource(fallbackUsed ? "live" : "live"); // both indicate data is live
      setErrorInfo(null);

      // Pre-select first appropriate stock symbol on chart stage
      if (inTradeData.length > 0) {
        setSelectedSymbol(inTradeData[0].symbol);
      } else if (toBuyData.length > 0) {
        setSelectedSymbol(toBuyData[0].symbol);
      } else if (portfolioData.length > 0) {
        setSelectedSymbol(portfolioData[0].symbol);
      } else if (closedData.length > 0) {
        setSelectedSymbol(closedData[0].symbol);
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

  // 1. Ongoing/Active Trades Filters (inTradeTrades)
  const filteredActiveTrades = inTradeTrades.filter(t => {
    return t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (t.sector && t.sector.toLowerCase().includes(searchQuery.toLowerCase()));
  }).sort((a, b) => {
    switch (activeTradesSort) {
      case "latest_date":
        return new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime();
      case "oldest_date":
        return new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
      case "return_high":
        return (b.currentROI || 0) - (a.currentROI || 0);
      case "return_low":
        return (a.currentROI || 0) - (b.currentROI || 0);
      case "strategy":
        return (a.strategyName || "").localeCompare(b.strategyName || "");
      default:
        return 0;
    }
  });

  // 2. Setup/toBuySignals Filters
  const filteredSetups = toBuySignals.filter(s => {
    return s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (s.sector && s.sector.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // 3. Portfolio Filters
  const filteredPortfolio = manualPortfolio.filter(p => {
    return p.symbol.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // 4. Closed Trades Filters (closedTrades)
  const filteredClosedTrades = closedTrades.filter(b => {
    return b.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (b.exitReason && b.exitReason.toLowerCase().includes(searchQuery.toLowerCase()));
  }).sort((a, b) => {
    switch (closedTradesSort) {
      case "in_latest":
        return new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime();
      case "in_oldest":
        return new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
      case "out_latest":
        return new Date(b.exitDate).getTime() - new Date(a.exitDate).getTime();
      case "out_oldest":
        return new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime();
      case "return_high":
        return (b.returnPct || 0) - (a.returnPct || 0);
      case "return_low":
        return (a.returnPct || 0) - (b.returnPct || 0);
      default:
        return 0;
    }
  });


  // --- COMPUTE DYNAMIC DOCK-LEVEL STATS BASED ON VISIBLE / FILTERED RECORDS ---
  
  // Tactical Win Rate: filteredClosedTrades count of WIN / total filtered closed trades
  const totalClosed = filteredClosedTrades.length;
  const winsCount = filteredClosedTrades.filter(t => t.pnlLabel === "WIN").length;
  const dynamicWinRate = totalClosed > 0 ? (winsCount / totalClosed) * 100 : 0;

  // Strong WR: win rate only for filtered closed trades where mlGrade is A+ or A
  const strongClosedTrades = filteredClosedTrades.filter(t => t.mlGrade === "A+" || t.mlGrade === "A");
  const strongWinsCount = strongClosedTrades.filter(t => t.pnlLabel === "WIN").length;
  const dynamicWinRateStrong = strongClosedTrades.length > 0 ? (strongWinsCount / strongClosedTrades.length) * 100 : 0;

  // Average Return: mean of returnPct from filtered closed trades
  const dynamicAvgReturn = totalClosed > 0 
    ? filteredClosedTrades.reduce((sum, t) => sum + (t.returnPct || 0), 0) / totalClosed 
    : 0;

  // Active Open Count & Closed Count
  const dynamicOpenCount = filteredActiveTrades.length;
  const dynamicClosedCount = totalSummary?.totalTrades || 0; // Use true historical count

  // Setup toBuyCount
  const dynamicToBuyCount = filteredSetups.length;


  // --- TAB COHORT INSIGHTS ---
  
  // Active Tab Insights
  const profitableActiveCount = filteredActiveTrades.filter(t => t.currentROI > 0).length;
  const inDrawdownActiveCount = filteredActiveTrades.filter(t => t.currentROI < 0).length;
  const avgActiveRoi = filteredActiveTrades.length > 0
    ? filteredActiveTrades.reduce((sum, t) => sum + (t.currentROI || 0), 0) / filteredActiveTrades.length
    : 0;

  // Setup Tab Insights
  const upcomingStrongCount = filteredSetups.filter(u => u.mlGrade === "A+" || u.mlGrade === "A").length;
  const upcomingAvgScore = filteredSetups.length > 0
    ? filteredSetups.reduce((sum, item) => sum + (item.rankScore || 0), 0) / filteredSetups.length
    : 0;

  // Helper for manual portfolio ROI
  const getManualPortfolioCurrentData = (symbol: string, buyPrice: number) => {
    const liveTrade = inTradeTrades.find(t => t.symbol === symbol) || portfolio.find(p => p.symbol === symbol) || toBuySignals.find(s => s.symbol === symbol);
    const currentPrice = liveTrade?.currentPrice || liveTrade?.price || null;
    const currentROI = currentPrice ? ((currentPrice - buyPrice) / buyPrice) * 100 : 0;
    return { currentPrice, currentROI };
  };

  // Portfolio Tab Insights
  const portfolioWithROI = filteredPortfolio.map(p => {
    const { currentPrice, currentROI } = getManualPortfolioCurrentData(p.symbol, p.buyPrice);
    return { ...p, currentPrice, currentROI };
  });

  const avgPortfolioRoi = portfolioWithROI.length > 0
    ? portfolioWithROI.reduce((sum, t) => sum + t.currentROI, 0) / portfolioWithROI.length
    : 0;
  const portfolioWinnerCount = portfolioWithROI.filter(p => p.currentROI > 0).length;
  const portfolioLoserCount = portfolioWithROI.filter(p => p.currentROI < 0).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* System Status Connectivity Ribbon */}
      <div className="bg-slate-900 dark:bg-slate-950 text-slate-300 px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs flex flex-row items-center justify-between gap-1.5 border-b border-slate-800 dark:border-slate-900 overflow-hidden select-none">
        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-mono tracking-wide truncate">
            API CORE CONNECT: <span className="text-emerald-400 font-bold uppercase">{dataSource} Wix Signal Gateway</span>
          </span>
          {errorInfo && (
            <span className="text-red-400 text-[9px] truncate max-w-[100px] sm:max-w-md font-mono hidden sm:inline">
              ({errorInfo})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 font-mono text-[9px] sm:text-[11px] text-slate-400 shrink-0">
          <span className="hidden sm:inline">Data Generated At: {generatedAt ? formatCompactDate(generatedAt) : "N/A"}</span>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <span className="text-slate-300 font-semibold font-mono uppercase bg-emerald-950/40 dark:bg-emerald-900/10 px-1.5 py-0.5 rounded border border-emerald-900/30">ML Engine: V3.5</span>
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

            {/* Filter and Switch controls */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Dynamic Search Box */}
              <div className="relative flex-1 md:flex-initial">
                <Search className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8.5 pr-2.5 py-1.5 w-full md:w-52 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-slate-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-800/80 transition-all font-semibold"
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
                title="Toggle Theme"
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
          winRate={totalSummary?.winRate || 0} 
          avgReturn={totalSummary?.avgReturnPct || 0} 
          profitFactor={totalSummary?.profitFactor || 0} 
          openCount={dynamicOpenCount} 
          closedCount={dynamicClosedCount} 
          toBuyCount={dynamicToBuyCount} 
        />

        {/* Strategy Leaderboard Component */}
        <StrategyLeaderboard strategies={strategySummary} />

        {/* Interactive Workspace Area: Tab Table Controls & TradingView Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          
          {/* Left Column: Wix Managed Tables (8 Columns) */}
          <div className="lg:col-span-8 flex flex-col gap-3 sm:gap-4">
            
            {/* Table Control Hub */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200/80 dark:border-slate-800/80 shadow-3xs overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-900/30">
                
                {/* Segmented Tab navigation controls */}
                <div className="flex p-0.5 gap-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700 w-full xl:w-auto overflow-x-auto scrollbar-none select-none">
                  <button
                    onClick={() => setActiveTab("active")}
                    className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-md text-[11px] sm:text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer text-center whitespace-nowrap ${
                      activeTab === "active"
                        ? "bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-400 shadow-3xs"
                        : "text-gray-500 hover:text-gray-950 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white/40 dark:hover:bg-slate-700/30"
                    }`}
                  >
                    🚀 Active ({filteredActiveTrades.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("setup")}
                    className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-md text-[11px] sm:text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer text-center whitespace-nowrap ${
                      activeTab === "setup"
                        ? "bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-400 shadow-3xs"
                        : "text-gray-500 hover:text-gray-950 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white/40 dark:hover:bg-slate-700/30"
                    }`}
                  >
                    👁️ Setup ({filteredSetups.length})
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
                    📜 Backtests ({filteredClosedTrades.length})
                  </button>
                </div>

                <div className="flex items-center gap-2 justify-between w-full xl:w-auto border-t border-gray-150 dark:border-slate-800 pt-2 xl:border-t-0 xl:pt-0">
                  {activeTab === "active" && (
                    <>
                      <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase font-mono tracking-wider ml-1">Sort:</span>
                      <select
                        value={activeTradesSort}
                        onChange={(e: any) => setActiveTradesSort(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs py-1 px-2.5 sm:py-1.5 select-none focus:outline-none focus:ring-2 focus:ring-indigo-500/25 shadow-3xs hover:border-gray-300 dark:hover:border-slate-700 font-bold text-gray-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        <option value="latest_date">Latest to Old</option>
                        <option value="oldest_date">Oldest to Latest</option>
                        <option value="return_high">Return (High to Low)</option>
                        <option value="return_low">Return (Low to High)</option>
                        <option value="strategy">Strategy Name</option>
                      </select>
                    </>
                  )}
                  {activeTab === "backtest" && (
                    <>
                      <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase font-mono tracking-wider ml-1">Sort:</span>
                      <select
                        value={closedTradesSort}
                        onChange={(e: any) => setClosedTradesSort(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs py-1 px-2.5 sm:py-1.5 select-none focus:outline-none focus:ring-2 focus:ring-indigo-500/25 shadow-3xs hover:border-gray-300 dark:hover:border-slate-700 font-bold text-gray-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        <option value="out_latest">Exit Date (Latest)</option>
                        <option value="out_oldest">Exit Date (Oldest)</option>
                        <option value="in_latest">Entry Date (Latest)</option>
                        <option value="in_oldest">Entry Date (Oldest)</option>
                        <option value="return_high">Return (High to Low)</option>
                        <option value="return_low">Return (Low to High)</option>
                      </select>
                    </>
                  )}
                </div>
              </div>

              {/* Dynamic Tab Insights Panel */}
              <div className="px-3 py-2 sm:px-4 sm:py-3 bg-linear-to-r from-slate-50 to-indigo-50/10 dark:from-slate-900 dark:to-slate-900/30 border-b border-gray-100 dark:border-slate-800 flex flex-wrap gap-2 sm:gap-4 items-center justify-between text-[11px] sm:text-xs text-gray-600 dark:text-slate-400 font-mono">
                {activeTab === "active" && (
                  <>
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
                      <span className="font-bold text-indigo-950 dark:text-indigo-400">🚀 ACTIVE STREAMS:</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Gain: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{profitableActiveCount}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Loss: <strong className="text-rose-700 dark:text-rose-400 font-bold">{inDrawdownActiveCount}</strong>
                      </span>
                      <span className="text-slate-405">|</span>
                      <span>
                        Avg Floating ROI: <strong className={avgActiveRoi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}>
                          {avgActiveRoi >= 0 ? "+" : ""}{avgActiveRoi.toFixed(2)}%
                        </strong>
                      </span>
                    </div>
                  </>
                )}

                {activeTab === "setup" && (
                  <>
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
                      <span className="font-bold text-indigo-950 dark:text-indigo-400">👁️ SETUP INTERCEPT:</span>
                      <span>
                        Total Setup: <strong className="text-amber-700 dark:text-amber-400 font-bold">{filteredSetups.length}</strong>
                      </span>
                      <span>
                        Strong Grade: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{upcomingStrongCount}</strong>
                      </span>
                      <span className="text-slate-405">|</span>
                      <span>
                        Avg Rank Score: <strong className="text-indigo-650 dark:text-indigo-400 font-bold">{upcomingAvgScore.toFixed(1)}%</strong>
                      </span>
                    </div>
                  </>
                )}

                {activeTab === "portfolio" && (
                  <>
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 w-full justify-between">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <span className="font-bold text-emerald-950 dark:text-emerald-400">🏆 PORTFOLIO SUMMARY:</span>
                        <span>
                          Assets: <strong className="text-slate-800 dark:text-slate-300 font-bold">{filteredPortfolio.length}</strong>
                        </span>
                        <span>
                          Avg Float Return: <strong className={`font-bold ${avgPortfolioRoi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                            {avgPortfolioRoi >= 0 ? "+" : ""}{avgPortfolioRoi.toFixed(2)}%
                          </strong>
                        </span>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 font-semibold text-[10px]">
                        <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-900/30">Up: {portfolioWinnerCount}</span>
                        <span className="text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded border border-rose-200/50 dark:border-rose-900/30">Down: {portfolioLoserCount}</span>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "backtest" && (
                  <>
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
                      <span className="font-bold text-indigo-950 dark:text-indigo-400">📜 BACKTEST INSIGHTS:</span>
                      <span>
                        Exits Analyzed: <strong className="text-slate-800 dark:text-slate-300 font-bold">{totalClosed}</strong>
                      </span>
                      <span>
                        Avg ReturnPct: <strong className={`font-bold ${dynamicAvgReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                          {dynamicAvgReturn >= 0 ? "+" : ""}{dynamicAvgReturn.toFixed(2)}%
                        </strong>
                      </span>
                      <span className="text-slate-405">|</span>
                      <span>
                        Win Rate: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{dynamicWinRate.toFixed(1)}%</strong>
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
                    <div className="hidden md:block overflow-x-auto">
                      {activeTab === "active" && (
                        filteredActiveTrades.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-20 text-center">
                            <BookOpen className="w-10 h-10 text-gray-300 dark:text-slate-700 mb-3" />
                            <h4 className="font-bold text-gray-700 dark:text-slate-300 text-sm">No active trades match filters</h4>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-sm font-mono">Relax parameters or try syncing again.</p>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-gray-200/60 dark:border-slate-800 font-mono text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider select-none">
                                <th className="px-4 py-3">Symbol</th>
                                <th className="px-4 py-3">Entry Details</th>
                                <th className="px-4 py-3 text-right">Entry / Current Price</th>
                                <th className="px-4 py-3 text-right">Current ROI</th>
                                <th className="px-4 py-3 text-center">Strategy</th>
                                <th className="px-4 py-3 text-right">Max Fav / Adv</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {filteredActiveTrades.map((item) => {
                                const isSelected = selectedSymbol === item.symbol;
                                const isPositive = item.currentROI >= 0;
                                return (
                                  <tr
                                    key={`active-${item.symbol}`}
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
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                                          {item.sector || "OTHER"}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 font-mono text-xs">
                                      <span className="text-gray-700 dark:text-slate-300 font-semibold">
                                        {formatCompactDate(item.entryDate)}
                                      </span>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono text-xs">
                                      <div className="flex flex-col">
                                        <span className="text-gray-500 dark:text-slate-400">
                                          Buy: ₹{item.entryPrice.toFixed(2)}
                                        </span>
                                        <span className="font-bold text-gray-900 dark:text-slate-100 mt-0.5">
                                          LTP: ₹{item.currentPrice.toFixed(2)}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono">
                                      <span className={`text-xs sm:text-sm font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                                        {isPositive ? "▲ +" : "▼ "}{item.currentROI.toFixed(2)}%
                                      </span>
                                    </td>

                                    <td className="px-4 py-3.5 text-center font-mono text-xs">
                                      <div className="flex flex-col items-center">
                                        <ConvictionBadge 
                                          strategyName={getStrategyAbbreviation(item.strategyName)}
                                          alsoTriggeredBy={item.alsoTriggeredBy?.map(getStrategyAbbreviation)}
                                        />
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono text-[10px]">
                                      <div className="flex flex-col">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                          MFE: +{item.maxFavorable?.toFixed(1) || item.mfe?.toFixed(1) || "0.0"}%
                                        </span>
                                        <span className="text-rose-500 dark:text-rose-455 mt-0.5">
                                          MAE: {item.maxAdverse?.toFixed(1) || "0.0"}%
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-right flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => setSelectedSymbol(item.symbol)}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                          isSelected
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                            : "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                                        }`}
                                      >
                                        Chart
                                      </button>
                                      <button
                                        onClick={() => {
                                          setBuyPopupSymbol({ symbol: item.symbol, currentPrice: item.currentPrice });
                                          setBuyPopupPrice(item.currentPrice);
                                        }}
                                        className="px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer shadow-3xs whitespace-nowrap"
                                      >
                                        ➕ Buy
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
                        filteredSetups.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-20 text-center">
                            <BookOpen className="w-10 h-10 text-gray-300 dark:text-slate-700 mb-3" />
                            <h4 className="font-bold text-gray-700 dark:text-slate-300 text-sm">No setup opportunities loaded</h4>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-sm font-mono">Parameters are solid.</p>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-gray-200/60 dark:border-slate-800 font-mono text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider select-none">
                                <th className="px-4 py-3">Symbol</th>
                                <th className="px-4 py-3">Signal Date</th>
                                <th className="px-4 py-3 text-right">Trigger price</th>
                                <th className="px-4 py-3 text-center">Strategy</th>
                                <th className="px-4 py-3 text-center">Action Trigger</th>
                                <th className="px-4 py-3 text-center">Rank Details</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {filteredSetups.map((item) => {
                                const isSelected = selectedSymbol === item.symbol;
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
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm font-mono tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                          {item.symbol}
                                        </span>
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                                          {item.sector || "OTHER"}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 font-mono text-xs">
                                      <span className="text-gray-700 dark:text-slate-300 font-semibold">
                                        {formatCompactDate(item.date)}
                                      </span>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono text-xs font-bold text-gray-900 dark:text-slate-100">
                                      ₹{item.price.toFixed(2)}
                                    </td>

                                    <td className="px-4 py-3.5 text-center font-mono text-xs">
                                      <div className="flex flex-col items-center">
                                        <ConvictionBadge 
                                          strategyName={getStrategyAbbreviation(item.strategyName)}
                                          alsoTriggeredBy={item.alsoTriggeredBy?.map(getStrategyAbbreviation)}
                                        />
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-center">
                                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                                        {item.mlAction || "BUY"}
                                      </span>
                                    </td>

                                    <td className="px-4 py-3.5 text-center font-mono text-xs">
                                      <div className="flex flex-col items-center">
                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                          Score: {item.rankScore}
                                        </span>
                                        <span className="text-[10px] text-gray-400 mt-0.5">
                                          Grade: <strong className="text-indigo-600 dark:text-indigo-450">{item.rankGrade}</strong>
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => setSelectedSymbol(item.symbol)}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                          isSelected
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
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
                            <h4 className="font-bold text-gray-700 dark:text-slate-300 text-sm">No portfolio assets found</h4>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-sm font-mono">Sync your account signal database.</p>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-gray-200/60 dark:border-slate-800 font-mono text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider select-none">
                                <th className="px-4 py-3">Symbol</th>
                                <th className="px-4 py-3 text-right">Buy Price</th>
                                <th className="px-4 py-3 text-right">Current Price</th>
                                <th className="px-4 py-3 text-right">ROI (%)</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {portfolioWithROI.map((item) => {
                                const isSelected = selectedSymbol === item.symbol;
                                const isPositive = item.currentROI >= 0;
                                const isExited = !item.isActiveInStrategy;
                                return (
                                  <tr
                                    key={`portfolio-${item.symbol}`}
                                    className={`group transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/20 cursor-pointer ${
                                      isSelected ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""
                                    } ${isExited ? "bg-rose-50 dark:bg-rose-900/10" : ""}`}
                                    onClick={() => setSelectedSymbol(item.symbol)}
                                  >
                                    <td className="px-4 py-3.5 font-bold font-mono text-slate-900 dark:text-slate-100">
                                      <div className="flex flex-col gap-1">
                                        <span>{item.symbol}</span>
                                        {isExited ? (
                                          <span className="inline-flex items-center w-max px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-300">
                                            ⚠️ Exited
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center w-max px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-300">
                                            Active
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                                      {item.date ? formatCompactDate(item.date) : "N/A"}
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono text-xs">
                                      ₹{item.buyPrice?.toFixed(2)}
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold">
                                      {item.currentPrice ? `₹${item.currentPrice.toFixed(2)}` : "N/A"}
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono font-bold">
                                      {item.currentPrice ? (
                                        <span className={isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}>
                                          {isPositive ? "+" : ""}{(item.currentROI || 0).toFixed(2)}%
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">N/A</span>
                                      )}
                                    </td>

                                    <td className="px-4 py-3.5 text-center font-mono text-xs">
                                      <div className="flex flex-col items-center">
                                        <ConvictionBadge 
                                          strategyName={getStrategyAbbreviation(item.strategyName)}
                                          alsoTriggeredBy={item.alsoTriggeredBy?.map(getStrategyAbbreviation)}
                                        />
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono text-[10px]">
                                      <div className="flex flex-col text-right">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                          N/A
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSellConfirm(item.symbol);
                                        }}
                                        className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer shadow-3xs"
                                      >
                                        🟥 Sell
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
                        filteredClosedTrades.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-20 text-center">
                            <BookOpen className="w-10 h-10 text-gray-300 dark:text-slate-700 mb-3" />
                            <h4 className="font-bold text-gray-700 dark:text-slate-300 text-sm">No closed signal logs loaded</h4>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-sm font-mono font-bold">Clear filters or force refresh.</p>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-gray-200/60 dark:border-slate-800 font-mono text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider select-none">
                                <th className="px-4 py-3">Symbol</th>
                                <th className="px-4 py-3">Dates (In/Out)</th>
                                <th className="px-4 py-3 text-right">Entry / Exit Prices</th>
                                <th className="px-4 py-3 text-right">ReturnPct</th>
                                <th className="px-4 py-3 text-center">Result</th>
                                <th className="px-4 py-3">Exit Reason</th>
                                <th className="px-4 py-3 text-center">Strategy</th>
                                <th className="px-4 py-3 text-right">Max Fav / Adverse</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {filteredClosedTrades.map((item, idx) => {
                                const isSelected = selectedSymbol === item.symbol;
                                const isWin = item.pnlLabel === "WIN";
                                return (
                                  <tr
                                    key={`closed-${item.symbol}-${idx}`}
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
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                                          {item.sector || "OTHER"}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 font-mono text-xs">
                                      <div className="flex flex-col">
                                        <span className="text-gray-700 dark:text-slate-300">
                                          In: {formatCompactDate(item.entryDate)}
                                        </span>
                                        <span className="text-[10px] text-gray-400 mt-0.5">
                                          Out: {formatCompactDate(item.exitDate)}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono text-xs">
                                      <div className="flex flex-col">
                                        <span className="text-gray-500">
                                          In: ₹{item.entryPrice.toFixed(2)}
                                        </span>
                                        <span className="font-bold text-gray-900 dark:text-slate-100 mt-0.5">
                                          Out: ₹{item.exitPrice.toFixed(2)}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono">
                                      <span className={`text-xs sm:text-sm font-bold ${isWin ? "text-emerald-600 dark:text-emerald-400" : "text-rose-550"}`}>
                                        {item.returnPct >= 0 ? "+" : ""}{item.returnPct.toFixed(2)}%
                                      </span>
                                    </td>

                                    <td className="px-4 py-3.5 text-center">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                        isWin 
                                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" 
                                          : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-455"
                                      }`}>
                                        {isWin ? "WIN ✅" : "LOSS ❌"}
                                      </span>
                                    </td>

                                    <td className="px-4 py-3.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                                      {getExitReasonLabel(item.exitReason)}
                                    </td>

                                    <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                      <ConvictionBadge 
                                        strategyName={getStrategyAbbreviation(item.strategyName)}
                                        alsoTriggeredBy={item.alsoTriggeredBy?.map(getStrategyAbbreviation)}
                                      />
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono text-[10px]">
                                      <div className="flex flex-col text-right">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                          MaxF: +{item.maxFavorable?.toFixed(1) || "0.0"}%
                                        </span>
                                        <span className="text-rose-500 dark:text-rose-455 mt-0.5">
                                          MaxA: {item.maxAdverse?.toFixed(1) || "0.0"}%
                                        </span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => setSelectedSymbol(item.symbol)}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                          isSelected
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
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

                    {/* ================= MOBILE STYLED VIEWS (Hidden on Desktop) ================= */}
                    <div className="block md:hidden p-3 space-y-3">
                      {activeTab === "active" && (
                        filteredActiveTrades.length === 0 ? (
                          <p className="text-center py-10 text-xs text-gray-400 font-mono">No ongoing signals match criteria.</p>
                        ) : (
                          filteredActiveTrades.map((item) => {
                            const isSelected = selectedSymbol === item.symbol;
                            const isPositive = item.currentROI >= 0;
                            return (
                              <div
                                key={`active-mob-${item.symbol}`}
                                onClick={() => setSelectedSymbol(item.symbol)}
                                className={`p-3.5 rounded-xl border transition-all ${
                                  isSelected
                                    ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500"
                                    : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-base font-bold font-mono tracking-tight text-gray-950 dark:text-white">{item.symbol}</span>
                                    <span className="text-[10px] text-gray-400 block font-mono">Date: {formatCompactDate(item.entryDate)}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-base font-bold font-mono ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                                      {isPositive ? "+" : ""}{item.currentROI.toFixed(2)}%
                                    </span>
                                    <span className="text-[10px] text-gray-400 block font-mono">LTP: ₹{item.currentPrice.toFixed(2)}</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-slate-800/60 font-mono text-[11px] text-gray-500 dark:text-slate-400">
                                  <div>
                                    <ConvictionBadge 
                                      strategyName={getStrategyAbbreviation(item.strategyName)}
                                      alsoTriggeredBy={item.alsoTriggeredBy?.map(getStrategyAbbreviation)}
                                    />
                                  </div>
                                  <div className="text-right">
                                    <span>Buy Price: <strong>₹{item.entryPrice.toFixed(2)}</strong></span>
                                  </div>
                                  <div>
                                    <span className="text-emerald-600 font-bold">MFE: +{item.maxFavorable || item.mfe}%</span>
                                  </div>
                                  <div className="col-span-2 mt-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setBuyPopupSymbol({ symbol: item.symbol, currentPrice: item.currentPrice });
                                        setBuyPopupPrice(item.currentPrice);
                                      }}
                                      className="px-2.5 py-1.5 w-full rounded border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/30 cursor-pointer shadow-3xs text-center"
                                    >
                                      ➕ Buy
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )
                      )}

                      {activeTab === "setup" && (
                        filteredSetups.length === 0 ? (
                          <p className="text-center py-10 text-xs text-gray-400 font-mono">No setups match criteria.</p>
                        ) : (
                          filteredSetups.map((item) => {
                            const isSelected = selectedSymbol === item.symbol;
                            return (
                              <div
                                key={`setup-mob-${item.symbol}`}
                                onClick={() => setSelectedSymbol(item.symbol)}
                                className={`p-3.5 rounded-xl border transition-all ${
                                  isSelected
                                    ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500"
                                    : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-base font-bold font-mono tracking-tight text-gray-950 dark:text-white">{item.symbol}</span>
                                    <span className="text-[10px] text-emerald-600 font-bold block font-mono uppercase bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded w-fit mt-1">
                                      {item.mlAction || "BUY"}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-base font-bold font-mono text-gray-900 dark:text-slate-100">₹{item.price.toFixed(2)}</span>
                                    <span className="text-[10px] text-gray-400 block font-mono">Date: {formatCompactDate(item.date)}</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-slate-800/60 font-mono text-[11px] text-gray-500 dark:text-slate-400">
                                  <div>
                                    <ConvictionBadge 
                                      strategyName={getStrategyAbbreviation(item.strategyName)}
                                      alsoTriggeredBy={item.alsoTriggeredBy?.map(getStrategyAbbreviation)}
                                    />
                                  </div>
                                  <div className="text-right">
                                    <span>Rank details: <strong>Score {item.rankScore} ({item.rankGrade})</strong></span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )
                      )}

                      {activeTab === "portfolio" && (
                        portfolioWithROI.length === 0 ? (
                          <p className="text-center py-10 text-xs text-gray-400 font-mono">No portfolio holdings found.</p>
                        ) : (
                          portfolioWithROI.map((item) => {
                            const isSelected = selectedSymbol === item.symbol;
                            const isPositive = item.currentROI >= 0;
                            const isExited = !item.isActiveInStrategy;
                            return (
                              <div
                                key={`portfolio-mob-${item.symbol}`}
                                onClick={() => setSelectedSymbol(item.symbol)}
                                className={`p-3.5 rounded-xl border transition-all ${
                                  isSelected
                                    ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500"
                                    : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800"
                                } ${isExited ? "bg-rose-50 dark:bg-rose-950/20" : ""}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-base font-bold font-mono tracking-tight text-gray-950 dark:text-white">{item.symbol}</span>
                                    <div className="mt-1">
                                      {isExited ? (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-300">
                                          ⚠️ Exited
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-300">
                                          Active
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {item.currentPrice ? (
                                      <>
                                        <span className={`text-base font-bold font-mono ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                                          {isPositive ? "+" : ""}{item.currentROI.toFixed(2)}%
                                        </span>
                                        <span className="text-[10px] text-gray-400 block font-mono">LTP: ₹{item.currentPrice.toFixed(2)}</span>
                                      </>
                                    ) : (
                                      <span className="text-[10px] text-gray-400 block font-mono">LTP: N/A</span>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-slate-800/60 font-mono text-[11px] text-gray-500 dark:text-slate-400">
                                  <div>
                                    <span>Buy Price: <strong>₹{item.buyPrice.toFixed(2)}</strong></span>
                                  </div>
                                  <div className="text-right flex justify-end">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSellConfirm(item.symbol);
                                      }}
                                      className="px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 text-[10px] font-bold transition-all hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer shadow-3xs flex items-center justify-center"
                                    >
                                      🟥 Sell
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )
                      )}

                      {activeTab === "backtest" && (
                        filteredClosedTrades.length === 0 ? (
                          <p className="text-center py-10 text-xs text-gray-400 font-mono">No closed trades match filter criteria.</p>
                        ) : (
                          filteredClosedTrades.map((item, idx) => {
                            const isSelected = selectedSymbol === item.symbol;
                            const isWin = item.pnlLabel === "WIN";
                            return (
                              <div
                                key={`closed-mob-${item.symbol}-${idx}`}
                                onClick={() => setSelectedSymbol(item.symbol)}
                                className={`p-3.5 rounded-xl border transition-all ${
                                  isSelected
                                    ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500"
                                    : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-base font-bold font-mono tracking-tight text-gray-950 dark:text-white">{item.symbol}</span>
                                    <span className={`text-[9px] font-bold block w-fit px-1 rounded uppercase mt-0.5 ${
                                      isWin ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                    }`}>
                                      {isWin ? "WIN ✅" : "LOSS ❌"}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-base font-bold font-mono ${isWin ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                                      {item.returnPct >= 0 ? "+" : ""}{item.returnPct.toFixed(2)}%
                                    </span>
                                    <span className="text-[10px] text-gray-400 block font-mono">Exit: {formatCompactDate(item.exitDate)}</span>
                                  </div>
                                </div>
                                <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-slate-800/60 font-mono text-[11px] text-gray-500 dark:text-slate-400 space-y-1">
                                  <div className="flex justify-between">
                                    <span>Exit Action: <strong className="text-indigo-600 dark:text-indigo-400">{getExitReasonLabel(item.exitReason)}</strong></span>
                                    <span>Entry: ₹{item.entryPrice.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <ConvictionBadge 
                                      strategyName={getStrategyAbbreviation(item.strategyName)}
                                      alsoTriggeredBy={item.alsoTriggeredBy?.map(getStrategyAbbreviation)}
                                    />
                                    <span>Exit: ₹{item.exitPrice.toFixed(2)}</span>
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

          {/* Right Column: Interactive TradingView chart (4 Columns) */}
          <div className="lg:col-span-4 sticky top-20 flex flex-col gap-4">
            <div className="h-[460px] lg:h-[580px]">
              {selectedSymbol ? (
                <TradingViewWidget symbol={selectedSymbol} theme={darkMode ? "dark" : "light"} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-xl p-6 text-center shadow-3xs">
                  <Activity className="w-12 h-12 text-indigo-400 animate-pulse mb-3" />
                  <h4 className="font-bold text-gray-700 dark:text-slate-300 text-sm">Interactive Stage Waiting</h4>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 font-mono">Select any stock symbol to load its high-definition TradingView chart immediately.</p>
                </div>
              )}
            </div>

            {/* Trading Suite Tips Panel */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-xl p-4 shadow-3xs">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4.5 h-4.5 text-indigo-500" />
                <h5 className="font-bold text-gray-900 dark:text-slate-100 text-xs font-mono uppercase tracking-wider">Trading Suite Tips</h5>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed font-mono">
                Clicking on any asset card or row dynamically syncs the <strong>Weekly charts</strong> with Indian Exchange feeds (BSE/NSE) inside the viewport.
              </p>
            </div>
          </div>

        </div>

      </main>

      {/* Modern Compact Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-gray-250/50 dark:border-slate-800/80 py-4 mt-auto transition-colors duration-150 select-none">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 font-mono uppercase tracking-widest">
            © 2026 RAHULTRADING TERMINAL • POWERED BY ML V3.5 CORE ENGINE • SECURE ENDPOINT SYNCHRONIZATION
          </p>
        </div>
      </footer>

      {/* Buy Popup Modal */}
      {buyPopupSymbol && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 w-full max-w-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 font-mono text-sm">Buy {buyPopupSymbol.symbol}</h3>
              <button 
                onClick={() => setBuyPopupSymbol(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 font-mono mb-1.5 uppercase tracking-wider">Buy Price</label>
              <input
                type="number"
                value={buyPopupPrice}
                onChange={(e) => setBuyPopupPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder={buyPopupSymbol.currentPrice ? buyPopupSymbol.currentPrice.toString() : ""}
              />
              <button
                onClick={handleBuySubmit}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-sm transition-colors shadow-sm"
              >
                Confirm Buy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-gray-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-lg shadow-xl text-xs font-bold font-mono tracking-tight z-50 flex items-center gap-2 border border-gray-800 dark:border-gray-200">
          <span className="text-emerald-400 dark:text-emerald-600">✓</span>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
