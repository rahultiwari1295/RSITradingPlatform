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
}

export interface ToBuySignal {
  symbol: string;
  type?: string;
  date?: string;
  price: number;
  strategyName?: string;
  mlProbability?: number;
  mlGrade?: string;
  mlAction?: string;
  rankScore?: number;
  rankGrade?: string;
  sector?: string;
  alsoTriggeredBy?: string[];
  [key: string]: any;
}

export interface InTradeTrade {
  symbol: string;
  sector?: string;
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
  alsoTriggeredBy?: string[];
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
  symbol: string;
  buyPrice: number;
  isActiveInStrategy: boolean;
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
  source?: "live" | "failed";
  error?: string;
}

