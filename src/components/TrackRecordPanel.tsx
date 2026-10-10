// Layout drafted by local model ornith:9b; defects fixed over 3 review rounds; assembled + verified by Claude.
import React, { useMemo } from "react";
import { formatCurrency, formatExitReason, formatReturn, sortMonthsDesc, useOriginFilter } from "../lib/trackRecordFormat";

type Summary = {
  trades: number; wins: number; losses: number; winRate: number | null; profitFactor: number | null; netPnl: number;
  avgWinPct: number | null; avgLossPct: number | null; expectancyPct: number | null; medianHoldDays: number | null;
  maxConsecutiveLosses: number;
};
type Month = Summary & { month: string; origin: "LIVE" | "SIMULATED" | "MIXED"; liveTrades: number };
type Trade = {
  tradeId: string; engine: string; symbol: string; strategy: string; entryDate: string; exitDate: string;
  entryPrice: number; exitPrice: number; netPnl: number; returnPct: number; exitReason: string; holdingDays: number;
  origin: "LIVE" | "SIMULATED"; fillCheck: string | null;
};
export type TrackRecord = {
  liveSince: string; live: Summary; simulated: Summary; combined: Summary; byMonth: Month[];
  byStrategy: Record<string, Summary>; note: string; trades: Trade[];
};

const C = {
  up: "var(--up, #16a34a)", down: "var(--down, #dc2626)", line: "var(--line, rgba(148,163,184,.35))",
  ink: "var(--ink, #0f172a)", ink2: "var(--ink2, #64748b)", panel: "var(--panel, rgba(255,255,255,.04))",
};
const dash = (v: number | null | undefined, f: (x: number) => string) => (v === null || v === undefined ? "—" : f(v));
const badge = (origin: string) => {
  const map: Record<string, [string, string, string]> = {
    LIVE: ["rgba(22,163,74,.15)", C.up, "LIVE"],
    SIMULATED: ["rgba(107,114,128,.15)", C.ink2, "SIM"],
    MIXED: ["rgba(245,158,11,.15)", "#b45309", "MIXED"],
  };
  const [bg, fg, label] = map[origin] || map.SIMULATED;
  return <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 4, fontSize: 10.5, fontWeight: 700, background: bg, color: fg }}>{label}</span>;
};

function SummaryCard({ title, s, accent, note }: { title: string; s: Summary; accent: string; note?: string | null }) {
  const cell = (label: string, value: React.ReactNode, color?: string) => (
    <div style={{ minWidth: 86 }}>
      <div style={{ color: C.ink2, fontSize: 11.5 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || C.ink }}>{value}</div>
    </div>
  );
  return (
    <div style={{ flex: "1 1 220px", borderLeft: `3px solid ${accent}`, padding: 12, background: C.panel, borderRadius: 10 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {cell("Trades", s.trades)}
        {cell("Win rate", dash(s.winRate, (x) => `${x.toFixed(1)}%`))}
        {cell("Profit factor", dash(s.profitFactor, (x) => x.toFixed(2)))}
        {cell("Net P&L", formatCurrency(s.netPnl), s.netPnl >= 0 ? C.up : C.down)}
        {cell("Avg win", dash(s.avgWinPct, formatReturn))}
        {cell("Avg loss", dash(s.avgLossPct, formatReturn))}
        {cell("Worst losing streak", s.maxConsecutiveLosses)}
      </div>
      {note ? <div style={{ marginTop: 8, fontSize: 11.5, fontStyle: "italic", color: C.ink2 }}>{note}</div> : null}
    </div>
  );
}

export default function TrackRecordPanel({ data, loading }: { data: TrackRecord | null; loading?: boolean }) {
  const [filter, setFilter] = useOriginFilter(data?.live?.trades);
  const months = useMemo(() => sortMonthsDesc(data?.byMonth), [data]);
  const trades = useMemo(() => {
    const all = data?.trades || [];
    const f = filter === "ALL" ? all : all.filter((t) => t.origin === filter);
    return [...f].sort((a, b) => String(b.exitDate).localeCompare(String(a.exitDate))).slice(0, 50);
  }, [data, filter]);

  if (loading) return <div style={{ padding: 12, fontSize: 14, color: C.ink2 }}>Loading track record…</div>;
  if (!data) return <div style={{ padding: 12, fontSize: 14, color: C.ink2 }}>Track record unavailable right now.</div>;

  const liveNote = data.live.trades < 30
    ? `Only ${data.live.trades} live trades so far — too few to judge. We publish every one.`
    : null;

  return (
    <div style={{ padding: 12, color: C.ink }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Track record</div>
        <div style={{ fontSize: 12, marginTop: 4, color: C.ink2, lineHeight: 1.45 }}>{data.note}</div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <SummaryCard title={`Live since ${data.liveSince}`} s={data.live} accent={C.up} note={liveNote} />
        <SummaryCard title="Simulation (walk-forward)" s={data.simulated} accent={C.line} />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Month by month</div>
      <div style={{ overflowX: "auto", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 420 }}>
          <thead>
            <tr style={{ color: C.ink2, textAlign: "left" }}>
              {["Month", "Type", "Trades", "Win %", "PF", "Net ₹"].map((h) => <th key={h} style={{ padding: "6px 4px", fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: "6px 4px" }}>{m.month}</td>
                <td style={{ padding: "6px 4px" }}>{badge(m.origin)}</td>
                <td style={{ padding: "6px 4px" }}>{m.trades}</td>
                <td style={{ padding: "6px 4px" }}>{dash(m.winRate, (x) => `${x.toFixed(1)}%`)}</td>
                <td style={{ padding: "6px 4px" }}>{dash(m.profitFactor, (x) => x.toFixed(2))}</td>
                <td style={{ padding: "6px 4px", fontWeight: 700, color: m.netPnl >= 0 ? C.up : C.down }}>{formatCurrency(m.netPnl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {(["LIVE", "SIMULATED", "ALL"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} style={{
            padding: "5px 12px", borderRadius: 999, border: `1px solid ${C.line}`, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: filter === f ? C.ink : "transparent", color: filter === f ? "var(--bg, #fff)" : C.ink2,
          }}>
            {f === "LIVE" ? "Live" : f === "SIMULATED" ? "Simulated" : "All"}
          </button>
        ))}
      </div>
      {trades.length === 0 ? (
        <div style={{ fontSize: 12, color: C.ink2 }}>No trades to show.</div>
      ) : trades.map((t) => (
        <div key={t.tradeId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 12, borderTop: `1px solid ${C.line}` }}>
          <div style={{ flex: "1 1 30%", minWidth: 0 }}>
            <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.symbol}</div>
            <div style={{ color: C.ink2, fontSize: 11 }}>{t.entryDate} → {t.exitDate}</div>
          </div>
          <div style={{ flex: "0 0 70px", fontWeight: 700, color: t.returnPct >= 0 ? C.up : C.down }}>{formatReturn(t.returnPct)}</div>
          <div style={{ flex: "1 1 30%", color: C.ink2, fontSize: 11.5 }}>
            {formatExitReason(t.exitReason)}
            {t.fillCheck && t.fillCheck !== "OK" ? (
              <span title="Recorded price was outside that day's traded range and has been flagged" style={{ marginLeft: 6, color: C.down, cursor: "help" }}>· fill adjusted</span>
            ) : null}
          </div>
          <div style={{ flex: "0 0 auto" }}>{badge(t.origin)}</div>
        </div>
      ))}
    </div>
  );
}
