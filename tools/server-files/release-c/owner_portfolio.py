"""Owner-only portfolio API: live holdings from the owner's Angel One account (config.json "broker_vps1").

GET /api/owner/holdings  -> holdings, normalised, cached 60 s.
Only the owner (Firebase token checked on the server by collectors.admin.auth) gets data; everyone else gets a
plain 404, so the endpoint does not reveal that it exists. Never cached by proxies (Cache-Control: no-store).
"""
from __future__ import annotations

import json
import logging
import os
import threading
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from collectors.admin.auth import require_admin
from common import broker as B

log = logging.getLogger("owner_portfolio")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG_KEY = "broker_vps1"
router = APIRouter(prefix="/api/owner", tags=["owner"])

_lock = threading.Lock()
_cache: Dict[str, Any] = {"t": 0.0, "data": None}
_sess: Dict[str, Any] = {"jwt": None, "expires_at": 0.0}


def _owner(request: Request) -> Dict[str, Any]:
    try:
        return require_admin(request)
    except HTTPException as e:
        if e.status_code == 429:
            raise
        raise HTTPException(404, "Not found")


def _cfg() -> Dict[str, Any]:
    with open(os.path.join(ROOT, "config.json")) as f:
        c = json.load(f).get(CFG_KEY) or {}
    if not c.get("client_id"):
        raise RuntimeError(f"config.json has no {CFG_KEY} account")
    return c


def _call(url: str, cfg: Dict[str, Any], token: str = "", payload: Dict[str, Any] | None = None) -> Dict[str, Any]:
    headers = {"Content-Type": "application/json", "Accept": "application/json", "X-UserType": "USER",
               "X-SourceID": "WEB", "X-ClientLocalIP": cfg.get("client_ip", "127.0.0.1"),
               "X-ClientPublicIP": cfg.get("client_ip", "127.0.0.1"),
               "X-MACAddress": cfg.get("mac_address", "00:00:00:00:00:00"), "X-PrivateKey": cfg.get("api_key", "")}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method="POST" if payload is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"status": False, "message": f"HTTP {e.code}"}
    except Exception as e:  # network
        return {"status": False, "message": str(e)}


def _token(cfg: Dict[str, Any], force: bool = False) -> str:
    now = time.time()
    if not force and _sess["jwt"] and _sess["expires_at"] > now + 300:
        return _sess["jwt"]
    cache = cfg.get("session_cache") or "Data/angel_session.json"
    cache = cache if os.path.isabs(cache) else os.path.join(ROOT, cache)
    if not force and os.path.exists(cache):
        try:
            c = json.load(open(cache))
            if float(c.get("expires_at") or 0) > now + 300 and c.get("jwt"):
                _sess.update(jwt=c["jwt"], expires_at=float(c["expires_at"]))
                return _sess["jwt"]
        except Exception:
            pass
    r = _call(B._LOGIN_URL, cfg, payload={"clientcode": cfg["client_id"], "password": cfg.get("password", ""),
                                          "totp": B._totp(cfg.get("totp_secret", ""))})
    if not r.get("status") or not r.get("data"):
        raise RuntimeError(f"Angel login failed: {r.get('message', 'no data')}")
    jwt, exp = r["data"]["jwtToken"], now + 12 * 3600
    _sess.update(jwt=jwt, expires_at=exp)
    try:
        tmp = cache + ".tmp"
        json.dump({"jwt": jwt, "feed_token": r["data"].get("feedToken", ""), "expires_at": exp}, open(tmp, "w"))
        os.replace(tmp, cache)
    except Exception as e:
        log.warning(f"session cache write failed: {e}")
    return jwt


def _f(x: Any) -> float:
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


def _fetch() -> Dict[str, Any]:
    cfg = _cfg()
    r = _call(B._HOLDING_URL, cfg, _token(cfg))
    if not r.get("status"):                       # expired / revoked token: log in once more
        r = _call(B._HOLDING_URL, cfg, _token(cfg, force=True))
    if not r.get("status"):
        raise RuntimeError(f"Angel holdings failed: {r.get('message', 'unknown')}")
    raw = r.get("data") or []
    if isinstance(raw, dict):
        raw = raw.get("holdings") or []
    items: List[Dict[str, Any]] = []
    for h in raw:
        # Angel's "quantity" already counts shares still in T1; t1quantity is only the T1 part of it. Adding them doubled new buys.
        qty = max(_f(h.get("quantity")), _f(h.get("t1quantity")))
        if qty <= 0:
            continue
        avg, ltp, close = _f(h.get("averageprice")), _f(h.get("ltp")), _f(h.get("close"))
        sym = str(h.get("tradingsymbol", "")).upper().replace("-EQ", "").replace("-BE", "")
        inv, val = avg * qty, ltp * qty
        items.append(dict(symbol=sym, qty=qty, avg_price=round(avg, 2), ltp=round(ltp, 2), invested=round(inv, 2),
                          value=round(val, 2), pnl=round(val - inv, 2),
                          pnl_pct=round((ltp / avg - 1) * 100, 2) if avg else None,
                          day_pct=round((ltp / close - 1) * 100, 2) if close else None,
                          t1_qty=_f(h.get("t1quantity")), exchange=h.get("exchange", "NSE")))
    items.sort(key=lambda x: -x["value"])
    inv, val = sum(i["invested"] for i in items), sum(i["value"] for i in items)
    cid = str(cfg["client_id"])
    return {"as_of": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "account": cid[:2] + "…" + cid[-2:],
            "items": items, "totals": {"count": len(items), "invested": round(inv, 2), "value": round(val, 2),
                                       "pnl": round(val - inv, 2),
                                       "pnl_pct": round((val / inv - 1) * 100, 2) if inv else None}}


@router.get("/holdings")
def holdings(request: Request, fresh: bool = False):
    _owner(request)
    with _lock:
        if fresh or not _cache["data"] or time.time() - _cache["t"] > 60:
            try:
                _cache.update(data=_fetch(), t=time.time())
            except Exception as e:
                log.error(f"owner holdings: {e}")
                if not _cache["data"]:
                    return JSONResponse({"error": "Could not reach Angel One right now. Try again in a minute."},
                                        status_code=502, headers={"Cache-Control": "no-store"})
        data = dict(_cache["data"], cached_seconds=int(time.time() - _cache["t"]))
    return JSONResponse(data, headers={"Cache-Control": "no-store, private"})


