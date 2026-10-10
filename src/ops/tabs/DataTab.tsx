import React, { useState } from "react";
import StatusPill from "../StatusPill";
import { opsPost, useOps } from "../opsApi";

const DATASETS: [string, string][] = [["results", "Results"], ["shareholding", "Shareholding"], ["listing", "Listing"], ["ratios", "Ratios"], ["news", "News"]];
const STATES: [string, string][] = [["", "All"], ["FRESH", "Fresh"], ["STALE", "Stale"], ["MISSING", "Missing"], ["DEAD", "Not reporting"]];

export default function DataTab({ dataset, state, setDataset, setState, toast }: {
  dataset: string; state: string; setDataset: (s: string) => void; setState: (s: string) => void; toast: (m: string) => void;
}) {
  const [q, setQ] = useState("");
  const path = `/api/admin/coverage/${dataset}?state=${state}&q=${encodeURIComponent(q)}&limit=300`;
  const { data, error, loading, reload } = useOps<any>(path, 0);
  const rows: any[] = data?.rows || [];

  const refresh = async (sym: string) => {
    try {
      await opsPost(`/api/admin/refresh/${dataset}/${sym}`);
      toast(`${sym}: queued. The scheduler picks it up within about 10 seconds.`);
      setTimeout(reload, 15000);
    } catch (e: any) { toast(`Could not queue: ${e.message}`); }
  };

  return (
    <>
      <div className="ops-chips">{DATASETS.map(([k, l]) => <button key={k} className="ops-chip" aria-pressed={dataset === k} onClick={() => setDataset(k)}>{l}</button>)}</div>
      <div className="ops-chips">{STATES.map(([k, l]) => <button key={k} className="ops-chip" aria-pressed={state === k} onClick={() => setState(k)}>{l}</button>)}</div>
      <input className="ops-input" placeholder="Search symbol (starts with…)" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && reload()} style={{ marginBottom: 12 }} />
      <div className="ops-card">
        {loading && !data && <div className="ops-sub">Loading…</div>}
        {error && <div className="ops-alert bad">{error}</div>}
        {rows.map((r) => (
          <div className="ops-row" key={r.symbol}>
            <div className="grow"><b>{r.symbol}</b><div className="ops-sub">{r.as_of ? `latest ${r.as_of}` : "no data"}{r.note ? ` · ${r.note}` : ""}</div></div>
            <StatusPill status={r.state} />
            <button className="ops-btn" onClick={() => refresh(r.symbol)}>Refresh</button>
          </div>
        ))}
        {!loading && !rows.length && !error && <div className="ops-sub">Nothing here.</div>}
        {rows.length >= 300 && <div className="ops-sub" style={{ marginTop: 8 }}>Showing the first 300. Narrow it with the search box.</div>}
      </div>
    </>
  );
}
