"""Owner-only holding health for /rahul: one verdict per holding (exit / protect / hold / buy-more zone), long-term marks,
and one list of every GTT (sell trigger) left at Angel, Kite and Dhan, matched against what is actually held.

Everything answers 404 to anyone who is not the owner (OP._owner). Placing or cancelling a GTT needs the trade code.
Verdict rules were blind-tested on 8 years of NSE prices (research/health/blind_test.py, 15 Nov 2026); TEST below holds
the result so the page can show it. Broker GTT field names come from Kite's documentation and the official Angel and Dhan
Python SDKs; none of the GTT calls had been run against a real account when this was written.
"""
from __future__ import annotations

import json
import logging
import os
import sqlite3
import time
import urllib.parse
from typing import Any, Dict, List

from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.responses import JSONResponse

import owner_portfolio as OP

log = logging.getLogger("owner_health")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HIST, EDGE = os.path.join(ROOT, "Data", "stock_history.db"), os.path.join(ROOT, "Data", "edge.db")
router = APIRouter(prefix="/api/owner", tags=["owner-health"])
NOSTORE = {"Cache-Control": "no-store, private"}
ANGEL_HOST = "https://apiconnect.angelbroking.com"
ANGEL_GTT = {"create": ANGEL_HOST + "/gtt-service/rest/secure/angelbroking/gtt/v1/createRule",
             "cancel": ANGEL_HOST + "/gtt-service/rest/secure/angelbroking/gtt/v1/cancelRule",
             "list": ANGEL_HOST + "/rest/secure/angelbroking/gtt/v1/ruleList"}

# Blind test, liquid NSE stocks, a verdict every 21 sessions, 2019-22 (A) and 2023-26 (B). Return is against NIFTY500.
TEST = {"periods": ["2019-22", "2023-26"],
        "exit": {"n": [2611, 4868], "rel6m": [2.74, 1.88], "fall20": [25.9, 24.7]},
        "protect": {"n": [7571, 13265], "rel6m": [2.79, 3.20], "fall20": [22.3, 21.4]},
        "hold": {"n": [13071, 20414], "rel6m": [7.69, 4.47], "fall20": [22.2, 22.3]},
        "buy": {"n": [2696, 4817], "rel6m": [5.96, 4.93], "fall20": [19.1, 17.6]},
        "note": "The price list holds today's stocks only, so stocks that were delisted are missing. That flatters the weak groups."}


# ------------------------------------------------------------------ rules (same code as the blind test)
def _sma(xs, n, end):
    return sum(xs[end - n + 1:end + 1]) / n if end + 1 >= n else None


def verdict_at(cs, i, bench=None):
    if i < 260:
        return None
    c = [x["c"] for x in cs]
    px = c[i]
    d50 = _sma(c, 50, i)
    w30, w30p = _sma(c, 150, i), _sma(c, 150, i - 20)
    m10, m10p = _sma(c, 210, i), _sma(c, 210, i - 42)
    sup = min(x["l"] for x in cs[i - 65:i - 4])
    wk = "up" if px > w30 and w30 >= w30p else "down" if px < w30 and w30 < w30p else "flat"
    mo = "up" if px > m10 and m10 >= m10p else "down" if px < m10 and m10 < m10p else "flat"
    rs = None
    if bench:
        b0, b1 = bench.get(cs[i - 63]["t"]), bench.get(cs[i]["t"])
        if b0 and b1:
            rs = ((px / c[i - 63]) - (b1 / b0)) * 100
    broken = px < sup
    out = {"px": px, "d50": d50, "w30": w30, "m10": m10, "support": sup, "weekly": wk, "monthly": mo, "rs": rs, "broken": broken}
    if wk == "down" and mo == "down" and (broken or (rs is not None and rs < -10)):
        out["verdict"] = "exit"
    elif wk == "up" and mo == "up" and d50 * 0.98 <= px <= d50 * 1.03:
        out["verdict"] = "buy"
    elif wk == "down" or (mo == "up" and px < d50) or broken:
        out["verdict"] = "protect"
    else:
        out["verdict"] = "hold"
    return out


