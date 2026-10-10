import React, { useState } from "react";
import StatusPill from "../StatusPill";
import { ago, num, opsPost, useOps } from "../opsApi";

function scheduleText(s: any): string {
  if (!s) return "manual only";
  const days = (s.days || []).length === 5 ? "weekdays" : (s.days || []).length === 1 ? ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][s.days[0]] : "daily";
  if (s.at) return `${days} at ${s.at}`;
  return `${days}, every ${s.every_min} min ${s.window?.[0]}–${s.window?.[1]}${s.season ? " (results season)" : ""}`;
}

function Logs({ job, onClose }: { job: string; onClose: () => void }) {
  const { data, loading } = useOps<any>(`/api/admin/jobs/${job}/runs?limit=5`, 0);
  const [open, setOpen] = useState(0);
  const runs: any[] = data?.runs || [];
  return (
    <div className="ops-sheet" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}><h3 style={{ flex: 1, margin: 0 }}>{job} — recent runs</h3><button className="ops-btn" onClick={onClose}>Close</button></div>
        {loading && <div className="ops-sub">Loading…</div>}
        {runs.map((r, i) => (
          <div key={r.id} style={{ marginBottom: 10 }}>
            <div className="ops-row" onClick={() => setOpen(i)} style={{ cursor: "pointer" }}>
              <div className="grow"><b>{r.started_at}</b><div className="ops-sub">{r.summary || "running…"} · {r.trigger}</div></div>
              <StatusPill status={r.status} />
            </div>
            {open === i && <pre className="ops-pre">{r.log_tail || "(no log)"}</pre>}
          </div>
        ))}
        {!loading && !runs.length && <div className="ops-sub">Never run.</div>}
      </div>
    </div>
  );
}

export default function JobsTab({ toast }: { toast: (m: string) => void }) {
  const jobs = useOps<any>("/api/admin/jobs", 10000);
  const src = useOps<any>("/api/admin/sources", 15000);
  const [logs, setLogs] = useState<string | null>(null);

  const run = async (name: string) => {
    try {
      const r = await opsPost(`/api/admin/jobs/${name}/run`);
      toast(r.queued ? `${name}: queued` : `${name}: already queued or running`);
      setTimeout(jobs.reload, 3000);
    } catch (e: any) { toast(`Failed: ${e.message}`); }
  };
  const route = async (name: string, action: string) => {
    try { await opsPost(`/api/admin/sources/${encodeURIComponent(name)}/${action}`); toast(`${name}: ${action}`); src.reload(); }
    catch (e: any) { toast(`Failed: ${e.message}`); }
  };

  return (
    <>
      <h3 style={{ margin: "0 2px 8px" }}>Where data comes from</h3>
      <div className="ops-grid" style={{ marginBottom: 22 }}>
        {(src.data?.routes || []).map((r: any) => (
          <div className="ops-card" key={r.route}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><h3 style={{ margin: 0, flex: 1 }}>{r.route}</h3><StatusPill status={r.state} /></div>
            <div className="ops-sub">today {num(r.today_ok)} ok · {num(r.today_fail)} failed · last ok {ago(r.last_ok)}</div>
            {r.last_error && <div className="ops-sub" style={{ color: "var(--ops-bad)" }}>last error: {r.last_error}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {r.state === "paused" && <button className="ops-btn" onClick={() => route(r.route, "resume")}>Resume</button>}
              {r.state === "active" && <button className="ops-btn" onClick={() => route(r.route, "pause")}>Pause 1 hr</button>}
              {r.state === "off" ? <button className="ops-btn" onClick={() => route(r.route, "on")}>Switch on</button> : <button className="ops-btn danger" onClick={() => route(r.route, "off")}>Switch off</button>}
            </div>
          </div>
        ))}
        {!(src.data?.routes || []).length && <div className="ops-card ops-sub">No fetch has been attempted yet. Run “Route probe” below.</div>}
      </div>

      <h3 style={{ margin: "0 2px 8px" }}>Jobs</h3>
      <div className="ops-grid">
        {(jobs.data?.jobs || []).map((j: any) => (
          <div className="ops-card" key={j.name}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><h3 style={{ margin: 0, flex: 1 }}>{j.label}</h3>{j.last && <StatusPill status={j.last.status} />}</div>
            <div className="ops-sub">{j.about}</div>
            <div className="ops-sub" style={{ marginTop: 6 }}>{scheduleText(j.schedule)}{j.next ? ` · next ${j.next}` : ""}</div>
            <div className="ops-sub">{j.last ? `${j.last.summary || "running…"} · ${ago(j.last.started_at)}` : "never run"}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="ops-btn primary" onClick={() => run(j.name)}>Run now</button>
              <button className="ops-btn" onClick={() => setLogs(j.name)}>Logs</button>
            </div>
          </div>
        ))}
      </div>
      {logs && <Logs job={logs} onClose={() => setLogs(null)} />}
    </>
  );
}