# ════════════════════════════════════════════════════════════════════════════
# Owner trade log + combined portfolio, stored on the VPS (Data/owner.db). Owner-only like everything above.
# ════════════════════════════════════════════════════════════════════════════
import sqlite3
from collections import defaultdict, deque
from datetime import date as _date

from fastapi import Body

DB = os.path.join(ROOT, "Data", "owner.db")
HIST = os.path.join(ROOT, "Data", "stock_history.db")


def _db() -> sqlite3.Connection:
    c = sqlite3.connect(DB, timeout=30)
    c.row_factory = sqlite3.Row
    c.executescript("""
        CREATE TABLE IF NOT EXISTS manual_trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT, symbol TEXT NOT NULL, side TEXT NOT NULL CHECK (side IN ('BUY','SELL')),
            qty REAL NOT NULL CHECK (qty > 0), price REAL NOT NULL CHECK (price > 0), trade_date TEXT NOT NULL,
            note TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS angel_holdings_daily (
            snap_date TEXT NOT NULL, symbol TEXT NOT NULL, qty REAL, avg_price REAL, ltp REAL, value REAL, pnl REAL,
            PRIMARY KEY (snap_date, symbol));
    """)
    return c


def _snapshot_angel(data: Dict[str, Any]) -> None:
    try:
        d = _date.today().isoformat()
        with _db() as c:
            c.execute("DELETE FROM angel_holdings_daily WHERE snap_date=?", (d,))
            c.executemany("INSERT INTO angel_holdings_daily VALUES (?,?,?,?,?,?,?)",
                          [(d, i["symbol"], i["qty"], i["avg_price"], i["ltp"], i["value"], i["pnl"]) for i in data["items"]])
    except Exception as e:
        log.warning(f"angel snapshot failed: {e}")


def _angel() -> Dict[str, Any]:
    with _lock:
        if not _cache["data"] or time.time() - _cache["t"] > 60:
            try:
                _cache.update(data=_fetch(), t=time.time())
                _snapshot_angel(_cache["data"])
            except Exception as e:
                log.error(f"owner holdings: {e}")
        return _cache["data"] or {"items": [], "error": "Angel One not reachable"}


def _quotes(symbols: List[str]) -> Dict[str, Dict[str, float]]:
    if not symbols:
        return {}
    try:
        with sqlite3.connect(f"file:{HIST}?mode=ro", uri=True, timeout=10) as c:
            q = ",".join("?" * len(symbols))
            rows = c.execute(f"SELECT symbol, ltp, prev_close FROM live_quotes WHERE symbol IN ({q})", symbols).fetchall()
        return {s: {"ltp": float(l or 0), "prev": float(p or 0)} for s, l, p in rows}
    except Exception:
        return {}


def _manual_positions() -> Dict[str, Dict[str, float]]:
    """FIFO over the trade log: open qty, average cost of the open lots, realised P&L per symbol."""
    with _db() as c:
        rows = c.execute("SELECT * FROM manual_trades ORDER BY trade_date, id").fetchall()
    lots: Dict[str, deque] = defaultdict(deque)
    real: Dict[str, float] = defaultdict(float)
    for r in rows:
        s, q, p = r["symbol"], float(r["qty"]), float(r["price"])
        if r["side"] == "BUY":
            lots[s].append([q, p])
            continue
        while q > 1e-9 and lots[s]:
            lot = lots[s][0]
            take = min(q, lot[0])
            real[s] += take * (p - lot[1])
            lot[0] -= take
            q -= take
            if lot[0] <= 1e-9:
                lots[s].popleft()
    out = {}
    for s in set(lots) | set(real):
        qty = sum(l[0] for l in lots[s])
        cost = sum(l[0] * l[1] for l in lots[s])
        out[s] = {"qty": qty, "avg": cost / qty if qty else 0.0, "realised": real[s]}
    return out


def _trade_in(t: Dict[str, Any]) -> tuple:
    sym = str(t.get("symbol", "")).upper().strip().replace("-EQ", "")
    side = str(t.get("side", "BUY")).upper()
    qty, price = _f(t.get("qty")), _f(t.get("price"))
    d = str(t.get("date") or t.get("trade_date") or _date.today().isoformat())[:10]
    if not sym or side not in ("BUY", "SELL") or qty <= 0 or price <= 0 or len(d) != 10:
        raise HTTPException(400, "symbol, side BUY/SELL, qty > 0, price > 0 and date YYYY-MM-DD are required")
    return sym, side, qty, price, d, str(t.get("note", ""))[:200]


@router.get("/trades")
def trades(request: Request):
    _owner(request)
    with _db() as c:
        rows = [dict(r) for r in c.execute("SELECT * FROM manual_trades ORDER BY trade_date DESC, id DESC")]
    return JSONResponse({"trades": rows}, headers={"Cache-Control": "no-store, private"})


@router.post("/trades")
def add_trade(request: Request, t: Dict[str, Any] = Body(...)):
    _owner(request)
    row = _trade_in(t)
    with _db() as c:
        cur = c.execute("INSERT INTO manual_trades (symbol, side, qty, price, trade_date, note) VALUES (?,?,?,?,?,?)", row)
    return JSONResponse({"ok": True, "id": cur.lastrowid}, headers={"Cache-Control": "no-store"})


@router.put("/trades/{tid}")
def edit_trade(tid: int, request: Request, t: Dict[str, Any] = Body(...)):
    _owner(request)
    row = _trade_in(t)
    with _db() as c:
        n = c.execute("UPDATE manual_trades SET symbol=?, side=?, qty=?, price=?, trade_date=?, note=? WHERE id=?", row + (tid,)).rowcount
    if not n:
        raise HTTPException(404, "Not found")
    return JSONResponse({"ok": True}, headers={"Cache-Control": "no-store"})


@router.delete("/trades/{tid}")
def delete_trade(tid: int, request: Request):
    _owner(request)
    with _db() as c:
        n = c.execute("DELETE FROM manual_trades WHERE id=?", (tid,)).rowcount
    if not n:
        raise HTTPException(404, "Not found")
    return JSONResponse({"ok": True}, headers={"Cache-Control": "no-store"})


