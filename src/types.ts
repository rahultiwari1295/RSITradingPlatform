/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TerminalKPIs {
  totalSignals: number;
  toBuy: number;
  inTrade: number;
  closedTradeCount: number;
  stocksProcessed: number;
}

export interface TotalSummary {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWinPct: number;
  avgLossPct: number;
  avgReturnPct: number;
  totalReturnPct: number;
  profitFactor: number;
  bestTrade: { symbol: string; returnPct: number };
  worstTrade: { symbol: string; returnPct: number };
  avgHoldDays: number;
  generatedAt: string;
}

export interface StrategySummary {
  strategyId: string;
  strategyName: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWinPct: number;
  avgLossPct: number;
  avgReturnPct: number;
  profitFactor: number;
  avgHoldDays: number;
  description?: string;
}

export interface ToBuySignal {
  symbol: string;
  type?: string;
  date?: string;
  entryDate?: string;
  price?: number;
  currentPrice?: number;
  entryPrice?: number;
  currentROI?: number;
  strategyName?: string;
  sector?: string;
  compositeScore?: number;
  mlProbability?: number;
  mlGrade?: string;
  mlAction?: string;
  rankScore?: number;
  rankGrade?: string;
  technicalScore?: number;
  riskScore?: number;
  confidence?: number;
  opportunityScore?: number;
  marketScore?: number;
  researchScore?: number | null;
  alsoTriggeredBy?: string[];
  stars?: number;
  starsDisplay?: string;
  action?: string;
  actionLabel?: string;
  actionColor?: string;
  slippageText?: string;
  footerLine?: string;
  waitReason?: string;
  missedNote?: string;
  // Engine-defined trade plan
  target1Price?: number;
  target1Pct?: number;
  stopPrice?: number;
  stopPct?: number;
  t1RiskReward?: string;
  // Strategy track record
  strategyWinRate?: number;
  strategyTradeCount?: number;
  strategySampleLabel?: string;
  typicalWinnerPct?: number;
  volumeVsAverage?: number;
  isStarred?: boolean;
  [key: string]: any;
}

export interface InTradeTrade {
  symbol: string;
  sector?: string;
  strategyId?: string;
  strategyName?: string;
  entryDate: string;
  entryPrice: number;
  currentPrice: number;
  currentROI: number;
  exitReason?: string | null;
  mfe?: number;
  maxFavorable?: number;
  maxAdverse?: number;
  t1Triggered?: boolean;
  t1ReturnPct?: number | null;
  mlProbability?: number;
  mlGrade?: string;
  mlAction?: string;
  mlRawEntry?: number;
  // Enhanced scores
  compositeScore?: number;
  technicalScore?: number;
  riskScore?: number;
  confidence?: number;
  marketScore?: number;
  researchScore?: number | null;
  alsoTriggeredBy?: string[];
  // Health & Trade plan
  target1Price?: number;
  target1Pct?: number;
  stopPrice?: number;
  stopPct?: number;
  t1RiskReward?: string;
  activeHealthStatus?: "HEALTHY" | "WATCH" | "EXIT_RISK";
  trailingStopDistance?: number;
  volumeVsAverage?: number;
  holdingDays?: number;
  [key: string]: any;
}

export interface PortfolioTrade extends InTradeTrade {
  matchedActiveTrade?: {
    strategyId: string;
    strategyName: string;
    entryDate: string;
    mfe: number;
    alsoTriggeredBy: string[];
  };
}

export interface ClosedTrade {
  symbol: string;
  sector?: string;
  strategyName?: string;
  entryDate: string;
  exitDate?: string;
  entryPrice: number;
  exitPrice?: number;
  returnPct: number;
  exitReason?: string;
  exitReasonLabel?: string;
  mfe?: number;
  maxFavorable?: number;
  maxAdverse?: number;
  t1Triggered?: boolean;
  t1ReturnPct?: number | null;
  mlProbability?: number;
  mlGrade?: string;
  pnlLabel: "WIN" | "LOSS" | string;
  alsoTriggeredBy?: string[];
  [key: string]: any;
}

export interface ManualPortfolioTrade {
  tradeId?: string;
  id?: string;
  symbol: string;
  buyPrice: number;
  quantity?: number;
  date?: string;
  buyDate?: string;
  currentPrice?: number;
  currentROI?: number;
  strategyName?: string;
  totalInvested?: number;
  daysHeld?: number;
  isActiveInStrategy?: boolean;
  stopLoss?: number;
  targetPrice?: number;
  [key: string]: any;
}

export type UserTrade = ManualPortfolioTrade;

export interface CompletedTrade {
  tradeId: string;
  symbol: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  totalInvested: number;
  totalReceived: number;
  pnl: number;
  pnlPct: number;
  strategyName?: string;
  buyDate: string;
  sellDate: string;
  holdDays: number;
}

// Trade history keyed by symbol
export interface TradeHistory {
  [symbol: string]: CompletedTrade[];
}

export interface TerminalDataResponse {
  success: boolean;
  generatedAt: string;
  totalSummary?: TotalSummary;
  strategySummary?: StrategySummary[];
  kpis?: TerminalKPIs;
  toBuySignals: ToBuySignal[];
  inTradeTrades: InTradeTrade[];
  portfolio: PortfolioTrade[];
  manualPortfolio?: ManualPortfolioTrade[];
  closedTrades: ClosedTrade[];
  tradeHistory?: TradeHistory;
  source?: "live" | "failed";
  error?: string;
}

