"""Owner-only "edge" API for /rahul. Serves what scripts/edge_build.py wrote to Data/edge.db, the alert inbox,
broker cash, and two AI helpers (ask about a stock, read the latest results filing).

Everything here answers 404 to anyone who is not the owner (same check as owner_portfolio).
The AI helpers need config.json "ai": {"anthropic_api_key": "..."} and `pip install anthropic`; without them they say so.
"""
from __future__ import annotations

import base64
import json
import logging
import os
import sqlite3
import time
from typing import Any, Dict, List

from fastapi import APIRouter, Body, HTTPException, Request
from fastapi.responses import JSONResponse

import owner_portfolio as OP

log = logging.getLogger("owner_edge")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EDGE, INTEL, FUND = (os.path.join(ROOT, "Data", f) for f in ("edge.db", "intel.db", "fundamental_cache.db"))
router = APIRouter(prefix="/api/owner", tags=["owner-edge"])
BLOBS = {"regime", "earnings", "owners", "smart", "sectors", "accum", "scorecard", "meta"}
NOSTORE = {"Cache-Control": "no-store, private"}
AI_DAILY_LIMIT = 60
MODEL = "claude-opus-5-5"


def _ro(path: str) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=10)


def _blob(key: str) -> Dict[str, Any]:
    try:
        with _ro(EDGE) as c:
            r = c.execute("SELECT body_json FROM blobs WHERE key=?", (key,)).fetchone()
    except sqlite3.Error:
        r = None
    return json.loads(r[0]) if r else {}


def _stocks(symbols: List[str]) -> Dict[str, Any]:
    symbols = [s for s in symbols if s][:150]
    if not symbols:
        return {}
    try:
        with _ro(EDGE) as c:
            rows = c.execute(f"SELECT symbol, body_json FROM stock WHERE symbol IN ({','.join('?' * len(symbols))})", symbols).fetchall()
    except sqlite3.Error:
        return {}
    return {s: json.loads(b) for s, b in rows}


def _syms(s: str) -> List[str]:
    return [x.strip().upper() for x in (s or "").split(",") if x.strip().replace("&", "").replace("-", "").isalnum()]


@router.get("/edge/home")
def edge_home(request: Request, symbols: str = ""):
    """One call for the Today page: market gauge, the day's best lists (short), and the edge row of every stock held."""
    OP._owner(request)
    reg = _blob("regime")
    reg.pop("series", None)
    e, s, a = _blob("earnings"), _blob("smart"), _blob("accum")
    return JSONResponse({"meta": _blob("meta"), "regime": reg, "earnings": {"quarter": e.get("quarter"), "reported": e.get("reported"), "strong": (e.get("strong") or [])[:6]},
                         "smart": {"now": (s.get("now") or [])[:6], "from": s.get("from")}, "accum": (a.get("list") or [])[:5],
                         "stocks": _stocks(_syms(symbols)), "alerts": _alerts(20)}, headers=NOSTORE)


@router.get("/edge/blob/{key}")
def edge_blob(key: str, request: Request):
    OP._owner(request)
    if key not in BLOBS:
        raise HTTPException(404, "Not found")
    return JSONResponse(_blob(key), headers=NOSTORE)


@router.get("/edge/stocks")
def edge_stocks(request: Request, symbols: str = ""):
    OP._owner(request)
    return JSONResponse({"stocks": _stocks(_syms(symbols))}, headers=NOSTORE)


@router.get("/edge/stock/{symbol}")
def edge_stock(symbol: str, request: Request):
    OP._owner(request)
    return JSONResponse(_stocks(_syms(symbol)).get(symbol.upper().strip()) or {}, headers=NOSTORE)


@router.get("/funds")
def funds(request: Request):
    """Cash available in each broker (live call to each connected broker)."""
    OP._owner(request)
    return JSONResponse({"funds": OP._funds(), "as_of": time.strftime("%H:%M:%S")}, headers=NOSTORE)


