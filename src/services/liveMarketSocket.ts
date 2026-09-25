/**
 * liveMarketSocket.ts — Real-Time WebSocket Streaming Client for QuantSync
 *
 * Connects to /ws/live-market on QuantSync VPS:
 * - 1-second live tick updates for Nifty 50, Sensex, and Bank Nifty
 * - Real-time CMP updates for Active positions, Signals, and Breakout setups
 * - Automatic exponential backoff reconnection & heartbeat ping
 */

import { useEffect, useState, useCallback, useRef } from "react";

export interface IndexTick {
  n: string;
  v: number;
  p: number;
  seed: number;
  trend: number;
  spark?: number[];
}

export interface StockTick {
  price: number;
  change_pct?: number;
  breakout_level?: number;
  target_1?: number;
  ts?: number;
}

export interface MarketTickPayload {
  type: string;
  timestamp: string;
  indices: IndexTick[];
  stocks: Record<string, StockTick>;
}

type TickListener = (payload: MarketTickPayload) => void;
type StatusListener = (status: "connected" | "connecting" | "disconnected") => void;

class LiveMarketSocketService {
  private socket: WebSocket | null = null;
  private tickListeners: Set<TickListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private status: "connected" | "connecting" | "disconnected" = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private subscribedSymbols: Set<string> = new Set();
  private latestPayload: MarketTickPayload | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.connect();
    }
  }

  private getSocketUrl(): string {
    if (typeof window === "undefined") return "";
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal) {
      // In local dev, can connect to local port 8000 or DuckDNS
      return "wss://quantsync-api.duckdns.org:8443/ws/live-market";
    }
    return "wss://quantsync-api.duckdns.org:8443/ws/live-market";
  }

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = this.getSocketUrl();
    if (!url) return;

    this.setStatus("connecting");

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.setStatus("connected");
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        // Resubscribe symbols if any were registered
        if (this.subscribedSymbols.size > 0) {
          this.sendSubscription(Array.from(this.subscribedSymbols));
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "TICK" || data.type === "SUBSCRIBE_ACK") {
            this.latestPayload = data as MarketTickPayload;
            this.notifyTick(this.latestPayload);
          }
        } catch (e) {
          console.debug("[LiveMarketWS] parse error", e);
        }
      };

      this.socket.onclose = () => {
        this.cleanup();
        this.setStatus("disconnected");
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn("[LiveMarketWS] connection error:", err);
        if (this.socket) {
          this.socket.close();
        }
      };
    } catch (e) {
      console.warn("[LiveMarketWS] could not create WebSocket:", e);
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private cleanup() {
    this.stopHeartbeat();
    this.socket = null;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private setStatus(status: "connected" | "connecting" | "disconnected") {
    this.status = status;
    this.statusListeners.forEach((l) => l(status));
  }

  public subscribe(symbols: string[]) {
    symbols.forEach((s) => this.subscribedSymbols.add(s.toUpperCase()));
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendSubscription(symbols);
    }
  }

  private sendSubscription(symbols: string[]) {
    try {
      this.socket?.send(JSON.stringify({
        type: "subscribe",
        symbols: symbols.map((s) => s.toUpperCase())
      }));
    } catch (e) {
      console.debug("[LiveMarketWS] subscribe send error:", e);
    }
  }

  public onTick(listener: TickListener): () => void {
    this.tickListeners.add(listener);
    if (this.latestPayload) {
      listener(this.latestPayload);
    }
    return () => {
      this.tickListeners.delete(listener);
    };
  }

  public onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyTick(payload: MarketTickPayload) {
    this.tickListeners.forEach((l) => {
      try {
        l(payload);
      } catch (e) {
        console.error("[LiveMarketWS] listener error:", e);
      }
    });
  }

  public getLatestPayload(): MarketTickPayload | null {
    return this.latestPayload;
  }

  public getStatus() {
    return this.status;
  }
}

// Global Singleton
export const liveMarketSocket = new LiveMarketSocketService();

/**
 * React Hook for consuming live WebSocket market ticks anywhere in the app.
 */
export function useLiveMarket(symbolsToWatch?: string[]) {
  const [status, setStatus] = useState<"connected" | "connecting" | "disconnected">(liveMarketSocket.getStatus());
  const [indices, setIndices] = useState<IndexTick[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, StockTick>>({});

  useEffect(() => {
    if (symbolsToWatch && symbolsToWatch.length > 0) {
      liveMarketSocket.subscribe(symbolsToWatch);
    }
  }, [symbolsToWatch]);

  useEffect(() => {
    const unsubStatus = liveMarketSocket.onStatus((s) => setStatus(s));
    const unsubTick = liveMarketSocket.onTick((tick) => {
      if (tick.indices && tick.indices.length > 0) {
        setIndices(tick.indices);
      }
      if (tick.stocks) {
        setLivePrices((prev) => ({ ...prev, ...tick.stocks }));
      }
    });

    return () => {
      unsubStatus();
      unsubTick();
    };
  }, []);

  return {
    isConnected: status === "connected",
    status,
    indices,
    livePrices,
    subscribe: useCallback((syms: string[]) => liveMarketSocket.subscribe(syms), [])
  };
}
