import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import "./ops.css";
import { OWNER_EMAIL, useOps } from "./opsApi";
import OverviewTab from "./tabs/OverviewTab";
import DataTab from "./tabs/DataTab";
import JobsTab from "./tabs/JobsTab";
import ReviewTab from "./tabs/ReviewTab";
import PerformanceTab from "./tabs/PerformanceTab";

type Tab = "overview" | "data" | "jobs" | "review" | "performance";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "◎" }, { id: "data", label: "Data", icon: "▤" }, { id: "jobs", label: "Jobs", icon: "⚙" },
  { id: "review", label: "Review", icon: "✓" }, { id: "performance", label: "Performance", icon: "↗" },
];

function Gate({ text }: { text: string }) {
  return (
    <div className="ops-root"><div className="ops-center"><div>
      <div style={{ fontSize: 34, marginBottom: 10 }}>🔒</div>
      <h2 style={{ margin: "0 0 6px" }}>{text}</h2>
      <a className="ops-btn primary" href="/" style={{ display: "inline-block", textDecoration: "none", marginTop: 10 }}>Go to the main website</a>
    </div></div></div>
  );
}

function Console({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>(() => (new URLSearchParams(window.location.search).get("tab") as Tab) || "overview");
  const [dataset, setDataset] = useState("results");
  const [state, setState] = useState("STALE");
  const [msg, setMsg] = useState<string | null>(null);
  const pending = useOps<any>("/api/admin/coverage", 0);   // also proves the token works before showing anything else
  const rev = useOps<any>("/api/admin/review", 30000);

  const toast = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3200); }, []);
  useEffect(() => { try { const u = new URL(window.location.href); u.searchParams.set("tab", tab); window.history.replaceState(null, "", u); } catch { /* ignore */ } }, [tab]);

  if (pending.error === "not allowed" || pending.error === "not signed in") return <Gate text="Please visit the main website" />;
  const nPending = rev.data?.pending?.length || 0;

  return (
    <div className="ops-root">
      <div className="ops-shell">
        <nav className="ops-side" aria-label="Sections">
          <div className="ops-brand">QuantSync Ops<small>{email}</small></div>
          {TABS.map((t) => (
            <button key={t.id} className="ops-navbtn" aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
              <span aria-hidden>{t.icon}</span><span>{t.label}</span>
              {t.id === "review" && nPending > 0 && <span className="badge">{nPending}</span>}
            </button>
          ))}
          <a className="ops-navbtn" href="/" style={{ marginTop: "auto", textDecoration: "none" }}><span aria-hidden>←</span><span>Main site</span></a>
        </nav>
        <main className="ops-main">
          <div className="ops-top"><h1>{TABS.find((t) => t.id === tab)?.label}</h1><span className="ops-sub">refreshes automatically</span></div>
          {pending.error && !pending.data && <div className="ops-alert bad">Can't reach the server right now ({pending.error}). Showing nothing rather than old numbers.</div>}
          {tab === "overview" && <OverviewTab onOpenData={(ds, st) => { setDataset(ds); setState(st); setTab("data"); }} onOpenReview={() => setTab("review")} />}
          {tab === "data" && <DataTab dataset={dataset} state={state} setDataset={setDataset} setState={setState} toast={toast} />}
          {tab === "jobs" && <JobsTab toast={toast} />}
          {tab === "review" && <ReviewTab toast={toast} onChanged={rev.reload} />}
          {tab === "performance" && <PerformanceTab />}
        </main>
      </div>
      {msg && <div className="ops-toast" role="status">{msg}</div>}
    </div>
  );
}

export default function OpsPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="ops-root"><div className="ops-center">Loading…</div></div>;
  // UI gate only — /api/admin/* verifies the token on the server and rejects everyone else.
  if (!user || (user.email || "").toLowerCase() !== OWNER_EMAIL) return <Gate text="Please visit the main website" />;
  return <Console email={user.email || ""} />;
}