def _alerts(limit: int = 50) -> List[Dict[str, Any]]:
    try:
        with OP._db() as c:
            c.execute("CREATE TABLE IF NOT EXISTS alert_sent (key TEXT PRIMARY KEY, ts TEXT, kind TEXT, symbol TEXT, text TEXT, sent INTEGER)")
            rows = c.execute("SELECT ts, kind, symbol, text, sent FROM alert_sent ORDER BY ts DESC LIMIT ?", (limit,)).fetchall()
    except sqlite3.Error:
        return []
    return [{"ts": r[0], "kind": r[1], "symbol": r[2], "text": r[3], "sent": bool(r[4])} for r in rows]


@router.get("/alerts")
def alerts(request: Request):
    OP._owner(request)
    return JSONResponse({"alerts": _alerts(), "telegram": bool(OP._section("owner_alerts").get("chat_id"))}, headers=NOSTORE)


# ------------------------------------------------------------------ AI helpers
def _ai_ready() -> str:
    key = OP._section("ai").get("anthropic_api_key")
    if not key:
        raise HTTPException(503, "The AI helper is not set up yet: add an Anthropic API key on the server.")
    try:
        import anthropic  # noqa: F401
    except ImportError:
        raise HTTPException(503, "The AI helper is not set up yet: the anthropic package is not installed on the server.")
    with OP._db() as c:
        c.execute("CREATE TABLE IF NOT EXISTS ai_log (ts REAL, kind TEXT, symbol TEXT, tokens_in INTEGER, tokens_out INTEGER)")
        n = c.execute("SELECT count(*) FROM ai_log WHERE ts>?", (time.time() - 86400,)).fetchone()[0]
    if n >= AI_DAILY_LIMIT:
        raise HTTPException(429, f"Daily AI limit reached ({AI_DAILY_LIMIT} questions). Try again tomorrow.")
    return key


def _claude(key: str, system: str, content: Any, kind: str, sym: str, max_tokens: int = 1500) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=key, timeout=120.0)
    try:
        resp = client.beta.messages.create(
            model=OP._section("ai").get("model") or MODEL, max_tokens=max_tokens,
            betas=["server-side-fallback-2026-07-01"], fallbacks="default",       # a declined request is re-run on a fallback model in the same call
            output_config={"effort": "low"}, system=system, messages=[{"role": "user", "content": content}])
    except anthropic.RateLimitError:
        raise HTTPException(429, "The AI service is busy. Try again in a minute.")
    except anthropic.APIStatusError as e:
        log.warning(f"claude {kind} {sym}: {e.status_code} {str(e)[:200]}")
        raise HTTPException(502, f"The AI service returned an error ({e.status_code}).")
    except anthropic.APIConnectionError:
        raise HTTPException(502, "Could not reach the AI service.")
    with OP._db() as c:
        c.execute("INSERT INTO ai_log VALUES (?,?,?,?,?)", (time.time(), kind, sym, resp.usage.input_tokens, resp.usage.output_tokens))
    if resp.stop_reason == "refusal":
        raise HTTPException(502, "The AI declined to answer this one.")
    return "".join(b.text for b in resp.content if b.type == "text").strip()


def _context(sym: str) -> Dict[str, Any]:
    ctx: Dict[str, Any] = {"stock": _stocks([sym]).get(sym) or {}, "market": {k: v for k, v in _blob("regime").items() if k in ("gauge", "b50", "b200", "index", "flow5", "as_of")}}
    try:
        with _ro(INTEL) as c:
            ctx["recent_filings_and_news"] = [{"date": r[0][:10], "type": r[1], "headline": r[2], "summary": (r[3] or "")[:600], "sentiment": r[4]} for r in c.execute(
                "SELECT ts, type, headline, summary, sentiment FROM events WHERE symbol=? ORDER BY ts DESC LIMIT 15", (sym,))]
    except sqlite3.Error:
        pass
    try:
        with _ro(FUND) as c:
            r = c.execute("SELECT data_json FROM stock_fundamentals WHERE symbol=?", (sym,)).fetchone()
        if r:
            d = json.loads(r[0])
            ctx["fundamentals"] = {"key_ratios": d.get("key_ratios"), "market_cap_cr": d.get("market_cap_cr"), "last_8_quarters": (d.get("quarterly_performance") or [])[-8:],
                                   "shareholding": d.get("shareholding_pattern"), "pros": d.get("pros"), "cons": d.get("cons")}
    except (sqlite3.Error, ValueError):
        pass
    return ctx