@router.post("/trades/import")
def import_trades(request: Request, body: Dict[str, Any] = Body(...)):
    """One-time import of old portfolio rows [{symbol, qty, avg_price, date?}] as BUY trades. Skips symbols already logged."""
    _owner(request)
    with _db() as c:
        have = {r[0] for r in c.execute("SELECT DISTINCT symbol FROM manual_trades")}
        added = 0
        for h in body.get("items") or []:
            try:
                row = _trade_in({"symbol": h.get("symbol"), "side": "BUY", "qty": h.get("qty"),
                                 "price": h.get("avg_price") or h.get("price"), "date": h.get("date"), "note": "imported"})
            except HTTPException:
                continue
            if row[0] in have:
                continue
            c.execute("INSERT INTO manual_trades (symbol, side, qty, price, trade_date, note) VALUES (?,?,?,?,?,?)", row)
            added += 1
    return JSONResponse({"ok": True, "added": added}, headers={"Cache-Control": "no-store"})


# ════════════════════════════════════════════════════════════════════════════
# Kite (Zerodha) and Dhan holdings. Credentials live only in config.json on the VPS:
#   "kite": {"api_key": "...", "api_secret": "..."}      (Kite Connect app; redirect URL = /api/owner/kite/callback)
#   "dhan": {"client_id": "...", "access_token": "..."}  (DhanHQ token from web.dhan.co, valid up to 30 days)
# Kite access tokens expire every morning (~6 AM IST): reconnect once a day from /rahul (Zerodha's own login page).
# ════════════════════════════════════════════════════════════════════════════
import hashlib
import secrets
import urllib.parse
from fastapi.responses import HTMLResponse

KITE_SESSION = os.path.join(ROOT, "Data", "kite_session.json")
_bcache: Dict[str, Dict[str, Any]] = {}            # source -> {"t", "data"}


def _section(name: str) -> Dict[str, Any]:
    try:
        with open(os.path.join(ROOT, "config.json")) as f:
            return json.load(f).get(name) or {}
    except Exception:
        return {}


def _http(url: str, headers: Dict[str, str], data: bytes | None = None, method: str = "GET") -> Dict[str, Any]:
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read().decode()
            return json.loads(body) if body.strip().startswith(("{", "[")) else {"raw": body}
    except urllib.error.HTTPError as e:
        try:
            return {"_error": json.loads(e.read().decode()).get("message") or f"HTTP {e.code}", "_code": e.code}
        except Exception:
            return {"_error": f"HTTP {e.code}", "_code": e.code}
    except Exception as e:
        return {"_error": str(e)}


def _norm(source: str, sym: str, qty: float, avg: float, ltp: float, close: float = 0.0) -> Dict[str, Any]:
    sym = str(sym).upper().replace("-EQ", "").replace("-BE", "").strip()
    return dict(source=source, symbol=sym, qty=qty, avg_price=round(avg, 2), ltp=round(ltp, 2),
                day_pct=round((ltp / close - 1) * 100, 2) if close and ltp else None)


def _kite_session() -> Dict[str, Any]:
    try:
        s = json.load(open(KITE_SESSION))
        return s if float(s.get("expires_at", 0)) > time.time() else {}
    except Exception:
        return {}


def _kite_fetch() -> Dict[str, Any]:
    cfg = _section("kite")
    if not cfg.get("api_key"):
        return {"status": "not_set_up", "items": []}
    sess = _kite_session()
    if not sess.get("access_token"):
        return {"status": "login_needed", "items": []}
    r = _http("https://api.kite.trade/portfolio/holdings",
              {"X-Kite-Version": "3", "Authorization": f"token {cfg['api_key']}:{sess['access_token']}"})
    if r.get("_error"):
        if r.get("_code") in (401, 403):
            try:
                os.remove(KITE_SESSION)
            except OSError:
                pass
            return {"status": "login_needed", "items": [], "error": "Kite session expired"}
        return {"status": "error", "items": [], "error": r["_error"]}
    items = [_norm("Kite", h.get("tradingsymbol"), _f(h.get("quantity")) + _f(h.get("t1_quantity")),
                   _f(h.get("average_price")), _f(h.get("last_price")), _f(h.get("close_price")))
             for h in (r.get("data") or [])]
    return {"status": "ok", "items": [i for i in items if i["qty"] > 0], "user": sess.get("user_id")}


DHAN_SESSION = os.path.join(ROOT, "Data", "dhan_session.json")


def _dhan_session() -> Dict[str, Any]:
    try:
        s = json.load(open(DHAN_SESSION))
        return s if float(s.get("expires_at", 0)) > time.time() + 60 else {}
    except Exception:
        return {}


def _dhan_fetch() -> Dict[str, Any]:
    cfg, sess = _section("dhan"), _dhan_session()
    token = sess.get("access_token") or cfg.get("access_token")
    client = str(sess.get("client_id") or cfg.get("client_id") or "")
    if not token:
        return {"status": "login_needed" if cfg.get("app_id") else "not_set_up", "items": []}
    r = _http("https://api.dhan.co/v2/holdings", {"access-token": token, "client-id": client, "Accept": "application/json"})
    if isinstance(r, dict) and r.get("_error"):
        if r.get("_code") in (401, 403):
            try:
                os.remove(DHAN_SESSION)
            except OSError:
                pass
            return {"status": "login_needed" if cfg.get("app_id") else "token_expired", "items": [], "error": "Dhan session expired"}
        if "no holding" in str(r.get("_error", "")).lower():
            return {"status": "ok", "items": [], "user": client}
        return {"status": "error", "items": [], "error": r["_error"]}
    rows = r if isinstance(r, list) else (r.get("data") or [])
    items = []
    for h in rows:
        qty = _f(h.get("totalQty")) or (_f(h.get("dpQty")) + _f(h.get("t1Qty")))
        if qty > 0:
            items.append(_norm("Dhan", h.get("tradingSymbol"), qty, _f(h.get("avgCostPrice")), _f(h.get("lastTradedPrice"))))
    return {"status": "ok", "items": items, "user": client[:2] + "…" + client[-2:] if client else None}


def _dhan_headers(cfg: Dict[str, Any]) -> Dict[str, str]:
    return {"app_id": str(cfg.get("app_id", "")), "app_secret": str(cfg.get("app_secret", "")), "Accept": "application/json"}


