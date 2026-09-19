import React, { useState, useEffect } from "react";
import { X, Check, ArrowUpRight } from "lucide-react";
import { formatINR } from "../../lib/utils";

interface SellModalProps {
  trade: {
    tradeId?: string;
    symbol: string;
    buyPrice: number;
    quantity?: number;
    currentPrice?: number | null;
    strategyName?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { tradeId?: string; symbol: string; sellPrice: number; sellQuantity: number }) => void;
}

export default function SellModal({
  trade,
  isOpen,
  onClose,
  onSubmit
}: SellModalProps) {
  const [sellPrice, setSellPrice] = useState<number | "">("");
  const [sellQty, setSellQty] = useState<number | "">("");

  useEffect(() => {
    if (trade) {
      setSellPrice(trade.currentPrice || trade.buyPrice || "");
      setSellQty(trade.quantity || 1);
    }
  }, [trade]);

  if (!isOpen || !trade) return null;

  const totalHoldingQty = trade.quantity || 1;
  const buyPrice = trade.buyPrice || 0;
  const numQty = Number(sellQty || 0);
  const numSellPrice = Number(sellPrice || 0);
  const totalCost = buyPrice * numQty;
  const totalReceived = numSellPrice * numQty;
  const realizedPnL = totalReceived - totalCost;
  const realizedRoiPct = totalCost > 0 ? (realizedPnL / totalCost) * 100 : 0;
  const isProfit = realizedPnL >= 0;

  const handleSetPercentQty = (fraction: number) => {
    const calculated = Math.max(1, Math.round(totalHoldingQty * fraction));
    setSellQty(calculated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellPrice || !sellQty) return;
    onSubmit({
      tradeId: trade.tradeId,
      symbol: trade.symbol,
      sellPrice: Number(sellPrice),
      sellQuantity: Number(sellQty)
    });
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--s1)",
          border: "1px solid var(--line-2)",
          borderRadius: 22,
          padding: "24px 22px",
          position: "relative",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(239, 68, 68, 0.15)",
          color: "var(--ink1)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--s2)",
            border: "1px solid var(--line)",
            color: "var(--ink2)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center"
          }}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.4))",
              color: "var(--loss)",
              display: "grid",
              placeItems: "center",
              fontSize: 16,
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              border: "1px solid rgba(239, 68, 68, 0.3)"
            }}
          >
            {trade.symbol.slice(0, 2)}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>
              Exit {trade.symbol}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink3)", marginTop: 2 }}>
              Bought at {formatINR(trade.buyPrice)} · Holding {totalHoldingQty} shares
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--ink3)",
                marginBottom: 6,
                fontFamily: "'JetBrains Mono', monospace"
              }}
            >
              Exit Price (INR)
            </label>
            <input
              type="number"
              step="0.05"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0.00"
              style={{
                width: "100%",
                background: "var(--s2)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "11px 14px",
                fontSize: 14,
                fontWeight: 800,
                color: "var(--ink1)",
                outline: "none",
                fontFamily: "'JetBrains Mono', monospace"
              }}
              required
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--ink3)",
                  fontFamily: "'JetBrains Mono', monospace"
                }}
              >
                Quantity to Exit
              </label>
              <span style={{ fontSize: 10, color: "var(--ink3)", fontFamily: "'JetBrains Mono', monospace" }}>
                Max: {totalHoldingQty}
              </span>
            </div>

            {/* Quick Partial Exit Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
              {[
                { label: "25%", frac: 0.25 },
                { label: "50%", frac: 0.50 },
                { label: "75%", frac: 0.75 },
                { label: "100%", frac: 1.0 }
              ].map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => handleSetPercentQty(b.frac)}
                  style={{
                    padding: "6px 0",
                    borderRadius: 8,
                    background: "var(--s2)",
                    border: "1px solid var(--line)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink2)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <input
              type="number"
              min="1"
              max={totalHoldingQty}
              value={sellQty}
              onChange={(e) => setSellQty(e.target.value === "" ? "" : Number(e.target.value))}
              style={{
                width: "100%",
                background: "var(--s2)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "11px 14px",
                fontSize: 14,
                fontWeight: 800,
                color: "var(--ink1)",
                outline: "none",
                fontFamily: "'JetBrains Mono', monospace"
              }}
              required
            />
          </div>

          <div
            style={{
              background: isProfit ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
              border: `1px solid ${isProfit ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
              borderRadius: 12,
              padding: "12px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: 9.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: isProfit ? "var(--profit)" : "var(--loss)",
                  fontFamily: "'JetBrains Mono', monospace"
                }}
              >
                Realized P&L
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: isProfit ? "var(--profit)" : "var(--loss)",
                  fontFamily: "'JetBrains Mono', monospace"
                }}
              >
                {isProfit ? "+" : ""}{formatINR(realizedPnL)}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  display: "block",
                  fontSize: 9.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: isProfit ? "var(--profit)" : "var(--loss)",
                  fontFamily: "'JetBrains Mono', monospace"
                }}
              >
                Realized Return
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: isProfit ? "var(--profit)" : "var(--loss)",
                  fontFamily: "'JetBrains Mono', monospace"
                }}
              >
                {isProfit ? "+" : ""}{realizedRoiPct.toFixed(2)}%
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{ flex: 1, padding: "10px", fontSize: 12.5, fontWeight: 700 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              style={{
                flex: 1,
                padding: "10px",
                fontSize: 12.5,
                fontWeight: 700,
                background: "var(--loss)",
                color: "#fff",
                border: "none",
                boxShadow: "0 4px 14px rgba(239, 68, 68, 0.35)"
              }}
            >
              <Check style={{ width: 14, height: 14 }} />
              Confirm Exit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