ASK_SYSTEM = ("You answer one investor's questions about one NSE-listed stock, using ONLY the JSON data supplied with the question (prices, trend, results, "
              "ownership, filings, the investor's own position and any open AI call). The reader is a retail investor in India; write plain English, short "
              "sentences, no jargon without a few words of explanation. Lead with the direct answer. Say clearly when the data does not contain what is asked "
              "rather than guessing, and never invent numbers. Describe what the data shows and the risks on both sides; do not tell the reader to buy or "
              "sell. Keep the answer under 180 words unless the question needs a list.")


@router.post("/ask")
def ask(request: Request, body: Dict[str, Any] = Body(...)):
    OP._owner(request)
    sym, q = str(body.get("symbol", "")).upper().strip(), str(body.get("question", "")).strip()[:600]
    if not sym.replace("&", "").replace("-", "").isalnum() or len(q) < 3:
        raise HTTPException(400, "Give a stock and a question.")
    key = _ai_ready()
    ctx = _context(sym)
    ctx["my_position"], ctx["ai_call"] = body.get("position"), body.get("call")
    text = _claude(key, ASK_SYSTEM, f"Stock: {sym}\n\nData (JSON):\n{json.dumps(ctx, default=str)}\n\nQuestion: {q}", "ask", sym)
    return JSONResponse({"symbol": sym, "answer": text}, headers=NOSTORE)


READ_SYSTEM = ("You read one company filing (results, investor presentation or earnings-call transcript) for a retail investor in India who holds or is "
               "considering the stock. Reply in plain English with these short sections, each 2-4 bullet points: 'What happened', 'What management said about "
               "the coming quarters', 'What changed from before', 'Red flags', 'Numbers worth knowing'. Use only what the document says; if a section has "
               "nothing, write 'Nothing in this document.' Never invent a number. No buy or sell advice.")


@router.post("/read")
def read_filing(request: Request, body: Dict[str, Any] = Body(...)):
    """AI summary of the newest results / concall filing of a stock. Cached per filing in edge.db-independent owner.db."""
    OP._owner(request)
    sym = str(body.get("symbol", "")).upper().strip()
    with _ro(INTEL) as c:
        ev = c.execute("SELECT id, ts, type, headline, url FROM events WHERE symbol=? AND type IN ('concall','results') AND url LIKE 'http%' AND lower(url) LIKE '%.pdf%' "
                       "ORDER BY (type='concall') DESC, ts DESC LIMIT 1", (sym,)).fetchone()
    if not ev:
        raise HTTPException(404, "No results or earnings-call document found for this stock yet.")
    with OP._db() as c:
        c.execute("CREATE TABLE IF NOT EXISTS ai_cache (key TEXT PRIMARY KEY, ts REAL, body TEXT)")
        hit = c.execute("SELECT body FROM ai_cache WHERE key=?", (f"read:{ev[0]}",)).fetchone()
    meta = {"symbol": sym, "date": ev[1][:10], "type": ev[2], "headline": ev[3], "url": ev[4]}
    if hit:
        return JSONResponse({**meta, "summary": hit[0], "cached": True}, headers=NOSTORE)
    key = _ai_ready()
    from intel.net import Net
    try:
        pdf = Net().bytes(ev[4], "nsearch" if "nseindia" in ev[4] else "web", max_mb=20)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"Could not download the filing: {str(e)[:120]}")
    if not pdf.startswith(b"%PDF"):
        raise HTTPException(502, "The filing is not a readable PDF.")
    content = [{"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": base64.b64encode(pdf).decode()}},
               {"type": "text", "text": f"Company: {sym}. Filing: {ev[3]} ({ev[1][:10]}). Summarise it as instructed."}]
    text = _claude(key, READ_SYSTEM, content, "read", sym, max_tokens=2500)
    with OP._db() as c:
        c.execute("INSERT OR REPLACE INTO ai_cache VALUES (?,?,?)", (f"read:{ev[0]}", time.time(), text))
    return JSONResponse({**meta, "summary": text, "cached": False}, headers=NOSTORE)


# ------------------------------------------------------------------ stop-loss kept at the broker (GTT / forever order)
def _tick(x: float) -> float:
    return round(round(x / 0.05) * 0.05, 2)


