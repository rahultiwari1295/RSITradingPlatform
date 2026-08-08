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
  Info,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
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
import ScoreBadge from "./components/ScoreBadge";

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
  const [buyPopupSymbol, setBuyPopupSymbol] = useState<{symbol: string, currentPrice: number, strategyName?: string} | null>(null);
  const [buyPopupPrice, setBuyPopupPrice] = useState<number | "">("");
  const [buyPopupQty, setBuyPopupQty] = useState<number | "">("");
  
  const [sellPopupTrade, setSellPopupTrade] = useState<any | null>(null);
  const [sellPopupPrice, setSellPopupPrice] = useState<number | "">("");
  const [sellPopupQty, setSellPopupQty] = useState<number | "">("");
  
  const [tradeHistory, setTradeHistory] = useState<any>({});
  
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
  const [activeTab, setActiveTab] = useState<"active" | "portfolio" | "backtest">("active");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStrategy, setSelectedStrategy] = useState<string>("ALL");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [isMobileChartOpen, setIsMobileChartOpen] = useState<boolean>(false);

  const openMobileChart = (symbol: string) => {
    setSelectedSymbol(symbol);
    setIsMobileChartOpen(true);
  };
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
  const getExitReasonLabel = (reason: string | null | undefined, strategyName?: string) => {
    if (!reason || reason === "N/A" || reason.trim() === "") {
      return strategyName || "Completed Trade";
    }
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
    if (!buyPopupSymbol || buyPopupPrice === "" || buyPopupQty === "") return;
    
    try {
      const res = await fetch("https://rahultiwari1295.wixstudio.com/angelapi/_functions/addManualPortfolioTrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          symbol: buyPopupSymbol.symbol, 
          buyPrice: Number(buyPopupPrice),
          quantity: Number(buyPopupQty),
          strategyName: buyPopupSymbol.strategyName
        })
      });
      if (res.ok) {
        showToast(`${buyPopupSymbol.symbol} added to Portfolio`);
        setBuyPopupSymbol(null);
        setBuyPopupQty("");
        fetchTerminalData();
      } else {
        showToast("Error adding to portfolio.");
      }
    } catch (e) {
      showToast("Network error.");
    }
  };

  const handleSellSubmit = async () => {
    if (!sellPopupTrade || sellPopupPrice === "" || sellPopupQty === "") return;

    try {
      const res = await fetch("https://rahultiwari1295.wixstudio.com/angelapi/_functions/sellPortfolioTrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tradeId: sellPopupTrade.tradeId,
          symbol: sellPopupTrade.symbol,
          sellQuantity: Number(sellPopupQty),
          sellPrice: Number(sellPopupPrice)
        })
      });
      if (res.ok) {
        showToast(`Sold ${sellPopupQty} of ${sellPopupTrade.symbol}`);
        setSellPopupTrade(null);
        setSellPopupQty("");
        setSellPopupPrice("");
        fetchTerminalData();
      } else {
        showToast("Error selling asset.");
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
      
      if (result.kpis) setKpis(result.kpis);

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
      setTradeHistory(result.tradeHistory || {});

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
    const matchesSearch = t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.sector && t.sector.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStrategy = selectedStrategy === "ALL" || t.strategyName === selectedStrategy || getStrategyAbbreviation(t.strategyName) === selectedStrategy;
    return matchesSearch && matchesStrategy;
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

  // 2. Setup/toBuySignals Filters - Removed per user request
  const filteredSetups: any[] = [];

  // 3. Portfolio Filters
  const filteredPortfolio = manualPortfolio.filter(p => {
    const matchesSearch = p.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // 4. Closed Trades Filters (closedTrades)
  const filteredClosedTrades = closedTrades.filter(b => {
    const matchesSearch = b.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (b.exitReason && b.exitReason.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStrategy = selectedStrategy === "ALL" || b.strategyName === selectedStrategy || getStrategyAbbreviation(b.strategyName) === selectedStrategy;
    return matchesSearch && matchesStrategy;
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

  // List helper for mobile full-screen chart navigation
  const currentSymbolList: any[] = activeTab === "active" ? filteredActiveTrades : activeTab === "portfolio" ? portfolioWithROI : filteredClosedTrades;
  const currentSymbolIndex = currentSymbolList.findIndex(item => item.symbol === selectedSymbol);

  const handleNextSymbol = () => {
    if (currentSymbolList.length === 0) return;
    const nextIdx = (currentSymbolIndex + 1) % currentSymbolList.length;
    setSelectedSymbol(currentSymbolList[nextIdx].symbol);
  };

  const handlePrevSymbol = () => {
    if (currentSymbolList.length === 0) return;
    const prevIdx = (currentSymbolIndex - 1 + currentSymbolList.length) % currentSymbolList.length;
    setSelectedSymbol(currentSymbolList[prevIdx].symbol);
  };

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
              <div className="flex items-center gap-1.5 md:hidden">
                <button
                  onClick={() => setDarkMode(prev => !prev)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 active:scale-95 transition-all cursor-pointer text-xs font-mono font-bold"
                  title="Toggle Light/Dark Theme"
                >
                  {darkMode ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px]">Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-[10px]">Dark</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Filter and Switch controls */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Strategy Filter Dropdown */}
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="py-1.5 px-2.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-slate-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-800/80 transition-all font-semibold cursor-pointer"
              >
                <option value="ALL">All Strategies</option>
                {strategySummary.map(s => (
                  <option key={s.strategyName} value={s.strategyName}>{s.strategyName}</option>
                ))}
              </select>

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
                onClick={() => setDarkMode(prev => !prev)}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer text-xs font-mono font-bold border border-gray-200 dark:border-slate-700 transition-all active:scale-95 shadow-3xs"
                title="Toggle Light/Dark Theme"
              >
                {darkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Dark</span>
                  </>
                )}
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
          toBuyCount={0} 
        />

        {/* Strategy Leaderboard Component */}
        <StrategyLeaderboard 
          strategies={strategySummary} 
          selectedStrategy={selectedStrategy}
          onSelectStrategy={setSelectedStrategy}
        />

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
                                <th className="px-4 py-3 text-center">Score</th>
                                <th className="px-4 py-3 text-right">Max Fav / Adv</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {filteredActiveTrades.map((item) => {
                                const isSelected = selectedSymbol === item.symbol;
                                const isPositive = item.currentROI >= 0;
                                const isHeld = manualPortfolio.some(m => m.symbol === item.symbol);
                                return (
                                  <tr
                                    key={`active-${item.symbol}`}
                                    className={`group transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/20 cursor-pointer ${
                                      isSelected ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""
                                    } ${isHeld ? "border-l-4 border-l-emerald-500 bg-emerald-50/10 dark:bg-emerald-900/10" : ""}`}
                                    onClick={() => setSelectedSymbol(item.symbol)}
                                  >
                                    <td className="px-4 py-3.5">
                                      <div className="flex flex-col text-left">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm font-mono tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {item.symbol}
                                          </span>
                                          {isHeld && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 text-[9px] rounded font-bold uppercase">Held</span>}
                                        </div>
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

                                    <td className="px-4 py-3.5 text-center font-mono text-xs">
                                      <div className="flex flex-col items-center">
                                        <ScoreBadge
                                          compositeScore={item.compositeScore}
                                          technicalScore={item.technicalScore}
                                          riskScore={item.riskScore}
                                          confidence={item.confidence}
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
                                      {!isHeld && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setBuyPopupSymbol({symbol: item.symbol, currentPrice: item.currentPrice});
                                          }}
                                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-colors cursor-pointer shadow-xs border border-emerald-700"
                                        >
                                          Buy
                                        </button>
                                      )}
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
                                <th className="px-4 py-3 text-right">Qty</th>
                                <th className="px-4 py-3 text-right">Buy Price / Total</th>
                                <th className="px-4 py-3 text-right">LTP / Value</th>
                                <th className="px-4 py-3 text-right">P&L</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {portfolioWithROI.map((item) => {
                                const isSelected = selectedSymbol === item.symbol;
                                const isPositive = item.currentROI >= 0;
                                const isExited = !item.isActiveInStrategy;
                                const totalInvested = (item.buyPrice || 0) * (item.quantity || 1);
                                const currentValue = (item.currentPrice || 0) * (item.quantity || 1);
                                const pnlAmount = currentValue - totalInvested;
                                
                                return (
                                  <tr
                                    key={`portfolio-${item.tradeId || item.symbol}`}
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

                                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-800 dark:text-slate-200 font-bold">
                                      {item.quantity || 1}
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono text-xs">
                                      <div className="flex flex-col">
                                        <span className="text-gray-500 dark:text-slate-400">₹{item.buyPrice?.toFixed(2)}</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">₹{totalInvested.toFixed(2)}</span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono text-xs">
                                      <div className="flex flex-col">
                                        <span className="text-gray-500 dark:text-slate-400">{item.currentPrice ? `₹${item.currentPrice.toFixed(2)}` : "N/A"}</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{item.currentPrice ? `₹${currentValue.toFixed(2)}` : "N/A"}</span>
                                      </div>
                                    </td>

                                    <td className="px-4 py-3.5 text-right font-mono">
                                      {item.currentPrice ? (
                                        <div className="flex flex-col">
                                          <span className={`text-[11px] font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                            {isPositive ? "+" : ""}₹{pnlAmount.toFixed(2)}
                                          </span>
                                          <span className={`text-[10px] font-bold mt-0.5 ${isPositive ? "text-emerald-500 dark:text-emerald-500/70" : "text-rose-500/70"}`}>
                                            {isPositive ? "+" : ""}{(item.currentROI || 0).toFixed(2)}%
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 text-xs">N/A</span>
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

                                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSellPopupTrade(item);
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold transition-colors cursor-pointer shadow-xs border border-rose-700 whitespace-nowrap"
                                      >
                                        Sell
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )
                      )}

                      {activeTab === "portfolio" && Object.keys(tradeHistory).length > 0 && (
                        <div className="mt-8 border-t border-gray-200 dark:border-slate-800 pt-6">
                          <h4 className="px-4 font-bold text-gray-900 dark:text-slate-100 font-mono text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            Realized Trade History
                          </h4>
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-gray-200/60 dark:border-slate-800 font-mono text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider select-none">
                                <th className="px-4 py-3">Symbol</th>
                                <th className="px-4 py-3 text-right">Qty</th>
                                <th className="px-4 py-3">Dates (Buy/Sell)</th>
                                <th className="px-4 py-3 text-right">Prices (Buy/Sell)</th>
                                <th className="px-4 py-3 text-right">Realized P&L</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {Object.values(tradeHistory).flat().sort((a: any, b: any) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()).map((item: any, idx) => {
                                const isPositive = item.pnl >= 0;
                                return (
                                  <tr key={`th-${item.tradeId}-${idx}`} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                    <td className="px-4 py-3 font-bold font-mono text-sm text-slate-800 dark:text-slate-200">{item.symbol}</td>
                                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 dark:text-slate-400">{item.quantity}</td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                      <div className="flex flex-col gap-0.5">
                                        <span>B: {formatCompactDate(item.buyDate)}</span>
                                        <span>S: {formatCompactDate(item.sellDate)}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                      <div className="flex flex-col gap-0.5">
                                        <span>₹{item.buyPrice?.toFixed(2)}</span>
                                        <span>₹{item.sellPrice?.toFixed(2)}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                      <div className="flex flex-col items-end">
                                        <span className={`text-[12px] font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                          {isPositive ? "+" : ""}₹{item.pnl?.toFixed(2)}
                                        </span>
                                        <span className={`text-[10px] font-bold ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                                          {isPositive ? "+" : ""}{item.pnlPct?.toFixed(2)}%
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
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
                    <div className="block md:hidden p-2.5 space-y-2">
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
                                onClick={() => openMobileChart(item.symbol)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer active:scale-[0.99] ${
                                  isSelected
                                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-2xs"
                                    : "bg-white dark:bg-slate-900 border-gray-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700"
                                }`}
                              >
                                {/* Header line: Symbol + Conviction Badge | Price + ROI Pill */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-sm font-bold font-mono tracking-tight text-slate-900 dark:text-white truncate">
                                      {item.symbol}
                                    </span>
                                    <ConvictionBadge 
                                      strategyName={getStrategyAbbreviation(item.strategyName)}
                                      alsoTriggeredBy={item.alsoTriggeredBy?.map(getStrategyAbbreviation)}
                                    />
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                      ₹{item.currentPrice.toFixed(2)}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                                      isPositive 
                                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/50" 
                                        : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/50"
                                    }`}>
                                      {isPositive ? "+" : ""}{item.currentROI.toFixed(2)}%
                                    </span>
                                  </div>
                                </div>

                                {/* Compact Metadata Line */}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-slate-800/60 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  <div className="flex items-center gap-2 truncate">
                                    <span>Buy: <strong className="text-slate-700 dark:text-slate-200">₹{item.entryPrice.toFixed(2)}</strong></span>
                                    <span className="text-slate-300 dark:text-slate-700">•</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">MFE: +{item.maxFavorable || item.mfe}%</span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <ScoreBadge compositeScore={item.compositeScore} technicalScore={item.technicalScore} riskScore={item.riskScore} confidence={item.confidence} />
                                  </div>
                                </div>

                                {/* Quick Action Bar */}
                                <div className="flex items-center gap-2 mt-2 pt-1.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openMobileChart(item.symbol);
                                    }}
                                    className="flex-1 py-1 px-2.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer text-center flex items-center justify-center gap-1 shadow-2xs"
                                  >
                                    <Activity className="w-3 h-3 text-indigo-500" />
                                    <span>Full Chart</span>
                                  </button>

                                  {!manualPortfolio.some(m => m.symbol === item.symbol) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setBuyPopupSymbol({ symbol: item.symbol, currentPrice: item.currentPrice, strategyName: item.strategyName });
                                        setBuyPopupPrice(item.currentPrice);
                                        setBuyPopupQty("");
                                      }}
                                      className="flex-1 py-1 px-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer text-center shadow-2xs"
                                    >
                                      Buy
                                    </button>
                                  )}
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
                                onClick={() => openMobileChart(item.symbol)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer active:scale-[0.99] ${
                                  isSelected
                                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-2xs"
                                    : "bg-white dark:bg-slate-900 border-gray-200/80 dark:border-slate-800"
                                } ${isExited ? "bg-rose-50/40 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/30" : ""}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-sm font-bold font-mono tracking-tight text-slate-900 dark:text-white truncate">
                                      {item.symbol}
                                    </span>
                                    {isExited ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 shrink-0">
                                        ⚠️ Exited
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 shrink-0">
                                        Active
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-right shrink-0">
                                    {item.currentPrice ? (
                                      <div className="flex items-center gap-2 font-mono">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                          Val: ₹{((item.currentPrice || 0) * (item.quantity || 1)).toFixed(0)}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                          isPositive 
                                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50" 
                                            : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50"
                                        }`}>
                                          {isPositive ? "+" : ""}₹{((item.currentPrice - item.buyPrice) * (item.quantity || 1)).toFixed(1)}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400 font-mono">LTP: N/A</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-slate-800/60 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  <div>Qty: <strong className="text-slate-700 dark:text-slate-200">{item.quantity || 1}</strong> • Buy: <strong>₹{item.buyPrice.toFixed(2)}</strong></div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openMobileChart(item.symbol);
                                      }}
                                      className="px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[11px] font-bold"
                                    >
                                      Chart
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSellPopupTrade(item);
                                      }}
                                      className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 text-[11px] font-bold"
                                    >
                                      Sell
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
                                onClick={() => openMobileChart(item.symbol)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer active:scale-[0.99] ${
                                  isSelected
                                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-2xs"
                                    : "bg-white dark:bg-slate-900 border-gray-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-sm font-bold font-mono tracking-tight text-slate-900 dark:text-white truncate">
                                      {item.symbol}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                                      isWin ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                                    }`}>
                                      {isWin ? "WIN ✅" : "LOSS ❌"}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                                      isWin ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                                    }`}>
                                      {item.returnPct >= 0 ? "+" : ""}{item.returnPct.toFixed(2)}%
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-slate-800/60 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                  <div>
                                    <span>Entry: <strong className="text-slate-700 dark:text-slate-200">{formatCompactDate(item.entryDate)}</strong> @ <strong>₹{item.entryPrice.toFixed(2)}</strong></span>
                                  </div>
                                  <div className="text-right">
                                    <span>Exit: <strong className="text-slate-700 dark:text-slate-200">{formatCompactDate(item.exitDate)}</strong> @ <strong>₹{(item.exitPrice || item.entryPrice).toFixed(2)}</strong></span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mt-2 pt-1.5 text-[11px] font-mono">
                                  <div className="text-slate-500 dark:text-slate-400 truncate pr-2">
                                    Strategy: <strong className="text-indigo-600 dark:text-indigo-400">{item.strategyName || "Quantitative Model"}</strong>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openMobileChart(item.symbol);
                                    }}
                                    className="px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Activity className="w-3 h-3 text-indigo-500" />
                                    <span>Chart</span>
                                  </button>
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
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 font-mono mb-1.5 uppercase tracking-wider">Buy Price (₹)</label>
                <input
                  type="number"
                  value={buyPopupPrice}
                  onChange={(e) => setBuyPopupPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder={buyPopupSymbol.currentPrice ? buyPopupSymbol.currentPrice.toString() : ""}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 font-mono mb-1.5 uppercase tracking-wider">Quantity</label>
                <input
                  type="number"
                  value={buyPopupQty}
                  onChange={(e) => setBuyPopupQty(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="e.g. 100"
                />
              </div>
              {buyPopupPrice !== "" && buyPopupQty !== "" && (
                <div className="flex justify-between items-center py-2 border-t border-gray-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 font-mono uppercase">Total</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">₹{(Number(buyPopupPrice) * Number(buyPopupQty)).toFixed(2)}</span>
                </div>
              )}
              <button
                onClick={handleBuySubmit}
                disabled={!buyPopupPrice || !buyPopupQty}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
              >
                Confirm Buy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Popup Modal */}
      {sellPopupTrade && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 w-full max-w-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-rose-50/50 dark:bg-rose-900/10">
              <h3 className="font-bold text-rose-800 dark:text-rose-100 font-mono text-sm">Sell {sellPopupTrade.symbol}</h3>
              <button 
                onClick={() => setSellPopupTrade(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="text-gray-500">Avg Buy: ₹{sellPopupTrade.buyPrice?.toFixed(2)}</span>
                <span className="text-gray-500">Held: {sellPopupTrade.quantity} qty</span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 font-mono mb-1.5 uppercase tracking-wider">Sell Price (₹)</label>
                <input
                  type="number"
                  value={sellPopupPrice}
                  onChange={(e) => setSellPopupPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  placeholder={sellPopupTrade.currentPrice ? sellPopupTrade.currentPrice.toString() : ""}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-slate-400 font-mono mb-1.5 uppercase tracking-wider">Sell Quantity</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={sellPopupQty}
                    onChange={(e) => setSellPopupQty(e.target.value === "" ? "" : Number(e.target.value))}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                    placeholder={`Max ${sellPopupTrade.quantity}`}
                  />
                  <button 
                    onClick={() => setSellPopupQty(sellPopupTrade.quantity)}
                    className="px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer transition-colors text-slate-700 dark:text-slate-300 font-mono"
                  >
                    ALL
                  </button>
                </div>
              </div>
              
              {sellPopupPrice !== "" && sellPopupQty !== "" && (
                <div className="py-2 border-t border-gray-100 dark:border-slate-800 mt-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 font-mono uppercase">Proceeds</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 font-mono text-[11px]">₹{(Number(sellPopupPrice) * Number(sellPopupQty)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 font-mono uppercase">Est. P&L</span>
                    {(() => {
                      const pnl = (Number(sellPopupPrice) - sellPopupTrade.buyPrice) * Number(sellPopupQty);
                      return (
                        <span className={`font-bold font-mono text-[11px] ${pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {pnl >= 0 ? "+" : ""}₹{pnl.toFixed(2)}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}
              
              <button
                onClick={handleSellSubmit}
                disabled={!sellPopupPrice || !sellPopupQty || Number(sellPopupQty) > sellPopupTrade.quantity}
                className="w-full mt-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/50 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
              >
                Confirm Sell
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Mobile Chart View Modal */}
      {isMobileChartOpen && selectedSymbol && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col md:hidden animate-in fade-in duration-150">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
            <button
              onClick={() => setIsMobileChartOpen(false)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg transition-all border border-slate-700 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400" />
              <span>Back</span>
            </button>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className="font-mono font-bold text-sm text-white">{selectedSymbol}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-400 border border-indigo-900 font-mono">BSE</span>
              </div>
              {(() => {
                const item = currentSymbolList.find((i: any) => i.symbol === selectedSymbol);
                if (!item) return null;
                const roi = item.currentROI ?? item.returnPct;
                const price = item.currentPrice || item.exitPrice || item.buyPrice || item.entryPrice;
                const isPos = roi >= 0;
                return (
                  <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
                    <span>₹{price?.toFixed(2) || "0.00"}</span>
                    {roi !== undefined && (
                      <span className={`font-bold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                        {isPos ? "+" : ""}{roi.toFixed(2)}%
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevSymbol}
                disabled={currentSymbolList.length <= 1}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 text-slate-300 rounded-lg border border-slate-700 cursor-pointer"
                title="Previous stock"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextSymbol}
                disabled={currentSymbolList.length <= 1}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 text-slate-300 rounded-lg border border-slate-700 cursor-pointer"
                title="Next stock"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chart Container */}
          <div className="flex-1 w-full bg-slate-950 relative overflow-hidden">
            <TradingViewWidget symbol={selectedSymbol} theme="dark" />
          </div>

          {/* Quick Action Footer */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
            {(() => {
              const item = currentSymbolList.find((i: any) => i.symbol === selectedSymbol);
              const inPortfolio = manualPortfolio.some(m => m.symbol === selectedSymbol);
              return (
                <>
                  <div className="flex flex-col font-mono text-[10px] text-slate-400">
                    <span>Strategy: <strong className="text-indigo-400">{getStrategyAbbreviation(item?.strategyName)}</strong></span>
                    <span>Entry: <strong className="text-slate-200">₹{(item?.entryPrice || item?.buyPrice || 0).toFixed(2)}</strong></span>
                  </div>

                  <div className="flex gap-2">
                    {!inPortfolio && item?.currentPrice && (
                      <button
                        onClick={() => {
                          setBuyPopupSymbol({ symbol: selectedSymbol, currentPrice: item.currentPrice, strategyName: item.strategyName });
                          setBuyPopupPrice(item.currentPrice);
                          setBuyPopupQty("");
                        }}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md cursor-pointer transition-colors"
                      >
                        Buy Stock
                      </button>
                    )}
                    {inPortfolio && (
                      <button
                        onClick={() => {
                          const portItem = manualPortfolio.find(p => p.symbol === selectedSymbol);
                          if (portItem) setSellPopupTrade(portItem);
                        }}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow-md cursor-pointer transition-colors"
                      >
                        Sell Stock
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
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
