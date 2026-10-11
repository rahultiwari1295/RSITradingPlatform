// In-memory stand-in for the Lab API, used for ?demo=1 previews and UI work without the VPS.
import type { Bar, BacktestResult, Catalog, Enhancement, GateStat, JobStatus, LabApi, Portfolio, RuleJson, ScanRow, StrategyCard, TF, Trade, YearStat } from './types';

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const SYMS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BEL', 'LT', 'ITC', 'SBIN', 'BHARTIARTL', 'AXISBANK', 'MARUTI', 'TITAN', 'SUNPHARMA', 'TATAMOTORS', 'HAL', 'POLYCAB', 'DIXON', 'TRENT', 'ZOMATO', 'PERSISTENT', 'CUMMINSIND', 'ABB', 'SIEMENS', 'BAJFINANCE'];
const price: Record<string, number> = Object.fromEntries(SYMS.map(s => [s, Math.round(200 + rnd() * 3800)]));
const sleep = (ms = 250) => new Promise(r => setTimeout(r, ms));
const day = (back: number) => new Date(Date.now() - back * 864e5).toISOString().slice(0, 10);

const catalog: Catalog = {
  features: [
    ['close', 'Close', 'Price', '₹'], ['volume', 'Volume', 'Volume', ''], ['vol_ratio', 'Volume vs 20-bar avg', 'Volume', 'x'],
    ['ret_1', 'Change 1 bar', 'Momentum', '%'], ['ret_20', 'Change 20 bars', 'Momentum', '%'], ['rsi_14', 'RSI (14)', 'Momentum', ''],
    ['macd', 'MACD', 'Momentum', ''], ['macd_signal', 'MACD signal', 'Momentum', ''], ['adx_14', 'ADX (14)', 'Trend', ''],
    ['sma_20', 'SMA 20', 'Trend', '₹'], ['sma_50', 'SMA 50', 'Trend', '₹'], ['sma_200', 'SMA 200', 'Trend', '₹'],
    ['atr_pct', 'ATR % of price', 'Volatility', '%'], ['dist_hh52_pct', 'Distance from 52-wk high', 'Levels', '%'], ['hh_20', 'Prior 20-bar high', 'Levels', '₹'],
  ].map(([key, label, group, unit]) => ({ key, label, group, unit, kind: 'number' as const })),
  operators: [['>', 'is above'], ['<', 'is below'], ['>=', 'is at least'], ['<=', 'is at most'], ['between', 'is between'], ['crosses_above', 'crosses above'], ['crosses_below', 'crosses below']].map(([op, label]) => ({ op, label })),
  exits: [['stop_pct', 'Stop at % below entry', '%'], ['target_pct', 'Target at % above entry', '%'], ['time', 'Exit after N bars', 'bars']].map(([type, label, unit]) => ({ type, label, unit })),
};

const stat = (n: number, wr: number, avg: number): YearStat => ({ trades: n, wins: Math.round(n * wr / 100), losses: n - Math.round(n * wr / 100), win_rate: n ? wr : null, avg_ret: n ? avg : null });

function makeTrades(vid: string, closed: number, active: number, edge = 0): Trade[] {
  const out: Trade[] = [];
  for (let i = 0; i < closed + active; i++) {
    const sym = SYMS[Math.floor(rnd() * SYMS.length)];
    const open = i < active;
    const back = open ? Math.floor(rnd() * 6) : 4 + Math.floor(rnd() * 160);
    const win = rnd() < 0.5 + edge;
    const ret = open ? (rnd() - 0.4) * 9 : win ? 2 + rnd() * 9 : -(1 + rnd() * 5);
    const ep = price[sym] * (0.9 + rnd() * 0.2);
    out.push({ id: i + vid.length * 1000, symbol: sym, signal_date: day(back + 1), entry_date: day(back), entry_price: Math.round(ep * 100) / 100,
      exit_date: open ? null : day(Math.max(0, back - 2 - Math.floor(rnd() * 8))), exit_price: open ? null : Math.round(ep * (1 + ret / 100) * 100) / 100,
      exit_reason: open ? null : win ? 'target' : 'stop', ret_pct: Math.round(ret * 100) / 100, is_open: open ? 1 : 0, age_days: back });
  }
  return out;
}