def _tick(x: float) -> float:
    return round(round(x / 0.05) * 0.05, 2)


def _ro(p):
    return sqlite3.connect(f"file:{p}?mode=ro", uri=True, timeout=20)


_bench = {"t": 0, "m": {}}


def _bench_map() -> Dict[str, float]:
    if time.time() - _bench["t"] > 3600:
        with _ro(HIST) as c:
            r = c.execute("SELECT rawCandles FROM StockHistory WHERE symbol='NIFTY500'").fetchone()
        _bench.update(t=time.time(), m={k["t"][:10]: k["c"] for k in json.loads(r[0]) if not k.get("p")} if r else {})
    return _bench["m"]


def _marks(c) -> Dict[str, Dict[str, Any]]:
    c.execute("CREATE TABLE IF NOT EXISTS pf_marks (symbol TEXT PRIMARY KEY, mark TEXT, note TEXT, ts TEXT)")
    return {s: {"mark": m, "note": n, "ts": t} for s, m, n, t in c.execute("SELECT symbol, mark, note, ts FROM pf_marks")}


def health_of(symbols: List[str]) -> Dict[str, Any]:
    bench = _bench_map()
    out: Dict[str, Any] = {}
    edge = {}
    try:
        with _ro(EDGE) as e:
            q = ",".join("?" * len(symbols))
            edge = {s: json.loads(b) for s, b in e.execute(f"SELECT symbol, body_json FROM stock WHERE symbol IN ({q})", symbols)}
    except sqlite3.Error:
        pass
    live = OP._quotes(symbols)
    with _ro(HIST) as h:
        for sym in symbols:
            r = h.execute("SELECT rawCandles FROM StockHistory WHERE symbol=?", (sym,)).fetchone()
            E = edge.get(sym) or {}
            flags = [w for w in (E.get("warnings") or []) if w.get("level") == "bad"]
            fund = not E.get("sector")
            if not r:
                out[sym] = {"verdict": "unknown", "why": "No price history for this symbol.", "flags": flags, "fund": fund}
                continue
            cs = [k for k in json.loads(r[0]) if not k.get("p")]
            for k in cs:
                k["t"] = k["t"][:10]
            v = verdict_at(cs, len(cs) - 1, bench)
            if not v:
                out[sym] = {"verdict": "unknown", "why": "Less than a year of prices, too short to judge.", "flags": flags, "fund": fund}
                continue
            turn = sum(x["c"] * (x.get("v") or 0) for x in cs[-20:]) / 20
            px = v["px"]                       # the verdict is on the last daily close; the live price is shown apart
            ltp = (live.get(sym) or {}).get("ltp") or px
            sup, d50 = v["support"], v["d50"]
            gap = (px / sup - 1) * 100 if sup else None
            stop = _tick(sup * 0.995) if gap is not None and 3 <= gap <= 15 else _tick(px * 0.92)
            zone = [_tick(d50 * 0.98), _tick(d50 * 1.03)]
            # target to book profit: the 1-year high if it is 5-40% above, else +15%
            hi = max(x["h"] for x in cs[-250:])
            target = _tick(hi) if px * 1.05 <= hi <= px * 1.4 else _tick(px * 1.15)
            vd = v["verdict"]
            if fund:
                vd = "fund"
            why = {
                "exit": f"Weekly and monthly trends are down and {'price broke its 3-month low ₹' + format(sup, ',.2f') if v['broken'] else 'it lagged the market by ' + format(-(v['rs'] or 0), '.0f') + ' points in 3 months'}.",
                "protect": "Weekly trend is down." if v["weekly"] == "down" else f"Below its 3-month low ₹{sup:,.2f}." if v["broken"] else f"Long-term trend is up but price slipped under its 50-day average ₹{d50:,.2f}.",
                "hold": "Trends are fine and no support is broken.",
                "buy": f"Weekly and monthly trends are up and price is back at its 50-day average, the zone ₹{zone[0]:,.2f} to ₹{zone[1]:,.2f}.",
                "fund": "ETF or fund. The stock rules do not apply; trend shown for information.",
            }[vd]
            out[sym] = {"verdict": vd, "why": why, "px": round(px, 2), "ltp": round(ltp, 2), "as_of": cs[-1]["t"], "weekly": v["weekly"], "monthly": v["monthly"],
                        "d50": round(d50, 2), "support": round(sup, 2), "rs": None if v["rs"] is None else round(v["rs"], 1), "broken": v["broken"],
                        "stop": stop, "target": target, "zone": zone, "flags": flags, "fund": fund, "sector": E.get("sector"),
                        "thin": turn < 2e7 or v["px"] < 20}
    return out


