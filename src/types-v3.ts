/**
 * QuantSync V3 — Type Extensions
 * MiniChart, PatternSnippet and V3 Trade types
 */

export interface V3Bar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface V3BaseBox {
  start_date: string;
  end_date: string;
  top: number;
  bottom: number;
  duration_str: string;
  depth_pct: number;
}

export interface V3FibLevels {
  "1.000"?: number;
  "1.272"?: number;
  "1.618"?: number;
  "2.000"?: number;
}

export interface V3MiniChart {
  symbol: string;
  bars_count?: number;
  pivot?: number;
  base_box?: V3BaseBox;
  levels?: {
    entry?: number;
    stop?: number;
    target?: number;
    be_lock?: number;
    pivot?: number;
    floor?: number;
    current?: number;
  };
  bars?: V3Bar[];
  sparkline?: number[];
  candles?: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  context?: {
    label: string;
    sublabel?: string;
    originalPivot?: number;
    originalPivotDate?: string;
  };
  min_price?: number;
  max_price?: number;
  change_pct?: number;
  count?: number;
}

export interface V3Geometry {
  pattern?: string;
  base_start_date?: string;
  base_ceiling?: number;
  base_floor?: number;
  base_depth_pct?: number;
  box_top?: number;
  box_bottom?: number;
  pivot?: number;
  floor?: number;
  fib_structure_id?: string;
  fib_a_price?: number;
  fib_b_price?: number;
  fib_c_price?: number;
  fib_levels?: V3FibLevels;
  volume_ratio?: number;
  cir?: number;
}

export interface V3ActiveTrade {
  tradeId?: string;
  symbol: string;
  strategyId?: string;
  strategyName?: string;
  entryDate?: string;
  entryPrice?: number;
  currentPrice?: number;
  livePrice?: number;
  roiPct?: number;
  currentROI?: number;
  stopLoss?: number;
  stop?: number;
  targetPrice?: number;
  target?: number;
  beLockPrice?: number;
  pivot?: number;
  floor?: number;
  fibLevels?: V3FibLevels;
  geometry?: V3Geometry;
  status?: string;
  compositeScore?: number;
  convictionScore?: number;
  stars?: number;
  starsDisplay?: string;
  action?: string;
  actionLabel?: string;
  actionColor?: string;
  slippageText?: string;
  footerLine?: string;
  holdingDays?: number;
  shares?: number;
  miniChart?: V3MiniChart;
  sparkline?: number[];
  [key: string]: any;
}

export interface V3ClosedTrade {
  tradeId?: string;
  symbol: string;
  strategyId?: string;
  strategyName?: string;
  entryDate?: string;
  exitDate?: string;
  entryPrice?: number;
  exitPrice?: number;
  roiPct?: number;
  returnPct?: number;
  realizedPnl?: number;
  holdingDays?: number;
  exitReason?: string;
  pnlLabel?: string;
  isWin?: boolean;
  miniChart?: V3MiniChart;
  sparkline?: number[];
  [key: string]: any;
}

export interface V3KPIs {
  totalStocks?: number;
  activeCount?: number;
  totalTradesClosed?: number;
  totalTrades?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
  profitFactor?: number;
  totalReturnPct?: number;
  allTimeTradesClosed?: number;
}

export interface V3TerminalData {
  system?: string;
  inTradeTrades?: V3ActiveTrade[];
  closedTrades?: V3ClosedTrade[];
  toBuySignals?: V3ActiveTrade[];
  kpis?: V3KPIs;
  activeCount?: number;
  closedCount?: number;
  winRate?: number;
  profitFactor?: number;
  totalReturnPct?: number;
  updatedAt?: string;
}