const entry = (f: string, op: string, c: number) => ({ l: { f }, op, r: { c } });
const strategies: StrategyCard[] = [
  { id: 'stg_alpha', name: 'AI Alpha', tf: '1D', kind: 'flagship', visibility: 'public', owner: 'QuantSync', mine: false, followers: 1840, version: 3, live_from: '2026-01-05', ai_gate: 70, enhanced: true, exit_choice: 'user', enhancement: { id: 'ai_1', status: 'done' }, stats: { trades: 212, wins: 141, losses: 71, win_rate: 66.5, avg_ret: 2.4, open: 6, shown: true }, info: { entry: { v: 1, all: [entry('rsi_14', '>', 55), entry('vol_ratio', '>', 1.5)] }, exit: { v: 1, any: [{ type: 'stop_pct', v: 5 }, { type: 'target_pct', v: 10 }] } } },
  { id: 'stg_pattern', name: 'AI Pattern', tf: '1D', kind: 'flagship', visibility: 'public', owner: 'QuantSync', mine: false, followers: 1210, version: 2, live_from: '2026-02-02', ai_gate: 60, enhanced: true, exit_choice: 'user', enhancement: { id: 'ai_2', status: 'done' }, stats: { trades: 96, wins: 58, losses: 38, win_rate: 60.4, avg_ret: 1.9, open: 4, shown: true }, info: { entry: { v: 1, all: [entry('close', '>', 0)] }, exit: { v: 1, any: [{ type: 'time', v: 20 }] } } },
  { id: 'stg_monk', name: 'Momentum Monk', tf: '1D', kind: 'user', visibility: 'public', owner: 'monk_trades', mine: false, followers: 312, version: 1, live_from: '2026-03-10', ai_gate: null, enhanced: false, exit_choice: 'user', enhancement: null, stats: { trades: 58, wins: 31, losses: 27, win_rate: 53.4, avg_ret: 0.8, open: 3, shown: true }, info: { entry: { v: 1, all: [entry('ret_20', '>', 8), entry('rsi_14', '<', 75)] }, exit: { v: 1, any: [{ type: 'stop_pct', v: 6 }] } } },
  { id: 'stg_weekly', name: 'Weekly Breakouts', tf: '1W', kind: 'user', visibility: 'public', owner: 'swing_ria', mine: false, followers: 148, version: 1, live_from: '2026-04-01', ai_gate: null, enhanced: false, exit_choice: 'user', enhancement: null, stats: { trades: 19, wins: 11, losses: 8, win_rate: null, avg_ret: 1.1, open: 2, shown: false }, info: { entry: { v: 1, all: [entry('dist_hh52_pct', '>', -3)] }, exit: { v: 1, any: [{ type: 'time', v: 8 }] } } },
  { id: 'stg_mine', name: 'My RSI trend', tf: '1D', kind: 'user', visibility: 'private', owner: 'you', mine: true, followers: 0, version: 1, live_from: '2026-08-20', ai_gate: null, enhanced: false, exit_choice: 'user', enhancement: null, stats: { trades: 7, wins: 4, losses: 3, win_rate: null, avg_ret: 1.4, open: 2, shown: false }, info: { entry: { v: 1, all: [entry('rsi_14', '>', 50), entry('rsi_14', '<', 70)] }, exit: { v: 1, any: [{ type: 'stop_pct', v: 5 }, { type: 'target_pct', v: 10 }] } } },
];
const tradeStore: Record<string, Trade[]> = {
  stg_alpha: makeTrades('a', 40, 6, 0.16), stg_pattern: makeTrades('p', 30, 4, 0.1), stg_monk: makeTrades('m', 24, 3), stg_weekly: makeTrades('w', 12, 2), stg_mine: makeTrades('x', 5, 2),
};
const following = new Set<string>(['stg_alpha']);

