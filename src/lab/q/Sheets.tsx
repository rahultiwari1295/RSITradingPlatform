/* Share + "add a stock" sheets for the portfolio and report pages (copied from the live app's shell so the
   Lab can host the same pages without touching src/q). */
import React, { useEffect, useRef, useState } from "react";
import { q } from "../../q/core";
import { searchStocks, getHoldings, setHoldings } from "../../q/data";
import { Icon } from "../../q/ui";

export function ShareSheet({ onClose }: { onClose: () => void }) {
  const link = location.origin + location.pathname + location.search + location.hash;
  const [ok, setOk] = useState(false);
  const inp = useRef<HTMLInputElement>(null);
  const copy = () => {
    const done = () => setOk(true);
    try { navigator.clipboard.writeText(link).then(done, () => inp.current?.select()); } catch { inp.current?.select(); }
  };
  const native = typeof navigator !== "undefined" && (navigator as any).share;
  return (
    <>
      <h2>Share this page</h2>
      <p className={q("mu")} style={{ margin: "6px 0 0", fontSize: 15 }}>Anyone with the link lands right on this page.</p>
      <div className={q("share")}>
        <input ref={inp} readOnly value={link} aria-label="Link to this page" onFocus={(e) => e.target.select()} />
        <button className={q("btn acc")} style={{ ["--acc" as any]: "var(--fg)" }} onClick={copy}><Icon n={ok ? "check" : "copy"} s={17} w={2.2} /> {ok ? "Copied" : "Copy"}</button>
      </div>
      {native ? <button className={q("btn soft w")} style={{ marginTop: 10 }} onClick={() => (navigator as any).share({ url: link, title: document.title }).catch(() => {})}><Icon n="share" s={17} /> Share with an app</button> : null}
      <button className={q("btn soft w")} style={{ marginTop: 10 }} onClick={onClose}>Done</button>
    </>
  );
}
export function AddSheet({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [sym, setSym] = useState(""), [qty, setQty] = useState(""), [avg, setAvg] = useState(""), [err, setErr] = useState(""), [sug, setSug] = useState<any[]>([]);
  useEffect(() => {
    const v = sym.trim(); if (v.length < 1) { setSug([]); return; }
    const id = setTimeout(() => searchStocks(v).then((r: any) => setSug(Array.isArray(r) ? r.slice(0, 4) : []), () => setSug([])), 180);
    return () => clearTimeout(id);
  }, [sym]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = sym.trim().toUpperCase().replace(/[^A-Z0-9&_.-]/g, ""), qn = Math.floor(+qty), a = +avg;
    if (!s) return setErr("Enter a stock symbol.");
    if (!(qn > 0)) return setErr("Enter 1 or more shares.");
    if (!(a > 0)) return setErr("Enter the price you paid per share.");
    const hs = getHoldings(), ex = hs.find((h) => h.sym === s);
    if (ex) { const tq = ex.qty + qn; ex.avg = (ex.avg * ex.qty + a * qn) / tq; ex.qty = tq; } else hs.push({ sym: s, qty: qn, avg: a });
    setHoldings(hs); onAdded();
  };
  return (
    <>
      <h2>Add a stock you own</h2>
      <p className={q("mu")} style={{ margin: "6px 0 0", fontSize: 15 }}>Type what you bought. You can remove it any time.</p>
      <form onSubmit={submit} noValidate>
        <div className={q("fld")}><label htmlFor="q-sym">Stock symbol</label><input id="q-sym" value={sym} onChange={(e) => setSym(e.target.value)} placeholder="e.g. TRENT" autoComplete="off" style={{ textTransform: "uppercase" }} /></div>
        {sug.length ? <div className={q("chips")} style={{ marginTop: 10 }}>{sug.map((s) => <button type="button" key={s.symbol} className={q("chip")} onClick={() => { setSym(s.symbol); setSug([]); }}>{s.symbol}</button>)}</div> : null}
        <div className={q("fld")}><label htmlFor="q-qty">How many shares</label><input id="q-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="10" /></div>
        <div className={q("fld")}><label htmlFor="q-avg">Average price you paid (₹)</label><input id="q-avg" inputMode="decimal" value={avg} onChange={(e) => setAvg(e.target.value)} placeholder="1500" /></div>
        <p className={q("err")} role="alert">{err}</p>
        <div style={{ display: "flex", gap: 10 }}><button type="button" className={q("btn soft")} style={{ flex: 1 }} onClick={onClose}>Cancel</button><button type="submit" className={q("btn acc")} style={{ flex: 1, ["--acc" as any]: "var(--pf)" }}>Add</button></div>
      </form>
    </>
  );
}
