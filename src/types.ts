/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BestWorstTrade {
  symbol: string;
  pct: number;
  date: string;
}

export interface ExitReasonBreakdown {
  reason: string;
  count: number;
  winRate: number;
  avgReturn: number;
}

export interface TerminalKPIs {
  totalSignals: number;
  closedTrades: number;
  openTrades: number;
  winRate: number;
  winRateStrong: number;
  liveWinRate: number;
  avgReturn: number;
  avgReturnStrong: number;
  expectancy: number;
  setupCount: number;
  watchingCount: number;
  inTradeCount: number;
  bestTrade: BestWorstTrade | null;
  worstTrade: BestWorstTrade | null;
  exitReasonBreakdown: ExitReasonBreakdown[];
}

export interface NearSetupStock {
  symbol: string;
  name: string;
  ltp: number;
  tradeState: "SETUP" | "WATCHING";
  tradeStateScore: number;
  quality: string;
  rsiGapFromSMA: number;
  lastRSI: number;
  lastSMA: number;
  monthlyRsiAboveTL: boolean;
  weeklyPriceTLGapPct: number | null;
  dailyRsiTrend: "RISING" | "FALLING" | "FLAT" | string;
  dailyVolumeRatio: number;
  holdStrength: string;
  lastSynced: string;
  tradingviewUrl: string;
}

export interface OngoingTrade {
  symbol: string;
  tradeId: string;
  isLive: boolean;
  entryDate: string;
  entryPrice: number;
  entryRSI: number;
  entryRsiGap: number;
  entryQuality: string;
  strength: string;
  barsSinceP2: number;
  currentLtp: number;
  currentRoi: number;
  mfePeak: number;
  barsSinceEntry: number;
  stopLoss: number;
  t1Target: number;
  t1Triggered: boolean;
  t1Price: number | null;
  t1ReturnPct: number | null;
  suggestedAction: string;
  tradingviewUrl: string;
}

export interface BacktestLogRecord {
  symbol: string;
  tradeId: string;
  isLive: boolean;
  entryDate: string;
  entryPrice: number;
  entryQuality: string;
  strength: string;
  entryRsiGap: number;
  tlSlope: number;
  exitDate: string;
  exitPrice: number;
  exitReason: string;
  tradeReturnPct: number;
  mfePeak: number;
  maxFavorablePct: number;
  maxAdversePct: number;
  result: "WIN" | "LOSS" | string;
  t1Triggered: boolean;
  t1ReturnPct: number | null;
  tradingviewUrl: string;
}

export interface PortfolioSignal {
  tradeState: string;
  tradeStateScore: number;
  holdStrength: string;
  exitZone: boolean;
  lastRSI: number;
  lastSMA: number;
  rsiGapFromSMA: number;
  monthlyRsiAboveTL: boolean;
  dailyRsiTrend: string;
  weeklyPriceTLGapPct: number | null;
  lastSignal?: string;
  lastSignalDate?: string;
  lastSynced?: string;
  tradingviewUrl?: string;
  recommendation?: string;
  activeTradeMatch?: {
    tradeId: string;
    entryDate: string;
    algoEntryPrice: number;
    entryQuality: string;
    rsiGap: number;
  } | null;
}

export interface PortfolioStock {
  symbol: string;
  qty: number;
  avgBuyPrice: number;
  ltp: number;
  investedValue: number;
  currentValue: number;
  pnl: number;
  currentRoi: number;
  todayChangePct: number;
  signal: PortfolioSignal | null;
}

export interface TerminalDataResponse {
  success: boolean;
  generatedAt?: string;
  kpis: TerminalKPIs;
  nearSetup: NearSetupStock[];
  ongoingTrades: OngoingTrade[];
  backtestLog: BacktestLogRecord[];
  portfolio: PortfolioStock[];
  meta?: {
    totalSymbols: number;
    syncedOK: number;
    syncErrors: number;
    staleSymbols: number;
    responseTimeMs: number;
    errorSymbols: string[];
  };
  source?: "live" | "failed";
  error?: string;
}
