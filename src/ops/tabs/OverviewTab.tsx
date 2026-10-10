import React from "react";
import StackedBar from "../StackedBar";
import StatusPill from "../StatusPill";
import { ago, num, useOps } from "../opsApi";

const LABELS: Record<string, string> = {
  results: "Quarterly results", shareholding: "Shareholding", listing: "Listing dates", news: "News (last 30 days)", ratios: "Ratios (our own)",
};
const ORDER = ["results", "shareholding", "listing", "ratios", "news"];

export default function OverviewTab({ onOpenData, onOpenReview }: { onOpenData: (ds: string, state: string) => void; onOpenReview: () => void }) {
  const { data, error, loading } = useOps<any>("/api/admin/overview");
  if (loading && !data) return <div className="ops-sub">Loading…</div>;
  if (error && !data) return <div className="ops-alert bad">Could not load: {error}</div>;
  const o = data || {};
  const dq = o.dataQuality || {};
  const cov = o.coverage || {};
  return (
    <>
      <div className="ops-card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>Price data</h3>
          <StatusPill status={dq.status || "unknown"} />
          <span className="ops-sub">{dq.session ? `session ${dq.session}` : ""}{dq.written_at ? ` · checked ${ago(dq.written_at)}` : ""}</span>
        </div>
        <div className="ops-kpis">
          <div className="ops-kpi"><div className="v">{dq.data_quality?.official_coverage != null ? `${num(dq.data_quality.official_coverage * 100, 1)}%` : "—"}</div><div className="l">official candle coverage</div></div>
          <div className="ops-kpi"><div className="v">{num(o.rejectedToday)}</div><div className="l">rows rejected today</div></div>
          <div className="ops-kpi"><div className="v">{num(o.pendingReview)}</div><div className="l">waiting for you</div></div>
        </div>
      </div>

      {(o.alerts || []).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {o.alerts.map((a: any, i: number) => (
            <div key={i} className={`ops-alert ${a.level}`} onClick={a.text.includes("review") ? onOpenReview : undefined} style={{ cursor: a.text.includes("review") ? "pointer" : "default" }}>{a.text}</div>
          ))}
        </div>
      )}

      <div className="ops-grid">
        {ORDER.filter((k) => cov[k]).map((k) => {
          const c = cov[k];
          return (
            <div className="ops-card" key={k}>
              <h3>{LABELS[k] || k}</h3>
              <div className="ops-sub" style={{ marginBottom: 8 }}>{num(c.total)} stocks · tap a colour to see which</div>
              <StackedBar onSelect={(s) => onOpenData(k, s)} parts={[
                { key: "FRESH", label: "Fresh", value: c.FRESH || 0, color: "var(--ops-good)" },
                { key: "STALE", label: "Stale", value: c.STALE || 0, color: "var(--ops-warn)" },
                { key: "MISSING", label: "Missing", value: c.MISSING || 0, color: "var(--ops-muted)" },
                { key: "DEAD", label: "Not reporting", value: c.DEAD || 0, color: "var(--ops-bad)" },
              ]} />
            </div>
          );
        })}
        {!Object.keys(cov).length && <div className="ops-card">No coverage yet. Run "Coverage status" from the Jobs tab.</div>}
      </div>

      <h3 style={{ margin: "22px 2px 8px" }}>Latest runs</h3>
      <div className="ops-card">
        {(o.lastRuns || []).map((r: any) => (
          <div className="ops-row" key={r.job}>
            <div className="grow"><b>{r.job}</b><div className="ops-sub">{r.summary || "running…"} · {ago(r.started_at)}</div></div>
            <StatusPill status={r.status} />
          </div>
        ))}
        {!(o.lastRuns || []).length && <div className="ops-sub">No job has run yet.</div>}
      </div>
    </>
  );
}
