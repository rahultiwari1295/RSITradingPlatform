/**
 * QuantSync Unified API Client
 * Connects the frontend directly to the Python FastAPI VPS engine.
 */

const VPS_DEFAULT_BASE = "https://quantsync-api.duckdns.org:8000";

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = (import.meta as any).env?.VITE_VPS_API_URL;
    if (envUrl) return envUrl;
    // If running on localhost on port 3000/5173, express or vite proxies /api requests
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "";
    }
  }
  return VPS_DEFAULT_BASE;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      // If local proxy failed and base was empty, attempt direct VPS fallback
      if (!base && typeof window !== "undefined") {
        const fallbackUrl = `${VPS_DEFAULT_BASE}${path}`;
        const fallbackRes = await fetch(fallbackUrl, options);
        if (fallbackRes.ok) {
          return await fallbackRes.json();
        }
      }
      throw new Error(`API ${path} returned status ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    // Direct VPS fallback for network or CORS anomalies
    if (!base && typeof window !== "undefined") {
      try {
        const fallbackUrl = `${VPS_DEFAULT_BASE}${path}`;
        const fallbackRes = await fetch(fallbackUrl, options);
        if (fallbackRes.ok) {
          return await fallbackRes.json();
        }
      } catch {
        // pass through original error
      }
    }
    console.error(`Fetch error for ${path}:`, err);
    throw err;
  }
}

export interface TerminalSnapshot {
  system: string;
  hero: {
    nav: number;
    todayPnl: number;
    todayPnlPct: number;
    winRate: number;
    wins: number;
    losses: number;
    navSparkline: number[];
  };
  streak: {
    current: number;
    best_this_year: number;
  };
  scanner?: {
    scanned: number;
    tech: number;
    quality: number;
    selected: number;
    note: string;
    top: Array<[string, number, number]>;
  };
  closedSummary?: {
    totalPnl: number;
    winRate: number;
    avgR: number;
  };
  active: any[];
  closed: any[];
  toBuySignals?: any[];
  portfolio?: any[];
  kpis?: any;
  updatedAt?: string;
  status?: string;
  [key: string]: any;
}

export interface EquityCurveData {
  version: string;
  rangeDays: number;
  peakEquity: number;
  maxDrawdownPct: number;
  maxDrawdownInr: number;
  currentNav: number;
  series: Array<{
    date: string;
    nav: number;
    cash?: number;
    drawdownPct: number;
    activePositions: number;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface ActivityFeedItem {
  id?: number;
  time: string;
  kind: string; // 'p' (profit), 'l' (loss), 'b' (buy/neutral)
  icon: string;
  title: string;
  desc: string;
  trade_symbol?: string;
  engine_version?: string;
}

export interface ScannerReport {
  date: string;
  engine_version: string;
  scanned_count: number;
  tech_filter_count: number;
  quality_gate_count: number;
  selected_count: number;
  top3: Array<{
    symbol: string;
    score: number;
    stars: number;
  }>;
  ai_note: string;
  created_at: string;
}

export interface PatternSection {
  name: string;
  count: number;
  items: Array<{
    symbol: string;
    s: string;
    base: string;
    vol: string;
    score: number;
    tier: string;
    pivotPrice: number;
    currentPrice: number;
    miniCandles?: any[];
  }>;
}

export interface BreakoutItem {
  date: string;
  rank: number;
  rankIcon?: string;
  symbol: string;
  pattern: string;
  score: number;
  volume_multiple: number;
  price: number;
  priceFormatted?: string;
  volFormatted?: string;
  notes: string;
  qualification_status: string;
  badge?: string;
}

export interface MarketPulseData {
  date: string;
  sentiment: string;
  sentiment_pill: string;
  nifty_price: number;
  nifty_chg_pct: number;
  sensex_price: number;
  sensex_chg_pct: number;
  banknifty_price: number;
  banknifty_chg_pct: number;
  advances_pct: number;
  declines_pct: number;
  fii_net_cr: number;
  dii_net_cr: number;
  updated_at: string;
}

export interface ChartData {
  symbol: string;
  count: number;
  candles: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  geometry: Record<string, any>;
  lines: Array<{
    name: string;
    price: number;
    color: string;
    style: string;
    width: number;
  }>;
  indicators: {
    ma20?: number;
    ma50?: number;
    atr14?: number;
  };
}

export const quantsyncApi = {
  getTerminalData: (version: "v2" | "v3" = "v2") =>
    apiFetch<TerminalSnapshot>(`/api/terminalData?version=${version}`),

  getEquityCurve: (version: "v2" | "v3" = "v2", days: number = 90) =>
    apiFetch<EquityCurveData>(`/api/equity-curve?version=${version}&days=${days}`),

  getActivityFeed: (version?: string, limit: number = 10) =>
    apiFetch<{ count: number; feed: ActivityFeedItem[] }>(
      `/api/activity-feed?limit=${limit}${version ? `&version=${version}` : ""}`
    ),

  getScannerReport: (version: "v2" | "v3" = "v2", date?: string) =>
    apiFetch<ScannerReport>(
      `/api/scanner-report?version=${version}${date ? `&date=${date}` : ""}`
    ),

  getPatterns: (date?: string, patternType: string = "all") =>
    apiFetch<{ date: string; total: number; sections: PatternSection[] }>(
      `/api/v3/patterns?pattern_type=${patternType}${date ? `&date=${date}` : ""}`
    ),

  getBreakouts: (date?: string, sort: string = "score") =>
    apiFetch<{ count: number; breakouts: BreakoutItem[] }>(
      `/api/v3/breakouts?sort=${sort}${date ? `&date=${date}` : ""}`
    ),

  getMarketPulse: (date?: string) =>
    apiFetch<MarketPulseData>(`/api/intel/pulse${date ? `?date=${date}` : ""}`),

  getDailyDigest: (version: "v2" | "v3" = "v2", date?: string) =>
    apiFetch<{ summary_text: string; generated_time: string }>(
      `/api/intel/digest?version=${version}${date ? `&date=${date}` : ""}`
    ),

  getSystemStatus: () =>
    apiFetch<any>(`/api/system/status`),

  getSystemConfig: () =>
    apiFetch<any>(`/api/system/config`),

  getChartData: (symbol: string, limit: number = 250, engine: "v2" | "v3" = "v3") =>
    apiFetch<ChartData>(`/api/chart/${encodeURIComponent(symbol)}?limit=${limit}&engine=${engine}`),

  getSectors: (period: string = "day") =>
    apiFetch<{ count: number; sectors: Array<{ name: string; disp_value?: string; change_pct: number; color?: string; updated_at?: string }> }>(
      `/api/intel/sectors?period=${period}`
    ),

  getNews: (limit: number = 20, stock?: string) =>
    apiFetch<{ count: number; news: Array<any> }>(
      `/api/intel/news?limit=${limit}${stock ? `&stock=${encodeURIComponent(stock)}` : ""}`
    ),
};
