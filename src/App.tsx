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
  Send, 
  Search, 
  RefreshCw, 
  Settings, 
  DollarSign, 
  CheckCircle2, 
  ExternalLink,
  Sliders,
  ShieldCheck,
  ChevronRight,
  BellRing,
  HelpCircle,
  TrendingDown
} from "lucide-react";
import { TradeRecord, TerminalKPIs, TradeState, UpcomingStock } from "./types";
import KPICards from "./components/KPICards";
import TradingViewWidget from "./components/TradingViewWidget";

export default function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<{ kpis: TerminalKPIs; tableData: TradeRecord[] }>({
    kpis: {
      inEntryZone: 0,
      tlCrossed: 0,
      inTrade: 0,
      winRate: 0,
      avgReturn: 0
    },
    tableData: []
  });
  const [dataSource, setDataSource] = useState<"live" | "failed">("failed");
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  // Upcoming setup bounce alerts state
  const [upcomingStocks, setUpcomingStocks] = useState<UpcomingStock[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState<boolean>(false);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);

  // Filter Tabs
  const [activeTab, setActiveTab] = useState<"active" | "setup" | "portfolio" | "backtest">("active");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [strengthFilter, setStrengthFilter] = useState<string>("ALL");

  // Helper to safely format relative dates
  const formatCompactDate = (dateStr: string | null) => {
    if (!dateStr) return "Ongoing";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  // Fetch terminal metrics dynamically with API support
  const fetchTerminalData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/terminal-data");
      const result = await res.json();
      if (result.success) {
        setData({
          kpis: result.kpis || { inEntryZone: 0, tlCrossed: 0, inTrade: 0, winRate: 0, avgReturn: 0 },
          tableData: result.tableData || []
        });
        setDataSource("live");
        setErrorInfo(null);

        // Initialize active trading selection with the first active element found
        const table = result.tableData || [];
        const firstActive = table.find((t: TradeRecord) => t.tradeState === "ACTIVE");
        if (firstActive) {
          setSelectedSymbol(firstActive.symbol);
        } else if (table.length > 0) {
          setSelectedSymbol(table[0].symbol);
        }
      } else {
        setDataSource("failed");
        setErrorInfo(result.error || "Wix endpoint returned unsuccessful status");
      }
    } catch (err: any) {
      console.error("API Fetch Error:", err);
      setDataSource("failed");
      setErrorInfo(err.message || "Failed to reach node proxy");
    } finally {
      setLoading(false);
    }
  };

  // Fetch upcoming/bounce list directly
  const fetchUpcomingStocks = async () => {
    setUpcomingLoading(true);
    try {
      const res = await fetch("/api/upcoming-stocks");
      const result = await res.json();
      if (result.success && Array.isArray(result.status)) {
        setUpcomingStocks(result.status);
        setUpcomingError(null);
      } else {
        setUpcomingError(result.error || "Wix bounce endpoint returned unsuccessful status");
      }
    } catch (err: any) {
      console.error("Upcoming Stocks Fetch Error:", err);
      setUpcomingError(err.message || "Failed to reach node proxy for upcoming stocks");
    } finally {
      setUpcomingLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminalData();
    fetchUpcomingStocks();
  }, []);

  // Sync state mutations dynamically on the client side
  const togglePurchasedStatus = (tradeId: string) => {
    const updated = data.tableData.map(item => {
      if (item.tradeId === tradeId) {
        const nextState = !item.purchased;
        return { 
          ...item, 
          purchased: nextState,
          purchasePrice: nextState ? (item.purchasePrice || item.entryPrice) : undefined,
          purchaseQty: nextState ? (item.purchaseQty || 100) : undefined,
          purchasedDate: nextState ? (item.purchasedDate || new Date().toISOString()) : undefined
        };
      }
      return item;
    });

    setData(prev => ({
      ...prev,
      tableData: updated
    }));
  };

  // Get count stats
  const activeSignals = data.tableData.filter(t => t.tradeState === "ACTIVE" || t.tradeState === "SETUP");
  const portfolioList = data.tableData.filter(t => t.purchased);
  const setupZones = data.tableData.filter(t => t.tradeState === "SETUP" || t.tradeState === "WATCHING");

  // --- DETAILED CALCULATIONS FOR DYNAMIC METRICS OVER COHORT DATA ---

  // 1. Active Tab Calculations
  const activeList = data.tableData.filter(t => t.tradeState === "ACTIVE");
  const activeCountVal = activeList.length;
  const activeProfitableCount = activeList.filter(t => {
    const rawLtp = t.currentLtp !== undefined ? t.currentLtp : (t.ltp !== undefined ? t.ltp : 0);
    return rawLtp > 0 && rawLtp > t.entryPrice;
  }).length;
  const activeLossCount = activeList.filter(t => {
    const rawLtp = t.currentLtp !== undefined ? t.currentLtp : (t.ltp !== undefined ? t.ltp : 0);
    return rawLtp > 0 && rawLtp < t.entryPrice;
  }).length;
  
  let totalActiveRoiSum = 0;
  let activeLtpCount = 0;
  activeList.forEach(t => {
    const rawLtp = t.currentLtp !== undefined ? t.currentLtp : (t.ltp !== undefined ? t.ltp : 0);
    if (rawLtp > 0 && t.entryPrice > 0) {
      totalActiveRoiSum += ((rawLtp - t.entryPrice) / t.entryPrice) * 100;
      activeLtpCount++;
    }
  });
  const avgActiveRoi = activeLtpCount > 0 ? (totalActiveRoiSum / activeLtpCount) : 0;

  // 2. Portfolio Calculations
  const portfolioItems = data.tableData.filter(t => t.purchased);
  const totalPortfolioInvested = portfolioItems.reduce((sum, item) => {
    const price = item.purchasePrice || item.entryPrice || 0;
    const qty = item.purchaseQty || 100;
    return sum + (price * qty);
  }, 0);
  
  const totalPortfolioCurrentValue = portfolioItems.reduce((sum, item) => {
    const rawLtp = item.currentLtp !== undefined ? item.currentLtp : (item.ltp !== undefined ? item.ltp : 0);
    const qty = item.purchaseQty || 100;
    return sum + (rawLtp * qty);
  }, 0);

  const totalPortfolioPnlVal = totalPortfolioCurrentValue - totalPortfolioInvested;
  const totalPortfolioPnlPct = totalPortfolioInvested > 0 ? (totalPortfolioPnlVal / totalPortfolioInvested) * 100 : 0;
  const portfolioProfitableCount = portfolioItems.filter(item => {
    const rawLtp = item.currentLtp !== undefined ? item.currentLtp : (item.ltp !== undefined ? item.ltp : 0);
    const price = item.purchasePrice || item.entryPrice || 0;
    return rawLtp > 0 && rawLtp > price;
  }).length;
  const portfolioLossCount = portfolioItems.filter(item => {
    const rawLtp = item.currentLtp !== undefined ? item.currentLtp : (item.ltp !== undefined ? item.ltp : 0);
    const price = item.purchasePrice || item.entryPrice || 0;
    return rawLtp > 0 && rawLtp < price;
  }).length;

  // 3. Backtest Calculations
  const backtestExitedList = data.tableData.filter(t => t.isBacktest || t.tradeState === "EXITED");
  const backtestCount = backtestExitedList.length;
  const backtestWinnerCount = backtestExitedList.filter(t => t.exitPrice !== null && t.exitPrice >= t.entryPrice).length;
  const backtestLoserCount = backtestExitedList.filter(t => t.exitPrice !== null && t.exitPrice < t.entryPrice).length;
  const backtestWinRatePct = backtestCount > 0 ? (backtestWinnerCount / backtestCount) * 100 : 0;
  
  const backtestAvgReturnPct = backtestCount > 0 
    ? backtestExitedList.reduce((sum, item) => {
        if (item.tradeReturnPct !== null) return sum + item.tradeReturnPct;
        if (item.exitPrice !== null && item.entryPrice > 0) {
          return sum + ((item.exitPrice - item.entryPrice) / item.entryPrice * 100);
        }
        return sum;
      }, 0) / backtestCount 
    : 0;

  // 4. Upcoming Bounce Calculations
  const upcomingSetupCount = upcomingStocks.filter(u => u.tradeState === "SETUP").length;
  const upcomingWatchingCount = upcomingStocks.filter(u => u.tradeState === "WATCHING").length;
  const upcomingStrongCount = upcomingStocks.filter(u => u.quality === "STRONG").length;
  const upcomingAvgScore = upcomingStocks.length ? upcomingStocks.reduce((sum, item) => sum + item.tradeStateScore, 0) / upcomingStocks.length : 0;

  // Filtering search list records
  const filteredRecords = data.tableData.filter((record) => {
    const matchesSearch = record.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          record.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStrength = strengthFilter === "ALL" || record.entryStrength === strengthFilter;

    if (!matchesSearch || !matchesStrength) return false;

    switch (activeTab) {
      case "active":
        return record.tradeState === "ACTIVE";
      case "setup":
        return record.tradeState === "SETUP" || record.tradeState === "WATCHING";
      case "portfolio":
        return record.purchased;
      case "backtest":
        return record.isBacktest && record.tradeState === "EXITED";
      default:
        return true;
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Dynamic Connection Banner */}
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
        </div>
        <div className="flex items-center gap-3 font-mono text-[9px] sm:text-[11px] text-slate-400 justify-between md:justify-end w-full md:w-auto border-t border-slate-800/60 pt-1.5 md:border-t-0 md:pt-0">
          <span>Server Time: 2026-06-20 IST</span>
          <span className="text-slate-700 hidden md:inline">|</span>
          <span className="text-slate-300 font-medium">AngelOne Auth: ACTIVE</span>
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
                <p className="text-xs text-gray-500 hidden sm:block truncate">Automated Weekly Trendline Cross &amp; RSI Exit Sentinel</p>
                <p className="text-[11px] text-gray-500 block sm:hidden">RSI Exit Sentinel &amp; Trendline Tracker</p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-between md:justify-end w-full md:w-auto">
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 w-60 rounded-lg text-xs bg-slate-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <button
                onClick={() => { fetchTerminalData(); fetchUpcomingStocks(); }}
                disabled={loading || upcomingLoading}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 w-full sm:w-auto rounded-lg bg-white border border-gray-200 hover:bg-slate-50 text-xs font-semibold text-gray-700 transition-all shadow-3xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${(loading || upcomingLoading) ? "animate-spin" : ""}`} />
                {loading || upcomingLoading ? "Syncing..." : "Force Sync"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Metric Cards Grid Component */}
        <KPICards 
          kpis={data.kpis} 
          activeCount={data.tableData.filter(t => t.tradeState === "ACTIVE").length} 
          setupCount={setupZones.length} 
        />

        {/* Interactive Layout Section: Core Tables & TradingView Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Alerts & Trade Tables (8 Columns) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            {/* Table Control Hub */}
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gray-50/50">
                
                {/* Navigation Tabs */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap p-1 gap-1 rounded-xl bg-gray-150/80 border border-gray-200/30 w-full xl:w-auto">
                  <button
                    onClick={() => setActiveTab("active")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer text-center whitespace-nowrap truncate ${
                      activeTab === "active"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
                    }`}
                  >
                    🚀 Active ({data.tableData.filter(t => t.tradeState === "ACTIVE").length})
                  </button>
                  <button
                    onClick={() => setActiveTab("setup")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer text-center whitespace-nowrap truncate ${
                      activeTab === "setup"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
                    }`}
                  >
                    👁️ Setup ({upcomingStocks.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("portfolio")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer text-center whitespace-nowrap truncate ${
                      activeTab === "portfolio"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
                    }`}
                  >
                    🏆 Portfolio ({portfolioList.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("backtest")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all duration-150 cursor-pointer text-center whitespace-nowrap truncate ${
                      activeTab === "backtest"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
                    }`}
                  >
                    📜 Backtests ({data.tableData.filter(t => t.isBacktest).length})
                  </button>
                </div>

                {/* Dropdowns Filters */}
                <div className="flex items-center gap-2 justify-between w-full xl:w-auto border-t border-gray-150 pt-3 xl:border-t-0 xl:pt-0">
                  <span className="text-[11px] font-bold text-gray-400 uppercase font-mono tracking-wider">Quality Level:</span>
                  <select
                    value={strengthFilter}
                    onChange={(e) => setStrengthFilter(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg text-xs py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-3xs hover:border-gray-300 font-semibold text-gray-700 transition-colors"
                  >
                    <option value="ALL">All Strengths</option>
                    <option value="STRONG">🟢 Strong Only</option>
                    <option value="MEDIUM">🟡 Medium Only</option>
                    <option value="WEAK">⚪ Weak Only</option>
                  </select>
                </div>
              </div>

              {/* Tab-Aware Rich Analytical Insights Panel */}
              <div className="px-4 py-3 bg-linear-to-r from-slate-50 to-indigo-50/10 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between text-xs text-gray-600">
                {activeTab === "active" && (
                  <>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="font-semibold text-indigo-950 font-mono">🚀 CORES ACTIVE INSIGHTS:</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Profitable Setups: <strong className="text-emerald-700 font-mono">{activeProfitableCount}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        In Drawdown: <strong className="text-rose-700 font-mono">{activeLossCount}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">|</span>
                      <span className="font-mono text-[11px]">
                        Avg Floating ROI: <strong className={avgActiveRoi >= 0 ? "text-emerald-600" : "text-rose-500"}>
                          {avgActiveRoi >= 0 ? "+" : ""}{avgActiveRoi.toFixed(2)}%
                        </strong>
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 italic">Live floating alerts tracked by RSI Sentinel</div>
                  </>
                )}

                {activeTab === "setup" && (
                  <>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="font-semibold text-indigo-950 font-mono">👁️ BOUNCE MONITOR INSIGHTS:</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        In SETUP state: <strong className="text-amber-700 font-mono">{upcomingSetupCount}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        In WATCHING state: <strong className="text-purple-700 font-mono">{upcomingWatchingCount}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Strong Quality: <strong className="text-emerald-700 font-mono">{upcomingStrongCount}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">|</span>
                      <span>
                        Avg State Score: <strong className="text-indigo-600 font-mono">{upcomingAvgScore.toFixed(1)}</strong>
                      </span>
                    </div>
                    <div className="text-[11px] text-indigo-500/80 font-bold font-mono">Ready to Bounce list loaded live from Wix</div>
                  </>
                )}

                {activeTab === "portfolio" && (
                  <>
                    <div className="flex flex-wrap items-center gap-4 w-full justify-between">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="font-semibold text-emerald-950 font-mono">🏆 PORTFOLIO BALANCE SHEETS:</span>
                        <span>
                          Invested: <strong className="text-slate-800 font-mono">₹{totalPortfolioInvested.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</strong>
                        </span>
                        <span>
                          Current Value: <strong className="text-slate-800 font-mono">₹{totalPortfolioCurrentValue.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</strong>
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">|</span>
                        <span className="flex items-center gap-1">
                          Net Gain/Loss: <strong className={`font-mono ${totalPortfolioPnlVal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {totalPortfolioPnlVal >= 0 ? "+" : ""}₹{totalPortfolioPnlVal.toLocaleString("en-IN", { maximumFractionDigits: 1 })} ({totalPortfolioPnlVal >= 0 ? "+" : ""}{totalPortfolioPnlPct.toFixed(2)}%)
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-medium">Profit: {portfolioProfitableCount}</span>
                        <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 font-medium">Loss: {portfolioLossCount}</span>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "backtest" && (
                  <>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="font-semibold text-indigo-950 font-mono">📜 HISTORICAL EXIT STRATEGY STATS:</span>
                      <span>
                        Total Logs: <strong className="text-slate-800 font-mono">{backtestCount}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Wins: <strong className="text-emerald-700 font-mono">{backtestWinnerCount}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Losses: <strong className="text-rose-700 font-mono">{backtestLoserCount}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">|</span>
                      <span>
                        Avg Exit Return: <strong className={`font-mono ${backtestAvgReturnPct >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                          {backtestAvgReturnPct >= 0 ? "+" : ""}{backtestAvgReturnPct.toFixed(2)}%
                        </strong>
                      </span>
                    </div>
                    <span className="text-[11px] font-bold font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                      Win Rate: {backtestWinRatePct.toFixed(1)}%
                    </span>
                  </>
                )}
              </div>

              {/* Live Alerts & Tables */}
              <div className="overflow-x-auto min-h-[400px]">
                {activeTab === "setup" ? (
                  upcomingLoading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-3">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-400 text-xs font-mono">Synchronizing bounce alerts from Wix upcomingStock...</p>
                    </div>
                  ) : upcomingStocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center">
                      <BookOpen className="w-10 h-10 text-gray-300 mb-3" />
                      <h4 className="font-semibold text-gray-700 text-sm">No upcoming bounce triggers detected currently</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm font-mono">
                        Check back later or force manual sync above.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200/60 font-mono text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                          <th className="px-4 py-3">Symbol / Base Info</th>
                          <th className="px-4 py-3">Bounce Status</th>
                          <th className="px-4 py-3 text-right">LTP Price</th>
                          <th className="px-4 py-3 text-right hidden sm:table-cell">Setup Quality</th>
                          <th className="px-4 py-3 text-center hidden md:table-cell">Ready Score</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {upcomingStocks.map((item) => {
                          const isSelected = selectedSymbol === item.symbol;
                          const rawLtp = item.ltp !== undefined ? item.ltp : 0;
                          return (
                            <tr
                              key={`upcoming-${item.symbol}`}
                              className={`group transition-all hover:bg-slate-50/80 cursor-pointer ${
                                isSelected ? "bg-indigo-50/30" : ""
                              }`}
                              onClick={() => setSelectedSymbol(item.symbol)}
                            >
                              <td className="px-4 py-3.5">
                                <div className="flex flex-col text-left">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-gray-900 text-sm font-mono tracking-tight group-hover:text-indigo-600 transition-colors">
                                      {item.symbol}
                                    </span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-800 border border-purple-200 uppercase font-mono shrink-0">
                                      BOUNCE SETUP
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                                    Ready-to-bounce Setup Zone
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  item.tradeState === "SETUP"
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-purple-100 text-purple-800 border border-purple-200"
                                }`}>
                                  ● {item.tradeState}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono font-semibold">
                                <div className="flex flex-col">
                                  {rawLtp > 0 ? (
                                    <span className="text-indigo-600 font-bold bg-indigo-50/50 px-1 py-0.5 rounded inline-block text-right">₹{rawLtp.toFixed(2)}</span>
                                  ) : (
                                    <span className="text-slate-400 italic">0.00</span>
                                  )}
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-right font-mono hidden sm:table-cell">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  item.quality === "STRONG" 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}>
                                  {item.quality} Quality
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-center hidden md:table-cell">
                                <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">
                                  Score: {item.tradeStateScore}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedSymbol(item.symbol)}
                                    className={`px-3 py-1.5 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                                      isSelected
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                        : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50/50"
                                    }`}
                                  >
                                    Chart
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                ) : loading ? (
                  <div className="flex flex-col items-center justify-center p-20 gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-xs font-mono">Synchronizing trades with active Wix clusters...</p>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-16 text-center">
                     <BookOpen className="w-10 h-10 text-gray-300 mb-3" />
                     <h4 className="font-semibold text-gray-700 text-sm">No records found matching current active tab</h4>
                     <p className="text-xs text-gray-400 mt-1 max-w-sm">
                       Try adjusting the search input or choosing a different strategy strength filtering option.
                     </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200/60 font-mono text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                        <th className="px-4 py-3">Symbol / Base Info</th>
                        <th className="px-4 py-3">Signal State</th>
                        <th className="px-4 py-3 text-right">Entry / LTP</th>
                        <th className="px-4 py-3 text-right hidden sm:table-cell">MFE Peak / ROI</th>
                        <th className="px-4 py-3 text-center hidden md:table-cell">Score / Gap</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRecords.map((item) => {
                        const isSelected = selectedSymbol === item.symbol;
                        
                        // Robust LTP extraction - fallback cleanly to 0 if missing from Wix API response
                        const rawLtp = item.currentLtp !== undefined 
                          ? item.currentLtp 
                          : (item.ltp !== undefined ? item.ltp : 0);
                        
                        // Calculate live dynamic ROI
                        const calculatedStopLoss = item.entryPrice * (1 - 0.08);
                        const isStopLossTriggered = item.tradeState === "ACTIVE" && rawLtp > 0 && rawLtp < calculatedStopLoss;
                        
                        // Buy state attributes for purchased layout
                        const purchasePrice = item.purchasePrice || item.entryPrice || 0;
                        const purchaseQty = item.purchaseQty || 100;
                        
                        // True P&L strictly parsed from live database
                        const pnlVal = rawLtp > 0 ? (rawLtp - purchasePrice) * purchaseQty : 0;
                        const pnlPct = rawLtp > 0 && purchasePrice > 0 ? ((rawLtp - purchasePrice) / purchasePrice) * 100 : 0;
                        
                        // Potential singular share P&L for non-purchased active zones
                        const potentialPnlVal = rawLtp > 0 ? (rawLtp - item.entryPrice) : 0;
                        const potentialPnlPct = rawLtp > 0 && item.entryPrice > 0 
                          ? ((rawLtp - item.entryPrice) / item.entryPrice) * 100 
                          : 0;

                        const isPositive = item.purchased ? pnlVal >= 0 : potentialPnlVal >= 0;
                        const hasLtp = rawLtp > 0;

                        return (
                          <tr
                            key={item.tradeId}
                            className={`group transition-all hover:bg-slate-50/80 cursor-pointer ${
                              isSelected ? "bg-indigo-50/30" : ""
                            }`}
                            onClick={() => setSelectedSymbol(item.symbol)}
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-gray-900 text-sm font-mono tracking-tight group-hover:text-indigo-600 transition-colors">
                                    {item.symbol}
                                  </span>
                                  {item.purchased ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase font-mono">
                                      PORTFOLIO ITEM
                                    </span>
                                  ) : item.tradeState === "ACTIVE" ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase font-mono">
                                      SIGNAL ALIVE
                                    </span>
                                  ) : null}
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono truncate max-w-[170px] mt-0.5">
                                  {formatCompactDate(item.signalDate)} • {item.tradeId}
                                </span>
                                {item.purchased && (
                                  <span className="text-[9px] font-semibold text-emerald-600 font-mono mt-0.5 block">
                                    Invested: ₹{(purchasePrice * purchaseQty).toLocaleString("en-IN", { maximumFractionDigits: 1 })} ({purchaseQty} shares @ ₹{purchasePrice})
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    item.tradeState === "ACTIVE"
                                      ? "bg-blue-50 text-blue-700 border border-blue-100"
                                      : item.tradeState === "SETUP"
                                      ? "bg-amber-50 text-amber-700 border border-amber-100"
                                      : item.tradeState === "WATCHING"
                                      ? "bg-purple-50 text-purple-700 border border-purple-100"
                                      : "bg-gray-100 text-gray-600 border border-gray-200"
                                  }`}>
                                    ● {item.tradeState}
                                  </span>

                                  {isStopLossTriggered && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-sm bg-red-100 text-red-700 animate-pulse border border-red-200">
                                      SL BREACHED
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-400 block truncate max-w-[150px]">
                                  {item.exitReason ? `Exit: ${item.exitReason}` : `Quality: ${item.entryStrength}`}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-right font-mono">
                              <div className="flex flex-col">
                                <span className="text-gray-900 font-semibold font-sans">
                                  ₹{item.entryPrice ? item.entryPrice.toFixed(2) : "0.00"}
                                </span>
                                <span className="text-[10px] mt-0.5">
                                  {hasLtp ? (
                                    <span className="text-indigo-600 font-bold bg-indigo-50/50 px-1 py-0.5 rounded">LTP: ₹{rawLtp.toFixed(2)}</span>
                                  ) : (
                                    <span className="text-slate-400 bg-slate-100 px-1 py-0.5 rounded text-[9px]">LTP: 0.00</span>
                                  )}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-right font-mono hidden sm:table-cell">
                              <div className="flex flex-col">
                                <span className="text-gray-400 text-[10px]">
                                  MFE: <span className="font-semibold text-emerald-600">+{item.mfeHighWater ? item.mfeHighWater.toFixed(1) : "0"}%</span>
                                </span>
                                
                                {!hasLtp ? (
                                  <span className="text-gray-300 text-[10px] italic">LTP empty</span>
                                ) : item.purchased ? (
                                  <div className="flex flex-col items-end">
                                    <span className={`text-[11px] font-bold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                                      {isPositive ? "▲ +" : "▼ -"}₹{Math.abs(pnlVal).toFixed(2)}
                                    </span>
                                    <span className={`text-[10px] font-semibold ${isPositive ? "text-emerald-500" : "text-red-400"} font-sans`}>
                                      ({isPositive ? "+" : ""}{pnlPct.toFixed(2)}%)
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end">
                                    <span className={`text-[11.5px] font-bold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                                      {isPositive ? "🟢 +" : "🔴 "}{potentialPnlVal > 0 ? `₹${potentialPnlVal.toFixed(2)}` : `-₹${Math.abs(potentialPnlVal).toFixed(2)}`}
                                    </span>
                                    <span className={`text-[9px] font-semibold ${isPositive ? "text-emerald-500" : "text-red-400"}`}>
                                      ({potentialPnlPct.toFixed(2)}% ROI)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-center hidden md:table-cell">
                              <div className="flex flex-col items-center">
                                <span className={`text-[11px] px-1.5 py-0.5 rounded-sm font-bold font-mono ${
                                  item.entryScore >= 80 
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-50 text-slate-700"
                                  }`}>
                                  Score: {item.entryScore}
                                </span>
                                <span className="text-[9px] text-gray-400 font-mono">
                                  RSI Gap: +{item.entryRsiGap ? item.entryRsiGap.toFixed(1) : "0"}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedSymbol(item.symbol)}
                                  className={`px-2 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                                    isSelected
                                      ? "bg-indigo-600 text-white border-indigo-600"
                                      : "bg-white text-gray-700 border-gray-200 hover:bg-slate-50"
                                  }`}
                                  title="Render Interactive Chart"
                                >
                                  Chart
                                </button>

                                <button
                                  onClick={() => togglePurchasedStatus(item.tradeId)}
                                  className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                                    item.purchased
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100/60"
                                      : "bg-white border-gray-200 text-gray-400 hover:bg-slate-50 hover:text-gray-700"
                                  }`}
                                  title={item.purchased ? "Mark Unpurchased" : "Acquire into Portfolio"}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
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

        {/* Dynamic Instructional Bottom Card */}
        <div className="bg-linear-to-r from-indigo-50 to-indigo-100/50 p-5 rounded-xl border border-indigo-100 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="font-semibold text-indigo-950 text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Next-Level Wix API Interfacing
            </h4>
            <p className="text-xs text-indigo-900/80 leading-relaxed max-w-3xl">
              This portal completely decouples the Wix frontend UI elements. All stocks, crossovers, WIN rates, and MFE indicators are pulled cleanly via our optimized Node middleware gateway at: <code className="bg-white/70 px-1 py-0.5 rounded font-mono text-[11px]">/functions/terminalData</code>. Select any stock row to view its exact real-time weekly chart.
            </p>
          </div>
          <a
            href="https://rahultiwari1295.wixstudio.com/angelportfolio/_functions/terminalData"
            target="_blank"
            referrerPolicy="no-referrer"
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-indigo-200/60 rounded-lg text-xs font-semibold text-indigo-800 inline-flex items-center gap-1.5 shadow-3xs cursor-pointer"
          >
            Terminal JSON Resource
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </main>

      {/* Elegant Footer and Status Indicator bar */}
      <footer className="bg-white border-t border-gray-200/80 py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-1 font-mono text-[10px] text-gray-400">
          <p>© 2026 AngelOne Unified Terminal Logic. Manual next-level trading client.</p>
          <p>Powered by Node.js, weekly RSI alerts, and fully automated algorithmic exit shields.</p>
        </div>
      </footer>

    </div>
  );
}