@router.get("/health")
def health(request: Request, symbols: str = ""):
    OP._owner(request)
    syms = sorted({s.strip().upper() for s in symbols.split(",") if s.strip()})[:120]
    with OP._db() as c:
        marks = _marks(c)
    return JSONResponse({"stocks": health_of(syms) if syms else {}, "marks": marks, "test": TEST}, headers=NOSTORE)


@router.post("/marks")
def set_mark(request: Request, body: Dict[str, Any] = Body(...)):
    OP._owner(request)
    sym = str(body.get("symbol", "")).upper().strip()
    mark = str(body.get("mark") or "")
    if not sym or not sym.replace("&", "").replace("-", "").isalnum() or mark not in ("", "long"):
        raise HTTPException(400, "Bad mark.")
    with OP._db() as c:
        _marks(c)
        if mark:
            c.execute("INSERT OR REPLACE INTO pf_marks VALUES (?,?,?,?)", (sym, mark, str(body.get("note") or "")[:200], time.strftime("%Y-%m-%d %H:%M:%S")))
        else:
            c.execute("DELETE FROM pf_marks WHERE symbol=?", (sym,))
    return JSONResponse({"ok": True, "symbol": sym, "mark": mark or None}, headers=NOSTORE)


# ------------------------------------------------------------------ GTT list, match, cancel, place
def _f(x) -> float:
    try:
        return float(str(x).replace(",", ""))
    except (TypeError, ValueError):
        return 0.0


def _pick(d, *names):
    for n in names:
        if d.get(n) not in (None, ""):
            return d[n]
    return None


def _sym(s) -> str:
    return str(s or "").upper().replace("-EQ", "").replace("-BE", "").strip()


def _list_angel() -> List[Dict[str, Any]]:
    cfg = OP._cfg()
    if not cfg.get("api_key"):
        raise RuntimeError("not set up")
    body = {"status": ["NEW", "ACTIVE"], "page": 1, "count": 100}
    r = OP._call(ANGEL_GTT["list"], cfg, OP._token(cfg), body)
    if not r.get("status"):
        r = OP._call(ANGEL_GTT["list"], cfg, OP._token(cfg, force=True), body)
    if not r.get("status"):
        raise RuntimeError(r.get("message") or "list failed")
    out = []
    for g in r.get("data") or []:
        trig = _f(_pick(g, "triggerprice", "triggerPrice"))
        out.append({"broker": "Angel", "id": str(_pick(g, "id", "ruleid") or ""), "symbol": _sym(_pick(g, "tradingsymbol", "symbol")),
                    "side": str(_pick(g, "transactiontype", "transactionType") or "").upper(), "qty": _f(_pick(g, "qty", "quantity")),
                    "triggers": [trig] if trig else [], "price": _f(g.get("price")), "status": str(g.get("status") or ""),
                    "created": str(_pick(g, "createddate", "createdDate") or "")[:19], "token": str(_pick(g, "symboltoken", "symbolToken") or ""),
                    "exchange": str(g.get("exchange") or "NSE"), "type": "single"})
    return out


