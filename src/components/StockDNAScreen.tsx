import React, { useState, useEffect, useRef } from "react";

/**
 * StockDNAScreen
 * Embeds the ultra-premium mobile-first Stock DNA Story experience.
 * Features:
 *  - 180° Speedometer Arc Gauge with animated needle & institutional verdict
 *  - 3-Card Tactical Action Plan (Buy The Dip, Momentum Breakout, Emergency Exit)
 *  - Interactive 4-Month Tactical & 1-Year Macro Candlestick Charts with Lightbox Modal
 *  - Sector Peer Alternatives Comparison Matrix
 *  - The 7 Plain-English Burning Questions with Smart Investor Compass
 *  - DNA Home Search Console with live autocomplete and discovery radar shelves
 */
export default function StockDNAScreen() {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Read current query parameters to support deep linking (e.g. ?stock=TCS or ?symbol=TCS)
  const [targetSrc, setTargetSrc] = useState("/dna-mobile-story.html");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const stock = searchParams.get("stock") || searchParams.get("sym") || searchParams.get("symbol");
      if (stock) {
        setTargetSrc(`/dna-mobile-story.html?stock=${encodeURIComponent(stock.toUpperCase())}`);
      } else {
        setTargetSrc("/dna-mobile-story.html");
      }
    }
  }, []);

  return (
    <div 
      className="dna-screen-root"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "#080B11",
      }}
    >
      {/* Loading Skeleton Backdrop */}
      {!iframeLoaded && (
        <div 
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#080B11",
            zIndex: 2,
            gap: 12,
            color: "#94A3B8",
            fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
          }}
        >
          <div 
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: "3px solid rgba(59, 130, 246, 0.2)",
              borderTopColor: "#3B82F6",
              animation: "spin 0.8s linear infinite",
            }} 
          />
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.03em", color: "#F8FAFC" }}>
            Loading Stock DNA Engine...
          </div>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Embedded Stock DNA Institutional Platform */}
      <iframe
        ref={iframeRef}
        src={targetSrc}
        title="Stock DNA Institutional Intelligence"
        onLoad={() => setIframeLoaded(true)}
        style={{
          width: "100%",
          height: "100%",
          flex: 1,
          border: "none",
          display: "block",
          background: "#080B11",
          opacity: iframeLoaded ? 1 : 0,
          transition: "opacity 0.25s ease-in-out",
        }}
        allow="clipboard-write"
      />
    </div>
  );
}