def _place_stop(broker: str, sym: str, qty: int, trigger: float, ltp: float) -> Dict[str, Any]:
    """A resting SELL that the broker fires when price falls to `trigger`. Limit price sits 2% under the trigger so it fills."""
    import urllib.parse
    trigger, px = _tick(trigger), _tick(trigger * 0.98)
    if broker == "Angel":
        tok = OP._angel_token(sym)
        if not tok:
            return {"ok": False, "message": f"{sym} not found in Angel's NSE list"}
        cfg = OP._cfg()
        r = OP._call(OP.ANGEL_API + "/gtt/v1/createRule", cfg, OP._token(cfg), {
            "tradingsymbol": sym + "-EQ", "symboltoken": tok, "exchange": "NSE", "producttype": "DELIVERY", "transactiontype": "SELL",
            "price": f"{px:.2f}", "qty": str(qty), "disclosedqty": str(qty), "triggerprice": f"{trigger:.2f}", "timeperiod": "365"})
        rid = (r.get("data") or {}).get("id") if isinstance(r.get("data"), dict) else None
        return {"ok": bool(r.get("status") and rid), "order_id": rid, "message": r.get("message") or ("Stop placed" if rid else "Rejected")}
    if broker == "Kite":
        h = OP._kite_headers()
        if not h:
            return {"ok": False, "message": "Kite is not connected today"}
        f = {"type": "single", "condition": json.dumps({"exchange": "NSE", "tradingsymbol": sym, "trigger_values": [trigger], "last_price": round(ltp, 2)}),
             "orders": json.dumps([{"exchange": "NSE", "tradingsymbol": sym, "transaction_type": "SELL", "quantity": qty, "order_type": "LIMIT", "product": "CNC", "price": px}])}
        r = OP._http("https://api.kite.trade/gtt/triggers", h | {"Content-Type": "application/x-www-form-urlencoded"}, urllib.parse.urlencode(f).encode(), "POST")
        tid = (r.get("data") or {}).get("trigger_id") if isinstance(r.get("data"), dict) else None
        return {"ok": bool(tid), "order_id": tid, "message": "Stop placed" if tid else r.get("_error") or r.get("message") or "Rejected"}
    if broker == "Dhan":
        a = OP._dhan_auth()
        if not a:
            return {"ok": False, "message": "Dhan is not connected today"}
        sid = OP._dhan_security(sym)
        if not sid:
            return {"ok": False, "message": f"{sym} not found in Dhan's NSE list"}
        body = {"dhanClientId": a[1], "orderFlag": "SINGLE", "transactionType": "SELL", "exchangeSegment": "NSE_EQ", "productType": "CNC", "orderType": "LIMIT",
                "validity": "DAY", "securityId": sid, "quantity": qty, "price": px, "triggerPrice": trigger}
        r = OP._http("https://api.dhan.co/v2/forever/orders", {"access-token": a[0], "client-id": a[1], "Content-Type": "application/json", "Accept": "application/json"},
                     json.dumps(body).encode(), "POST")
        oid = r.get("orderId")
        return {"ok": bool(oid) and str(r.get("orderStatus", "")).upper() != "REJECTED", "order_id": oid, "message": r.get("_error") or r.get("orderStatus") or "Rejected"}
    return {"ok": False, "message": "Unknown broker"}


