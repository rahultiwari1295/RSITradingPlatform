import React, { useState, useMemo } from "react";
import {
  Briefcase,
  Plus,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  LineChart,
  Trash2,
  Clock,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { ManualPortfolioTrade, CompletedTrade, UserTrade, ClosedTrade, InTradeTrade } from "../types";
import { formatINR } from "../lib/utils";

interface PortfolioViewProps {
  portfolio?: ManualPortfolioTrade[];
  userTrades?: UserTrade[];
  completedHistory?: CompletedTrade[];
  closedTrades?: ClosedTrade[];
  inTradeTrades?: InTradeTrade[];
  onOpenAddModal?: () => void;
  onOpenBuyModal?: (symbol: string, currentPrice: number, strategyName?: string) => void;
  onOpenSellModal: (trade: any) => void;
  onOpenChart: (symbol: string) => void;
  onDeleteCompletedTrade?: (tradeIdOrIndex: string | number) => void;
  onDeleteTrade?: (tradeId: string) => void;
  onSelectStock?: (stock: any) => void;
}

const avatarGradients = [
  "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
  "linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)",
  "linear-gradient(135deg, #10B981 0%, #059669 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
  "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
  "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
];

function formatSignalDate(dateStr?: string): string {
  if (!dateStr) return "Recent";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

export default function PortfolioView({
  portfolio,
  userTrades,
  completedHistory,
  closedTrades,
  inTradeTrades,
  onOpenAddModal,
  onOpenBuyModal,
  onOpenSellModal,
  onOpenChart,
  onDeleteCompletedTrade,
  onDeleteTrade,
  onSelectStock
}: PortfolioViewProps) {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  const rawHoldings = portfolio || (userTrades as any) || [];
  const activeHoldings = rawHoldings;
  const historyList = completedHistory || (closedTrades as any) || [];

  // Active signals lookup map for live LTP tracking
  const activeSignalMap = useMemo(() => {
    const map = new Map<string, InTradeTrade>();
    (inTradeTrades || []).forEach(t => {
      if (t.symbol) {
        map.set(t.symbol.toUpperCase().trim(), t);
      }
    });
    return map;
  }, [inTradeTrades]);

  // State to store live DB quotes fetched directly from SQLite for non-strategy/manual holdings
  const [liveDbQuotes, setLiveDbQuotes] = useState<Record<string, number>>({});

  useEffect(() => {
    const symsToFetch = activeHoldings
      .map((h: any) => (h.symbol || "").toUpperCase().trim())
      .filter((s: string) => s && !activeSignalMap.has(s) && liveDbQuotes[s] === undefined);

    if (symsToFetch.length === 0) return;

    symsToFetch.forEach((sym: string) => {
      fetch(`/api/stock/quote/${encodeURIComponent(sym)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.close && Number(data.close) > 0) {
            setLiveDbQuotes((prev) => ({ ...prev, [sym]: Number(data.close) }));
          }
        })
        .catch(() => {});
    });
  }, [activeHoldings, activeSignalMap]);

  // Aggregate metrics
  const { totalInvested, totalCurrentValue, totalUnrealizedPnL, returnPct } = useMemo(() => {
    let invested = 0;
    let currentVal = 0;

    activeHoldings.forEach((trade: any) => {
      const sym = (trade.symbol || "").toUpperCase().trim();
      const activeMatch = activeSignalMap.get(sym);
      const dbLtp = liveDbQuotes[sym];
      const buyPrice = Number(trade.buyPrice || 0);
      const qty = Number(trade.quantity || 1);
      invested += buyPrice * qty;

      let curPrice = buyPrice;
      if (activeMatch) {
        curPrice = Number(activeMatch.currentPrice || activeMatch.entryPrice || trade.currentPrice || buyPrice);
      } else if (dbLtp && dbLtp > 0) {
        curPrice = dbLtp;
      } else if (trade.currentPrice && Number(trade.currentPrice) > 0) {
        curPrice = Number(trade.currentPrice);
      }
      currentVal += curPrice * qty;
    });

    const pnl = currentVal - invested;
    const pct = invested > 0 ? (pnl / invested) * 100 : 0;
    return {
      totalInvested: invested,
      totalCurrentValue: currentVal,
      totalUnrealizedPnL: pnl,
      returnPct: pct
    };
  }, [activeHoldings, activeSignalMap, liveDbQuotes]);

  // Realized statistics
  const { totalRealizedPnL, winCount, lossCount, winRate } = useMemo(() => {
    let sumPnl = 0;
    let wins = 0;
    let losses = 0;

    historyList.forEach((t: any) => {
      const pnl = t.pnl ?? ((Number(t.sellPrice || 0) - Number(t.buyPrice || 0)) * Number(t.quantity || 1));
      sumPnl += pnl;
      if (pnl >= 0) wins++;
      else losses++;
    });

    const rate = historyList.length > 0 ? Math.round((wins / historyList.length) * 100) : 100;
    return {
      totalRealizedPnL: sumPnl,
      winCount: wins,
      lossCount: losses,
      winRate: historyList.length > 0 ? rate : 100
    };
  }, [historyList]);

  const handleAddClick = () => {
    if (onOpenAddModal) onOpenAddModal();
    else if (onOpenBuyModal) onOpenBuyModal("WSTCSTPAPR", 637.25, "Breakout Setup");
  };

  const handleCardClick = (holding: any) => {
    const sym = (holding.symbol || "").toUpperCase().trim();
    const activeMatch = activeSignalMap.get(sym);
    const buy = Number(holding.buyPrice || 0);
    const cur = activeMatch
      ? Number(activeMatch.currentPrice || activeMatch.entryPrice || holding.currentPrice || buy)
      : Number(holding.currentPrice || buy);

    const itemData = {
      ...holding,
      symbol: sym,
      currentPrice: cur,
      entryPrice: buy,
      strategyName: activeMatch?.strategyName || holding.strategyName || "Institutional Setup",
      stopLoss: holding.stopLoss || (buy > 0 ? buy * 0.94 : undefined),
      targetPrice: holding.targetPrice || (buy > 0 ? buy * 1.15 : undefined)
    };

    if (onSelectStock) {
      onSelectStock(itemData);
    }
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* 1. HERO BANNER: System-wide Glassmorphic Look */}
      <div className="hero" style={{ marginBottom: 14 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="row gap8">
            <span className="pill green" style={{ fontSize: 9.5, padding: "3px 8px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "currentColor",
                  marginRight: 5,
                  boxShadow: "0 0 6px currentColor"
                }}
              />
              Cloud Synced
            </span>
            <span className="micro dim">Live Paper Ledger</span>
          </div>

          <button
            onClick={handleAddClick}
            className="btn-add-paper"
            style={{ padding: "4px 12px", fontSize: 11, fontWeight: 700 }}
          >
            + Add Position
          </button>
        </div>

        <div className="hero-grid">
          <div>
            <div className="micro">Portfolio Value</div>
            <div className="val num" style={{ fontSize: 21, fontWeight: 800 }}>
              {formatINR(totalCurrentValue)}
            </div>
            <div className="sub dim" style={{ fontSize: 10, marginTop: 4 }}>
              Invested: {formatINR(totalInvested)}
            </div>
          </div>

          <div>
            <div className="micro">Unrealized P&L</div>
            <div
              className={`val num ${totalUnrealizedPnL >= 0 ? "up" : "down"}`}
              style={{ fontSize: 21, fontWeight: 800 }}
            >
              {totalUnrealizedPnL >= 0 ? "+" : "−"}{formatINR(Math.abs(totalUnrealizedPnL))}
            </div>
            <div className={`sub ${totalUnrealizedPnL >= 0 ? "up" : "down"}`}>
              {totalUnrealizedPnL >= 0 ? "+" : ""}{returnPct.toFixed(2)}%
            </div>
          </div>

          <div>
            <div className="micro">Win Rate & Closed</div>
            <div className="val num" style={{ fontSize: 21, fontWeight: 800 }}>
              {historyList.length > 0 ? `${winRate}%` : "100%"}
            </div>
            <div className="sub dim" style={{ fontSize: 10, marginTop: 4 }}>
              {winCount}W · {lossCount}L ({historyList.length} closed)
            </div>
          </div>
        </div>

        <div className="hero-note" style={{ marginTop: 12 }}>
          <span className="hn-ico">💼</span>
          <span>
            {activeHoldings.length > 0
              ? `Tracking ${activeHoldings.length} open position${activeHoldings.length === 1 ? "" : "s"} with live price sync & trailing stops.`
              : "Virtual paper ledger initialized. Log setups to simulate execution risk-free."}
          </span>
        </div>
      </div>

      {/* 2. SUBTABS SWITCHER */}
      <div className="subtabs" style={{ marginBottom: 14 }}>
        <button
          className={`subtab ${activeTab === "active" ? "on" : ""}`}
          onClick={() => setActiveTab("active")}
        >
          Active Positions ({activeHoldings.length})
        </button>
        <button
          className={`subtab ${activeTab === "history" ? "on" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          Closed Realized ({historyList.length})
        </button>
      </div>

      {/* 3. ACTIVE POSITIONS VIEW */}
      {activeTab === "active" ? (
        <div>
          <div className="sec-head" style={{ marginBottom: 12 }}>
            <span className="micro">Open Holdings ({activeHoldings.length})</span>
            <span
              className="micro"
              style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 700 }}
              onClick={handleAddClick}
            >
              + Add Custom Setup →
            </span>
          </div>

          {activeHoldings.length === 0 ? (
            <div className="card" style={{ padding: "36px 20px", textAlign: "center", borderRadius: 20 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: "rgba(99, 102, 241, 0.12)",
                  color: "var(--accent)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 14px",
                  fontSize: 24
                }}
              >
                💼
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink1)" }}>
                No Active Holdings Logged
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink3)",
                  margin: "8px auto 18px",
                  maxWidth: 360,
                  lineHeight: 1.6
                }}
              >
                Click below to manually log a trade, or tap "+ ADD" on any active setup in the Signals tab.
              </div>
              <button
                className="btn primary"
                style={{ padding: "8px 22px", fontSize: 12, fontWeight: 700, margin: "0 auto" }}
                onClick={handleAddClick}
              >
                + Log New Position
              </button>
            </div>
          ) : (
            <div>
              {activeHoldings.map((holding: any, idx: number) => {
                const sym = (holding.symbol || "").toUpperCase().trim();
                const activeMatch = activeSignalMap.get(sym);
                const isSignalActive = !!activeMatch;

                const buy = Number(holding.buyPrice || 0);
                const qty = Number(holding.quantity || 1);
                const invested = buy * qty;

                // Sync live LTP directly from active signals or SQLite DB quote
                const dbLtp = liveDbQuotes[sym];
                const cur = isSignalActive
                  ? Number(activeMatch.currentPrice || activeMatch.entryPrice || holding.currentPrice || buy)
                  : (dbLtp && dbLtp > 0 
                      ? dbLtp 
                      : (holding.currentPrice && Number(holding.currentPrice) > 0 ? Number(holding.currentPrice) : buy));

                const currentVal = cur * qty;
                const pnl = currentVal - invested;
                const roi = buy > 0 ? ((cur - buy) / buy) * 100 : 0;
                const isUp = roi >= 0;
                const stratName = activeMatch?.strategyName || holding.strategyName || "Institutional Momentum";
                const holdingEngine = holding.engine || (activeMatch as any)?.engine || (stratName.toLowerCase().includes("pattern") || stratName.toLowerCase().includes("v3") ? "v3" : "v2");

                const isManual = (holding.strategyName || "").toLowerCase().trim() === "manual";

                return (
                  <div
                    key={holding.tradeId || holding.id || idx}
                    className="trade-h"
                    style={{ animationDelay: `${idx * 60}ms` }}
                    onClick={() => handleCardClick(holding)}
                  >
                    {/* Top Row: Monogram, Symbol, Stars, QTY, Engine, Status Pill, ROI */}
                    <div className="row between" style={{ alignItems: "flex-start" }}>
                      <div className="row gap12" style={{ alignItems: "flex-start" }}>
                        <div
                          className="av"
                          style={{
                            background: avatarGradients[idx % avatarGradients.length],
                            boxShadow: "0 4px 14px rgba(99, 102, 241, 0.25)"
                          }}
                        >
                          {sym.slice(0, 2) || "ST"}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.02em" }}>
                              {sym}
                            </span>
                            <span className="stars" style={{ verticalAlign: "middle" }}>
                              ★★★★★
                              <i style={{ width: "90%" }}>★★★★★</i>
                            </span>
                            <span className="pill" style={{ fontSize: 9.5, padding: "2px 7px" }}>
                              {qty} QTY
                            </span>
                            {!isManual && (
                              <span
                                className={`pill ${holdingEngine === "v2" ? "blue" : "purple"}`}
                                style={{ fontSize: 9, padding: "2px 6.5px", fontWeight: 700 }}
                              >
                                {holdingEngine === "v2" ? "V2 PRO AI" : "V3 PATTERN AI"}
                              </span>
                            )}
                            {isManual ? (
                              <span className="pill" style={{ fontSize: 9.5, padding: "2px 7px", background: "rgba(255,255,255,0.07)", color: "var(--ink2)", fontWeight: 700 }}>
                                ✍️ MANUAL
                              </span>
                            ) : isSignalActive ? (
                              <span className="pill green" style={{ fontSize: 9.5, padding: "2px 7px" }}>
                                <span
                                  style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: "50%",
                                    background: "currentColor",
                                    marginRight: 4,
                                    display: "inline-block"
                                  }}
                                />
                                ACTIVE
                              </span>
                            ) : (
                              <span className="pill red" style={{ fontSize: 9.5, padding: "2px 7px" }}>
                                STRATEGY CLOSED
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 3 }}>
                            {stratName} · Bought on {formatSignalDate(holding.date || holding.buyDate)}
                          </div>
                        </div>
                      </div>

                      {/* Right side: Floating P&L and % */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div className={`num ${isUp ? "up" : "down"}`} style={{ fontSize: 15, fontWeight: 800 }}>
                          {isUp ? "+" : ""}{formatINR(pnl)}
                        </div>
                        <div
                          className={`num ${isUp ? "up" : "down"}`}
                          style={{ fontSize: 11.5, fontWeight: 700, marginTop: 2 }}
                        >
                          {isUp ? "+" : ""}{roi.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* 4-Column Financial Metric Grid */}
                    <div className="pf-grid">
                      <div className="pf-col">
                        <div className="pf-lbl">Bought Price</div>
                        <div className="pf-val">{formatINR(buy)}</div>
                      </div>
                      <div className="pf-col">
                        <div className="pf-lbl" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span>Live LTP</span>
                          {(isSignalActive || isManual) && (
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: "var(--profit)",
                                display: "inline-block"
                              }}
                            />
                          )}
                        </div>
                        <div className="pf-val">{cur ? formatINR(cur) : "—"}</div>
                      </div>
                      <div className="pf-col">
                        <div className="pf-lbl">Invested</div>
                        <div className="pf-val">{formatINR(invested)}</div>
                      </div>
                      <div className="pf-col">
                        <div className="pf-lbl">Current Value</div>
                        <div className="pf-val">{currentVal ? formatINR(currentVal) : "—"}</div>
                      </div>
                    </div>

                    {/* Inactive Strategy Warning Banner (Only for algorithmic strategy setups, not for Manual) */}
                    {!isSignalActive && !isManual && (
                      <div className="pf-alert">
                        <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
                        <div>
                          <b>Setup exited in Strategy:</b> This position is no longer an active signal in the engine.
                          Review the chart or log an exit to lock in performance.
                        </div>
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="pf-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="pf-btn outline"
                        onClick={() => onOpenChart(holding.symbol)}
                        title="Open TradingView Chart"
                      >
                        <LineChart style={{ width: 14, height: 14, color: "var(--accent)" }} />
                        <span>Chart</span>
                      </button>
                      <button
                        className="pf-btn exit"
                        onClick={() =>
                          onOpenSellModal({
                            ...holding,
                            symbol: sym,
                            currentPrice: cur || holding.currentPrice || buy,
                            buyPrice: buy,
                            quantity: qty
                          })
                        }
                      >
                        <ArrowUpRight style={{ width: 14, height: 14 }} />
                        <span>Log Exit / Sell</span>
                      </button>
                      {onDeleteTrade && (
                        <button
                          className="pf-btn del"
                          onClick={() => {
                            if (window.confirm(`Remove ${sym} from your paper portfolio?`)) {
                              onDeleteTrade(holding.tradeId || holding.id || sym);
                            }
                          }}
                          title="Delete holding"
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 4. CLOSED REALIZED HISTORY VIEW */
        <div>
          <div className="sec-head" style={{ marginBottom: 12 }}>
            <span className="micro">Realized Performance History ({historyList.length})</span>
            <span
              className={`num ${totalRealizedPnL >= 0 ? "up" : "down"}`}
              style={{ fontSize: 11.5, fontWeight: 700 }}
            >
              Total Realized: {totalRealizedPnL >= 0 ? "+" : ""}{formatINR(totalRealizedPnL)}
            </span>
          </div>

          {historyList.length === 0 ? (
            <div className="card" style={{ padding: "36px 20px", textAlign: "center", borderRadius: 20 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: "rgba(99, 102, 241, 0.12)",
                  color: "var(--accent)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 14px",
                  fontSize: 24
                }}
              >
                📜
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink1)" }}>
                No Closed Paper Trades Yet
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink3)",
                  margin: "8px auto 0",
                  maxWidth: 360,
                  lineHeight: 1.6
                }}
              >
                When you exit an open paper holding, your realized P&L, hold duration, and return % will be permanently
                logged here.
              </div>
            </div>
          ) : (
            <div>
              {historyList.map((c: any, idx: number) => {
                const ret = c.pnlPct ?? c.returnPct ?? 0;
                const isWin = ret >= 0;
                const exitP = c.sellPrice || c.exitPrice || 0;
                const buyP = c.buyPrice || c.entryPrice || 0;
                const pnlVal =
                  c.pnl ?? (exitP > 0 && buyP > 0 ? (exitP - buyP) * (c.quantity || 1) : 0);

                return (
                  <div
                    key={c.tradeId || idx}
                    className={`closed-row ${isWin ? "win" : "lose"}`}
                    onClick={() => {
                      if (onSelectStock) onSelectStock(c);
                    }}
                  >
                    <div className="cr-top">
                      <div
                        className="av"
                        style={{
                          background: isWin
                            ? "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.4))"
                            : "linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(220, 38, 38, 0.4))",
                          color: isWin ? "var(--profit)" : "var(--loss)",
                          fontSize: 12,
                          fontWeight: 800
                        }}
                      >
                        {c.symbol?.slice(0, 2) || "TR"}
                      </div>
                      <div className="cr-info">
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="cr-sym">{c.symbol}</span>
                          <span
                            className={`pill ${isWin ? "green" : "red"}`}
                            style={{ fontSize: 9, padding: "2px 6px" }}
                          >
                            {isWin ? "WIN" : "LOSS"}
                          </span>
                          {c.quantity && (
                            <span className="pill" style={{ fontSize: 9, padding: "2px 6px" }}>
                              {c.quantity} Qty
                            </span>
                          )}
                        </div>
                        <div className="cr-path">
                          {c.strategyName || "Institutional Strategy"} · {c.holdDays || c.holdingDays || 1}d hold
                        </div>
                      </div>
                      <div className="cr-pnl">
                        <div className={`cr-amount num ${isWin ? "up" : "down"}`}>
                          {pnlVal >= 0 ? "+" : ""}{formatINR(pnlVal)}
                        </div>
                        <div className={`cr-pct num ${isWin ? "up" : "down"}`}>
                          {ret >= 0 ? "+" : ""}{ret.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    <div className="cr-footer">
                      <div className="cr-meta">
                        Entry: <b>{formatINR(buyP)}</b> → Exit: <b>{formatINR(exitP)}</b> (
                        {c.sellDate || c.exitDate || "Realized"})
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          className="btn"
                          style={{ padding: "3px 8px", fontSize: 10, fontWeight: 700 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenChart(c.symbol);
                          }}
                        >
                          Chart
                        </button>
                        {onDeleteCompletedTrade && c.tradeId && (
                          <button
                            className="btn"
                            style={{ padding: "3px 7px", fontSize: 10, color: "var(--ink3)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete trade record for ${c.symbol}?`)) {
                                onDeleteCompletedTrade(c.tradeId);
                              }
                            }}
                            title="Delete record"
                          >
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
