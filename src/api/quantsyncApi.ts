/**
 * QuantSync Unified API Client
 * Connects the frontend directly to the Python FastAPI VPS engine.
 */

const VPS_DEFAULT_BASE = "https://backing-lapping-denial.ngrok-free.dev";

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = (import.meta as any).env?.VITE_VPS_API_URL;
    if (envUrl) return envUrl;
    // In browser (both localhost and deployed on Vercel), route /api calls via same-origin proxy
    return "";
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
        "ngrok-skip-browser-warning": "true",
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      // If local proxy failed and base was empty, attempt direct VPS fallback
      if (!base && typeof window !== "undefined") {
        const fallbackUrl = `${VPS_DEFAULT_BASE}${path}`;
        const fallbackRes = await fetch(fallbackUrl, {
          ...options,
          headers: {
            Accept: "application/json",
            "ngrok-skip-browser-warning": "true",
            ...(options?.headers || {}),
          },
        });
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
  pattern_count?: number;
  ai_approved_count?: number;
  gate_approved_count?: number;
  traded_count?: number;
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
  getTerminalData: async (version: "v2" | "v3" = "v2") => {
    try {
      const data = await apiFetch<TerminalSnapshot>(`/api/terminal-data?version=${version}`);
      const closed = (data as any)?.closedTrades || (data as any)?.closed || [];
      if (closed.length >= 350) return data;
      // Fallback to static snapshot if API returned partial
      const staticData = await fetch("/terminal_data_v2.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (staticData) {
        return {
          ...staticData,
          ...(data || {}),
          closedTrades: staticData.closed || staticData.closedTrades || [],
          closed: staticData.closed || staticData.closedTrades || [],
        };
      }
      return data;
    } catch {
      const staticData = await fetch("/terminal_data_v2.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (staticData) return staticData;
      throw new Error("Unable to load terminal data");
    }
  },

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

  getPatterns: (date?: string, patternType: string = "all", timeframe: string = "all") =>
    apiFetch<{ date: string; total: number; sections: PatternSection[] }>(
      `/api/v3/patterns?pattern_type=${patternType}&timeframe=${timeframe}${date ? `&date=${date}` : ""}`
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

  /** Honest AI Buy/Sell record: live vs walk-forward simulation, every closed trade with origin. */
  getTrackRecord: (version?: "v2" | "v3") =>
    apiFetch<any>(`/api/track-record${version ? `?version=${version}` : ""}`),

  /** Data-as-of stamp + quality verdict of the last EOD pipeline. */
  getDataStatus: () => apiFetch<any>(`/api/data-status`),

  /** Per-pattern fair-test win rate vs random-day baseline. */
  getPatternEdge: () => apiFetch<{ rows: any[]; method: string }>(`/api/screener/pattern-edge`),

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

  getDayReports: (limit: number = 10) =>
    apiFetch<{ count: number; reports: Array<any> }>(
      `/api/intel/day-reports?limit=${limit}`
    ),

  getNewsMovers: () =>
    apiFetch<{ count: number; movers: Array<any> }>(
      `/api/intel/movers`
    ),

  getScreenerRows: (params?: Record<string, any>) => {
    const qs = params ? "?" + new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)])
    ).toString() : "";
    return apiFetch<{ scan_date: string; total: number; limit: number; offset: number; rows: Array<any> }>(`/api/screener${qs}`);
  },

  getScreenerBreakouts: (scanDate?: string) =>
    apiFetch<{ scan_date: string; success: Array<any>; near_breakout: Array<any>; failed: Array<any> }>(
      `/api/screener/breakouts${scanDate ? `?scan_date=${scanDate}` : ""}`
    ),

  getScreenerSummary: (scanDate?: string) =>
    apiFetch<{
      scan_date: string;
      total_stocks: number;
      pattern_stages: Record<string, number>;
      breakout_statuses: Record<string, number>;
      stances: Record<string, number>;
      top_sectors: Record<string, number>;
    }>(`/api/screener/summary${scanDate ? `?scan_date=${scanDate}` : ""}`),

  getScreenerAccuracy: (days: number = 90) =>
    apiFetch<{
      lookback_window_days: number;
      total_resolved_signals: number;
      winners: number;
      losers: number;
      inconclusive: number;
      win_rate_pct: number;
    }>(`/api/screener/accuracy?days=${days}`),

  getStockDetail: (symbol: string, timeframe?: string) =>
    apiFetch<any>(`/api/stock/detail/${encodeURIComponent(symbol)}${timeframe ? `?timeframe=${encodeURIComponent(timeframe)}` : ""}`),

  getPatternAccuracy: () =>
    apiFetch<{
      period: string;
      overall: {
        total_records: number;
        resolved_trades: number;
        wins: number;
        losses: number;
        active: number;
        win_rate_pct: number;
        avg_win_gain_pct: number;
        avg_pnl_pct: number;
        avg_holding_bars: number;
      };
      by_timeframe: Record<string, {
        total: number;
        resolved: number;
        wins: number;
        losses: number;
        win_rate_pct: number;
        avg_win_gain_pct: number;
        avg_pnl_pct: number;
      }>;
      by_pattern: Record<string, {
        total: number;
        resolved: number;
        wins: number;
        losses: number;
        win_rate_pct: number;
        avg_win_gain_pct: number;
        avg_pnl_pct: number;
      }>;
      matrix: Record<string, {
        timeframe: string;
        pattern_type: string;
        total: number;
        resolved: number;
        win_rate_pct: number;
        avg_win_gain_pct: number;
      }>;
    }>(`/api/screener/pattern-accuracy`),

  getHistoricalBreakoutRecords: (params?: { symbol?: string; timeframe?: string; pattern?: string; outcome?: string; limit?: number; offset?: number }) => {
    const qs = params ? "?" + new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)])
    ).toString() : "";
    return apiFetch<{ count: number; records: Array<any> }>(`/api/screener/records${qs}`);
  },

  getMlQualityGates: () =>
    apiFetch<{
      validation_method: string;
      gates: Array<{
        pattern_type: string;
        pre_win_rate: number;
        post_win_rate: number;
        win_rate_lift: number;
        pre_avg_pnl: number;
        post_avg_pnl: number;
        trades_tested: number;
        trades_passed: number;
        pruned_pct: number;
        losers_eliminated: number;
        auc_score: number;
        gate_threshold: number;
        survival_verdict: string;
        recommendation: string;
        top_features: string[];
      }>;
    }>(`/api/screener/ml-gates`),

  searchSymbols: (query: string) =>
    apiFetch<Array<{ symbol: string; name?: string; token?: string; price?: number; candleCount?: number }>>(
      `/api/dna/search?q=${encodeURIComponent(query)}`
    ),
};