@router.post("/stop")
def place_stop(request: Request, o: Dict[str, Any] = Body(...)):
    """Leave a stop-loss SELL with the broker. Needs the owner login + the trade code. Never retried automatically."""
    OP._owner(request)
    broker, sym = str(o.get("broker", "")), str(o.get("symbol", "")).upper().strip()
    try:
        qty, trig = int(o.get("qty") or 0), float(o.get("trigger") or 0)
    except (TypeError, ValueError):
        raise HTTPException(400, "Quantity and stop price must be numbers.")
    if broker not in OP.FETCHERS or qty <= 0 or trig <= 0 or not sym.replace("&", "").replace("-", "").isalnum():
        raise HTTPException(400, "Bad stop order.")
    nonce = str(o.get("nonce", ""))
    if not nonce or OP._recent_nonce.get(nonce, 0) > time.time() - 120:
        raise HTTPException(409, "This stop was already sent.")
    OP._check_pin(str(o.get("pin", "")))
    ltp = OP._angel_ltp(sym) or (OP._quotes([sym]).get(sym) or {}).get("ltp") or 0.0
    if not ltp:
        raise HTTPException(502, "No live price, so the stop cannot be checked. Try again.")
    if not (ltp * 0.7 <= trig < ltp):
        raise HTTPException(400, f"The stop must be below the current price ₹{ltp:,.2f} and within 30% of it.")
    cap = float(OP._section("owner_trade").get("max_order_value", 50000))
    if qty * ltp > cap * 1.5:
        raise HTTPException(400, f"Stop value ₹{qty * ltp:,.0f} is above the safety limit.")
    OP._recent_nonce[nonce] = time.time()
    try:
        res = _place_stop(broker, sym, qty, trig, ltp)
    except Exception as e:  # noqa: BLE001
        res = {"ok": False, "message": str(e)}
    with OP._db() as c:
        OP._log_tables(c)
        c.execute("INSERT INTO order_log (ts, broker, symbol, side, qty, order_type, price, ref_price, status, order_id, message) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                  (time.strftime("%Y-%m-%d %H:%M:%S"), broker, sym, "SELL", qty, "STOP", _tick(trig), ltp, "sent" if res["ok"] else "failed", str(res.get("order_id") or ""), str(res.get("message"))[:300]))
    log.info(f"owner stop {broker} {qty} {sym} @ {trig} -> {res}")
    return JSONResponse(res, status_code=200 if res["ok"] else 502, headers=NOSTORE)


# ------------------------------------------------------------------ follow tracker (phase 3)
# Did the owner follow the AI calls? scripts/owner_follow.py builds owner.db `follow` nightly and after every import.
# `fills` holds trades imported from a broker trade-book file (history from before broker snapshots began).
import hashlib
import datetime as _dt
import re as _re
import threading

_FILLS = """CREATE TABLE IF NOT EXISTS fills (broker TEXT, trade_id TEXT, d TEXT, ts TEXT, symbol TEXT, side TEXT CHECK (side IN ('BUY','SELL')),
            qty REAL, price REAL, src TEXT, PRIMARY KEY (broker, trade_id))"""
_follow_lock = threading.Lock()


def _follow_build() -> None:
    if not _follow_lock.acquire(blocking=False):
        return
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("owner_follow", os.path.join(ROOT, "scripts", "owner_follow.py"))
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        m.build(log=log.info)
    except Exception as e:  # noqa: BLE001
        log.warning(f"follow build failed: {e}")
    finally:
        _follow_lock.release()


@router.post("/fills/import")
def fills_import(request: Request, body: Dict[str, Any] = Body(...)):
    """Import past trades from a broker trade-book file. body: {broker, rows: [{date, symbol, side, qty, price, trade_id?}]}.
    History only: it does not change holdings or the manual trade log. Importing the same rows again adds nothing."""
    OP._owner(request)
    broker = str(body.get("broker", ""))
    if broker not in OP.FETCHERS:
        raise HTTPException(400, "Choose Angel, Kite or Dhan.")
    rows = body.get("rows")
    if not isinstance(rows, list) or not rows:
        raise HTTPException(400, "No rows to import.")
    if len(rows) > 5000:
        raise HTTPException(400, "Send at most 5,000 rows at a time.")
    today = _dt.date.today().isoformat()
    seen: Dict[str, int] = {}
    out, bad = [], 0
    for r in rows:
        d = str((r or {}).get("date", ""))[:10]
        if not _re.match(r"^\d{4}-\d{2}-\d{2}$", d) or d > today:
            bad += 1
            continue
        try:
            sym, side, qty, price, d, _ = OP._trade_in({"symbol": r.get("symbol"), "side": r.get("side"), "qty": r.get("qty"), "price": r.get("price"), "date": d})
        except HTTPException:
            bad += 1
            continue
        tid = str(r.get("trade_id") or "").strip()[:64]
        if not tid:
            k = f"{d}|{sym}|{side}|{qty:g}|{price:g}"
            seen[k] = seen.get(k, 0) + 1
            tid = hashlib.sha1(f"{k}|{seen[k]}".encode()).hexdigest()[:16]
        out.append((broker, tid, d, d, sym, side, qty, price, "import"))
    with OP._db() as c:
        c.execute(_FILLS)
        before = c.total_changes
        c.executemany("INSERT OR IGNORE INTO fills VALUES (?,?,?,?,?,?,?,?,?)", out)
        added = c.total_changes - before
    if added:
        threading.Thread(target=_follow_build, daemon=True).start()
    return JSONResponse({"ok": True, "added": added, "skipped": len(out) - added, "bad": bad}, headers=NOSTORE)


def _track_from(c) -> str | None:
    best = []
    for q in ("SELECT min(d) FROM fills", "SELECT min(snap_date) FROM broker_holdings_daily", "SELECT min(substr(ts,1,10)) FROM order_log"):
        try:
            v = c.execute(q).fetchone()[0]
        except sqlite3.Error:
            v = None
        if v:
            best.append(v)
    return min(best) if best else None


def _follow_summary(rows: List[Dict[str, Any]], size: int, label: str) -> Dict[str, Any]:
    """Counts leave out calls older than the tracking start (untracked) and stocks held before the call (held_before)."""
    def avg(l):
        v = [r["call_result"] for r in l if r["call_result"] is not None]
        return round(sum(v) / len(v), 2) if v else None
    tr = [r for r in rows if r["state"] in ("taken", "late", "skipped")]
    took = [r for r in tr if r["state"] in ("taken", "late")]
    skipped = [r for r in tr if r["state"] == "skipped"]
    skipped_sum = sum(r["call_result"] for r in skipped if r["call_result"] is not None)
    ex = [r for r in rows if r["state"] in ("taken", "late", "held_before") and r["exit_date"]]
    followed = [r for r in ex if r["exit_lag"] is not None and -1 <= r["exit_lag"] <= 2]
    return {"label": label, "calls": len(tr), "taken": sum(r["state"] == "taken" for r in tr), "late": sum(r["state"] == "late" for r in tr), "skipped": len(skipped),
            "taken_avg": avg(took), "skipped_avg": avg(skipped), "skipped_cost_inr": round(skipped_sum / 100 * size),
            "bought_below": sum(r["zone"] == "below" for r in took), "exits": len(ex), "exits_followed": len(followed), "exits_late": len(ex) - len(followed)}


@router.get("/follow")
def follow(request: Request, size: int = 14000):
    """The follow table plus month and all-time summaries. Empty before the first build."""
    OP._owner(request)
    size = max(2000, min(50000, int(size)))
    try:
        with OP._db() as c:
            cur = c.execute("SELECT * FROM follow ORDER BY call_date DESC, symbol")
            names = [x[0] for x in cur.description]
            rows = [dict(zip(names, r)) for r in cur.fetchall()]
            track_from = _track_from(c)
    except sqlite3.Error:
        return JSONResponse({"track_from": None, "built_at": None, "rows": [], "summary": {}}, headers=NOSTORE)
    now = _dt.date.today()
    month = [r for r in rows if str(r["call_date"]).startswith(now.strftime("%Y-%m"))]
    return JSONResponse({"track_from": track_from, "built_at": max((r["built_at"] for r in rows), default=None),
                         "summary": {"month": _follow_summary(month, size, now.strftime("%b %Y")), "all": _follow_summary(rows, size, "All time")},
                         "rows": [{k: v for k, v in r.items() if k != "built_at"} for r in rows if r["state"] != "untracked"]}, headers=NOSTORE)


@router.get("/weekly")
def weekly(request: Request):
    """The latest weekly report built by scripts/owner_weekly.py (empty before the first run)."""
    OP._owner(request)
    try:
        with OP._db() as c:
            r = c.execute("SELECT week, built_at, body_json, text, sent FROM weekly ORDER BY week DESC LIMIT 1").fetchone()
    except sqlite3.Error:
        r = None
    if not r:
        return JSONResponse({}, headers=NOSTORE)
    return JSONResponse({"week": r[0], "built_at": r[1], "body": json.loads(r[2]), "text": r[3], "sent": bool(r[4])}, headers=NOSTORE)


# ------------------------------------------------------------------ several buys with one trade code (phase 8)
MAX_BASKET = 5


@router.post("/orders")
def place_orders(request: Request, body: Dict[str, Any] = Body(...)):
    """Several BUY LIMIT orders after ONE trade-code check. body: {pin, orders: [{broker, symbol, qty, price, nonce, stop?}]}.
    Everything is checked before anything is sent; after that each order goes alone, one failure does not stop the rest,
    and nothing is retried. A stop-loss (stop) is placed only for an order that was accepted."""
    OP._owner(request)
    orders = body.get("orders")
    if not isinstance(orders, list) or not 1 <= len(orders) <= MAX_BASKET:
        raise HTTPException(400, f"Send between 1 and {MAX_BASKET} orders.")
    cap = float(OP._section("owner_trade").get("max_order_value", 50000))
    clean, syms, nonces, per_broker = [], set(), set(), {}
    for o in orders:
        o = o if isinstance(o, dict) else {}
        broker, sym = str(o.get("broker", "")), str(o.get("symbol", "")).upper().strip()
        try:
            qty, px = int(o.get("qty") or 0), float(o.get("price") or 0)
            stop = float(o["stop"]) if o.get("stop") not in (None, "", 0) else None
        except (TypeError, ValueError):
            raise HTTPException(400, f"{sym or 'An order'}: quantity, price and stop must be numbers.")
        nonce = str(o.get("nonce", ""))
        if broker not in OP.FETCHERS or not sym or not sym.replace("&", "").replace("-", "").isalnum() or qty <= 0 or px <= 0:
            raise HTTPException(400, f"{sym or 'An order'}: broker, symbol, quantity and price are not valid.")
        if not nonce or nonce in nonces or OP._recent_nonce.get(nonce, 0) > time.time() - 120:
            raise HTTPException(409, f"{sym}: this order was already sent.")
        if sym in syms:
            raise HTTPException(400, f"{sym} is in the basket twice.")
        if qty * px > cap:
            raise HTTPException(400, f"{sym}: order value ₹{qty * px:,.0f} is above the ₹{cap:,.0f} safety limit.")
        if stop is not None and not (px * 0.7 <= stop < px):
            raise HTTPException(400, f"{sym}: the stop must be below the price and within 30% of it.")
        syms.add(sym)
        nonces.add(nonce)
        per_broker[broker] = per_broker.get(broker, 0.0) + qty * px
        clean.append({"broker": broker, "sym": sym, "qty": qty, "px": px, "stop": stop, "nonce": nonce})
    funds = OP._funds()
    for b, total in per_broker.items():
        f = funds.get(b) or {}
        if f.get("status") != "ok":
            raise HTTPException(400, f"{b} is not connected right now, so its orders cannot be sent.")
        if total > float(f.get("cash") or 0) + 1e-6:
            raise HTTPException(400, f"{b}: these orders cost ₹{total:,.0f} but the free cash is ₹{float(f.get('cash') or 0):,.0f}.")
    OP._check_pin(str(body.get("pin", "")))
    results = []
    for o in clean:
        try:
            res = OP._send_order(o["broker"], o["sym"], "BUY", o["qty"], "LIMIT", o["px"], o["nonce"])
        except HTTPException as e:
            res = {"ok": False, "message": str(e.detail)}
        except Exception as e:  # noqa: BLE001
            res = {"ok": False, "message": str(e)}
        stop_res = None
        if res.get("ok") and o["stop"]:
            try:
                stop_res = _place_stop(o["broker"], o["sym"], o["qty"], o["stop"], o["px"])
            except Exception as e:  # noqa: BLE001
                stop_res = {"ok": False, "message": str(e)}
            with OP._db() as c:
                OP._log_tables(c)
                c.execute("INSERT INTO order_log (ts, broker, symbol, side, qty, order_type, price, ref_price, status, order_id, message) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                          (time.strftime("%Y-%m-%d %H:%M:%S"), o["broker"], o["sym"], "SELL", o["qty"], "STOP", _tick(o["stop"]), o["px"], "sent" if stop_res["ok"] else "failed",
                           str(stop_res.get("order_id") or ""), str(stop_res.get("message"))[:300]))
        results.append({"symbol": o["sym"], "broker": o["broker"], "ok": bool(res.get("ok")), "order_id": res.get("order_id"), "message": res.get("message"), "stop": stop_res})
        time.sleep(0.3)
    return JSONResponse({"results": results}, headers=NOSTORE)
