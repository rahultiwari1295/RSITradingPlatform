import React, { useState } from "react";
import { X, Plus, ShieldCheck } from "lucide-react";
import { formatINR } from "../../lib/utils";

interface AddPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    symbol: string;
    buyPrice: number;
    quantity: number;
    strategyName?: string;
    date?: string;
  }) => void;
}

export default function AddPositionModal({
  isOpen,
  onClose,
  onSubmit
}: AddPositionModalProps) {
  const [symbol, setSymbol] = useState("");
  const [buyPrice, setBuyPrice] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">(10);
  const [strategyName, setStrategyName] = useState("Breakout Setup");

  if (!isOpen) return null;

  const total = Number(buyPrice || 0) * Number(quantity || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !buyPrice || !quantity) return;

    onSubmit({
      symbol: symbol.toUpperCase().trim(),
      buyPrice: Number(buyPrice),
      quantity: Number(quantity),
      strategyName,
      date: new Date().toISOString().split("T")[0]
    });

    setSymbol("");
    setBuyPrice("");
    setQuantity(10);
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
          boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 40px var(--glow)",
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
              background: "linear-gradient(135deg, var(--accent), var(--violet))",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 20,
              boxShadow: "0 4px 16px var(--glow)"
            }}
          >
            💼
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.02em" }}>
              Add Paper Position
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink3)", marginTop: 2 }}>
              Manually track a stock position in your portfolio
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
              Symbol (NSE / BSE)
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. RELIANCE, TATASTEEL"
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
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: "uppercase"
              }}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
                Buy Price (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value === "" ? "" : Number(e.target.value))}
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
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="10"
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
          </div>

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
              Strategy Setup
            </label>
            <select
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              style={{
                width: "100%",
                background: "var(--s2)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "11px 14px",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--ink1)",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="Breakout Setup">Breakout Setup</option>
              <option value="Wyckoff Spring">Wyckoff Spring</option>
              <option value="Decouple Momentum">Decouple Momentum</option>
              <option value="Alpha Momentum">Alpha Momentum</option>
              <option value="HyperSqueeze">HyperSqueeze</option>
              <option value="Volume Explosion">Volume Explosion</option>
              <option value="Discretionary Setup">Discretionary Setup</option>
            </select>
          </div>

          <div
            style={{
              background: "var(--s2)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: "11px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)" }}>Total Invested</span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "var(--accent)",
                fontFamily: "'JetBrains Mono', monospace"
              }}
            >
              {formatINR(total)}
            </span>
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
              className="btn primary"
              style={{ flex: 1, padding: "10px", fontSize: 12.5, fontWeight: 700 }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Add Position
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