@router.get("/dhan/login")
def dhan_login(request: Request):
    """Owner starts a Dhan login: Dhan issues a consent id; the owner logs in on Dhan's own page."""
    _owner(request)
    cfg = _section("dhan")
    if not cfg.get("app_id") or not cfg.get("app_secret"):
        raise HTTPException(400, "Add dhan.app_id and dhan.app_secret to config.json on the VPS first.")
    if not cfg.get("client_id"):
        raise HTTPException(400, "Add your Dhan client ID as dhan.client_id in config.json on the VPS.")
    r = _http("https://auth.dhan.co/app/generate-consent?client_id=" + urllib.parse.quote(str(cfg["client_id"])),
              _dhan_headers(cfg), b"", "POST")
    cid = r.get("consentAppId") if isinstance(r, dict) else None
    if not cid:
        raise HTTPException(502, f"Dhan did not start a login: {r.get('_error') or r.get('message') or r}")
    with _db() as c:
        c.execute("CREATE TABLE IF NOT EXISTS dhan_state (consent TEXT PRIMARY KEY, exp REAL)")
        c.execute("DELETE FROM dhan_state WHERE exp < ?", (time.time(),))
        c.execute("INSERT OR REPLACE INTO dhan_state VALUES (?,?)", (cid, time.time() + 600))
    return JSONResponse({"url": "https://auth.dhan.co/login/consentApp-login?consentAppId=" + urllib.parse.quote(cid)},
                        headers={"Cache-Control": "no-store"})


@router.get("/dhan/callback")
def dhan_callback(tokenId: str = "", tokenid: str = ""):
    """Dhan redirects here after login. Accepted only while a login started from /rahul is pending (10 min)."""
    token_id = tokenId or tokenid
    if not token_id:
        return _page("Dhan login was cancelled.", False)
    with _db() as c:
        c.execute("CREATE TABLE IF NOT EXISTS dhan_state (consent TEXT PRIMARY KEY, exp REAL)")
        pending = c.execute("SELECT COUNT(*) FROM dhan_state WHERE exp > ?", (time.time(),)).fetchone()[0]
        c.execute("DELETE FROM dhan_state")
    if not pending:
        return _page("This Dhan login has expired. Start again from /rahul.", False)
    cfg = _section("dhan")
    r = _http("https://auth.dhan.co/app/consumeApp-consent?tokenId=" + urllib.parse.quote(token_id), _dhan_headers(cfg))
    tok = r.get("accessToken") if isinstance(r, dict) else None
    if not tok:
        return _page(f"Dhan did not accept the login: {r.get('_error') or r.get('message') or 'unknown error'}", False)
    exp = time.time() + 23 * 3600
    try:
        from datetime import datetime
        exp = datetime.fromisoformat(str(r.get("expiryTime")).replace("Z", "")).timestamp() or exp
    except Exception:
        pass
    tmp = DHAN_SESSION + ".tmp"
    json.dump({"access_token": tok, "client_id": r.get("dhanClientId") or cfg.get("client_id"), "expires_at": exp}, open(tmp, "w"))
    os.chmod(tmp, 0o600)
    os.replace(tmp, DHAN_SESSION)
    _bcache.pop("Dhan", None)
    _source("Dhan", fresh=True)
    return _page("Dhan connected. Your Dhan holdings will show in the portfolio.", True)


def _angel_fetch() -> Dict[str, Any]:
    d = _angel()
    if d.get("error") and not d.get("items"):
        return {"status": "error", "items": [], "error": d["error"]}
    return {"status": "ok", "account": d.get("account"),
            "items": [_norm("Angel", i["symbol"], i["qty"], i["avg_price"], i["ltp"]) | {"day_pct": i.get("day_pct")}
                      for i in d.get("items", [])]}


FETCHERS = {"Angel": _angel_fetch, "Kite": _kite_fetch, "Dhan": _dhan_fetch}


ON_DEMAND = ("Kite", "Dhan")       # fetched only when the owner presses refresh; otherwise the last stored copy is shown


def _stored(name: str) -> Dict[str, Any] | None:
    """Last holdings fetched from a broker (Data/owner.db broker_last), shown without calling the broker."""
    try:
        with _db() as c:
            _moves_tables(c)
            rows = c.execute("SELECT symbol, qty, avg_price, ltp, as_of FROM broker_last WHERE source=?", (name,)).fetchall()
            seen = c.execute("SELECT as_of FROM broker_seen WHERE source=?", (name,)).fetchone()
    except Exception:
        return None
    if not seen:
        return None
    return {"status": "ok", "stored": True, "as_of": seen[0],
            "items": [_norm(name, r[0], r[1], r[2], r[3]) for r in rows]}


def _source(name: str, fresh: bool = False) -> Dict[str, Any]:
    c = _bcache.get(name)
    if not fresh and c and time.time() - c["t"] < 60:
        return c["data"]
    if not fresh and name in ON_DEMAND:
        st = _stored(name)
        if st is not None:
            _bcache[name] = {"t": time.time(), "data": st}
            return st
    try:
        data = FETCHERS[name]()
    except Exception as e:
        data = {"status": "error", "items": [], "error": str(e)}
    data["as_of"] = time.strftime("%Y-%m-%d %H:%M")
    if data.get("status") != "ok" and name in ON_DEMAND:      # keep showing the last good copy, flagged
        st = _stored(name)
        if st is not None:
            st.update(stale=True, live_status=data.get("status"), error=data.get("error"))
            data = st
    _bcache[name] = {"t": time.time(), "data": data}
    if data.get("status") == "ok" and not data.get("stored"):
        _snapshot(name, data["items"])
        _track_moves(name, data["items"])
    return data


def _moves_tables(c) -> None:
    c.execute("""CREATE TABLE IF NOT EXISTS broker_last (source TEXT, symbol TEXT, qty REAL, avg_price REAL, ltp REAL, as_of TEXT,
                 PRIMARY KEY (source, symbol))""")
    c.execute("CREATE TABLE IF NOT EXISTS broker_seen (source TEXT PRIMARY KEY, as_of TEXT)")
    c.execute("""CREATE TABLE IF NOT EXISTS broker_moves (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, source TEXT, symbol TEXT,
                 kind TEXT, qty REAL, avg_price REAL, price REAL, pnl REAL)""")


