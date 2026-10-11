/* Hosts the live app's Stock X-Ray, Patterns and Portfolio pages inside the Lab.
   Same components, same data; only the shell (routing, sheets, scrolling) is Lab's own.
   Routes (hash): patterns · patterns/SYM[/TF] · xray · xray/SYM · portfolio */
import React, { useEffect, useRef, useState } from "react";
import "../../q/q.css";
import { q, startEngine, setScroller, rescan } from "../../q/core";
import { XRay, Portfolio, type Go } from "../../q/tabs";
import { XRayReport, PatternPage } from "../../q/details";
import { AccountSheet } from "../../q/AccountSheet";
import { useAccount, onCloudPortfolio } from "../../q/account";
import { PatternPicker } from "./Patterns";
import { AddSheet, ShareSheet } from "./Sheets";

const clean = (s?: string) => (s || "").toUpperCase().replace(/[^A-Z0-9&_.-]/g, "");

/** live-app style path -> Lab hash */
export function toHash(path: string): string {
  const [p, qs = ""] = path.split("?");
  const seg = p.split("/").filter(Boolean);
  const tf = new URLSearchParams(qs).get("tf");
  if (seg[0] === "patterns") return seg[1] ? `#patterns/${clean(seg[1])}${tf ? "/" + tf.toUpperCase() : ""}` : "#patterns";
  if (seg[0] === "xray") return seg[1] ? `#xray/${clean(seg[1])}` : "#xray";
  if (seg[0] === "calls") return seg[1] && seg[1] !== "closed" ? `#xray/${clean(seg[1])}` : "#today";
  if (seg[0] === "portfolio") return "#portfolio";
  return "#today";
}
export const go: Go = (path) => { const h = toHash(path); if (location.hash !== h) location.hash = h; };

export default function QHost({ route }: { route: string }) {
  const [tab, id, tf] = route.split("/");
  const [modal, setModal] = useState<null | "share" | "add" | "account">(null);
  const [pf, setPf] = useState(0);
  const { user } = useAccount();
  const screen = useRef<HTMLElement>(null), page = useRef<HTMLElement>(null);
  const detail = !!id && (tab === "xray" || tab === "patterns");

  useEffect(() => { startEngine(); return onCloudPortfolio(() => setPf((v) => v + 1)); }, []);
  useEffect(() => {
    const el = (detail ? page.current : screen.current) as HTMLElement | null;
    if (el) el.scrollTop = 0;
    const raf = requestAnimationFrame(() => setScroller(el, true));
    return () => cancelAnimationFrame(raf);
  }, [route, detail]);
  useEffect(() => { document.documentElement.classList.toggle("lab-modal", !!modal); return () => document.documentElement.classList.remove("lab-modal"); }, [modal]);
  useEffect(() => { const t = setTimeout(rescan, 400); return () => clearTimeout(t); }, [route]);

  const back = () => go("/" + tab);
  const dark = () => (document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")) === "dark";
  const theme = () => { const r = document.documentElement; r.dataset.theme = dark() ? "light" : "dark"; try { localStorage.setItem("q-theme", r.dataset.theme); } catch { /* ignore */ } };

  return (
    <div className="q-root lab-q">
      <div className={q("device")}>
        <section ref={screen} className={q("screen on")} aria-label={tab}>
          {tab === "patterns" ? <PatternPicker go={go} />
            : tab === "xray" ? <XRay go={go} />
            : <Portfolio go={go} onAdd={() => setModal("add")} onAccount={() => setModal("account")} signedIn={!!user} version={pf} />}
        </section>
        {detail && (
          <section ref={page} className={q("page")} style={{ visibility: "visible" }} aria-label="Details">
            {tab === "xray" ? <XRayReport key={id} sym={clean(id)} go={go} onBack={back} onShare={() => setModal("share")} />
              : <PatternPage key={id + tf} sym={clean(id)} tf={tf} go={go} onBack={back} onShare={() => setModal("share")} />}
          </section>)}
        <div className={q("scrim" + (modal ? " on" : ""))} onClick={() => setModal(null)} />
        <section className={q("modal" + (modal ? " open" : ""))} role="dialog" aria-label="Sheet">
          {modal === "share" ? <ShareSheet onClose={() => setModal(null)} />
            : modal === "account" ? <AccountSheet onClose={() => setModal(null)} onTheme={theme} dark={dark()} />
            : modal === "add" ? <AddSheet onClose={() => setModal(null)} onAdded={() => { setModal(null); setPf((v) => v + 1); }} /> : null}
        </section>
      </div>
    </div>
  );
}
