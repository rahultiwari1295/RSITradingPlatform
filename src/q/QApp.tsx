/* QuantSync calm-luxe app shell: five tabs, real URLs for every report and call,
   spring transitions, push pages with edge-swipe back, share links and the locked launch film. */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import "./q.css";
import { q, Spring, clamp, RM, startEngine, setScroller, guardScroll } from "./core";
import { searchStocks, getHoldings, setHoldings } from "./data";
import { Icon } from "./ui";
import { Home, XRay, Calls, Patterns, Portfolio } from "./tabs";
import { XRayReport, CallPage, ClosedPage, PatternPage } from "./details";

type Tab = "home" | "xray" | "calls" | "patterns" | "portfolio";
type Kind = "xray" | "call" | "closed" | "pattern";
interface Route { tab: Tab; kind?: Kind; id?: string; tf?: string }
const TABS: [Tab, string, string, string][] = [
  ["home", "Home", "home", "var(--fg)"],
  ["xray", "X-Ray", "xray", "var(--ax)"],
  ["calls", "AI Calls", "ai", "var(--ai)"],
  ["patterns", "Patterns", "pat", "var(--pt)"],
  ["portfolio", "Portfolio", "pie", "var(--pf)"],
];
const PARENT: Record<Kind, Tab> = { xray: "xray", call: "calls", closed: "calls", pattern: "patterns" };
const TITLES: Record<Tab, string> = { home: "QuantSync", xray: "Stock X-Ray", calls: "AI Calls", patterns: "Pattern Calls", portfolio: "Portfolio" };

