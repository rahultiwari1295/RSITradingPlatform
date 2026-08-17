/**
 * QuantSync / AngelOne Algorithmic Trading Terminal
 * Implements the QuantSync Light Editorial Fintech Design System
 */

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Sun,
  Moon,
  Activity,
  CheckCircle2
} from "lucide-react";
import {
  InTradeTrade,
  ClosedTrade,
  ManualPortfolioTrade,
  StrategySummary,
  CompletedTrade
} from "./types";
import SignalsView from "./views/SignalsView";
import StrategiesView from "./views/StrategiesView";
import PortfolioView from "./views/PortfolioView";
import BacktestsView from "./views/BacktestsView";
import BottomNavBar, { TabType } from "./components/BottomNavBar";
import BuyModal from "./components/Modals/BuyModal";
import SellModal from "./components/Modals/SellModal";
import AddPositionModal from "./components/Modals/AddPositionModal";
import ChartModal from "./components/Modals/ChartModal";
import {
  initialSignals,
  initialStrategies,
  initialPortfolio,
  initialBacktests
} from "./data/mockData";

export default function App() {
  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<TabType>("signals");

  // Theme support
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Data States (initialized with realistic datasets)
  const [signals, setSignals] = useState<InTradeTrade[]>(initialSignals);
  const [strategies, setStrategies] = useState<StrategySummary[]>(initialStrategies);
  const [portfolio, setPortfolio] = useState<ManualPortfolioTrade[]>(() => {
    const saved = localStorage.getItem("qs_portfolio");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialPortfolio;
      }
    }
    return initialPortfolio;
  });
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>(initialBacktests);
  const [completedHistory, setCompletedHistory] = useState<CompletedTrade[]>(() => {
    const saved = localStorage.getItem("qs_completed_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Network sync states
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal States
  const [selectedChartSymbol, setSelectedChartSymbol] = useState<string | null>(null);
  const [buyModalData, setBuyModalData] = useState<{
    symbol: string;
    price: number;
    strategyName?: string;
  } | null>(null);
  const [sellModalTrade, setSellModalTrade] = useState<ManualPortfolioTrade | null>(null);
  const [isAddPositionOpen, setIsAddPositionOpen] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Persist portfolio to localStorage
  useEffect(() => {
    localStorage.setItem("qs_portfolio", JSON.stringify(portfolio));
  }, [portfolio]);

  // Persist trade history to localStorage
  useEffect(() => {
    localStorage.setItem("qs_completed_history", JSON.stringify(completedHistory));
  }, [completedHistory]);

  // Fetch live Wix Studio data with proxy fallback
  const fetchLiveTerminalData = async () => {
    setIsSyncing(true);
    let result: any = null;

    try {
      // Direct Wix API call
      const res = await fetch("https://rahultiwari1295.wixstudio.com/angelapi/_functions/terminalData", {
        headers: { Accept: "application/json" }
      });
      if (res.ok) {
        result = await res.json();
      } else {
        throw new Error("Direct Wix call returned non-200");
      }
    } catch (e) {
      // Server proxy fallback
      try {
        const proxyRes = await fetch("/api/terminal-data");
        if (proxyRes.ok) {
          result = await proxyRes.json();
        }
      } catch (proxyErr) {
        console.warn("Wix sync failed:", proxyErr);
      }
    }

    if (result && (result.success || result.generatedAt || result.inTradeTrades)) {
      if (Array.isArray(result.inTradeTrades) && result.inTradeTrades.length > 0) {
        setSignals(result.inTradeTrades);
      }
      if (Array.isArray(result.strategySummary) && result.strategySummary.length > 0) {
        setStrategies(result.strategySummary);
      }
      if (Array.isArray(result.closedTrades) && result.closedTrades.length > 0) {
        setClosedTrades(result.closedTrades);
      }
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      showToast("Live signals synchronized successfully");
    } else {
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }

    setIsSyncing(false);
  };

  useEffect(() => {
    fetchLiveTerminalData();
  }, []);

  // Buy submission handler
  const handleBuySubmit = (data: { symbol: string; buyPrice: number; quantity: number; strategyName?: string }) => {
    const newPosition: ManualPortfolioTrade = {
      tradeId: `port-${Date.now()}`,
      symbol: data.symbol,
      buyPrice: data.buyPrice,
      quantity: data.quantity,
      totalInvested: data.buyPrice * data.quantity,
      strategyName: data.strategyName || "Breakout",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      daysHeld: 1,
      isActiveInStrategy: true,
      currentPrice: data.buyPrice,
      currentROI: 0
    };

    setPortfolio(prev => [newPosition, ...prev]);
    showToast(`Added ${data.quantity} shares of ${data.symbol} to Portfolio`);
  };

  // Sell submission handler
  const handleSellSubmit = (data: { tradeId?: string; symbol: string; sellPrice: number; sellQuantity: number }) => {
    const target = portfolio.find(p => p.tradeId === data.tradeId || p.symbol === data.symbol);
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
      holdDays: target.daysHeld || 10
    };

    setCompletedHistory(prev => [completed, ...prev]);

    // Update remaining quantity or remove
    if ((target.quantity || 1) <= qty) {
      setPortfolio(prev => prev.filter(p => p !== target));
    } else {
      setPortfolio(prev => prev.map(p => {
        if (p === target) {
          const remainingQty = (p.quantity || 1) - qty;
          return {
            ...p,
            quantity: remainingQty,
            totalInvested: p.buyPrice * remainingQty
          };
        }
        return p;
      }));
    }

    showToast(`Exited ${data.symbol} for ${pnl >= 0 ? "+" : ""}${pnlPct.toFixed(1)}% return`);
  };

  // Untracked attention count
  const needsAttentionCount = portfolio.filter(p => !p.isActiveInStrategy).length;

  // Chart navigation helpers
  const allCurrentSymbols = signals.map(s => s.symbol);
  const currentSymbolIdx = selectedChartSymbol ? allCurrentSymbols.indexOf(selectedChartSymbol) : -1;

  const handlePrevChart = () => {
    if (allCurrentSymbols.length === 0) return;
    const prevIdx = (currentSymbolIdx - 1 + allCurrentSymbols.length) % allCurrentSymbols.length;
    setSelectedChartSymbol(allCurrentSymbols[prevIdx]);
  };

  const handleNextChart = () => {
    if (allCurrentSymbols.length === 0) return;
    const nextIdx = (currentSymbolIdx + 1) % allCurrentSymbols.length;
    setSelectedChartSymbol(allCurrentSymbols[nextIdx]);
  };

  const selectedTradeDetails = signals.find(s => s.symbol === selectedChartSymbol) ||
    portfolio.find(p => p.symbol === selectedChartSymbol);

  // Render view body
  const renderScreenContent = () => {
    switch (activeTab) {
      case "signals":
        return (
          <SignalsView
            signals={signals}
            portfolioSymbols={portfolio.map(p => p.symbol)}
            onOpenChart={(sym) => setSelectedChartSymbol(sym)}
            onOpenBuyModal={(sym, price, strat) => setBuyModalData({ symbol: sym, price, strategyName: strat })}
            onRefresh={fetchLiveTerminalData}
            isSyncing={isSyncing}
          />
        );
      case "strategies":
        return (
          <StrategiesView
            strategies={strategies}
            onSelectStrategy={(stratName) => {
              setActiveTab("signals");
            }}
          />
        );
      case "portfolio":
        return (
          <PortfolioView
            portfolio={portfolio}
            completedHistory={completedHistory}
            onOpenAddModal={() => setIsAddPositionOpen(true)}
            onOpenSellModal={(trade) => setSellModalTrade(trade)}
            onOpenChart={(sym) => setSelectedChartSymbol(sym)}
          />
        );
      case "backtest":
        return (
          <BacktestsView
            closedTrades={closedTrades}
            onOpenChart={(sym) => setSelectedChartSymbol(sym)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0E0F14] text-[#14151A] dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Global Navigation & Settings Header */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-[#ECEEF2] dark:border-slate-800 px-4 py-2.5 sm:px-6 sticky top-0 z-40 shadow-3xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-[#14151A] dark:bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
              QS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[14px] sm:text-[15px] tracking-tight">QuantSync</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#ECFDF3] text-[#16A34A] border border-[#86EFAC]/40 font-mono">
                  LIVE
                </span>
              </div>
              <p className="text-[10px] text-[#8B8D98] font-mono hidden sm:block">
                Editorial Fintech Trading Terminal {lastSyncedAt ? `· Synced ${lastSyncedAt}` : ""}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <button
              onClick={fetchLiveTerminalData}
              disabled={isSyncing}
              className="p-2 rounded-[11px] bg-[#F6F7F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#56586A] dark:text-slate-300 transition-colors cursor-pointer"
              title="Refresh Live Signals"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-[#6366F1]" : ""}`} />
            </button>

            {/* Theme switcher */}
            <button
              onClick={() => setDarkMode(prev => !prev)}
              className="p-2 rounded-[11px] bg-[#F6F7F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#56586A] dark:text-slate-300 transition-colors cursor-pointer"
              title="Toggle Light/Dark Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto px-3.5 sm:px-5 pt-3.5 sm:pt-5 pb-[104px]">
        {renderScreenContent()}
      </main>

      {/* Screen Fixed Bottom Navigation */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        needsAttentionCount={needsAttentionCount}
      />

      {/* Interactive Modals */}
      {selectedChartSymbol && (
        <ChartModal
          symbol={selectedChartSymbol}
          isOpen={!!selectedChartSymbol}
          onClose={() => setSelectedChartSymbol(null)}
          onPrev={handlePrevChart}
          onNext={handleNextChart}
          isBought={portfolio.some(p => p.symbol === selectedChartSymbol)}
          onMarkBought={(sym) => {
            setBuyModalData({
              symbol: sym,
              price: (selectedTradeDetails as any)?.currentPrice || (selectedTradeDetails as any)?.entryPrice || 100,
              strategyName: (selectedTradeDetails as any)?.strategyName
            });
          }}
          tradeDetails={{
            currentPrice: (selectedTradeDetails as any)?.currentPrice || (selectedTradeDetails as any)?.entryPrice,
            entryPrice: (selectedTradeDetails as any)?.entryPrice || (selectedTradeDetails as any)?.buyPrice,
            currentROI: (selectedTradeDetails as any)?.currentROI,
            strategyName: (selectedTradeDetails as any)?.strategyName
          }}
          darkMode={darkMode}
        />
      )}

      {buyModalData && (
        <BuyModal
          symbol={buyModalData.symbol}
          initialPrice={buyModalData.price}
          strategyName={buyModalData.strategyName}
          isOpen={!!buyModalData}
          onClose={() => setBuyModalData(null)}
          onSubmit={handleBuySubmit}
        />
      )}

      {sellModalTrade && (
        <SellModal
          trade={sellModalTrade}
          isOpen={!!sellModalTrade}
          onClose={() => setSellModalTrade(null)}
          onSubmit={handleSellSubmit}
        />
      )}

      {isAddPositionOpen && (
        <AddPositionModal
          isOpen={isAddPositionOpen}
          onClose={() => setIsAddPositionOpen(false)}
          onSubmit={handleBuySubmit}
        />
      )}

      {/* Global Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#14151A] text-white px-4 py-2.5 rounded-[14px] text-[12.5px] font-bold shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#8BF694]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
