import React, { useState, useMemo, useEffect } from "react";
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
  livePrices?: Record<string, { price: number; change_pct?: number }>;
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
  if (!dateStr) return "Today";
  try {
    const value = String(dateStr).trim();
    let d: Date;
    const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const yearlessDate = value.match(/^([A-Za-z]{3,9})\s+(\d{1,2})$/);
    if (isoDate) {
      d = new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    } else if (yearlessDate) {
      d = new Date(new Date().getFullYear(), new Date(`${yearlessDate[1]} 1, 2000`).getMonth(), Number(yearlessDate[2]));
    } else {
      d = new Date(value);
    }
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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
  livePrices,
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
      const live = livePrices && sym ? livePrices[sym] : undefined;
      const activeMatch = activeSignalMap.get(sym);
      const dbLtp = liveDbQuotes[sym];
      const buyPrice = Number(trade.buyPrice || 0);
      const qty = Number(trade.quantity || 1);
      invested += buyPrice * qty;

      let curPrice = buyPrice;
      if (live && live.price > 0) {
        curPrice = live.price;
      } else if (activeMatch) {
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
  }, [activeHoldings, activeSignalMap, liveDbQuotes, livePrices]);

  // Realized statistics
  const { totalRealizedPnL, winCount, lossCount, winRate } = useMemo(() => {
    let sumPnl = 0;
    let wins = 0;
    let losses = 0;

    historyList.forEach((t: any) => {
      const pnl = t.pnl ?? ((Number(t.sellPrice || 0) - Number(t.buyPrice || 0)) * Number(t.quantity || 1));
      sumPnl += pnl;
      if (pnl > 0) wins++;
      else if (pnl < 0) losses++;
    });

    const resolvedTrades = wins + losses;
    const rate = resolvedTrades > 0 ? Math.round((wins / resolvedTrades) * 100) : 0;
    return {
      totalRealizedPnL: sumPnl,
      winCount: wins,
      lossCount: losses,
      winRate: rate
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
      portfolioDetail: true,
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
    <div className="pf-page" style={{ paddingBottom: 24 }}>
      <header className="pf-page-heading">
        <span className="pf-page-kicker">Your capital</span>
        <h1>Portfolio</h1>
      </header>
      {/* Portfolio value and performance */}
      <div className="pf-hero">
        <div className="pf-hero-head">
          <div className="pf-hero-kicker">
            <div className="pf-hero-lbl">Net portfolio value</div>
            <span className="pf-sync-tag">Live prices when available</span>
          </div>

          <button onClick={handleAddClick} className="pf-hero-add-btn">
            <Plus style={{ width: 12, height: 12, strokeWidth: 2.8 }} />
            <span>Add Position</span>
          </button>
        </div>

        <div className="pf-hero-body">
          <div className="pf-hero-primary-row">
            <div className="pf-hero-main-val">
              {formatINR(totalCurrentValue)}
            </div>
            <div className={`pf-pnl-pill ${totalUnrealizedPnL >= 0 ? "up" : "down"}`}>
              <span className="pf-pnl-arrow">{totalUnrealizedPnL >= 0 ? "▲" : "▼"}</span>
              <span className="pf-pnl-num">
                {totalUnrealizedPnL >= 0 ? "+" : "−"}{formatINR(Math.abs(totalUnrealizedPnL))}
              </span>
              <span className="pf-pnl-pct">
                ({totalUnrealizedPnL >= 0 ? "+" : ""}{returnPct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="pf-metric-strip">
          <div className="pf-strip-item">
            <div className="pf-strip-label">Invested</div>
            <div className="pf-strip-value">{formatINR(totalInvested)}</div>
          </div>
          <div className="pf-strip-item">
            <div className="pf-strip-label">Realized</div>
            <div className={`pf-strip-value ${totalRealizedPnL >= 0 ? "up" : "down"}`}>
              {totalRealizedPnL >= 0 ? "+" : "−"}{formatINR(Math.abs(totalRealizedPnL))}
            </div>
          </div>
          <div className="pf-strip-item">
            <div className="pf-strip-label">Open positions</div>
            <div className="pf-strip-value">
              {activeHoldings.length}
              <span className="pf-strip-sub"> {activeHoldings.length === 1 ? "position" : "positions"}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 2. SUBTABS SWITCHER */}
      <div className="subtabs pf-subtabs" style={{ marginBottom: 12 }} role="tablist" aria-label="Portfolio positions">
        <button
          role="tab"
          aria-selected={activeTab === "active"}
          className={`subtab ${activeTab === "active" ? "on" : ""}`}
          onClick={() => setActiveTab("active")}
        >
          Open positions ({activeHoldings.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "history"}
          className={`subtab ${activeTab === "history" ? "on" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          Closed trades ({historyList.length})
        </button>
      </div>

      {/* 3. ACTIVE POSITIONS VIEW */}
      {activeTab === "active" ? (
        <div>
          <div className="sec-head pf-section-head" style={{ marginBottom: 10 }}>
            <div>
              <span className="micro">Holdings</span>
            </div>
          </div>

          {activeHoldings.length === 0 ? (
            <div className="card pf-empty-state" style={{ padding: "36px 20px", textAlign: "center", borderRadius: 20 }}>
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
            <div className="pf-holdings-list">
              {activeHoldings.map((holding: any, idx: number) => {
                const sym = (holding.symbol || "").toUpperCase().trim();
                const activeMatch = activeSignalMap.get(sym);
                const isSignalActive = !!activeMatch;

                const buy = Number(holding.buyPrice || 0);
                const qty = Number(holding.quantity || 1);
                const invested = buy * qty;

                // Sync live LTP directly from WebSocket stream, active signals, or SQLite DB quote
                const live = livePrices && sym ? livePrices[sym] : undefined;
                const dbLtp = liveDbQuotes[sym];
                const cur = (live && live.price > 0)
                  ? live.price
                  : (isSignalActive
                      ? Number(activeMatch.currentPrice || activeMatch.entryPrice || holding.currentPrice || buy)
                      : (dbLtp && dbLtp > 0 
                          ? dbLtp 
                          : (holding.currentPrice && Number(holding.currentPrice) > 0 ? Number(holding.currentPrice) : buy)));

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
                    className="pf-card"
                    style={{ animationDelay: `${idx * 45}ms` }}
                    onClick={() => handleCardClick(holding)}
                  >
                    {/* Identity and return stay aligned, with position details on their own line. */}
                    <div className="pf-card-head">
                      <div
                        className="pf-avatar"
                        style={{ background: avatarGradients[idx % avatarGradients.length] }}
                        aria-hidden="true"
                      >
                        {sym.slice(0, 2) || "ST"}
                      </div>
                      <div className="pf-card-id-block">
                        <div className="pf-card-title-row">
                          <button
                            type="button"
                            className="pf-stock-open"
                            aria-label={`View ${sym} stock details`}
                            onClick={(event) => { event.stopPropagation(); handleCardClick(holding); }}
                          >
                            <span className="pf-card-sym">{sym}</span>
                            <ArrowUpRight aria-hidden="true" />
                          </button>
                          <div className={`pf-card-right ${isUp ? "up" : "down"}`}>
                            <div className={`pf-card-pnl ${isUp ? "up" : "down"}`}>
                              {isUp ? "+" : ""}{formatINR(pnl)}
                            </div>
                            <div className={`pf-card-roi ${isUp ? "up" : "down"}`}>
                              {isUp ? "+" : ""}{roi.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Compact 4-Column Data Strip */}
                    <div className="pf-data-row">
                      <div className="pf-data-cell">
                        <span className="pf-data-k">Average buy</span>
                        <span className="pf-data-v">{formatINR(buy)}</span>
                      </div>
                      <div className="pf-data-cell">
                        <span className="pf-data-k">
                          Current
                        </span>
                        <span className="pf-data-v">{cur ? formatINR(cur) : "—"}</span>
                      </div>
                      <div className="pf-data-cell">
                        <span className="pf-data-k">Invested</span>
                        <span className="pf-data-v">{formatINR(invested)}</span>
                      </div>
                      <div className="pf-data-cell">
                        <span className="pf-data-k">Value now</span>
                        <span className="pf-data-v">{currentVal ? formatINR(currentVal) : "—"}</span>
                      </div>
                    </div>

                    {/* Inactive Strategy Warning (if applicable) */}
                    {!isSignalActive && !isManual && (
                      <div className="pf-compact-alert">
                        <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0 }} />
                        <span>Signal ended <span aria-hidden="true">·</span> Review this position</span>
                      </div>
                    )}

                    <div className="pf-card-summary" aria-label="Position details">
                      <span className="pf-card-summary-qty">{qty} shares</span>
                      <span className="pf-card-summary-separator" aria-hidden="true">·</span>
                      <span className="pf-card-summary-strategy">{isManual ? "Manual" : stratName}</span>
                      <span className="pf-card-summary-separator" aria-hidden="true">·</span>
                      <span className="pf-card-summary-date">{formatSignalDate(holding.date || holding.buyDate)}</span>
                    </div>

                    {/* Compact Action Toolbar */}
                    <div className="pf-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="pf-action-btn chart"
                        onClick={() => onOpenChart(holding.symbol)}
                        title="Open TradingView Chart"
                      >
                        <LineChart style={{ width: 13, height: 13 }} />
                        <span>Chart</span>
                      </button>

                      <button
                        className="pf-action-btn exit"
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
                        <ArrowUpRight style={{ width: 13, height: 13 }} />
                        <span>Exit</span>
                      </button>

                      {onDeleteTrade && (
                        <button
                          className="pf-action-btn del"
                          onClick={() => {
                            if (window.confirm(`Remove ${sym} from your paper portfolio?`)) {
                              onDeleteTrade(holding.tradeId || holding.id || sym);
                            }
                          }}
                          title="Delete holding"
                          aria-label={`Delete ${sym} holding`}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
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
          <div className="sec-head pf-closed-section-head" style={{ marginBottom: 12 }}>
            <span className="micro">Trade outcomes</span>
            <span
              className={`num ${totalRealizedPnL >= 0 ? "up" : "down"}`}
              style={{ fontSize: 11.5, fontWeight: 700 }}
            >
              Realized P&amp;L: {totalRealizedPnL >= 0 ? "+" : ""}{formatINR(totalRealizedPnL)}
            </span>
          </div>

          {historyList.length === 0 ? (
            <div className="card pf-empty-state" style={{ padding: "36px 20px", textAlign: "center", borderRadius: 20 }}>
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
                const isWin = ret > 0;
                const isLoss = ret < 0;
                const isFlat = ret === 0;
                const exitP = c.sellPrice || c.exitPrice || 0;
                const buyP = c.buyPrice || c.entryPrice || 0;
                const pnlVal =
                  c.pnl ?? (exitP > 0 && buyP > 0 ? (exitP - buyP) * (c.quantity || 1) : 0);

                return (
                  <div
                    key={c.tradeId || idx}
                    className={`closed-row ${isWin ? "win" : isLoss ? "lose" : "flat"}`}
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
                            : isLoss ? "linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(220, 38, 38, 0.4))" : "var(--s2)",
                          color: isWin ? "var(--profit)" : isLoss ? "var(--loss)" : "var(--ink3)",
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
                            className={`pill ${isWin ? "green" : isLoss ? "red" : ""}`}
                            style={{ fontSize: 9, padding: "2px 6px" }}
                          >
                            {isWin ? "WIN" : isLoss ? "LOSS" : "EVEN"}
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
                        <div className={`cr-amount num ${isWin ? "up" : isLoss ? "down" : ""}`}>
                          {pnlVal >= 0 ? "+" : ""}{formatINR(pnlVal)}
                        </div>
                        <div className={`cr-pct num ${isWin ? "up" : isLoss ? "down" : ""}`}>
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