def _list_kite() -> List[Dict[str, Any]]:
    h = OP._kite_headers()
    if not h:
        raise RuntimeError("not connected today")
    r = OP._http("https://api.kite.trade/gtt/triggers", h)
    if r.get("_error"):
        raise RuntimeError(r["_error"])
    out = []
    for g in r.get("data") or []:
        if str(g.get("status", "")).lower() != "active":
            continue
        cond, orders = g.get("condition") or {}, g.get("orders") or [{}]
        out.append({"broker": "Kite", "id": str(g.get("id")), "symbol": _sym(cond.get("tradingsymbol")), "side": str(orders[0].get("transaction_type", "")).upper(),
                    "qty": _f(orders[0].get("quantity")), "triggers": [_f(x) for x in cond.get("trigger_values") or []], "price": _f(orders[0].get("price")),
                    "status": g.get("status"), "created": str(g.get("created_at") or "")[:19], "type": g.get("type") or "single"})
    return out


def _list_dhan() -> List[Dict[str, Any]]:
    a = OP._dhan_auth()
    if not a:
        raise RuntimeError("not connected today")
    r = OP._http("https://api.dhan.co/v2/forever/orders", {"access-token": a[0], "client-id": a[1], "Accept": "application/json"})
    if isinstance(r, dict) and r.get("_error"):
        raise RuntimeError(r["_error"])
    rows = r if isinstance(r, list) else r.get("data") or []
    by: Dict[str, Dict[str, Any]] = {}
    for g in rows:
        st = str(g.get("orderStatus") or "").upper()
        if st in ("TRADED", "CANCELLED", "REJECTED", "EXPIRED"):
            continue
        oid = str(g.get("orderId") or "")
        x = by.setdefault(oid, {"broker": "Dhan", "id": oid, "symbol": _sym(g.get("tradingSymbol")), "side": str(g.get("transactionType") or "").upper(),
                                "qty": _f(g.get("quantity")), "triggers": [], "price": _f(g.get("price")), "status": st,
                                "created": str(g.get("createTime") or "")[:19], "type": "oco" if str(g.get("orderType") or g.get("orderFlag") or "").upper() == "OCO" else "single"})
        for k in ("triggerPrice", "triggerPrice1"):
            if _f(g.get(k)) and _f(g.get(k)) not in x["triggers"]:
                x["triggers"].append(_f(g.get(k)))
        if len(x["triggers"]) > 1:
            x["type"] = "oco"
    return list(by.values())


LISTERS = {"Angel": _list_angel, "Kite": _list_kite, "Dhan": _list_dhan}


def _gtt_table(c):
    c.execute("CREATE TABLE IF NOT EXISTS gtt_last (broker TEXT, id TEXT, body_json TEXT, as_of TEXT, PRIMARY KEY (broker, id))")
    c.execute("CREATE TABLE IF NOT EXISTS gtt_status (broker TEXT PRIMARY KEY, ok INTEGER, message TEXT, as_of TEXT)")


def refresh_gtts() -> Dict[str, str]:
    """Ask every broker for its open GTTs and save them. A broker that fails keeps its last saved list."""
    now, errs = time.strftime("%Y-%m-%d %H:%M:%S"), {}
    with OP._db() as c:
        _gtt_table(c)
        for name, fn in LISTERS.items():
            try:
                items = fn()
            except Exception as e:  # noqa: BLE001
                errs[name] = str(e)[:160]
                c.execute("INSERT OR REPLACE INTO gtt_status VALUES (?,?,?,?)", (name, 0, errs[name], now))
                continue
            c.execute("DELETE FROM gtt_last WHERE broker=?", (name,))
            c.executemany("INSERT OR REPLACE INTO gtt_last VALUES (?,?,?,?)", [(name, g["id"], json.dumps(g), now) for g in items])
            c.execute("INSERT OR REPLACE INTO gtt_status VALUES (?,?,?,?)", (name, 1, f"{len(items)} open", now))
    return errs


