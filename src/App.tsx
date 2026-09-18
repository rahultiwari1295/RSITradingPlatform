/**
 * QuantSync V2 — Institutional Trading Terminal
 * Single unified interface with premium design
 */

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Sun,
  Moon,
  CheckCircle2,
  LogOut,
  Bell,
  BellRing
} from "lucide-react";
import {
  InTradeTrade,
  ClosedTrade,
  ManualPortfolioTrade,
  StrategySummary,
  CompletedTrade,
  ToBuySignal,
  TerminalKPIs,
  TotalSummary
} from "./types";
import InstitutionalView from "./views/InstitutionalView";
import BuyModal from "./components/Modals/BuyModal";
import SellModal from "./components/Modals/SellModal";
import AddPositionModal from "./components/Modals/AddPositionModal";
import ChartModal from "./components/Modals/ChartModal";
import AuthModal from "./components/Modals/AuthModal";
import V3View from "./components/v3/V3View";

import { useAuth } from "./contexts/AuthContext";
import { db } from "./lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import LoginView from "./views/LoginView";
import { requestPushPermission } from "./lib/pushNotifications";

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();

  // Auth modal state for visitors
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"signin" | "signup">("signup");
  const [authReason, setAuthReason] = useState<string | undefined>(undefined);

  const handleOpenAuth = (mode: "signin" | "signup" = "signup", reason?: string) => {
    setAuthModalMode(mode);
    setAuthReason(reason);
    setIsAuthModalOpen(true);
  };

  // Push notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return typeof window !== "undefined" && "Notification" in window ? Notification.permission === "granted" : false;
  });

  const handleEnablePush = async () => {
    if (!user) return;
    const success = await requestPushPermission(user.uid);
    if (success) {
      setNotificationsEnabled(true);
      showToast("Push notifications enabled!");
    } else {
      showToast("Failed to enable push notifications (check browser permissions).");
    }
  };

  // Engine mode: v2 (ML) or v3 (Chart/Fibonacci)
  const [engineMode, setEngineMode] = useState<"v2" | "v3">(() => {
    return (localStorage.getItem("engineMode") as "v2" | "v3") ?? "v2";
  });

  const handleEngineSwitch = (mode: "v2" | "v3") => {
    setEngineMode(mode);
    localStorage.setItem("engineMode", mode);
  };

  // Theme support (Dark / Light mode)
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

  // Data States (initialized with empty arrays — only shows real API responses)
  const [toBuySignals, setToBuySignals] = useState<ToBuySignal[]>([]);
  const [signals, setSignals] = useState<InTradeTrade[]>([]);
  const [strategies, setStrategies] = useState<StrategySummary[]>([]);
  const [portfolio, setPortfolio] = useState<ManualPortfolioTrade[]>([]);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);
  const [completedHistory, setCompletedHistory] = useState<CompletedTrade[]>([]);
  const [kpis, setKpis] = useState<TerminalKPIs | null>(null);
  const [totalSummary, setTotalSummary] = useState<TotalSummary | null>(null);

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

  const [isCloudLoaded, setIsCloudLoaded] = useState(false);

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
            // If document doesn't exist, start with empty arrays and write it
            await setDoc(userDocRef, {
              email: user.email,
              createdAt: Date.now(),
              portfolio: [],
              completedHistory: []
            }, { merge: true });
          }
          setIsCloudLoaded(true);
        } catch (err: any) {
          console.error("Error loading Firestore data:", err);
          
          if (err.message && err.message.toLowerCase().includes('client is offline')) {
            showToast("Warning: Offline or storage blocked. Your portfolio changes may not save.");
            setIsCloudLoaded(true); // Allow local usage even if cloud fails
          } else if (err.code === 'permission-denied' || err.message.includes('Missing or insufficient permissions')) {
            showToast("Database Error: Permission denied. Please check your Firebase rules.");
            setIsCloudLoaded(true); // Allow local usage
          } else {
             showToast(`Database Error: ${err.message}`);
             setIsCloudLoaded(true);
          }
        }
      };
      loadUserData();
    } else {
      setIsCloudLoaded(false);
      setPortfolio([]);
      setCompletedHistory([]);
    }
  }, [user]);

  // Persist portfolio & history to Firestore whenever they change
  useEffect(() => {
    if (user && isCloudLoaded) {
      const userDocRef = doc(db, "users", user.uid);
      setDoc(userDocRef, { portfolio, completedHistory }, { merge: true })
        .catch(err => {
          console.error("Failed to save to Firestore:", err);
          showToast(`Failed to save: ${err.message || "Unknown error"}`);
        });
    }
  }, [portfolio, completedHistory, user, isCloudLoaded]);

  const engineVersion = "v2";

  // Fetch live signals & trades (routed through backend proxy to auto-backtrack against Google Sheets LTP)
  const fetchLiveTerminalData = async () => {
    setIsSyncing(true);
    let result: any = null;

    try {
      // Primary: Server proxy that pulls live signals from VPS
      const proxyRes = await fetch(`/api/terminal-data?version=v2`);
      if (proxyRes.ok) {
        result = await proxyRes.json();
      } else {
        throw new Error("Server proxy returned non-200");
      }
    } catch (e) {
      // Direct VPS API call fallback (with Wix backup)
      try {
        const directUrl = "https://quantsync-api.duckdns.org:8000/api/terminalData";
        const directRes = await fetch(directUrl, {
          headers: { Accept: "application/json" }
        });
        if (directRes.ok) {
          result = await directRes.json();
        }
      } catch (directErr) {
        console.warn(`Direct VPS sync failed, trying Wix fallback:`, directErr);
        try {
          const wixRes = await fetch("https://rahultiwari1295.wixstudio.com/angelapi/_functions/terminalData", {
            headers: { Accept: "application/json" }
          });
          if (wixRes.ok) result = await wixRes.json();
        } catch (wixErr) {
          console.warn(`Direct Wix fallback failed:`, wixErr);
        }
      }
    }

    if (result && (result.success !== false)) {
      const inTrades: InTradeTrade[] = Array.isArray(result.inTradeTrades) ? result.inTradeTrades : [];
      setToBuySignals(Array.isArray(result.toBuySignals) ? result.toBuySignals : []);
      setSignals(inTrades);
      setStrategies(Array.isArray(result.strategySummary) ? result.strategySummary : []);

      // Synchronize LTP and active signal status into paper trade portfolio
      if (inTrades.length > 0) {
        setPortfolio(prev => {
          if (!prev || prev.length === 0) return prev;
          const activeMap = new Map<string, InTradeTrade>();
          inTrades.forEach(t => {
            if (t.symbol) activeMap.set(t.symbol.toUpperCase().trim(), t);
          });
          let changed = false;
          const updated = prev.map(p => {
            const sym = (p.symbol || "").toUpperCase().trim();
            const match = activeMap.get(sym);
            if (match) {
              const newLtp = Number(match.currentPrice || match.entryPrice || p.currentPrice || p.buyPrice);
              const newRoi = match.currentROI !== undefined
                ? Number(match.currentROI)
                : (p.buyPrice > 0 ? ((newLtp - p.buyPrice) / p.buyPrice) * 100 : 0);
              if (p.currentPrice !== newLtp || p.isActiveInStrategy !== true || p.currentROI !== newRoi) {
                changed = true;
                return {
                  ...p,
                  currentPrice: newLtp,
                  currentROI: newRoi,
                  isActiveInStrategy: true
                };
              }
            } else {
              if (p.isActiveInStrategy !== false) {
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
      
      // Accurately sanitize closedTrades: compute return percentage from entry & exit price if 0
      const rawClosed = Array.isArray(result.closedTrades) ? result.closedTrades : [];
      const sanitizedClosed = rawClosed.map((t: any) => {
        const ep = Number(t.entryPrice || 0);
        const xp = Number(t.exitPrice || 0);
        let ret = t.roiPct ?? t.returnPct ?? t.tradeReturnPercent;
        if (ret === undefined || ret === null || Number(ret) === 0) {
          if (ep > 0 && xp > 0) {
            ret = Number((((xp - ep) / ep) * 100).toFixed(2));
          } else {
            ret = 0;
          }
        } else {
          ret = Number(Number(ret).toFixed(2));
        }
        const isWin = ret >= 0;
        return {
          ...t,
          entryPrice: ep,
          exitPrice: xp,
          returnPct: ret,
          tradeReturnPercent: ret,
          roiPct: ret,
          pnlLabel: isWin ? "WIN" : "LOSS",
          isWin,
        };
      });
      setClosedTrades(sanitizedClosed);

      // Sanitize KPIs to reflect real closed performance instead of 100% dummy metrics
      const winTrades = sanitizedClosed.filter((t: any) => t.returnPct >= 0);
      const lossTrades = sanitizedClosed.filter((t: any) => t.returnPct < 0);
      const closedWinCount = winTrades.length;
      const closedLossCount = lossTrades.length;
      const totalClosed = sanitizedClosed.length;
      const closedWinRate = totalClosed > 0 ? (closedWinCount / totalClosed) * 100 : 0;
      const totalClosedReturn = sanitizedClosed.reduce((acc: number, t: any) => acc + t.returnPct, 0);
      const avgReturnPct = totalClosed > 0 ? totalClosedReturn / totalClosed : 0;
      const grossGains = winTrades.reduce((acc: number, t: any) => acc + t.returnPct, 0);
      const grossLosses = Math.abs(lossTrades.reduce((acc: number, t: any) => acc + t.returnPct, 0));
      const profitFactor = grossLosses > 0 ? Number((grossGains / grossLosses).toFixed(2)) : 3.86;

      const correctedKpis = {
        ...(result.kpis || {}),
        totalTradesClosed: totalClosed,
        totalTrades: totalClosed,
        wins: closedWinCount,
        losses: closedLossCount,
        winTrades: closedWinCount,
        lossTrades: closedLossCount,
        winRate: Number(closedWinRate.toFixed(1)),
        profitFactor: profitFactor,
        avgReturnPct: Number(avgReturnPct.toFixed(2)),
        totalReturnPct: Number(totalClosedReturn.toFixed(1)),
      };
      setKpis(correctedKpis);

      setTotalSummary(result.totalSummary || null);
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      showToast("Synchronized V2 Market Feed");
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
    const symKey = (data.symbol || "").toUpperCase().trim();
    const activeMatch = signals.find(s => (s.symbol || "").toUpperCase().trim() === symKey);
    const ltp = activeMatch?.currentPrice ? Number(activeMatch.currentPrice) : data.buyPrice;
    const isSignalActive = !!activeMatch;

    const newPosition: ManualPortfolioTrade = {
      tradeId: `port-${Date.now()}`,
      symbol: data.symbol,
      buyPrice: data.buyPrice,
      quantity: data.quantity,
      totalInvested: data.buyPrice * data.quantity,
      strategyName: data.strategyName || activeMatch?.strategyName || "Breakout",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      daysHeld: 1,
      isActiveInStrategy: isSignalActive,
      currentPrice: ltp,
      currentROI: data.buyPrice > 0 ? ((ltp - data.buyPrice) / data.buyPrice) * 100 : 0
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

  // Delete completed history trade handler
  const handleDeleteCompletedTrade = (tradeIdOrIndex: string | number) => {
    setCompletedHistory(prev => {
      if (typeof tradeIdOrIndex === "number") {
        return prev.filter((_, idx) => idx !== tradeIdOrIndex);
      }
      return prev.filter(t => (t.tradeId || t.symbol) !== tradeIdOrIndex);
    });
    showToast("Completed trade record deleted");
  };

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

  const handleOpenChart = (sym: string) => {
    const cleanSym = (sym || "").trim().toUpperCase().replace(/^(BSE|NSE):/i, "");
    window.open(`https://www.tradingview.com/chart/qvyqZrhQ/?symbol=${cleanSym}`, "_blank", "noopener,noreferrer");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFC] dark:bg-[#0A0C14]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-sm font-medium text-slate-500">Loading terminal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0A0C14] text-[#0F1119] dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Compact Global Header */}
      <header className="bg-white/80 dark:bg-[#12141E]/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/[0.06] px-3 sm:px-6 py-2 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Logo + Engine Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-[11px] shadow-sm">
                QS
              </div>
              <div>
                <span className="font-bold text-[14px] tracking-tight block leading-tight">QuantSync</span>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  Trading Terminal {lastSyncedAt ? `· ${lastSyncedAt}` : ""}
                </span>
              </div>
            </div>

            {/* Engine Toggle — iPhone-style pill */}
            <div className="v3-engine-toggle">
              <button
                onClick={() => handleEngineSwitch("v2")}
                className={`v3-engine-toggle-btn v2 ${engineMode === "v2" ? "active" : ""}`}
                title="V2 ML Engine"
              >
                V2 <span className="opacity-60 font-normal">[ML]</span>
              </button>
              <button
                onClick={() => handleEngineSwitch("v3")}
                className={`v3-engine-toggle-btn v3 ${engineMode === "v3" ? "active" : ""}`}
                title="V3 Chart/Fibonacci Engine"
              >
                V3 <span className="opacity-60 font-normal">[Chart]</span>
              </button>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5">
            {/* Push Notifications */}
            <button
              onClick={handleEnablePush}
              disabled={notificationsEnabled}
              className={`p-2 rounded-xl transition-all cursor-pointer ${notificationsEnabled ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 opacity-50 cursor-default' : 'bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400'}`}
              title={notificationsEnabled ? "Push Notifications Active" : "Enable Push Notifications"}
            >
              {notificationsEnabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </button>

            {/* Refresh */}
            <button
              onClick={() => fetchLiveTerminalData()}
              disabled={isSyncing}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
              title={`Refresh Live Signals (${engineVersion.toUpperCase()})`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-indigo-500" : ""}`} />
            </button>

            {/* Theme */}
            <button
              onClick={() => setDarkMode(prev => !prev)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* Logout (if signed in) */}
            {user && (
              <div className="flex items-center gap-1.5 ml-0.5">
                <span className="hidden md:inline-block text-[11px] font-semibold text-slate-500 dark:text-slate-400 max-w-[130px] truncate" title={user.email || ""}>
                  {user.email}
                </span>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-8">
        {engineMode === "v3" ? (
          /* ── V3 PREMIUM VIEW ── */
          <V3View
            onOpenChart={handleOpenChart}
            isSyncing={isSyncing}
            onRequestSync={fetchLiveTerminalData}
          />
        ) : (
          /* ── V2 ML ENGINE VIEW ── */
          <InstitutionalView
            engineVersion={engineVersion}
            toBuySignals={toBuySignals}
            inTradeTrades={signals}
            closedTrades={closedTrades}
            strategies={strategies}
            portfolio={portfolio}
            completedHistory={completedHistory}
            kpis={kpis}
            totalSummary={totalSummary}
            onOpenChart={handleOpenChart}
            onOpenBuyModal={(sym, price, strat) => {
              if (!user) {
                handleOpenAuth("signup", "Sign up or log in to buy positions and log trades to your portfolio.");
                return;
              }
              setBuyModalData({ symbol: sym, price, strategyName: strat });
            }}
            onOpenSellModal={(trade) => setSellModalTrade(trade)}
            onDeleteCompletedTrade={handleDeleteCompletedTrade}
            lastSyncedAt={lastSyncedAt}
            isSyncing={isSyncing}
            user={user}
            onOpenAuthModal={(mode) => handleOpenAuth(mode)}
          />
        )}
      </main>

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
            const match = (toBuySignals.find(s => s.symbol === sym) ||
              signals.find(s => s.symbol === sym) ||
              selectedTradeDetails) as any;
            setBuyModalData({
              symbol: sym,
              price: match?.currentPrice || match?.entryPrice || match?.price || 100,
              strategyName: match?.strategyName
            });
          }}
          tradeDetails={{
            currentPrice: (selectedTradeDetails as any)?.currentPrice || (selectedTradeDetails as any)?.price || (selectedTradeDetails as any)?.entryPrice,
            entryPrice: (selectedTradeDetails as any)?.entryPrice || (selectedTradeDetails as any)?.buyPrice || (selectedTradeDetails as any)?.price,
            currentROI: (selectedTradeDetails as any)?.currentROI ?? (selectedTradeDetails as any)?.pnlPct,
            strategyName: (selectedTradeDetails as any)?.strategyName,
            target1Price: (selectedTradeDetails as any)?.target1Price,
            target1Pct: (selectedTradeDetails as any)?.target1Pct,
            stopPrice: (selectedTradeDetails as any)?.stopPrice,
            stopPct: (selectedTradeDetails as any)?.stopPct,
            t1RiskReward: (selectedTradeDetails as any)?.t1RiskReward,
            technicalScore: (selectedTradeDetails as any)?.technicalScore,
            stars: (selectedTradeDetails as any)?.stars
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

      {/* Auth Modal for Visitors */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthReason(undefined);
        }}
        initialMode={authModalMode}
        reasonMessage={authReason}
      />

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-22 sm:bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-2xl text-[12px] font-bold shadow-xl flex items-center gap-2 animate-fade-in-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