def _track_moves(source: str, items: List[Dict[str, Any]]) -> None:
    """Compare with the previous fetch: a stock that disappeared was sold, a smaller qty was partly sold, new ones bought."""
    now = time.strftime("%Y-%m-%d %H:%M")
    try:
        with _db() as c:
            _moves_tables(c)
            first = c.execute("SELECT 1 FROM broker_seen WHERE source=?", (source,)).fetchone() is None
            prev = {r[0]: r[1:] for r in c.execute("SELECT symbol, qty, avg_price, ltp FROM broker_last WHERE source=?", (source,))}
            cur = {i["symbol"]: i for i in items}
            moves = []
            if not first:
                for sym, (q0, a0, l0) in prev.items():
                    i = cur.get(sym)
                    q1 = i["qty"] if i else 0.0
                    if q1 < q0 - 1e-9:
                        px = (i or {}).get("ltp") or l0
                        moves.append((now, source, sym, "sold" if not i else "reduced", q0 - q1, a0, px, round((px - a0) * (q0 - q1), 2)))
                for sym, i in cur.items():
                    q0 = prev.get(sym, (0.0,))[0]
                    if i["qty"] > q0 + 1e-9:
                        moves.append((now, source, sym, "bought" if not q0 else "added", i["qty"] - q0, i["avg_price"], i["ltp"], None))
            c.executemany("INSERT INTO broker_moves (ts, source, symbol, kind, qty, avg_price, price, pnl) VALUES (?,?,?,?,?,?,?,?)", moves)
            c.execute("DELETE FROM broker_last WHERE source=?", (source,))
            c.executemany("INSERT INTO broker_last VALUES (?,?,?,?,?,?)",
                          [(source, i["symbol"], i["qty"], i["avg_price"], i["ltp"], now) for i in items])
            c.execute("INSERT OR REPLACE INTO broker_seen VALUES (?,?)", (source, now))
    except Exception as e:
        log.warning(f"moves {source} failed: {e}")


def _snapshot(source: str, items: List[Dict[str, Any]]) -> None:
    try:
        d = _date.today().isoformat()
        with _db() as c:
            c.execute("""CREATE TABLE IF NOT EXISTS broker_holdings_daily (snap_date TEXT, source TEXT, symbol TEXT, qty REAL,
                         avg_price REAL, ltp REAL, PRIMARY KEY (snap_date, source, symbol))""")
            c.execute("DELETE FROM broker_holdings_daily WHERE snap_date=? AND source=?", (d, source))
            c.executemany("INSERT INTO broker_holdings_daily VALUES (?,?,?,?,?,?)",
                          [(d, source, i["symbol"], i["qty"], i["avg_price"], i["ltp"]) for i in items])
    except Exception as e:
        log.warning(f"snapshot {source} failed: {e}")


def refresh_all(names: List[str] | None = None) -> Dict[str, str]:
    """Refresh button (all brokers) and the daily cron (Angel only: Kite / Dhan are fetched on demand)."""
    return {k: _source(k, fresh=True).get("status") for k in (names or list(FETCHERS))}


@router.get("/brokers")
def brokers(request: Request):
    _owner(request)
    out = {}
    for k in FETCHERS:
        d = _source(k)
        out[k] = {"status": d.get("status"), "count": len(d.get("items", [])), "error": d.get("error"), "as_of": d.get("as_of"),
                  "account": d.get("account") or d.get("user")}
    if _dhan_session():
        out["Dhan"]["expires"] = time.strftime("%d %b %H:%M", time.localtime(float(_dhan_session().get("expires_at", 0))))
    if out["Kite"]["status"] in ("ok",):
        out["Kite"]["expires"] = time.strftime("%d %b %H:%M", time.localtime(float(_kite_session().get("expires_at", 0))))
    with _db() as c:
        out["Manual"] = {"status": "ok", "count": c.execute("SELECT COUNT(*) FROM manual_trades").fetchone()[0]}
    return JSONResponse(out, headers={"Cache-Control": "no-store, private"})


@router.get("/kite/login")
def kite_login(request: Request):
    """Owner asks for the Zerodha login link. A one-time state ties the callback to this request."""
    _owner(request)
    cfg = _section("kite")
    if not cfg.get("api_key"):
        raise HTTPException(400, "Add kite.api_key and kite.api_secret to config.json on the VPS first.")
    state = secrets.token_urlsafe(24)
    with _db() as c:
        c.execute("CREATE TABLE IF NOT EXISTS kite_state (state TEXT PRIMARY KEY, exp REAL)")
        c.execute("DELETE FROM kite_state WHERE exp < ?", (time.time(),))
        c.execute("INSERT INTO kite_state VALUES (?,?)", (state, time.time() + 600))
    url = "https://kite.zerodha.com/connect/login?" + urllib.parse.urlencode(
        {"v": "3", "api_key": cfg["api_key"], "redirect_params": urllib.parse.urlencode({"state": state})})
    return JSONResponse({"url": url}, headers={"Cache-Control": "no-store"})


def _page(msg: str, ok: bool) -> HTMLResponse:
    return HTMLResponse(f"""<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex>
<body style="font:16px system-ui;display:grid;place-items:center;min-height:90vh;text-align:center;color:#333">
<div><h2 style="color:{'#1a7f4b' if ok else '#c0392b'}">{msg}</h2>
<p><a href="https://rsitradingplatform.vercel.app/rahul/portfolio?v=brokers">Back to my portfolio</a></p></div>""",
                        headers={"Cache-Control": "no-store"})


@router.get("/kite/callback")
def kite_callback(request_token: str = "", status: str = "", state: str = "", tokenId: str = "", tokenid: str = ""):
    """Zerodha redirects the browser here after login. Accepted only with a fresh state issued by /kite/login."""
    if (tokenId or tokenid) and not request_token:      # Dhan app registered with this URL: hand over to the Dhan handler
        return dhan_callback(tokenId=tokenId, tokenid=tokenid)
    if status != "success" or not request_token or not state:
        return _page("Kite login was cancelled.", False)
    with _db() as c:
        c.execute("CREATE TABLE IF NOT EXISTS kite_state (state TEXT PRIMARY KEY, exp REAL)")
        row = c.execute("SELECT exp FROM kite_state WHERE state=?", (state,)).fetchone()
        c.execute("DELETE FROM kite_state WHERE state=?", (state,))
    if not row or row[0] < time.time():
        return _page("This login link has expired. Start again from /rahul.", False)
    cfg = _section("kite")
    checksum = hashlib.sha256((cfg["api_key"] + request_token + cfg.get("api_secret", "")).encode()).hexdigest()
    r = _http("https://api.kite.trade/session/token", {"X-Kite-Version": "3", "Content-Type": "application/x-www-form-urlencoded"},
              urllib.parse.urlencode({"api_key": cfg["api_key"], "request_token": request_token, "checksum": checksum}).encode(), "POST")
    tok = (r.get("data") or {}).get("access_token") if isinstance(r, dict) else None
    if not tok:
        return _page(f"Kite did not accept the login: {r.get('_error', 'unknown error')}", False)
    # Kite tokens die at ~6 AM IST the next morning
    lt = time.localtime()
    exp = time.mktime((lt.tm_year, lt.tm_mon, lt.tm_mday + (1 if lt.tm_hour >= 6 else 0), 6, 0, 0, 0, 0, -1))
    tmp = KITE_SESSION + ".tmp"
    json.dump({"access_token": tok, "user_id": r["data"].get("user_id"), "expires_at": exp}, open(tmp, "w"))
    os.chmod(tmp, 0o600)
    os.replace(tmp, KITE_SESSION)
    _bcache.pop("Kite", None)
    _source("Kite", fresh=True)
    return _page("Kite connected. Your Zerodha holdings will show in the portfolio.", True)