export function parseRoute(path: string, search: string): Route {
  const seg = path.replace(/\/+$/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const tf = new URLSearchParams(search).get("tf") || undefined;
  const clean = (s?: string) => (s || "").toUpperCase().replace(/[^A-Z0-9&_.-]/g, "");
  if (seg[0] === "xray") return seg[1] ? { tab: "xray", kind: "xray", id: clean(seg[1]) } : { tab: "xray" };
  if (seg[0] === "calls") {
    if (seg[1] === "closed" && seg[2]) return { tab: "calls", kind: "closed", id: seg[2] };
    return seg[1] ? { tab: "calls", kind: "call", id: clean(seg[1]) } : { tab: "calls" };
  }
  if (seg[0] === "patterns") return seg[1] ? { tab: "patterns", kind: "pattern", id: clean(seg[1]), tf: tf?.toUpperCase() } : { tab: "patterns" };
  if (seg[0] === "portfolio") return { tab: "portfolio" };
  return { tab: "home" };
}
const routeKey = (r: Route) => (r.kind ? `${r.kind}:${r.id}:${r.tf || ""}` : "");

/* ---------------- launch film (locked files in /public/q) ---------------- */
function useFilm(enabled: boolean) {
  useEffect(() => {
    if (!enabled || (window as any).__qFilm) return;
    try { if (sessionStorage.getItem("q-film")) return; } catch { /* storage blocked: still show */ }
    (window as any).__qFilm = true;
    let host: HTMLDivElement | null = null, tpl: HTMLTemplateElement | null = null, scr: HTMLScriptElement | null = null;
    const leave = () => {
      try { sessionStorage.setItem("q-film", "1"); } catch { /* ignore */ }
      setTimeout(() => { host?.remove(); tpl?.remove(); scr?.remove(); }, 1400);
    };
    Promise.all([fetch("/q/intro.css").then((r) => r.text()), fetch("/q/intro.html").then((r) => r.text())]).then(([css, html]) => {
      tpl = document.createElement("template"); tpl.id = "film-tpl"; tpl.innerHTML = `<style>${css}</style>${html}`;
      host = document.createElement("div"); host.id = "film-host";
      document.body.appendChild(tpl); document.body.appendChild(host);
      document.addEventListener("film:leave", leave, { once: true });
      scr = document.createElement("script"); scr.src = "/q/intro.js"; document.body.appendChild(scr);
    }).catch(() => { /* film is optional */ });
  }, [enabled]);
}

export default function QApp() {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.pathname, location.search));
  const [shown, setShown] = useState<Route | null>(() => (route.kind ? route : null));
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set([route.tab]));
  const [modal, setModal] = useState<null | "share" | "add">(null);
  const [pfVersion, setPfVersion] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null), devRef = useRef<HTMLDivElement>(null), screensRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLElement>(null), tabsRef = useRef<HTMLElement>(null), pillRef = useRef<HTMLSpanElement>(null);
  const scr = useRef<Partial<Record<Tab, HTMLElement | null>>>({});
  const tabSpr = useRef<Partial<Record<Tab, Spring>>>({});
  const prevTab = useRef<Tab>(route.tab);
  const firstLoad = useRef(true);
  const backRef = useRef<() => void>(() => {});

  useFilm(!route.kind && (location.pathname === "/" || location.pathname === "/home"));

  /* theme */
  useEffect(() => {
    try { const t = localStorage.getItem("q-theme"); if (t) document.documentElement.dataset.theme = t; } catch { /* ignore */ }
    document.title = "QuantSync";
  }, []);
  const toggleTheme = () => {
    const r = document.documentElement, cur = r.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"), nx = cur === "dark" ? "light" : "dark";
    r.dataset.theme = nx;
    try { localStorage.setItem("q-theme", nx); } catch { /* ignore */ }
  };

  /* router */
  const go = useCallback((path: string) => {
    if (path === location.pathname + location.search) return;
    history.pushState(null, "", path);
    setRoute(parseRoute(location.pathname, location.search));
  }, []);
  useEffect(() => {
    const on = () => setRoute(parseRoute(location.pathname, location.search));
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  useEffect(() => {
    document.title = route.kind ? `${route.id} · ${route.kind === "xray" ? "Stock X-Ray" : route.kind === "pattern" ? "Pattern Call" : "AI Call"} · QuantSync` : `${TITLES[route.tab]} · QuantSync`;
  }, [route]);

  /* springs: tab pill, page push */
  const pill = useRef<Spring | undefined>(undefined);
  const pg = useRef<Spring | undefined>(undefined);
  if (!pill.current) pill.current = new Spring(TABS.findIndex((t) => t[0] === route.tab), 280, 24, (x) => { if (pillRef.current) pillRef.current.style.transform = `translateX(${(x * 100).toFixed(2)}%)`; });
  if (!pg.current) pg.current = new Spring(route.kind ? 0 : 1, 230, 28, (x) => {
    const page = pageRef.current, sc = screensRef.current, tb = tabsRef.current, dev = devRef.current;
    if (!page || !sc || !tb || !dev) return;
    const W = dev.clientWidth, o = 1 - clamp(x, 0, 1);
    page.style.transform = x ? `translate3d(${(x * W).toFixed(1)}px,0,0)` : "";
    page.style.visibility = x >= 0.999 ? "hidden" : "visible";
    sc.style.transform = o ? `translate3d(${(-o * W * 0.26).toFixed(1)}px,0,0)` : "";
    sc.style.filter = o > 0.01 ? `brightness(${(1 - 0.35 * o).toFixed(3)})` : "";
    tb.style.transform = `translateX(-50%) translateY(${(o * 130).toFixed(1)}px)`;
  });

  useEffect(() => {
    startEngine();
    if (devRef.current && rootRef.current) guardScroll(devRef.current, rootRef.current);
    pg.current!.on(pg.current!.x);
    const onR = () => pg.current!.on(pg.current!.x);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  /* tab changes */
  useLayoutEffect(() => {
    const t = route.tab, p = prevTab.current;
    setVisited((v) => (v.has(t) ? v : new Set(v).add(t)));
    const ni = TABS.findIndex((x) => x[0] === t), pi = TABS.findIndex((x) => x[0] === p);
    pill.current!.to(ni);
    if (tabsRef.current) tabsRef.current.style.setProperty("--t", TABS[ni][3]);
    if (t !== p) {
      const dir = ni > pi ? 1 : -1, n = scr.current[t], o = scr.current[p];
      if (n) { n.classList.add("q-on"); n.style.zIndex = "2"; n.scrollTop = 0; }
      if (o) o.style.zIndex = "1";
      const sn = tabSpr.current[t], so = tabSpr.current[p];
      if (!route.kind && sn && so && !RM) {
        sn.set(70 * dir); sn.to(0);
        so.to(-70 * dir, null, () => { if (prevTab.current !== p) { o?.classList.remove("q-on"); so.set(0); } });
      } else { o?.classList.remove("q-on"); so?.set(0); }
      const h = n?.querySelector(".q-hero");
      if (h && !RM) { h.classList.remove("q-play"); void (h as HTMLElement).offsetWidth; h.classList.add("q-play"); }
      prevTab.current = t;
    }
  }, [route.tab, route.kind]);

  /* page open/close */
  useEffect(() => {
    if (route.kind) {
      setShown(route);
      if (pageRef.current) pageRef.current.scrollTop = 0;
      if (firstLoad.current) pg.current!.set(0); else pg.current!.to(0, 0);
    } else if (shown) {
      pg.current!.to(1, 0, () => setShown(null));
    }
    firstLoad.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey(route)]);

  /* point the motion engine at what the user sees */
  useEffect(() => {
    const el = route.kind ? pageRef.current : scr.current[route.tab] || null;
    const id = requestAnimationFrame(() => setScroller(el as HTMLElement, true));
    return () => cancelAnimationFrame(id);
  }, [route.tab, routeKey(route), visited.size]);

  /* edge swipe back on the page */
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    let x0: number | null = null, lx = 0, lt = 0, v = 0, W = 1;
    const down = (e: PointerEvent) => {
      const r = page.getBoundingClientRect();
      if (e.pointerType === "mouse" || e.clientX - r.left > 28) return;
      x0 = e.clientX; lx = x0; lt = performance.now(); W = r.width; v = 0; pg.current!.stop();
    };
    const move = (e: PointerEvent) => {
      if (x0 === null) return;
      const now = performance.now(), dx = Math.max(0, e.clientX - x0);
      v = (((e.clientX - lx) / Math.max(1, now - lt)) * 1000) / W; lx = e.clientX; lt = now;
      pg.current!.x = dx / W; pg.current!.on(pg.current!.x);
    };
    const up = () => { if (x0 === null) return; x0 = null; if (pg.current!.x > 0.35 || v > 1.1) backRef.current(); else pg.current!.to(0, v); };
    page.addEventListener("pointerdown", down); page.addEventListener("pointermove", move);
    page.addEventListener("pointerup", up); page.addEventListener("pointercancel", up);
    return () => { page.removeEventListener("pointerdown", down); page.removeEventListener("pointermove", move); page.removeEventListener("pointerup", up); page.removeEventListener("pointercancel", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const back = () => { const k = (shown || route).kind; go("/" + (k ? PARENT[k] : "home")); };
  backRef.current = back;
  const share = () => setModal("share");

  const regScreen = (t: Tab) => (el: HTMLElement | null) => {
    scr.current[t] = el;
    if (el && !tabSpr.current[t]) tabSpr.current[t] = new Spring(0, 240, 30, (x) => { el.style.transform = x ? `translate3d(${x.toFixed(2)}px,0,0)` : ""; el.style.opacity = (1 - Math.min(Math.abs(x) / 70, 1)).toFixed(3); });
  };
  const view = (t: Tab) => {
    if (!visited.has(t)) return null;
    if (t === "home") return <Home go={go} />;
    if (t === "xray") return <XRay go={go} />;
    if (t === "calls") return <Calls go={go} />;
    if (t === "patterns") return <Patterns go={go} />;
    return <Portfolio go={go} onAdd={() => setModal("add")} version={pfVersion} />;
  };
  const d = shown;
  return (
    <div className="q-root" ref={rootRef}>
      <div className={q("device")} ref={devRef}>
        <main className={q("screens")} ref={screensRef}>
          {TABS.map(([t, label]) => (
            <section key={t} ref={regScreen(t)} className={q("screen" + (t === route.tab ? " on" : ""))} aria-label={label} aria-hidden={t !== route.tab}>
              {view(t)}
            </section>
          ))}
        </main>
        <button className={q("tbtn")} onClick={toggleTheme} aria-label="Switch light or dark theme"><Icon n="moon" s={18} /></button>
        <section className={q("page")} ref={pageRef as any} aria-label="Details">
          {d?.kind === "xray" ? <XRayReport key={routeKey(d)} sym={d.id!} go={go} onBack={back} onShare={share} /> :
            d?.kind === "call" ? <CallPage key={routeKey(d)} sym={d.id!} go={go} onBack={back} onShare={share} /> :
            d?.kind === "closed" ? <ClosedPage key={routeKey(d)} id={d.id!} go={go} onBack={back} onShare={share} /> :
            d?.kind === "pattern" ? <PatternPage key={routeKey(d)} sym={d.id!} tf={d.tf} go={go} onBack={back} onShare={share} /> : null}
        </section>
        <div className={q("scrim" + (modal ? " on" : ""))} onClick={() => setModal(null)} />
        <section className={q("modal" + (modal ? " open" : ""))} role="dialog" aria-label={modal === "add" ? "Add a stock" : "Share"}>
          {modal === "share" ? <ShareSheet onClose={() => setModal(null)} /> : modal === "add" ? <AddSheet onClose={() => setModal(null)} onAdded={() => { setModal(null); setPfVersion((v) => v + 1); }} /> : null}
        </section>
        <nav className={q("tabs")} ref={tabsRef as any} aria-label="Main">
          <span className={q("tpill")} ref={pillRef} />
          {TABS.map(([t, label, icon]) => (
            <button key={t} className={q("tab")} aria-current={t === route.tab ? "page" : undefined} onClick={() => go("/" + t)} aria-label={label}>
              <Icon n={icon} s={24} w={1.9} /><span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function ShareSheet({ onClose }: { onClose: () => void }) {
  const link = location.origin + location.pathname + location.search;
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
function AddSheet({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
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