def gtt_view() -> Dict[str, Any]:
    """Saved GTTs, each matched against the holdings at that broker. state: ok | orphan | too_big | stale | unknown."""
    with OP._db() as c:
        _gtt_table(c)
        items = [json.loads(b) | {"as_of": a} for b, a in c.execute("SELECT body_json, as_of FROM gtt_last")]
        status = {b: {"ok": bool(o), "message": m, "as_of": a} for b, o, m, a in c.execute("SELECT broker, ok, message, as_of FROM gtt_status")}
        held: Dict[str, Dict[str, float]] = {}
        srcs = set()
        for src, sym, q in c.execute("SELECT source, symbol, qty FROM broker_last"):
            srcs.add(src)
            held.setdefault(src, {})[sym] = held.get(src, {}).get(sym, 0) + (q or 0)
    live = OP._quotes(sorted({g["symbol"] for g in items}))
    for g in items:
        ltp = (live.get(g["symbol"]) or {}).get("ltp") or 0
        g["ltp"] = ltp
        h = held.get(g["broker"], {}).get(g["symbol"], 0)
        g["held"] = h
        g["kinds"] = sorted({("stop" if t < ltp else "target") for t in g["triggers"]}) if ltp else []
        if g["side"] != "SELL":
            g["state"] = "buy"
        elif g["broker"] not in srcs:
            g["state"] = "unknown"
        elif h <= 0:
            g["state"] = "orphan"
        elif g["qty"] > h + 1e-9:
            g["state"] = "too_big"
        elif ltp and g["triggers"] and min(abs(t / ltp - 1) for t in g["triggers"]) > 0.25:
            g["state"] = "stale"
        else:
            g["state"] = "ok"
    covered: Dict[str, Dict[str, Any]] = {}
    for g in items:
        if g["side"] == "SELL" and g["state"] in ("ok", "stale", "too_big"):
            k = covered.setdefault(g["symbol"], {"stop": False, "target": False, "qty": 0})
            k["stop"] |= "stop" in g["kinds"]
            k["target"] |= "target" in g["kinds"]
            k["qty"] += g["qty"]
    return {"items": items, "status": status, "covered": covered}


@router.get("/gtt")
def gtt_list(request: Request, fresh: int = 0):
    OP._owner(request)
    errs = refresh_gtts() if fresh else {}
    return JSONResponse(gtt_view() | {"errors": errs}, headers=NOSTORE)


def _cancel(broker: str, gid: str, saved: Dict[str, Any]) -> Dict[str, Any]:
    if broker == "Angel":
        cfg = OP._cfg()
        r = OP._call(ANGEL_GTT["cancel"], cfg, OP._token(cfg), {"id": gid, "symboltoken": saved.get("token") or OP._angel_token(saved.get("symbol", "")) or "", "exchange": saved.get("exchange") or "NSE"})
        return {"ok": bool(r.get("status")), "message": r.get("message") or ("Cancelled" if r.get("status") else "Rejected")}
    if broker == "Kite":
        h = OP._kite_headers()
        if not h:
            return {"ok": False, "message": "Kite is not connected today"}
        r = OP._http(f"https://api.kite.trade/gtt/triggers/{urllib.parse.quote(gid)}", h, None, "DELETE")
        return {"ok": not r.get("_error"), "message": r.get("_error") or "Cancelled"}
    if broker == "Dhan":
        a = OP._dhan_auth()
        if not a:
            return {"ok": False, "message": "Dhan is not connected today"}
        r = OP._http(f"https://api.dhan.co/v2/forever/orders/{urllib.parse.quote(gid)}", {"access-token": a[0], "client-id": a[1], "Accept": "application/json"}, None, "DELETE")
        return {"ok": not (isinstance(r, dict) and r.get("_error")), "message": (r.get("_error") if isinstance(r, dict) else None) or "Cancelled"}
    return {"ok": False, "message": "Unknown broker"}


def _guard(o: Dict[str, Any]) -> None:
    nonce = str(o.get("nonce", ""))
    if not nonce or OP._recent_nonce.get(nonce, 0) > time.time() - 120:
        raise HTTPException(409, "This was already sent.")
    OP._check_pin(str(o.get("pin", "")))
    OP._recent_nonce[nonce] = time.time()