@router.get("/portfolio")
def portfolio(request: Request, fresh: bool = False):
    """One row per stock across Angel, Kite, Dhan and the manual trade log."""
    _owner(request)
    src = {k: _source(k, fresh=fresh) for k in FETCHERS}
    man = _manual_positions()
    by: Dict[str, Dict[str, Any]] = {}
    for name, d in src.items():
        for i in d.get("items", []):
            r = by.setdefault(i["symbol"], {"symbol": i["symbol"], "parts": {}, "ltp": 0.0, "day_pct": None, "realised": 0.0})
            r["parts"][name] = {"qty": i["qty"], "avg": i["avg_price"]}
            r["ltp"] = r["ltp"] or i["ltp"]
            r["day_pct"] = r["day_pct"] if r["day_pct"] is not None else i.get("day_pct")
    for s, m in man.items():
        if m["qty"] > 0 or m["realised"]:
            r = by.setdefault(s, {"symbol": s, "parts": {}, "ltp": 0.0, "day_pct": None, "realised": 0.0})
            if m["qty"] > 0:
                r["parts"]["Manual"] = {"qty": round(m["qty"], 4), "avg": round(m["avg"], 2)}
            r["realised"] = round(m["realised"], 2)
    q = _quotes(list(by))
    rows = []
    for s, r in by.items():
        qt = q.get(s, {})
        ltp = qt.get("ltp") or r["ltp"]
        if r["day_pct"] is None and qt.get("prev") and ltp:
            r["day_pct"] = round((ltp / qt["prev"] - 1) * 100, 2)
        qty = sum(p["qty"] for p in r["parts"].values())
        cost = sum(p["qty"] * p["avg"] for p in r["parts"].values())
        val = qty * ltp
        rows.append(dict(symbol=s, source="+".join(r["parts"]) or "Closed", parts=r["parts"], qty=qty,
                         avg=round(cost / qty, 2) if qty else None, ltp=round(ltp, 2), invested=round(cost, 2), value=round(val, 2),
                         pnl=round(val - cost, 2), pnl_pct=round((val / cost - 1) * 100, 2) if cost else None,
                         day_pct=r["day_pct"], realised=r["realised"]))
    rows.sort(key=lambda x: -x["value"])
    by_source = {k: round(sum(x["parts"].get(k, {}).get("qty", 0) * x["ltp"] for x in rows), 2) for k in list(FETCHERS) + ["Manual"]}
    status = {k: {"status": d.get("status"), "error": d.get("error"), "count": len(d.get("items", [])), "account": d.get("account") or d.get("user"),
                  "as_of": d.get("as_of")} for k, d in src.items()}
    return JSONResponse({"as_of": time.strftime("%Y-%m-%dT%H:%M:%S"), "rows": rows, "by_source": by_source, "brokers": status,
                         "realised": round(sum(x["realised"] for x in rows), 2)},
                        headers={"Cache-Control": "no-store, private"})



# ---------------------------------------------------------------- order ticket: live price, balances, place orders
# Every order needs the owner's Firebase login AND the trade code (config.json "owner_trade": {"pin_sha256": ..., "max_order_value": ...}).
# Wrong codes are counted; 5 wrong in 15 minutes locks ordering for 15 minutes. Every attempt is written to owner.db order_log.
import csv
import hmac
import io

import socket as _socket

# Brokers whitelist one static IP for API orders (SEBI rule). Our whitelisted IP is the VPS IPv4, so talk to them over IPv4 only.
_IPV4_HOSTS = {"api.dhan.co", "api.kite.trade", "auth.dhan.co"}
if not getattr(_socket, "_qs_v4_patch", False):
    _orig_gai = _socket.getaddrinfo

    def _gai(host, *a, **k):
        res = _orig_gai(host, *a, **k)
        if host in _IPV4_HOSTS:
            v4 = [r for r in res if r[0] == _socket.AF_INET]
            return v4 or res
        return res
    _socket.getaddrinfo = _gai
    _socket._qs_v4_patch = True
ANGEL_API = "https://apiconnect.angelbroking.com/rest/secure/angelbroking"
SCRIP = os.path.join(ROOT, "Data", "OpenAPIScripMaster.json")
DHAN_SCRIP = os.path.join(ROOT, "Data", "dhan_scrip_nse_eq.json")
_scrip: Dict[str, Any] = {"angel": None, "dhan": None, "dhan_t": 0.0}
_recent_nonce: Dict[str, float] = {}


def _angel_token(sym: str) -> str | None:
    if _scrip["angel"] is None:
        m = {}
        for x in json.load(open(SCRIP)):
            if x.get("exch_seg") == "NSE" and str(x.get("symbol", "")).endswith("-EQ"):
                m[x["symbol"][:-3]] = x["token"]
        _scrip["angel"] = m
    return _scrip["angel"].get(sym)


def _dhan_security(sym: str) -> str | None:
    """NSE equity security ids from Dhan's scrip master, cached on disk for a day."""
    if _scrip["dhan"] is None or time.time() - _scrip["dhan_t"] > 86400:
        m = None
        if os.path.exists(DHAN_SCRIP) and time.time() - os.path.getmtime(DHAN_SCRIP) < 86400:
            m = json.load(open(DHAN_SCRIP))
        if not m:
            raw = urllib.request.urlopen("https://images.dhan.co/api-data/api-scrip-master.csv", timeout=60).read().decode()
            m = {}
            for r in csv.DictReader(io.StringIO(raw)):
                if r.get("SEM_EXM_EXCH_ID") == "NSE" and r.get("SEM_SEGMENT") == "E" and r.get("SEM_SERIES") == "EQ":
                    m[r["SEM_TRADING_SYMBOL"].upper()] = r["SEM_SMST_SECURITY_ID"]
            json.dump(m, open(DHAN_SCRIP, "w"))
        _scrip.update(dhan=m, dhan_t=time.time())
    return _scrip["dhan"].get(sym)


