export type TF = '1D' | '1W';

export interface Operand { f?: string; c?: number; list?: (number | string)[]; lag?: number }
export interface Condition { l: Operand; op: string; r?: Operand }
export interface GroupJson { all?: (Condition | GroupJson)[]; any?: (Condition | GroupJson)[] }
export interface RuleJson extends GroupJson { v: 1 }
export interface ExitItem { type: string; v?: number; rule?: RuleJson }
export interface ExitJson { v: 1; any: ExitItem[] }

export interface FeatureDef { key: string; label: string; group: string; kind: 'number' | 'bool'; unit: string }
export interface Catalog { fsv?: number; features: FeatureDef[]; operators: { op: string; label: string }[]; exits: { type: string; label: string; unit: string }[] }

export interface Stats { trades: number; wins: number; losses: number; win_rate: number | null; avg_ret: number | null; open: number; shown: boolean }
export interface StrategyCard {
  id: string; name: string; tf: TF; kind: 'user' | 'flagship'; visibility: 'private' | 'public'; owner: string | null; mine: boolean;
  followers: number; version: number; live_from: string | null; ai_gate: number | null; enhanced: boolean; exit_choice: 'user' | 'ai';
  enhancement: { id: string; status: string } | null; stats: Stats; broken?: boolean; source?: 'engine' | 'lab'; info?: { entry: RuleJson; exit: ExitJson };
}
export interface Trade {
  id: number; symbol: string; signal_date: string; entry_date: string | null; entry_price: number | null; exit_date: string | null;
  exit_price: number | null; exit_reason: string | null; ret_pct: number | null; is_open: number; age_days?: number;
  strategy_id?: string; strategy_name?: string; enhanced?: number; origin?: 'live' | 'tested'; group?: string;
}
export interface ScanRow { symbol: string; date: string; close: number; rsi_14: number | null; ret_1: number | null; vol_ratio: number | null }
export interface ScanResult { as_of: string | null; count: number; rows: ScanRow[] }
export interface YearStat { trades: number; wins: number; losses: number; win_rate: number | null; avg_ret: number | null }
export interface BacktestTrade { symbol: string; signal_date: string; entry_date: string; entry_price: number | null; exit_date: string | null; exit_price: number | null; exit_reason: string | null; ret_pct: number | null; bars: number | null; is_open: boolean; origin?: 'live' | 'tested'; group?: string }
export interface BacktestResult { trades?: BacktestTrade[]; source?: 'engine' | 'lab'; note?: string; live_since?: string; ai_gate?: number; years: number[]; summary: Record<string, YearStat & { profit_factor: number | null; max_dd: number | null }>; months: { month: string; trades: number; win_rate: number }[] }
export interface GateStat { All: YearStat; months: { month: string; trades: number }[]; lift: number | null; z: number | null; [year: string]: unknown }
export interface Enhancement {
  id?: string; status: 'none' | 'queued' | 'running' | 'done' | 'failed' | 'insufficient'; reason?: string | null;
  result: null | { status: string; reason?: string; edge_found: boolean; plain: YearStat; gates: Record<string, GateStat>; drivers: string[]; leak: { passed: boolean } };
  exit: null | { gate: number; improved: boolean; tested: number; yours: YearStat; best: YearStat | null; best_exit: ExitJson | null };
}
export interface JobStatus { id: string; status: 'queued' | 'running' | 'done' | 'failed'; progress: number; stage: string | null; position?: number; eta_s?: number; error: string | null; result: unknown }
export interface Portfolio { summary: { active: number; closed: number; wins: number; losses: number; win_rate: number | null; avg_ret: number | null; active_avg?: number | null }; trades: Trade[] }
export interface Bar { date: string; open: number; high: number; low: number; close: number; volume: number; sma_50: number | null; sma_200: number | null }
export interface TodayData { data: Record<string, { as_of: string } | null>; flagship: StrategyCard[]; fresh: { symbol: string; signal_date: string; sid: string; name: string }[] }

export interface LabApi {
  catalog(): Promise<Catalog>;
  today(): Promise<TodayData>;
  scan(tf: TF, entry: RuleJson): Promise<ScanResult>;
  backtest(tf: TF, entry: RuleJson, exit?: ExitJson): Promise<{ job_id: string }>;
  strategyBacktest(id: string): Promise<{ status: 'none' | 'done' | 'running' | 'failed'; result?: BacktestResult; error?: string; job_id?: string }>;
  runStrategyBacktest(id: string): Promise<{ job_id: string }>;
  job(id: string): Promise<JobStatus>;
  strategies(scope: 'mine' | 'flagship' | 'people'): Promise<StrategyCard[]>;
  strategy(id: string): Promise<StrategyCard>;
  createStrategy(b: { name: string; tf: TF; entry: RuleJson; exit?: ExitJson }): Promise<{ id: string }>;
  copyStrategy(id: string): Promise<{ id: string }>;
  trades(id: string, status: 'active' | 'closed'): Promise<Trade[]>;
  follow(id: string, on: boolean, alerts?: boolean): Promise<void>;
  enhance(id: string): Promise<{ job_id: string }>;
  enhancement(id: string): Promise<Enhancement>;
  setGate(id: string, gate: number | null): Promise<void>;
  enhanceExit(id: string, gate: number): Promise<{ job_id: string }>;
  setExitChoice(id: string, choice: 'user' | 'ai'): Promise<void>;
  portfolio(status: 'active' | 'closed'): Promise<Portfolio>;
  chart(symbol: string, tf: TF): Promise<{ symbol: string; bars: Bar[] }>;
  patterns(tf: TF): Promise<{ configured: boolean; rows: Record<string, unknown>[] }>;
  setHandle(h: string): Promise<void>;
}
