import React, { useState, useEffect, useRef } from "react";

interface RadarScreenProps {
  theme?: "dark" | "light";
  onSelectStock?: (symbol: string) => void;
  onSwitchTab?: (tab: string) => void;
}

/**
 * RadarScreen
 * Next Generation Pattern & Breakout Radar (VisionOS / Apple 3D Physics Engine)
 * Features:
 *  - Scroll-driven 3D depth engine with gyroscopic pointer physics
 *  - Interactive candlestick chart with dynamic volume profile & scrub crosshair
 *  - Real endpoint mapping to /api/screener, /api/screener/summary, /api/screener/accuracy
 *  - Live position sizing calculator & strict trade plan rules
 *  - Segmented control with Confirmed, Retest, Near Breakout, and At Risk stages
 */
export default function RadarScreen({ theme, onSelectStock, onSwitchTab }: RadarScreenProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeTheme = theme || (typeof window !== "undefined" && (document.documentElement.dataset.theme as "dark" | "light")) || "dark";

  // Build target iframe URL
  const targetSrc = `/radar.html?embed=1&theme=${activeTheme}`;

  // Sync theme changes to iframe
  useEffect(() => {
    if (iframeRef.current && iframeLoaded) {
      try {
        iframeRef.current.contentWindow?.postMessage({
          type: "SET_THEME",
          theme: activeTheme,
        }, "*");
      } catch (e) {
        console.warn("Failed to post theme message to radar iframe:", e);
      }
    }
  }, [activeTheme, iframeLoaded]);

  // Handle postMessage events from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data) return;
      if (e.data.type === "NAVIGATE_DNA" && e.data.symbol) {
        if (onSelectStock) {
          onSelectStock(e.data.symbol);
        } else if (onSwitchTab) {
          onSwitchTab("dna");
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSelectStock, onSwitchTab]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        background: activeTheme === "light" ? "#F2F2F7" : "#0A0A0C",
        overflow: "hidden",
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
            background: activeTheme === "light" ? "#F2F2F7" : "#0A0A0C",
            zIndex: 2,
            gap: 12,
            color: activeTheme === "light" ? "#64748B" : "#94A3B8",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
            transition: "background 0.2s ease",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: `3px solid ${activeTheme === "light" ? "rgba(0, 122, 255, 0.2)" : "rgba(10, 132, 255, 0.2)"}`,
              borderTopColor: "#0A84FF",
              animation: "radarSpin 0.8s linear infinite",
            }}
          />
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.02em", color: activeTheme === "light" ? "#1C1C1E" : "#FFFFFF" }}>
            Initializing QuantSync 3D Radar...
          </div>
          <style>{`
            @keyframes radarSpin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Embedded 3D Radar Platform */}
      <iframe
        ref={iframeRef}
        src={targetSrc}
        title="QuantSync 3D Radar"
        onLoad={() => {
          setIframeLoaded(true);
          try {
            iframeRef.current?.contentWindow?.postMessage({
              type: "SET_THEME",
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
          transition: "opacity 0.25s ease-in-out",
        }}
        allow="clipboard-write"
      />
    </div>
  );
}