def _angel_ltp(sym: str) -> float:
    tok = _angel_token(sym)
    if not tok:
        return 0.0
    cfg = _cfg()
    r = _call(B._MARKET_URL, cfg, _token(cfg), {"mode": "LTP", "exchangeTokens": {"NSE": [tok]}})
    f = ((r.get("data") or {}).get("fetched") or [{}])
    return _f(f[0].get("ltp")) if f else 0.0


def _kite_headers() -> Dict[str, str] | None:
    cfg, sess = _section("kite"), _kite_session()
    if not cfg.get("api_key") or not sess.get("access_token"):
        return None
    return {"X-Kite-Version": "3", "Authorization": f"token {cfg['api_key']}:{sess['access_token']}"}


def _dhan_auth() -> tuple[str, str] | None:
    cfg, sess = _section("dhan"), _dhan_session()
    tok = sess.get("access_token") or cfg.get("access_token")
    return (tok, str(sess.get("client_id") or cfg.get("client_id") or "")) if tok else None


def _funds() -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    try:
        cfg = _cfg()
        r = _call(ANGEL_API + "/user/v1/getRMS", cfg, _token(cfg))
        if not r.get("status"):                      # an old session token: log in once more, as the holdings call does
            r = _call(ANGEL_API + "/user/v1/getRMS", cfg, _token(cfg, force=True))
        d = r.get("data") or {}
        if r.get("status"):
            out["Angel"] = {"status": "ok", "cash": _f(d.get("availablecash")), "account": str(cfg["client_id"])[:2] + "…" + str(cfg["client_id"])[-2:]}
        elif time.gmtime(time.time() + 19800).tm_wday >= 5:      # Saturday or Sunday (IST): Angel's funds service does not answer
            out["Angel"] = {"status": "closed", "error": r.get("message")}
        else:
            out["Angel"] = {"status": "error", "error": r.get("message")}
    except Exception as e:
        out["Angel"] = {"status": "error", "error": str(e)}
    h = _kite_headers()
    if not _section("kite").get("api_key"):
        out["Kite"] = {"status": "not_set_up"}
    elif not h:
        out["Kite"] = {"status": "login_needed"}
    else:
        r = _http("https://api.kite.trade/user/margins/equity", h)
        d = r.get("data") or {}
        out["Kite"] = {"status": "ok", "cash": _f(d.get("net"))} if d else {"status": "login_needed" if r.get("_code") in (401, 403) else "error", "error": r.get("_error")}
    a = _dhan_auth()
    if not a:
        out["Dhan"] = {"status": "login_needed" if _section("dhan").get("app_id") else "not_set_up"}
    else:
        r = _http("https://api.dhan.co/v2/fundlimit", {"access-token": a[0], "client-id": a[1], "Accept": "application/json"})
        if "_error" in r:
            out["Dhan"] = {"status": "login_needed" if r.get("_code") in (401, 403) else "error", "error": r["_error"]}
        else:
            out["Dhan"] = {"status": "ok", "cash": _f(r.get("availabelBalance", r.get("availableBalance")))}
    return out


@router.get("/ticket")
def ticket(request: Request, symbol: str):
    """Everything the buy / sell screen needs: live price, cash in each broker, how many shares each broker holds."""
    _owner(request)
    sym = symbol.upper().strip()
    ltp = 0.0
    try:
        ltp = _angel_ltp(sym)
    except Exception as e:
        log.warning(f"ltp {sym}: {e}")
    if not ltp:
        ltp = (_quotes([sym]).get(sym) or {}).get("ltp") or 0.0
    held = {}
    for k in FETCHERS:
        for i in _source(k).get("items", []):
            if i["symbol"] == sym:
                held[k] = {"qty": i["qty"], "avg": i["avg_price"]}
    oc = _section("owner_trade")
    return JSONResponse({"symbol": sym, "ltp": round(ltp, 2), "as_of": time.strftime("%H:%M:%S"), "funds": _funds(), "held": held,
                         "known": {"Angel": bool(_angel_token(sym))}, "max_order_value": float(oc.get("max_order_value", 50000)),
                         "pin_set": bool(oc.get("pin_sha256"))}, headers={"Cache-Control": "no-store, private"})


@router.get("/price")
def price(request: Request, symbol: str):
    _owner(request)
    sym = symbol.upper().strip()
    ltp = _angel_ltp(sym) or (_quotes([sym]).get(sym) or {}).get("ltp") or 0.0
    return JSONResponse({"symbol": sym, "ltp": round(ltp, 2), "as_of": time.strftime("%H:%M:%S")}, headers={"Cache-Control": "no-store"})


def _log_tables(c) -> None:
    c.execute("""CREATE TABLE IF NOT EXISTS order_log (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, broker TEXT, symbol TEXT, side TEXT,
                 qty REAL, order_type TEXT, price REAL, ref_price REAL, status TEXT, order_id TEXT, message TEXT)""")
    c.execute("CREATE TABLE IF NOT EXISTS pin_fail (ts REAL)")


def _check_pin(pin: str) -> None:
    oc = _section("owner_trade")
    want = oc.get("pin_sha256")
    if not want:
        raise HTTPException(400, "Trade code is not set on the server.")
    now = time.time()
    with _db() as c:
        _log_tables(c)
        c.execute("DELETE FROM pin_fail WHERE ts < ?", (now - 900,))
        if c.execute("SELECT COUNT(*) FROM pin_fail").fetchone()[0] >= 5:
            raise HTTPException(429, "Too many wrong codes. Ordering is locked for 15 minutes.")
        got = hashlib.sha256((oc.get("salt", "") + str(pin or "")).encode()).hexdigest()
        if not hmac.compare_digest(got, want):
            c.execute("INSERT INTO pin_fail VALUES (?)", (now,))
            raise HTTPException(403, "Wrong trade code. Nothing was sent.")
        c.execute("DELETE FROM pin_fail")