const enh: Record<string, Enhancement> = {};
function gates(): Record<string, GateStat> {
  const g: Record<string, GateStat> = {};
  [[50, 118, 58.5, 1.4], [60, 84, 63.1, 1.9], [70, 52, 68.4, 2.5], [80, 29, 72.4, 3.1], [90, 12, 75.0, 3.6]].forEach(([s, n, wr, avg]) => {
    const per: Record<string, unknown> = { All: stat(n, wr, avg), lift: wr - 52.1, z: (wr - 52.1) / 4.2 };
    [2023, 2024, 2025, 2026].forEach((y, i) => { per[String(y)] = stat(Math.round(n * [0.3, 0.3, 0.28, 0.12][i]), wr + (i - 1.5), avg); });
    per.months = Array.from({ length: 12 }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, '0')}`, trades: Math.max(0, Math.round(n / 40 + (rnd() - 0.4) * 3)) }));
    g[String(s)] = per as unknown as GateStat;
  });
  return g;
}

const btResult = (id: string): BacktestResult => { const k = id === 'stg_alpha' ? 1.15 : id === 'stg_pattern' ? 1.05 : 0.9; return { years: [2023, 2024, 2025, 2026], summary: { All: { ...stat(131, 52.1 * k, 0.9 * k), profit_factor: 1.3, max_dd: -14.2 }, '2023': { ...stat(41, 51 * k, 0.7 * k), profit_factor: 1.2, max_dd: -6 }, '2024': { ...stat(44, 54.5 * k, 1.2 * k), profit_factor: 1.5, max_dd: -5 }, '2025': { ...stat(36, 50 * k, 0.6 * k), profit_factor: 1.1, max_dd: -7 }, '2026': { ...stat(10, 50 * k, 0.5 * k), profit_factor: 1.1, max_dd: -3 } }, months: [] }; };
const jobs = new Map<string, { t0: number; dur: number; kind: string; sid: string; gate?: number }>();
const startJob = (kind: string, sid: string, dur: number, gate?: number) => { const id = `job_${jobs.size + 1}`; jobs.set(id, { t0: Date.now(), dur, kind, sid, gate }); return { job_id: id }; };

function bars(sym: string, n = 180): Bar[] {
  let p = price[sym] ?? 1000; const out: Bar[] = []; const raw: number[] = [];
  for (let i = 0; i < n + 200; i++) { p *= 1 + (rnd() - 0.47) * 0.03; raw.push(p); }
  const avg = (i: number, k: number) => (i >= k ? raw.slice(i - k + 1, i + 1).reduce((a, b) => a + b, 0) / k : null);
  for (let i = 200; i < raw.length; i++) {
    const o = raw[i - 1], c = raw[i];
    out.push({ date: day(raw.length - i), open: o, close: c, high: Math.max(o, c) * (1 + rnd() * 0.012), low: Math.min(o, c) * (1 - rnd() * 0.012), volume: 1e6 * (0.5 + rnd()), sma_50: avg(i, 50), sma_200: avg(i, 200) });
  }
  return out;
}

export const demoApi: LabApi = {
  async catalog() { return catalog; },
  async today() {
    await sleep();
    const fresh = strategies.filter(s => s.kind === 'flagship').flatMap(s => tradeStore[s.id].filter(t => t.is_open && (t.age_days ?? 9) <= 3).map(t => ({ symbol: t.symbol, signal_date: t.signal_date, sid: s.id, name: s.name })));
    return { data: { '1D': { as_of: day(1) }, '1W': { as_of: day(3) } }, flagship: strategies.filter(s => s.kind === 'flagship'), fresh };
  },
  async scan(_tf: TF, _e: RuleJson) {
    await sleep(500);
    const rows: ScanRow[] = SYMS.filter(() => rnd() < 0.4).map(s => ({ symbol: s, date: day(1), close: price[s], rsi_14: 50 + rnd() * 20, ret_1: (rnd() - 0.4) * 4, vol_ratio: 0.8 + rnd() * 2 }));
    return { as_of: day(1), count: rows.length, rows };
  },
  async strategyBacktest(id) { return { status: 'done', result: btResult(id) }; },
  async runStrategyBacktest() { return startJob('backtest', '', 2500); },
  async backtest() { return startJob('backtest', '', 3500); },
  async job(id): Promise<JobStatus> {
    await sleep(150);
    const j = jobs.get(id); if (!j) throw new Error('missing');
    const f = Math.min(1, (Date.now() - j.t0) / j.dur);
    if (f < 1) {
      const stages = j.kind === 'enhance' ? ['Collecting past trades', 'Preparing features', 'Training and testing gates', 'Checking for leaks'] : ['Finding entries', 'Simulating trades', 'Summarising'];
      return { id, status: f < 0.05 ? 'queued' : 'running', progress: Math.round(f * 95), stage: stages[Math.min(stages.length - 1, Math.floor(f * stages.length))], position: 1, eta_s: Math.round((1 - f) * j.dur / 1000), error: null, result: null };
    }
    if (j.kind === 'enhance' && !enh[j.sid]) enh[j.sid] = { id: 'ai_new', status: 'done', result: { status: 'done', edge_found: true, plain: stat(131, 52.1, 0.9), gates: gates(), drivers: ['RSI (14) higher than usual helped', 'Volume vs 20-bar avg higher than usual helped', 'Distance from 52-wk high lower than usual helped'], leak: { passed: true } }, exit: null };
    if (j.kind === 'enhance_exit') enh[j.sid].exit = { gate: j.gate ?? 70, improved: true, tested: 24, yours: stat(52, 68.4, 2.5), best: stat(51, 70.6, 3.2), best_exit: { v: 1, any: [{ type: 'trail_atr', v: 3 }] } };
    const result = j.kind === 'backtest' ? { years: [2023, 2024, 2025, 2026], summary: { All: { ...stat(131, 52.1, 0.9), profit_factor: 1.3, max_dd: -14.2 }, '2023': { ...stat(41, 51, 0.7), profit_factor: 1.2, max_dd: -6 }, '2024': { ...stat(44, 54.5, 1.2), profit_factor: 1.5, max_dd: -5 }, '2025': { ...stat(36, 50, 0.6), profit_factor: 1.1, max_dd: -7 }, '2026': { ...stat(10, 50, 0.5), profit_factor: 1.1, max_dd: -3 } }, months: [] } : {};
    return { id, status: 'done', progress: 100, stage: 'done', error: null, result };
  },
  async strategies(scope) { await sleep(); return scope === 'mine' ? strategies.filter(s => s.mine) : scope === 'flagship' ? strategies.filter(s => s.kind === 'flagship') : strategies.filter(s => s.kind === 'user' && s.visibility === 'public'); },
  async strategy(id) { await sleep(150); const s = strategies.find(x => x.id === id); if (!s) throw new Error('Strategy not found.'); return s; },
  async createStrategy(b) {
    const id = `stg_${Date.now()}`;
    strategies.push({ id, name: b.name, tf: b.tf, kind: 'user', visibility: 'private', owner: 'you', mine: true, followers: 0, version: 1, live_from: day(0), ai_gate: null, enhanced: false, exit_choice: 'user', enhancement: null, stats: { trades: 0, wins: 0, losses: 0, win_rate: null, avg_ret: null, open: 0, shown: false }, info: { entry: b.entry, exit: b.exit ?? { v: 1, any: [] } } });
    tradeStore[id] = [];
    return { id };
  },
  async copyStrategy(id) { const s = strategies.find(x => x.id === id)!; return demoApi.createStrategy({ name: `${s.name} (copy)`, tf: s.tf, entry: s.info!.entry, exit: s.info!.exit }); },
  async trades(id, status) { await sleep(150); return (tradeStore[id] ?? []).filter(t => (status === 'active') === !!t.is_open); },
  async follow(id, on) { if (on) following.add(id); else following.delete(id); },
  async enhance(id) { return startJob('enhance', id, 6500); },
  async enhancement(id) { return enh[id] ?? (strategies.find(s => s.id === id)?.enhanced ? { status: 'done', result: { status: 'done', edge_found: true, plain: stat(131, 52.1, 0.9), gates: gates(), drivers: ['RSI (14) higher than usual helped', 'Volume vs 20-bar avg higher than usual helped'], leak: { passed: true } }, exit: null } : { status: 'none', result: null, exit: null }); },
  async setGate(id, gate) { const s = strategies.find(x => x.id === id)!; s.ai_gate = gate; s.enhanced = !!gate; s.version += 1; s.stats = { ...s.stats, trades: 0, wins: 0, losses: 0, win_rate: null, shown: false }; },
  async enhanceExit(id, gate) { return startJob('enhance_exit', id, 4500, gate); },
  async setExitChoice(id, choice) { strategies.find(x => x.id === id)!.exit_choice = choice; },
  async portfolio(status): Promise<Portfolio> {
    await sleep(200);
    const all = [...following, 'stg_mine'].flatMap(id => (tradeStore[id] ?? []).map(t => ({ ...t, strategy_id: id, strategy_name: strategies.find(s => s.id === id)!.name, enhanced: strategies.find(s => s.id === id)!.enhanced ? 1 : 0 })));
    const closed = all.filter(t => !t.is_open), act = all.filter(t => t.is_open);
    const wins = closed.filter(t => (t.ret_pct ?? 0) > 0).length;
    return { summary: { active: act.length, closed: closed.length, wins, losses: closed.length - wins, win_rate: closed.length >= 30 ? Math.round(wins / closed.length * 1000) / 10 : null, avg_ret: Math.round(closed.reduce((a, t) => a + (t.ret_pct ?? 0), 0) / Math.max(1, closed.length) * 100) / 100, active_avg: Math.round(act.reduce((a, t) => a + (t.ret_pct ?? 0), 0) / Math.max(1, act.length) * 100) / 100 }, trades: (status === 'active' ? act : closed).sort((a, b) => (b.signal_date > a.signal_date ? 1 : -1)) };
  },
  async chart(symbol) { await sleep(200); return { symbol, bars: bars(symbol) }; },
  async patterns() { return { configured: false, rows: [] }; },
  async setHandle() {},
};
