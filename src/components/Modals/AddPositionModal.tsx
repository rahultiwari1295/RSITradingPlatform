import React, { useState, useEffect, useRef } from "react";
import { X, Plus, Search, Loader2 } from "lucide-react";
import { formatINR } from "../../lib/utils";

interface AddPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    symbol: string;
    buyPrice: number;
    quantity: number;
    strategyName?: string;
    currentPrice?: number;
    date?: string;
  }) => void;
}

interface StockSearchResult {
  symbol: string;
  name?: string;
  company_name?: string;
  candleCount?: number;
  price?: number;
  close?: number;
}

export default function AddPositionModal({
  isOpen,
  onClose,
  onSubmit
}: AddPositionModalProps) {
  const [symbol, setSymbol] = useState("");
  const [buyPrice, setBuyPrice] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">(10);
  const [strategyName, setStrategyName] = useState("Manual");

  // Autocomplete state
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setSymbol("");
      setBuyPrice("");
      setQuantity(10);
      setStrategyName("Manual");
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [isOpen]);

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setSymbol(val);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const query = val.trim();
    if (!query) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dna/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSearchResults(data.slice(0, 7));
            setShowDropdown(true);
            setIsSearching(false);
            return;
          }
        }
      } catch (err) {
        // Fallback or ignore
      }
      setIsSearching(false);
    }, 150);
  };

  const [ltpPrice, setLtpPrice] = useState<number | null>(null);

  const handleSelectStock = async (stock: StockSearchResult) => {
    const sym = stock.symbol.toUpperCase().trim();
    setSymbol(sym);
    setShowDropdown(false);

    let priceToSet = stock.price || stock.close;

    // If price wasn't in the search result, fetch it directly from /api/stock/quote
    if (!priceToSet) {
      try {
        const res = await fetch(`/api/stock/quote/${encodeURIComponent(sym)}`);
        if (res.ok) {
          const q = await res.json();
          if (q && q.close) {
            priceToSet = q.close;
          }
        }
      } catch (e) {}
    }

    if (priceToSet) {
      setBuyPrice(Number(priceToSet));
      setLtpPrice(Number(priceToSet));
    }
  };

  if (!isOpen) return null;

  const total = Number(buyPrice || 0) * Number(quantity || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !buyPrice || !quantity) return;

    onSubmit({
      symbol: symbol.toUpperCase().trim(),
      buyPrice: Number(buyPrice),
      quantity: Number(quantity),
      strategyName: strategyName || "Manual",
      currentPrice: ltpPrice || Number(buyPrice),
      date: new Date().toISOString().split("T")[0]
    });

    setSymbol("");
    setBuyPrice("");
    setQuantity(10);
    setLtpPrice(null);
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
              Manually track any stock position in your portfolio
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Symbol Input with Autocomplete */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
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
              Symbol (Search any stock)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={symbol}
                onChange={handleSymbolChange}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder="Type name or symbol e.g. TATA, RELIANCE..."
                style={{
                  width: "100%",
                  background: "var(--s2)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: "11px 36px 11px 14px",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--ink1)",
                  outline: "none",
                  fontFamily: "'JetBrains Mono', monospace",
                  textTransform: "uppercase",
                  boxSizing: "border-box"
                }}
                required
                autoComplete="off"
              />
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--ink3)",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {isSearching ? (
                  <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
                ) : (
                  <Search style={{ width: 15, height: 15 }} />
                )}
              </div>
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: "var(--s1)",
                  border: "1px solid var(--line-2)",
                  borderRadius: 12,
                  boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
                  zIndex: 1000,
                  maxHeight: 220,
                  overflowY: "auto",
                  padding: "4px 0"
                }}
              >
                {searchResults.map((s, i) => (
                  <div
                    key={s.symbol + i}
                    onClick={() => handleSelectStock(s)}
                    style={{
                      padding: "8px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      borderBottom: i === searchResults.length - 1 ? "none" : "1px solid var(--line)",
                      transition: "background 0.15s"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--s2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink1)" }}>
                        {s.symbol}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink3)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.name || s.company_name || ""}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 6,
                        background: "var(--s3)",
                        color: "var(--ink2)",
                        fontWeight: 700
                      }}
                    >
                      NSE
                    </span>
                  </div>
                ))}
              </div>
            )}
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
                  fontFamily: "'JetBrains Mono', monospace",
                  boxSizing: "border-box"
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
                  fontFamily: "'JetBrains Mono', monospace",
                  boxSizing: "border-box"
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
                cursor: "pointer",
                boxSizing: "border-box"
              }}
            >
              <option value="Manual">Manual</option>
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