def _log(broker, sym, qty, kind, price, ref, res):
    with OP._db() as c:
        OP._log_tables(c)
        c.execute("INSERT INTO order_log (ts, broker, symbol, side, qty, order_type, price, ref_price, status, order_id, message) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                  (time.strftime("%Y-%m-%d %H:%M:%S"), broker, sym, "SELL", qty, kind, price, ref, "sent" if res.get("ok") else "failed", str(res.get("order_id") or ""), str(res.get("message"))[:300]))


@router.post("/gtt/cancel")
def gtt_cancel(request: Request, o: Dict[str, Any] = Body(...)):
    OP._owner(request)
    broker, gid = str(o.get("broker", "")), str(o.get("id", ""))
    if broker not in LISTERS or not gid or len(gid) > 64:
        raise HTTPException(400, "Bad request.")
    with OP._db() as c:
        _gtt_table(c)
        row = c.execute("SELECT body_json FROM gtt_last WHERE broker=? AND id=?", (broker, gid)).fetchone()
    if not row:
        raise HTTPException(404, "This GTT is not in the saved list. Refresh the list first.")
    saved = json.loads(row[0])
    _guard(o)
    try:
        res = _cancel(broker, gid, saved)
    except Exception as e:  # noqa: BLE001
        res = {"ok": False, "message": str(e)}
    _log(broker, saved.get("symbol", ""), saved.get("qty", 0), "GTT_CANCEL", (saved.get("triggers") or [0])[0], 0, res | {"order_id": gid})
    if res["ok"]:
        with OP._db() as c:
            c.execute("DELETE FROM gtt_last WHERE broker=? AND id=?", (broker, gid))
    log.info(f"owner gtt cancel {broker} {gid} -> {res}")
    return JSONResponse(res, status_code=200 if res["ok"] else 502, headers=NOSTORE)


def _place(broker: str, sym: str, qty: int, stop: float, target: float, ltp: float) -> Dict[str, Any]:
    """SELL trigger(s) kept at the broker. stop and/or target; both together is one-cancels-other where the broker has it."""
    lim = lambda t, k: _tick(t * 0.98) if k == "stop" else _tick(t * 0.995)        # limit just under the trigger so it fills
    if broker == "Angel":
        if stop and target:
            return {"ok": False, "message": "Angel keeps one trigger per GTT. Place the stop, or the target, not both."}
        tok = OP._angel_token(sym)
        if not tok:
            return {"ok": False, "message": f"{sym} not found in Angel's NSE list"}
        t, k = (stop, "stop") if stop else (target, "target")
        cfg = OP._cfg()
        r = OP._call(ANGEL_GTT["create"], cfg, OP._token(cfg), {"tradingsymbol": sym + "-EQ", "symboltoken": tok, "exchange": "NSE", "producttype": "DELIVERY",
                                                               "transactiontype": "SELL", "price": f"{lim(t, k):.2f}", "qty": str(qty), "disclosedqty": str(qty),
                                                               "triggerprice": f"{_tick(t):.2f}", "timeperiod": "365"})
        rid = (r.get("data") or {}).get("id") if isinstance(r.get("data"), dict) else None
        return {"ok": bool(r.get("status") and rid), "order_id": rid, "message": r.get("message") or ("Placed" if rid else "Rejected")}
    if broker == "Kite":
        h = OP._kite_headers()
        if not h:
            return {"ok": False, "message": "Kite is not connected today"}
        legs = [(t, k) for t, k in ((stop, "stop"), (target, "target")) if t]
        order = lambda t, k: {"exchange": "NSE", "tradingsymbol": sym, "transaction_type": "SELL", "quantity": qty, "order_type": "LIMIT", "product": "CNC", "price": lim(t, k)}
        f = {"type": "two-leg" if len(legs) == 2 else "single",
             "condition": json.dumps({"exchange": "NSE", "tradingsymbol": sym, "trigger_values": [_tick(t) for t, _ in legs], "last_price": round(ltp, 2)}),
             "orders": json.dumps([order(t, k) for t, k in legs])}                  # lower trigger (stop) first, as in Kite's examples
        r = OP._http("https://api.kite.trade/gtt/triggers", h | {"Content-Type": "application/x-www-form-urlencoded"}, urllib.parse.urlencode(f).encode(), "POST")
        tid = (r.get("data") or {}).get("trigger_id") if isinstance(r.get("data"), dict) else None
        return {"ok": bool(tid), "order_id": tid, "message": "Placed" if tid else r.get("_error") or r.get("message") or "Rejected"}
    if broker == "Dhan":
        a = OP._dhan_auth()
        if not a:
            return {"ok": False, "message": "Dhan is not connected today"}
        sid = OP._dhan_security(sym)
        if not sid:
            return {"ok": False, "message": f"{sym} not found in Dhan's NSE list"}
        t, k = (target, "target") if target else (stop, "stop")
        body = {"dhanClientId": a[1], "orderFlag": "OCO" if stop and target else "SINGLE", "transactionType": "SELL", "exchangeSegment": "NSE_EQ",
                "productType": "CNC", "orderType": "LIMIT", "validity": "DAY", "securityId": sid, "quantity": qty, "price": lim(t, k), "triggerPrice": _tick(t)}
        if stop and target:
            body |= {"price1": lim(stop, "stop"), "triggerPrice1": _tick(stop), "quantity1": qty}
        r = OP._http("https://api.dhan.co/v2/forever/orders", {"access-token": a[0], "client-id": a[1], "Content-Type": "application/json", "Accept": "application/json"},
                     json.dumps(body).encode(), "POST")
        oid = r.get("orderId")
        return {"ok": bool(oid) and str(r.get("orderStatus", "")).upper() != "REJECTED", "order_id": oid, "message": r.get("_error") or r.get("orderStatus") or "Rejected"}
    return {"ok": False, "message": "Unknown broker"}


@router.post("/gtt/place")
def gtt_place(request: Request, o: Dict[str, Any] = Body(...)):
    """Leave a stop-loss and/or profit-booking SELL trigger at the broker. Owner login + trade code. Never retried."""
    OP._owner(request)
    broker, sym = str(o.get("broker", "")), str(o.get("symbol", "")).upper().strip()
    try:
        qty, stop, target = int(o.get("qty") or 0), float(o.get("stop") or 0), float(o.get("target") or 0)
    except (TypeError, ValueError):
        raise HTTPException(400, "Quantity and prices must be numbers.")
    if broker not in LISTERS or qty <= 0 or not (stop or target) or not sym.replace("&", "").replace("-", "").isalnum():
        raise HTTPException(400, "Bad GTT.")
    with OP._db() as c:
        h = c.execute("SELECT sum(qty) FROM broker_last WHERE source=? AND symbol=?", (broker, sym)).fetchone()[0]
    if h is not None and qty > h + 1e-9:
        raise HTTPException(400, f"You hold {h:g} {sym} at {broker}. A GTT for more than that could sell shares you buy later.")
    ltp = OP._angel_ltp(sym) or (OP._quotes([sym]).get(sym) or {}).get("ltp") or 0.0
    if not ltp:
        raise HTTPException(502, "No live price, so the levels cannot be checked. Try again.")
    if stop and not (ltp * 0.7 <= stop < ltp):
        raise HTTPException(400, f"The stop must be below the price ₹{ltp:,.2f} and within 30% of it.")
    if target and not (ltp < target <= ltp * 2):
        raise HTTPException(400, f"The target must be above the price ₹{ltp:,.2f}.")
    cap = float(OP._section("owner_trade").get("max_order_value", 50000))
    if qty * ltp > cap * 1.5:
        raise HTTPException(400, f"Value ₹{qty * ltp:,.0f} is above the safety limit.")
    _guard(o)
    try:
        res = _place(broker, sym, qty, stop, target, ltp)
    except Exception as e:  # noqa: BLE001
        res = {"ok": False, "message": str(e)}
    _log(broker, sym, qty, "GTT", _tick(stop or target), ltp, res)
    log.info(f"owner gtt {broker} {qty} {sym} stop={stop} target={target} -> {res}")
    if res["ok"]:
        try:
            refresh_gtts()
        except Exception:  # noqa: BLE001
            pass
    return JSONResponse(res, status_code=200 if res["ok"] else 502, headers=NOSTORE)
