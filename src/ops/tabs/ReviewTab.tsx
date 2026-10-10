import React from "react";
import StatusPill from "../StatusPill";
import { ago, num, opsPost, useOps } from "../opsApi";

const FIELDS: [string, string][] = [["revenue_cr", "Revenue ₹cr"], ["op_profit_cr", "Operating profit"], ["net_profit_cr", "Net profit"], ["eps", "EPS"]];

function Side({ title, v }: { title: string; v: any }) {
  return (
    <div>
      <div className="ops-sub" style={{ fontWeight: 700 }}>{title}</div>
      {v ? FIELDS.map(([k, l]) => <div key={k} className="ops-sub">{l}: <b style={{ color: "var(--ops-ink)" }}>{num(v[k], 2)}</b></div>) : <div className="ops-sub">nothing stored</div>}
      {v?.source && <div className="ops-sub">{v.source}</div>}
    </div>
  );
}

export default function ReviewTab({ toast, onChanged }: { toast: (m: string) => void; onChanged: () => void }) {
  const { data, loading, reload } = useOps<any>("/api/admin/review", 15000);
  const act = async (id: number, action: "approve" | "reject") => {
    try { await opsPost(`/api/admin/review/${id}/${action}`); toast(action === "approve" ? "Approved and saved" : "Rejected"); reload(); onChanged(); }
    catch (e: any) { toast(`Failed: ${e.message}`); }
  };
  const pending: any[] = data?.pending || [];
  return (
    <>
      <h3 style={{ margin: "0 2px 8px" }}>Waiting for your decision ({pending.length})</h3>
      <p className="ops-sub" style={{ margin: "0 2px 10px" }}>These rows looked unusual (a sudden jump, numbers that don't add up). Nothing here is shown to users until you approve it.</p>
      <div className="ops-grid">
        {pending.map((r) => (
          <div className="ops-card" key={r.id}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><h3 style={{ margin: 0, flex: 1 }}>{r.symbol} · {r.period}</h3><StatusPill status="PENDING" /></div>
            <div className="ops-sub" style={{ margin: "4px 0 10px" }}>{r.reason}</div>
            <div className="ops-split"><Side title="Stored now" v={r.old} /><Side title="New value" v={r.new} /></div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="ops-btn primary" onClick={() => act(r.id, "approve")}>Approve</button>
              <button className="ops-btn danger" onClick={() => act(r.id, "reject")}>Reject</button>
            </div>
          </div>
        ))}
        {!loading && !pending.length && <div className="ops-card ops-sub">Nothing waiting. 🎉</div>}
      </div>

      <h3 style={{ margin: "22px 2px 8px" }}>Recently rejected or held</h3>
      <div className="ops-card" style={{ overflowX: "auto" }}>
        <table className="ops-tbl">
          <thead><tr><th>When</th><th>Stock</th><th>Data</th><th>Why</th></tr></thead>
          <tbody>
            {(data?.rejections || []).map((r: any, i: number) => (
              <tr key={i}><td>{ago(r.ts)}</td><td><b>{r.symbol}</b> {r.period || ""}</td><td>{r.dataset}</td><td>{r.reason}</td></tr>
            ))}
          </tbody>
        </table>
        {!(data?.rejections || []).length && <div className="ops-sub">None.</div>}
      </div>
    </>
  );
}