def _place(broker: str, sym: str, side: str, qty: int, otype: str, px: float) -> Dict[str, Any]:
    if broker == "Angel":
        tok = _angel_token(sym)
        if not tok:
            return {"ok": False, "message": f"{sym} not found in Angel's NSE list"}
        cfg = _cfg()
        r = _call(ANGEL_API + "/order/v1/placeOrder", cfg, _token(cfg), {
            "variety": "NORMAL", "tradingsymbol": sym + "-EQ", "symboltoken": tok, "transactiontype": side, "exchange": "NSE",
            "ordertype": otype, "producttype": "DELIVERY", "duration": "DAY", "price": f"{px:.2f}" if otype == "LIMIT" else "0",
            "squareoff": "0", "stoploss": "0", "quantity": str(qty)})
        oid = (r.get("data") or {}).get("orderid") if isinstance(r.get("data"), dict) else None
        return {"ok": bool(r.get("status") and oid), "order_id": oid, "message": r.get("message") or ("Order sent" if oid else "Rejected")}
    if broker == "Kite":
        h = _kite_headers()
        if not h:
            return {"ok": False, "message": "Kite is not connected today"}
        f = {"tradingsymbol": sym, "exchange": "NSE", "transaction_type": side, "order_type": otype, "quantity": str(qty),
             "product": "CNC", "validity": "DAY"}
        if otype == "LIMIT":
            f["price"] = f"{px:.2f}"
        else:
            f["market_protection"] = "-1"
        r = _http("https://api.kite.trade/orders/regular", h | {"Content-Type": "application/x-www-form-urlencoded"},
                  urllib.parse.urlencode(f).encode(), "POST")
        oid = (r.get("data") or {}).get("order_id") if isinstance(r.get("data"), dict) else None
        return {"ok": bool(oid), "order_id": oid, "message": "Order sent" if oid else r.get("_error") or r.get("message") or "Rejected"}
    if broker == "Dhan":
        a = _dhan_auth()
        if not a:
            return {"ok": False, "message": "Dhan is not connected today"}
        sid = _dhan_security(sym)
        if not sid:
            return {"ok": False, "message": f"{sym} not found in Dhan's NSE list"}
        body = {"dhanClientId": a[1], "transactionType": side, "exchangeSegment": "NSE_EQ", "productType": "CNC", "orderType": otype,
                "validity": "DAY", "securityId": sid, "quantity": qty, "price": round(px, 2) if otype == "LIMIT" else 0}
        r = _http("https://api.dhan.co/v2/orders", {"access-token": a[0], "client-id": a[1], "Content-Type": "application/json",
                                                    "Accept": "application/json"}, json.dumps(body).encode(), "POST")
        oid = r.get("orderId")
        return {"ok": bool(oid) and str(r.get("orderStatus", "")).upper() != "REJECTED", "order_id": oid,
                "message": r.get("_error") or r.get("orderStatus") or "Rejected"}
    return {"ok": False, "message": "Unknown broker"}


def _send_order(broker: str, sym: str, side: str, qty: int, otype: str, px: float, nonce: str) -> Dict[str, Any]:
    """Safety limits, nonce mark, the broker call and the order_log row. The caller has already checked the trade code.
    Returns {'ok', 'order_id', 'message'}. Raises HTTPException(400/409) for a bad or repeated order. Never retries."""
    if _recent_nonce.get(nonce, 0) > time.time() - 120:
        raise HTTPException(409, "This order was already sent.")
    ref = px if otype == "LIMIT" else (_angel_ltp(sym) or (_quotes([sym]).get(sym) or {}).get("ltp") or 0.0)
    cap = float(_section("owner_trade").get("max_order_value", 50000))
    if ref and qty * ref > cap:
        raise HTTPException(400, f"Order value ₹{qty * ref:,.0f} is above the ₹{cap:,.0f} safety limit.")
    if side == "SELL":
        have = sum(i["qty"] for i in _source(broker).get("items", []) if i["symbol"] == sym)
        if qty > have:
            raise HTTPException(400, f"{broker} shows only {have:g} {sym} to sell.")
    _recent_nonce[nonce] = time.time()
    try:
        res = _place(broker, sym, side, qty, otype, px)
    except Exception as e:
        res = {"ok": False, "message": str(e)}
    with _db() as c:
        _log_tables(c)
        c.execute("INSERT INTO order_log (ts, broker, symbol, side, qty, order_type, price, ref_price, status, order_id, message) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                  (time.strftime("%Y-%m-%d %H:%M:%S"), broker, sym, side, qty, otype, px, ref, "sent" if res["ok"] else "failed",
                   res.get("order_id"), str(res.get("message"))[:300]))
    _bcache.pop(broker, None)
    log.info(f"owner order {broker} {side} {qty} {sym} {otype} -> {res}")
    return res


@router.post("/order")
def place_order(request: Request, o: Dict[str, Any] = Body(...)):
    """Place one delivery (CNC) order on NSE. Needs the owner login + the trade code. Never retried automatically."""
    _owner(request)
    broker, sym = str(o.get("broker", "")), str(o.get("symbol", "")).upper().strip()
    side, otype = str(o.get("side", "")).upper(), str(o.get("order_type", "LIMIT")).upper()
    try:
        qty, px = int(o.get("qty") or 0), float(o.get("price") or 0)
    except (TypeError, ValueError):
        raise HTTPException(400, "Quantity and price must be numbers.")
    if broker not in FETCHERS or side not in ("BUY", "SELL") or otype not in ("MARKET", "LIMIT") or not sym.replace("&", "").replace("-", "").isalnum():
        raise HTTPException(400, "Bad order.")
    if qty <= 0 or (otype == "LIMIT" and px <= 0):
        raise HTTPException(400, "Quantity (and a limit price) must be above zero.")
    nonce = str(o.get("nonce", ""))
    if not nonce or _recent_nonce.get(nonce, 0) > time.time() - 120:
        raise HTTPException(409, "This order was already sent.")
    _check_pin(str(o.get("pin", "")))
    res = _send_order(broker, sym, side, qty, otype, px, nonce)
    return JSONResponse(res, status_code=200 if res["ok"] else 502, headers={"Cache-Control": "no-store"})


@router.get("/activity")
def activity(request: Request):
    """Orders sent from /rahul and buys / sells spotted between broker refreshes."""
    _owner(request)
    with _db() as c:
        _log_tables(c); _moves_tables(c)
        orders = [dict(zip(("ts", "broker", "symbol", "side", "qty", "order_type", "price", "ref_price", "status", "order_id", "message"), r))
                  for r in c.execute("SELECT ts, broker, symbol, side, qty, order_type, price, ref_price, status, order_id, message FROM order_log ORDER BY id DESC LIMIT 100")]
        moves = [dict(zip(("ts", "source", "symbol", "kind", "qty", "avg_price", "price", "pnl"), r))
                 for r in c.execute("SELECT ts, source, symbol, kind, qty, avg_price, price, pnl FROM broker_moves ORDER BY id DESC LIMIT 200")]
    return JSONResponse({"orders": orders, "moves": moves}, headers={"Cache-Control": "no-store, private"})



if __name__ == "__main__":      # cron: python api/owner_portfolio.py refresh
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "refresh":
        print(json.dumps(refresh_all()))
