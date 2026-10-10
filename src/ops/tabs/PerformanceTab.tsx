import React from "react";
import StackedBar from "../StackedBar";
import { num, useOps } from "../opsApi";

function Summary({ title, s, note }: { title: string; s: any; note?: string }) {
  if (!s) return null;
  return (
    <div className="ops-card">
      <h3>{title}</h3>
      {note && <div className="ops-sub">{note}</div>}
      <div className="ops-kpis">
        <div className="ops-kpi"><div className="v">{num(s.trades)}</div><div className="l">trades</div></div>
        <div className="ops-kpi"><div className="v">{s.winRate == null ? "—" : `${num(s.winRate, 1)}%`}</div><div className="l">win rate</div></div>
        <div className="ops-kpi"><div className="v">{s.profitFactor == null ? "—" : num(s.profitFactor, 2)}</div><div className="l">profit factor</div></div>
        <div className="ops-kpi"><div className="v" style={{ color: (s.netPnl || 0) >= 0 ? "var(--ops-good)" : "var(--ops-bad)" }}>₹{num(s.netPnl)}</div><div className="l">net P&amp;L</div></div>
        <div className="ops-kpi"><div className="v">{num(s.maxConsecutiveLosses)}</div><div className="l">worst losing streak</div></div>
      </div>
    </div>
  );
}

const STATUS_COLORS = ["var(--ops-good)", "var(--ops-info)", "var(--ops-warn)", "var(--ops-muted)", "var(--ops-bad)"];

export default function PerformanceTab() {
  const { data, loading, error } = useOps<any>("/api/admin/performance", 60000);
  if (loading && !data) return <div className="ops-sub">Loading…</div>;
  if (error && !data) return <div className="ops-alert bad">{error}</div>;
  const p = data || {};
  const tr = p.trackRecord;
  const radar = p.radar;
  return (
    <>
      <h3 style={{ margin: "0 2px 8px" }}>AI Buy/Sell</h3>
      {tr ? (
        <div className="ops-grid">
          <Summary title={`Live since ${tr.liveSince}`} s={tr.live} note={tr.live?.trades < 30 ? `Only ${tr.live?.trades} live trades — too few to judge.` : undefined} />
          <Summary title="Simulation (walk-forward)" s={tr.simulated} />
        </div>
      ) : <div className="ops-alert warn">Track record unavailable{p.trackRecordError ? `: ${p.trackRecordError}` : ""}</div>}

      {(p.openTrades || []).length > 0 && (
        <div className="ops-card" style={{ marginTop: 14 }}>
          <h3>Open positions</h3>
          {p.openTrades.map((t: any) => (
            <div className="ops-row" key={t.symbol + t.entry_date}>
              <div className="grow"><b>{t.symbol}</b><div className="ops-sub">{t.strategy_id} · in {t.entry_date} @ ₹{num(t.entry_price, 2)}</div></div>
              <b style={{ color: (t.unrealized_pnl || 0) >= 0 ? "var(--ops-good)" : "var(--ops-bad)" }}>₹{num(t.unrealized_pnl)}</b>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ margin: "22px 2px 8px" }}>Radar &amp; DNA</h3>
      <div className="ops-grid">
        {radar && (
          <div className="ops-card">
            <h3>Radar scan {radar.scanDate || ""}</h3>
            <div className="ops-sub" style={{ marginBottom: 8 }}>{radar.quarantined != null ? `${num(radar.quarantined)} stocks kept off Radar for bad price data` : ""}</div>
            <StackedBar parts={Object.entries(radar.byStatus || {}).map(([k, v], i) => ({ key: k, label: k.replace(/_/g, " ").toLowerCase(), value: Number(v), color: STATUS_COLORS[i % STATUS_COLORS.length] }))} />
          </div>
        )}
        {p.dna && (
          <div className="ops-card">
            <h3>DNA reports</h3>
            <div className="ops-sub" style={{ marginBottom: 8 }}>{num(p.dna.updatedToday)} updated today of {num(p.dna.reports)}</div>
            <StackedBar parts={Object.entries(p.dna.byStance || {}).map(([k, v], i) => ({ key: k, label: k.toLowerCase(), value: Number(v), color: STATUS_COLORS[i % STATUS_COLORS.length] }))} />
          </div>
        )}
      </div>
    </>
  );
}
