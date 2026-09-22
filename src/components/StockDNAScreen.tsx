import React, { useState, useEffect, useRef } from "react";

interface StockDNAScreenProps {
  theme?: "dark" | "light";
  resetTrigger?: number;
  selectedStock?: string;
  onSwitchTab?: (tab: string) => void;
}

/**
 * StockDNAScreen
 * Embeds the ultra-premium mobile-first Stock DNA Story experience.
 * Features:
 *  - Dynamic Light & Dark Mode synchronization with top header toggle
 *  - 180° Speedometer Arc Gauge with animated needle & institutional verdict
 *  - 3-Card Tactical Action Plan (Buy The Dip, Momentum Breakout, Emergency Exit)
 *  - Interactive 4-Month Tactical & 1-Year Macro Candlestick Charts with Lightbox Modal
 *  - Sector Peer Alternatives Comparison Matrix
 *  - The 7 Plain-English Burning Questions with Smart Investor Compass
 *  - DNA Home Search Console with live autocomplete and discovery radar shelves
 */
export default function StockDNAScreen({ theme, resetTrigger, selectedStock, onSwitchTab }: StockDNAScreenProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Listen for messages from inside iframe (e.g. user clicked Screener button inside DNA)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "SWITCH_TAB" && e.data?.tab) {
        if (onSwitchTab) {
          onSwitchTab(e.data.tab);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSwitchTab]);

  // Determine current active theme
  const activeTheme = theme || (typeof window !== "undefined" && (document.documentElement.dataset.theme as "dark" | "light")) || "light";

  // Build target iframe URL preserving stock query param and syncing theme
  const [targetSrc, setTargetSrc] = useState(() => {
    let initialStock = selectedStock || "";
    if (!initialStock && typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      initialStock = searchParams.get("stock") || searchParams.get("sym") || searchParams.get("symbol") || "";
    }
    const params = new URLSearchParams();
    if (initialStock) params.set("stock", initialStock.toUpperCase());
    params.set("theme", activeTheme);
    return `/dna-mobile-story.html?${params.toString()}`;
  });

  // When selectedStock changes dynamically (e.g. user clicked a stock in Screener), notify iframe
  useEffect(() => {
    if (selectedStock && selectedStock.trim()) {
      const s = selectedStock.trim().toUpperCase();
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({
            type: "LOAD_STOCK",
            stock: s,
          }, "*");
        } catch (err) {
          console.warn("Could not post LOAD_STOCK to DNA iframe:", err);
        }
      }
    }
  }, [selectedStock, iframeLoaded]);

  // Whenever theme changes in parent app, notify the iframe via postMessage
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({
          type: "THEME_CHANGE",
          theme: activeTheme,
        }, "*");
      } catch (err) {
        console.warn("Could not postMessage to DNA iframe:", err);
      }
    }
  }, [activeTheme]);

  // Whenever user taps DNA in bottom tabbar, tell iframe to reset to home search view
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({
            type: "RESET_TO_HOME",
          }, "*");
        } catch (err) {
          console.warn("Could not post RESET_TO_HOME to DNA iframe:", err);
        }
      }
    }
  }, [resetTrigger]);

  return (
    <div 
      className="dna-screen-root"
      data-theme={activeTheme}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
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
            background: activeTheme === "light" ? "#F4F6FA" : "#080B11",
            zIndex: 2,
            gap: 12,
            color: activeTheme === "light" ? "#64748B" : "#94A3B8",
            fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
            transition: "background 0.2s ease",
          }}
        >
          <div 
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: `3px solid ${activeTheme === "light" ? "rgba(37, 99, 235, 0.2)" : "rgba(59, 130, 246, 0.2)"}`,
              borderTopColor: "#3B82F6",
              animation: "spin 0.8s linear infinite",
            }} 
          />
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.03em", color: activeTheme === "light" ? "#0F172A" : "#F8FAFC" }}>
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
        onLoad={() => {
          setIframeLoaded(true);
          // Ensure theme is set immediately on initial load
          try {
            iframeRef.current?.contentWindow?.postMessage({
              type: "THEME_CHANGE",
              theme: activeTheme,
            }, "*");
          } catch (e) {}
        }}
        style={{
          width: "100%",
          height: "100%",
          flex: 1,
          border: "none",
          display: "block",
          background: "transparent",
          opacity: iframeLoaded ? 1 : 0,
          transition: "opacity 0.2s ease-in-out",
        }}
        allow="clipboard-write"
      />
    </div>
  );
}
