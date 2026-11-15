# /rahul — implementation spec, version 2 (for a coding model)

Version: 15 Nov 2026, replaces version 1. Base commit of the app: `e8cc978` on `main`.
Read sections 0–3 fully before coding any phase. Each phase is independent unless it says "depends on".

**What changed from version 1**
- Call grades (A/B/C) and any gate on call type are **removed**. They failed the blind test (section 2).
- Every open call is shown. No cash limit, no greying out, no hidden calls. The owner adds money or sells old holdings when he wants a call.
- **News is the home page.** The separate Today page is removed; its Sell and Buy cards move to the top of Calls.
- Patterns moves under More. It did not predict AI calls (section 2).
- The follow tracker gets a broker trade-book import so it has history from day one.
- The "do not chase" rule is narrowed to what held up on later calls: do not buy an open call that is below its entry.
- Basket ordering is the last phase and is blocked until the owner has placed one order and one stop-loss himself.
- New phase 0: a fake-data fixture so screens can be tested without the owner's real holdings.

---

## 0. Rules that apply to every phase

1. **Never place a real order, stop-loss or GTT while building or testing.** Test order code only with a wrong trade code (expects HTTP 403) or with bad input (expects 400). The owner places the first real order himself.
2. **Never print, log or commit secrets**: `config.json`, broker tokens, the trade code, API keys.
3. **Owner-only.** Every new endpoint starts with `OP._owner(request)`. It returns 404 for anyone but the owner. Do not add any endpoint without it.
4. **Server deploys, new cron lines and new database tables need the owner's approval first.** Prepare the change, show it, wait. Back up every changed server file into `/root/quantsync/backup/<name>_<YYYYmmdd_HHMM>/` before overwriting.
5. **Do not push to `main` until the owner says so.** A push to `main` deploys the site.
6. **V4 engine stays off. V10 and AI-exit stay paper-only.** Do not touch `scheduler.py`, `daily_processor.py` or engine code.
7. **Telegram:** owner messages go only to `config.json → owner_alerts.chat_id` (a private chat). Never to the public or admin channel. If the id is not set, store the text and send nothing.
8. **Text on the site** is plain English: short sentences, no jargon, no "alpha", "signal strength", "conviction". Say "call", "stop", "target", "win rate". Indian number format (`fmt.inr`, `fmt.lakh`).
9. **No new dependencies** in the frontend (no npm, no build step). Server: standard library + what is already in the venv (`numpy`, `fastapi`, `anthropic`).
10. Research numbers in this spec are **in-sample**. Where the site shows them it must say "from past calls".

---

## 1. System map

### 1.1 Frontend (this repo)

- Repo: `RSITradingPlatform` (GitHub → Vercel, branch `main`). Live: `https://rsitradingplatform.vercel.app/rahul/`.
- App root: `public/rahul/`. Static ES-module single-page app. No bundler.

| File | Lines | Role |
|---|---|---|
| `core.js` | 765 | config, `api()`, `ownerApi()`, `ownerSend()`, formatting, icons, router (`TABS`, `ROUTES`, `parse`, `go`), `chrome()` page shell, `sheet()`, auth |
| `hero.js` | — | `titleHTML(t)` big animated headline used by `chrome()` |
| `charts.js` | — | `ruler()`, `spark()`, `settle()` |
| `m.css` | 1087 | all styles |
| `views/today.js` | 86 | Today page (removed in phase 1; its Sell and Buy cards move to Calls) |
| `views/calls.js` | 43 | AI Calls list |
| `views/call.js` | 84 | one call |
| `views/parts.js` | 133 | `callCard`, `signalCard`, `signalList`, `closedRow`, `sec`, `footNote` |
| `views/pfdata.js` | 63 | `loadBook()`, `enrich()`, `STATUS`, `technicals()`, `TREND` |
| `views/portfolio.js` | 194 | Portfolio with tabs Holdings / Review / Activity / Manual / Brokers |
| `views/review.js` | 67 | `reviewView(rows, act, term, S)` |
| `views/stock.js` | 190 | one stock |
| `views/trade.js` | 219 | `orderSheet(opts)`, `stopSheet(opts)` |
| `views/edge.js` | 119 | Edge lists (chips: market, results, owners, smart, sectors, delivery, scorecard) |
| `views/edgedata.js` | 42 | `edgeHome`, `edgeBlob`, `edgeStock`, `edgeStocks`, `GAUGE`, `srow`, `rsPill`, `warnChips`, `cr`, `day`, `note` |
| `views/embed.js` | 7 | News and X-Ray: a full-screen `<iframe class="rh-embed" src="/app/news?embed=1">` (the main site's page) |
| `views/patterns.js`, `pattern.js`, `closed.js`, `record.js`, `report.js`, `xray.js` | — | other pages, not changed unless stated |

A view is `export default async function name(el, r)`; `r = { view, tab, arg, path, query: URLSearchParams }`. It calls `chrome(el, {...})` which returns the body element.

### 1.2 Helpers you must reuse (exact signatures from `core.js`)

```js
api(path, ttlMinutes)                       // public GET, cached. e.g. api('/terminal-data?version=v2', 3)
ownerApi(path)                              // owner GET with Firebase token. path starts with '/owner/...'. Throws Error with .status
ownerSend(method, path, body)               // owner POST/PUT/DELETE. Throws Error(message from server 'detail')
isOwner(), auth.whenReady()
n(v)                                        // parse number, NaN if none
fmt.inr, fmt.sinr, fmt.lakh, fmt.px, fmt.px2, fmt.pct, fmt.sp (signed %), fmt.int, fmt.x(v, decimals), fmt.date, fmt.days
esc(s), tone(v) -> 'up' | 'dn' | '', mono(sym, cls), icon(name, size), link(path, innerHtml, cls, attrs)   // link() adds data-nav and CFG.base
skel(h, count, radius), errBox(msg, retry), empty(icon, h, p, cta), toast(msg), sheet(html, {label}) -> { el, close }
segmented(el, [[key, label, count]], value, onChange)
loadTerminal() -> { active: Call[], toBuy: Call[], closed: Closed[], kpis, at }
allSignals(term) -> Call[]                  // toBuy first, then active, one per stock+engine
engineOf(c) -> 'v2' | 'v3', engineName(c), engineBadge(c, cls), callPath(c), STRAT_NAMES
chrome(el, { title, sub, back, actions, top, page }) -> bodyEl
go(path), back(fallback), parse()
```

`Call` (from `toCall`): `{ sym, name, sector, action, stratId, strategy, entry, stop, target, now, roi, days, entryDate, why, score, engine, tradeId, isNew, raw }`.
`Closed` (from `toClosed`): `{ id, sym, stratId, strategy, entry, exit, roi, win, reason, rawReason, entryDate, exitDate, days, origin, engine }`.

Existing shared view helpers:

```js
// views/parts.js
callCard(c, { compact })      signalCard(c, { owned: Set, expand })     signalList(list, o)
isFreshSignal(c)              // c.isNew || c.days <= 1
sec(titleHtml, innerHtml, { more, p, id })     footNote(extra)
// views/pfdata.js
loadBook(fresh) -> { pf, term, rows }          // rows = enriched holdings
// enriched row: { symbol, source, parts: {Angel:{qty,avg}}, qty, avg, ltp, invested, value, pnl, pnl_pct, day_pct,
//                 call, calls, exitCall, status: 'exit'|'stop'|'target'|'ai'|'none', vsCall }
STATUS[status] -> { t, cls, rank }
// views/trade.js
orderSheet({ sym, side: 'BUY'|'SELL', broker?, call?: {entry, stop, target}, onDone? })
stopSheet({ sym, broker, qty, stop, ltp })
// views/edgedata.js
edgeHome(symbols[]) edgeBlob(key) edgeStock(sym) edgeStocks(symbols[]) -> { SYM: edgeRow }
```

`edgeRow` (per stock): `{ symbol, name, sector, industry, mcap_cr, as_of, close, liquid, rs (1–99), r5, r21, r63, r126, r252, trend: 'up'|'up-weak'|'side'|'down-weak'|'down', sector_rank, sectors, earnings, owners, delivery, smart, warnings: [{ kind, level: 'bad'|'warn', text, d }] }`. A symbol with no row is not an ordinary share (ETF, fund).

### 1.3 Server

- Host alias `quantsync-cloud` (SSH), code in `/root/quantsync`, Python venv `./venv/bin/python3`.
- API: FastAPI app `server.py`, service `quantsync-api` (uvicorn on 127.0.0.1:8000). Restart: `systemctl restart quantsync-api`. The site calls it as `/api/...` (Vercel rewrite).
- **The server is the source of truth for server files.** Copy each file down before editing (`scp quantsync-cloud:/root/quantsync/api/owner_edge.py .`), edit, show the diff, deploy after approval.

| Server file | Role |
|---|---|
| `api/owner_portfolio.py` (imported as `OP`) | router prefix `/api/owner`: `/portfolio`, `/trades`, `/brokers`, `/ticket`, `/price`, `/order`, `/activity`. Helpers `_owner`, `_db` (owner.db), `_section(name)` (config.json section), `_check_pin`, `_recent_nonce` (dict), `_place(broker, sym, side, qty, otype, px)`, `_funds()`, `_angel_ltp`, `_quotes`, `_source(broker)`, `_log_tables(c)`, `_moves_tables(c)`, `_track_moves`, `FETCHERS`, `_bcache` |
| `api/owner_edge.py` | router prefix `/api/owner`: `/edge/home`, `/edge/blob/{key}`, `/edge/stocks`, `/edge/stock/{symbol}`, `/funds`, `/alerts`, `/ask`, `/read`, `/stop`. `BLOBS` = allowed blob keys. `_blob(key)`, `_stocks(symbols)`, `_place_stop(broker, sym, qty, trig, ltp)`, `_tick(px)`, `NOSTORE` |
| `scripts/edge_build.py` | nightly builder. Reads prod DBs read-only, writes only `Data/edge.db`. `main(mode)` fills dict `blobs` then writes each to table `blobs`. Helpers: `ro(path)`, `r(x, n)`, `Px(hist)` (close/volume matrices: `px.cal`, `px.pos[date]`, `px.row[sym]`, `px.C`, `px.RAW`, `px.V`, `px.T`), `build_scorecard(master, today)` |
| `scripts/owner_alerts.py` | holdings alerts, `run` / `chatid` |

Databases (SQLite, in `/root/quantsync/Data/`):

```
quantsync_master.db   (READ ONLY for everything in this spec)
  closed_trades(trade_id PK, engine_version 'v2'|'v3', symbol, strategy_id, entry_date, exit_date, entry_price, exit_price,
                shares, invested_capital, gross_pnl, total_friction, net_pnl, exit_reason, holding_days, origin 'LIVE'|'SIMULATED'|NULL, fill_check, ...)
  active_trades(trade_id PK, engine_version, symbol, strategy_id, entry_date, entry_price, current_stop, target_price, current_ltp, status 'OPEN', ...)
  strategy_id values: v2 -> Apex, Leader, Breakout, Flag, Gap ; v3 -> 52W_HIGH, DARVAS, HTF, BASE
stock_history.db      (READ ONLY)  StockHistory(symbol, rawCandles JSON [{t,o,h,l,c,v,p?}])  -- skip candles with p (provisional); CompanyMaster(symbol, company_name, sector, industry, market_cap_cr, next_results_date)
edge.db               blobs(key PK, built_at, body_json), stock(symbol PK, body_json), deals_hist, pledge_snap
owner.db              manual_trades, broker_last(source, symbol, qty, avg_price, ltp, as_of), broker_seen, broker_moves(id, ts, source, symbol, kind 'bought'|'added'|'sold'|'reduced', qty, avg_price, price, pnl),
                      broker_holdings_daily(snap_date, source, symbol, qty, avg_price, ltp), order_log(id, ts, broker, symbol, side, qty, order_type 'LIMIT'|'MARKET'|'STOP', price, ref_price, status 'sent'|'failed', order_id, message),
                      pin_fail, alert_sent(key PK, ts, kind, symbol, text, sent)
```

Existing cron (root): `edge_build.py daily` at 08:40 and 20:10 Mon–Fri; `owner_alerts.py run` every 10 min 09–15 and at 16:25, 20:25.

Result of a call everywhere in this spec: `net % = (exit_price / entry_price − 1) × 100 − 0.45`.

### 1.4 Local preview

The app needs (a) a static server with fallback of every `/rahul/*` path to `/rahul/index.html`, and (b) owner data. For local tests without signing in: serve a copy of `public/rahul`, replace `isOwner` with `() => true` and `ownerApi` with a function that returns canned JSON captured from the server **in the copy only**. Never commit that patch or the captured JSON (it holds the owner's holdings). Test at 375×812 and at desktop width, light and dark, and check the console is clean.

---

## 2. What the data showed (and what failed)

From 395 closed calls, cost 0.45% per call.

**Held up**
- The best 10% of calls made about 95% of all profit. The other 90% together made about zero. So every call must be visible and easy to take, and skipped calls must be visible afterwards.
- After an AI exit the stock averaged about 0% over the next 20 days. Following the AI exit is right.
- Buying an open call later, at a close more than 1% **below** its entry: 27% won on calls to June 2026 (127 cases) and 30% on calls from July 2026 (100 cases). Average about 0. This held in both periods.
- Buying later within −1% to +2% of entry: 47% and 50% won, average +1.7% and +2.6%. Fine to buy.
- Buying later more than 2% above entry: 47% then 60% won, average +0.7% and +1.0%. Not bad, small reward. **Label it, do not forbid it.**

**Failed — do not build**
- Grades by call type. Walk-forward: A +2.70% (91 calls), B +0.61% (75), C +3.23% (42). Blocking C would have cut the total from 959 to 823 points. Only Apex was positive in all four half-years.
- Selling at day 2/3/5/8 when below entry; moving the stop to entry after +4%/+6%. No improvement.
- Patterns page as a "may be called soon" list. From 28 Sep to 13 Nov 2026 it listed about 104 stocks a day; 0 of 213 "NEAR" rows and 6 of about 2,450 rows became a Chart AI Pro call within 14 days. (Short history: 7 weeks, 8 such calls.)

**Not tested — show as information only, never as a rule**
- The market gauge sizes (full / half / none). Its evidence line is from past data only.

---

## 3. Build order

| Release | Phases |
|---|---|
| A | 0 fixture · 1 shell (News home, 4 tabs, compact header) · 2 Calls page |
| B | 3 follow tracker + trade-book import · 4 portfolio header + clean-up |
| C | 5 live record + fills · 6 weekly report · 7 fixes |
| D | 8 basket orders — only after the owner confirms one real order and one real stop-loss placed by himself |

---

## Phase 0 — Fake-data fixture (do this first)

Goal: test every owner screen locally without signing in and without real holdings.

Create `tools/rahul-preview/` in the repo (not under `public/`, so it is never deployed):

- `serve.py` — static server for a temp copy of `public/`, port 5173, any `/rahul/*` path without a file extension returns `/rahul/index.html`.
- `prepare.sh` — copies `public/` to a temp folder and patches **only the copy** of `rahul/core.js`: `isOwner = () => true`, `ownerApi(path)` and `ownerSend()` replaced by functions that read `sample_owner.json` and return the entry whose key matches the path prefix.
- `sample_owner.json` — **invented** data, never the owner's. Keys: `portfolio` (12 rows covering every `status`: 2 with an open call, 1 at stop, 1 at target, 1 with a call closed 3 days ago, 6 with no call incl. 1 ETF with no edge row and 2 in a downtrend with a `bad` warning, 1 up 40%), `activity`, `trades`, `funds`, `home`, `stocks`, `blob.*`, `follow`, `weekly`. Use real NSE symbols that currently have open calls so `loadTerminal()` (public, real) matches them; all quantities and prices invented.
- `README.md` — three commands to run it.

Accept: `sh tools/rahul-preview/prepare.sh && python3 tools/rahul-preview/serve.py` opens `/rahul/` with all screens filled. `git status` shows nothing changed under `public/`.

---

## Phase 1 — Shell: News home, four tabs, compact header

### 1.1 Tabs and routes (`core.js`)

```js
const TABS = [
  ['news', '', 'News', 'news'],
  ['calls', 'calls', 'Calls', 'ai'],
  ['portfolio', 'portfolio', 'Portfolio', 'pf'],
  ['more', 'more', 'More', 'grid'],      // 'grid' icon exists; tabIcon() works without a filled 'gridF'
];
const ROUTES = [
  [/^$/, 'home', 'news'],                // News is the home page
  [/^news$/, 'home', 'news'],            // old link keeps working
  [/^today$/, 'calls', 'calls'],         // old Today -> Calls
  [/^calls$/, 'calls', 'calls'],
  [/^calls\/closed\/([^/]+)$/, 'closed', 'calls'],
  [/^calls\/([^/]+)$/, 'call', 'calls'],
  [/^record$/, 'record', 'calls'],
  [/^portfolio$/, 'portfolio', 'portfolio'],
  [/^stock\/([^/]+)$/, 'stock', 'portfolio'],
  [/^more$/, 'more', 'more'],
  [/^edge$/, 'edge', 'more'],
  [/^patterns$/, 'patterns', 'more'],
  [/^patterns\/([^/]+)$/, 'pattern', 'more'],
  [/^xray$/, 'embed', 'more'],
  [/^xray\/([^/]+)$/, 'embed', 'more'],
];
```

- `parse()` fallback becomes `{ view: 'home', tab: 'news', … }`. `parse()` sets `root: view === tab`; that is now false for `home`, so change it to an explicit set: `root: ['home', 'calls', 'portfolio', 'more'].includes(view)`.
- `edge`, `patterns`, `xray` are no longer tab roots: pass `back: 'More'` to `chrome()` in `edge.js` and `patterns.js`; for `xray` (iframe view) add a slim bar with a back button above the iframe (see 1.3).
- Delete `views/today.js` after phase 2 has moved its cards. Keep `titleCase` (exported from today.js, imported by `edge.js` line 7 and `stock.js` line 11): move it to `views/edgedata.js` and fix both imports.
- `#tabs` and `#rail` are built from `TABS` in `bootApp()`; `--tn` is already set from `TABS.length`. Confirm 4 items in both.

### 1.2 Compact header (`core.js`, `m.css`)

`chrome(el, { …, compact = false })`: when `compact`, do not render `<div class="wrap head">…</div>`; render `<div class="wrap body compact"></div>`, add class `solid` to the bar at once and skip the scroll handler. Use `compact: true` in: calls, call, portfolio, stock, more, edge.

```css
.wrap.body.compact { margin-top: 10px; }
```

Accept: at 375×812 the first content card on Calls and Portfolio starts within 80px of the top (now about 250px).

### 1.3 `views/home.js` (new) — News with an action strip

```js
export default async function home(el, r)
```

Markup: `<div class="hm"><a class="hm-strip" data-nav href="/rahul/calls">…</a><iframe class="rh-embed" src="/app/news?embed=1" title="News" loading="eager"></iframe></div>`.

- The strip is one row, 44px high, above the iframe. The iframe fills the rest (`.hm { display:flex; flex-direction:column; height:100% }`, `.hm .rh-embed { flex:1; height:auto }` — check the existing `.rh-embed` rule and the bottom tab-bar padding so nothing is hidden).
- Strip content, from `loadBook()` (owner only, after `auth.whenReady()`); render a 44px skeleton first so the iframe does not jump:
  - `sell` = rows with `status ∈ {exit, stop, target}`; `fresh` = `allSignals(term).filter(c => entryZone(c) === 'new')` not already held.
  - Text: "**{sell} to sell** · **{fresh} new calls**" + chevron. Colour the sell part `dn` when sell > 0. If both are 0: "Nothing to sell · no new call yet".
  - On error: hide the strip.
- `views/embed.js` (now X-Ray only): add a 44px bar with a back button (`back('more')`) above the iframe, same flex layout.

### 1.4 `views/more.js` (new)

`chrome(el, { title: 'More', page: 'More', compact: true })`, then a `.group` of rows (icon, title, one line):

| Row | Path | Line |
|---|---|---|
| X-Ray | `xray` | Look up any stock |
| Edge | `edge` | Market gauge, results, owners, big buyers, scorecard |
| Patterns | `patterns` | Chart patterns forming now |
| Scanner | `/app/scanner.html` (plain `<a>`) | Build and test your own rules |

Then a "Settings" panel: **Standard buy amount (₹)**, numeric input, saved to `localStorage['rh-size']`, default 14000, allowed 2000–50000. In `views/trade.js` add and use in place of the `BUDGET` constant:

```js
export const buySize = () => { try { const v = +localStorage.getItem('rh-size'); return v >= 2000 && v <= 50000 ? v : 14000; } catch { return 14000; } };
```

### Accept

- `/rahul/` shows News with the strip; tapping the strip opens Calls.
- 4 tabs on phone and rail. `/rahul/news`, `/rahul/today`, `/rahul/edge`, `/rahul/patterns`, `/rahul/xray` all open; the last three highlight More and have a working back button.
- No console errors; light and dark; 375px and desktop.

---

## Phase 2 — Calls page: Sell, Buy, then all open calls by zone

### 2.1 `views/parts.js`

```js
/** 'new' | 'near' | 'ran' | 'below' — where the price is against the call's entry. */
export function entryZone(c) {
  if (isFreshSignal(c)) return 'new';
  const g = (c.now / c.entry - 1) * 100;
  if (!isFinite(g)) return 'near';
  return g > 2 ? 'ran' : g < -1 ? 'below' : 'near';
}
```

Rewrite `signalList(list, o)` into three groups. **Every call appears in exactly one group; none is hidden or folded.**

| Group | Zones | Heading | Sub-line | Sort |
|---|---|---|---|---|
| 1 | `new` | Buy today | New calls from the last scan. | score desc |
| 2 | `near`, `ran` | Still open to buy | Older calls that are at or above their entry. | `near` first, then `ran`; days asc |
| 3 | `below` | Below entry | The price has fallen under the call's entry. In the past, calls bought here won about 3 in 10. Wait for the price to get back above entry. | days asc |

- Card tags: `ran` → `<span class="tag">Already up +x%</span>`; `below` → `<span class="tag dn">Below entry −x%</span>`.
- Remove the texts "Paper trade these" and "Skip these. The best entry has passed."
- Empty group 1: "No new call in the last scan. Calls come at about 3:15 PM on market days."

### 2.2 `views/calls.js`

Use `compact: true`. Order on the page for the owner (after `auth.whenReady()`, `isOwner()`):

1. **Gauge line** — one row from `edgeHome([])`: coloured dot + "Market: **{GAUGE[g].t}** · {b50}% of stocks above their 50-day average". Tap → `edge?v=market`. Information only; it does not change sizes or hide anything.
2. **Card "Sell"** — move the "Sell or review" block from `today.js` unchanged (rows with `status ∈ {exit, stop, target}`, reason line, Sell button → `orderSheet({ side: 'SELL', … })`). Empty: "Nothing to sell."
3. **Card "Attention"** — only `bad` warnings dated within the last 7 days and results within the next 3 days, on held stocks (from `edgeHome(symbols).stocks`). Not rendered when empty.
4. The year summary tile and the Active / Past segmented control (existing).
5. Active tab: `signalList` (2.1). For the owner, cards in groups 1 and 2 get a **Buy** button → `orderSheet({ sym, side: 'BUY', call: c, onDone })`; group 3 cards get no button (the call page still allows buying). Held stocks keep the green border and "Bought" tag.
6. Cash line under group 1 (lazy, `ownerApi('/owner/funds')`): "Free cash: Angel ₹X · Dhan ₹Y · Kite —". Information only.

`signalCard` needs an optional `o.buy` flag that appends `<button class="btn sm" data-buy="${esc(c.sym)}">Buy</button>`; the card is an `<a>`, so the click handler must call `e.preventDefault(); e.stopPropagation()`.

### 2.3 `views/stock.js` and `views/call.js`

- If the stock has an open call in zone `below`: show above the Buy button "The price is below this call's entry. Calls bought here won about 3 in 10." and make Buy a `quiet` button.
- If the stock has **no** AI call: replace the full-width Buy button with `<button class="lnk" data-buy>Buy anyway</button>` and add the line "There is no AI call on this stock."

```css
.lnk { background:none; border:0; padding:8px 2px; color: var(--brand); font: inherit; text-decoration: underline; cursor:pointer; }
```

### Accept

Group counts add up to `allSignals(t).length` (40 on 13 Nov 2026). Hand-check 6 calls against `now/entry`. Sell and Buy open the right sheet. Non-owner code path (if reused elsewhere) shows no buttons.

---

## Phase 3 — "Did you follow the AI" tracker, with trade-book import

### 3.1 Trade-book import

Purpose: give the tracker past buys and sells from before broker snapshots began (about Nov 2026).

Table in owner.db:

```sql
CREATE TABLE IF NOT EXISTS fills (
  broker TEXT, trade_id TEXT, d TEXT, ts TEXT, symbol TEXT, side TEXT CHECK (side IN ('BUY','SELL')),
  qty REAL, price REAL, src TEXT,            -- src: 'import' | 'api'
  PRIMARY KEY (broker, trade_id));
```

Server, `api/owner_edge.py`: `POST /api/owner/fills/import`, body `{ broker, rows: [{ date, symbol, side, qty, price, trade_id? }] }`.
- Owner only. Max 5,000 rows per request. Validate like `OP._trade_in` (symbol upper-cased, `-EQ` stripped, side BUY/SELL, qty > 0, price > 0, date `YYYY-MM-DD`).
- `trade_id` missing → `sha1(f"{date}|{symbol}|{side}|{qty}|{price}|{row_index_within_same_key}")[:16]` so re-importing the same file adds nothing.
- `INSERT OR IGNORE`. Reply `{ added, skipped, bad }`.
- This does **not** touch `manual_trades` or holdings. It is history only.

Frontend, Portfolio → Brokers tab: panel "Import past trades" with a file input (`.csv`) and a broker select.
- Parse in the browser. Split on commas with quote handling. Find columns by header name, case-insensitive, first match:
  - date: `trade date`, `date`, `order execution time`, `trade_date`
  - symbol: `symbol`, `scrip`, `scrip name`, `tradingsymbol`, `stock name`
  - side: `trade type`, `buy/sell`, `type`, `transaction type`, `side` (values starting with `b`/`s`)
  - qty: `quantity`, `qty`, `traded qty`
  - price: `price`, `trade price`, `avg price`, `traded price`
  - trade id (optional): `trade id`, `trade no`, `trade_id`
- Dates: accept `YYYY-MM-DD`, `DD-MM-YYYY`, `DD/MM/YYYY`, `DD-Mon-YYYY`, with or without a time.
- Show a preview before sending: number of rows read, first 5 rows, rows that could not be read, date range. Button "Import {n} trades".
- If a required column is not found, say which one and stop. **Ask the owner for one real export file from each broker and test the parser against it; the header names above are a starting list, not verified.**

### 3.2 `scripts/owner_follow.py` (new)

Run: `venv/bin/python3 scripts/owner_follow.py run`. Reads master (ro), stock_history.db (ro, session calendar = dates of `NIFTY500` candles without `p`), owner.db (rw). Rebuilds the table in one transaction.

```sql
CREATE TABLE IF NOT EXISTS follow (
  call_id TEXT PRIMARY KEY, engine TEXT, strategy TEXT, symbol TEXT,
  call_date TEXT, call_entry REAL, exit_date TEXT, call_exit REAL, call_result REAL,   -- exit_* NULL while open
  state TEXT,              -- 'taken' | 'late' | 'skipped' | 'held_before' | 'untracked'
  your_date TEXT, your_price REAL, your_qty REAL, zone TEXT,                            -- zone at your buy: near | ran | below
  sold_date TEXT, sold_price REAL, exit_lag INTEGER,                                    -- sessions between AI exit and your sell
  your_result REAL, source TEXT,                                                        -- source of your prices: fills | orders | snapshots
  built_at TEXT);
```

1. `track_from` = earliest of `min(d)` in `fills` and `min(snap_date)` in `broker_holdings_daily`. Calls before it → `untracked`.
2. Calls = `closed_trades` + `active_trades` (OPEN), engines v2 and v3. `call_id = trade_id`. `call_result = (exit/entry − 1) × 100 − 0.45`.
3. Buy evidence for the symbol between `call_date` and `call_date + 10 sessions`, in this order of trust:
   a. `fills` side BUY (volume-weighted price per day) → `source 'fills'`
   b. `order_log` BUY, `status='sent'`, `order_type IN ('LIMIT','MARKET')` → `'orders'`
   c. `broker_moves` `bought`/`added` (ignore a move cancelled by an opposite move of the same qty within 2 calendar days) → `'snapshots'`
4. `state`: holding > 0 before `call_date` (from fills running total, else last snapshot) and no buy evidence → `held_before`; buy within 3 sessions → `taken`; sessions 4–10 → `late`; else `skipped`. `zone` from `your_price / call_entry` with the phase 2 cut-offs.
5. Sell evidence from `exit_date − 1 session` on (closed calls, state taken/late/held_before): `fills` SELL, then `order_log` SELL, then `broker_moves` `sold`/`reduced`. `exit_lag` in sessions (0 = same day).
6. `your_result = (sold_price / your_price − 1) × 100 − 0.45` when both exist.

Cron (needs approval): `20 20 * * 1-5 cd /root/quantsync && timeout 120 venv/bin/python3 scripts/owner_follow.py run >> logs/owner_follow.log 2>&1`. Also run once right after an import (the import endpoint may call the module's `run()` in a background thread).

### 3.3 `GET /api/owner/follow?size=14000` (`api/owner_edge.py`)

```json
{ "track_from": "2025-11-20", "built_at": "...",
  "summary": {
    "month": { "label": "Nov 2026", "calls": 14, "taken": 6, "late": 1, "skipped": 7,
               "taken_avg": 1.9, "skipped_avg": 3.4, "skipped_cost_inr": 4760,
               "bought_below": 1, "exits": 5, "exits_followed": 3, "exits_late": 2 },
    "all": { "…same keys…" } },
  "rows": [ { "call_id": "…", "symbol": "PNB", "engine": "v2", "strategy": "Apex", "call_date": "…", "call_entry": 132.1,
              "exit_date": null, "call_result": null, "state": "taken", "zone": "near", "your_date": "…", "your_price": 133.0,
              "sold_date": null, "exit_lag": null, "your_result": null, "source": "fills" } ] }
```

- Summary leaves out `untracked` and `held_before`. `*_avg` = mean `call_result` of closed calls in that state.
- `skipped_cost_inr = sum(call_result of skipped closed calls) / 100 × size` (`size` clamped 2000–50000). Negative means skipping saved money; the app then says "Skipping saved you ₹X".
- `exits_followed`: `exit_lag` from −1 to 2. `exits_late`: lag > 2, or still held after an AI exit.
- Table missing → `{ "track_from": null, "rows": [], "summary": {} }`.

### 3.4 Frontend

`views/follow.js` (new): `export function followView(d)` → HTML string.
- Stats (`.stats.four`): "Calls taken" `6 of 14` · "Calls you took" avg · "Calls you skipped" avg · "AI exits followed" `3 of 5`.
- One sentence by rule: `skipped_avg > taken_avg` → "The calls you skipped did better than the ones you took. Most of the profit comes from about 1 call in 10, so each skipped call is a risk."; else → "The calls you took did better this time. Keep taking each one so the big ones are not missed." If `bought_below > 0` add: "{n} bought below the call's entry — those have won about 3 in 10."
- Toggle month / all time.
- List grouped by month of `call_date`: symbol, engine badge, state pill (`taken` up · `late` warn · `skipped` dn · `held_before` plain "Already held"), right side `call_result` (or "open"), your result under it when known. Tap → `stock/SYM`.
- Foot: "Tracking starts on {track_from}. Import past trades in the Brokers tab to go further back."

`views/portfolio.js`: segment `['follow', 'Follow']` after Holdings; allow `v=follow`; `ownerApi('/owner/follow?size=' + buySize())`.
`views/review.js`: delete the "You against the AI calls" section.
`views/home.js` strip: when `summary.month.calls > 0` append " · took {taken} of {calls} this month".

### Accept

- Import the same file twice: second time `added: 0`.
- Hand-check 5 taken calls (GINNIFILA, DCAL, CDSL, PNB, ICICIBANK were held with open calls on 15 Nov 2026) and 5 skipped.
- Both endpoints return 404 without the owner token.

---

## Phase 4 — Portfolio header and clean-up

### 4.1 `views/pfdata.js`

```js
const DOWN = new Set(['down', 'down-weak']);
/** For a holding with no AI call. e = edge row or undefined. Returns { g: 'fund'|'sell'|'stop'|'keep', why }. */
export function cleanupGroup(x, e) {
  if (!e || !e.sector) return { g: 'fund', why: 'ETF or fund. The stock rules do not apply.' };
  const bad = (e.warnings || []).filter(w => w.level === 'bad'), dn = DOWN.has(e.trend);
  if (dn && bad.length) return { g: 'sell', why: `${e.trend === 'down' ? 'Strong downtrend' : 'Downtrend'} and ${bad[0].text.toLowerCase()}` };
  if (dn && x.pnl_pct <= -25) return { g: 'sell', why: `Down ${fmt.x(-x.pnl_pct, 0)}% and still below its 50 and 200-day averages` };
  if (dn) return { g: 'stop', why: 'Below its 50 and 200-day averages. Set a stop or decide why you keep it.' };
  if (bad.length) return { g: 'stop', why: bad[0].text };
  if (x.pnl_pct >= 30) return { g: 'stop', why: `Up ${fmt.x(x.pnl_pct, 0)}% with no stop protecting it` };
  return { g: 'keep', why: 'Uptrend or sideways, no red flag' };
}
```

These rules are the author's judgement, not a tested result. The page must say: "These groups are a starting point for your own decision, not a tested rule."
Suggested stop: `ltp × 0.92`, rounded down to 0.05, editable. Text: "Suggested stop is 8% below the price. Change it to a level you trust."

### 4.2 `views/portfolio.js`

- Header panel above the segmented control:
  - line 1: total value, today's change in ₹ and %.
  - line 2: "AI calls · {n} stocks · {value} · {pnl}".
  - line 3: "Not AI · {n} stocks · {value} · {pnl}".
  Use `totals(rows)` on the three sets; remove the first KPI tile from Holdings so it is not repeated.
- Segments: Holdings · Follow · Clean-up · Activity · Manual · Brokers. `v=review` maps to Clean-up.

### 4.3 `views/review.js`

`reviewView(rows, act, term, S)` returns:
1. Stats (keep): "If every AI stop is hit", "Covered by an AI call", "Top 5 holdings".
2. **Sell first** ({n} · {value}) — group `sell`, value desc. `srow(symbol, why, value + pnl%)` + Sell button (`data-sell`) when a broker part exists.
3. **Set a stop** — group `stop`. Button "Set stop" (`data-stop`).
4. **Keep** — group `keep`, inside `<details>` (closed).
5. **Funds and ETFs** — group `fund`, inside `<details>` (closed).
6. "Where the money sits" (keep).
Add a line under the stats: "Selling from 'Sell first' frees about {value} for new AI calls."
Export `bindReview(rootEl, rows, onDone)` wiring `data-sell` → `orderSheet`, `data-stop` → `stopSheet({ sym, broker, qty, stop: suggested, ltp })`; call it from `portfolio.js` after setting `innerHTML`.

### Accept

Each non-AI holding is in exactly one group (36 on 15 Nov 2026). Hand-check the 15 holdings down 15%+. Buttons open the right sheet with the right quantity. No order is sent in tests.

---

## Phase 5 — Live-only record, call-type table, real fills

### 5.1 `scripts/edge_build.py` → `build_scorecard(master, today, hist)`

- Also select `origin`, `strategy_id`.
- Per engine add `"live": stat(calls where upper(origin) == 'LIVE')`, `"live_first"` (earliest live entry date).
- `"next_open"`: the live calls re-priced with entry = next session's open after `entry_date` (`StockHistory.rawCandles`, field `o`, skip `p` candles; skip calls that exited on the entry day or have no such candle) → `{n, win, avg}`.
- `"types"`: per `strategy_id`: `{n, win, avg}` for all time and for each half-year (`2025H1` …). **Information only.**
- No intraday candles are stored: do not invent a "price a few minutes after the alert".

`views/edge.js` Scorecard:
- Per engine two columns: "All history" and "Live since {live_first}" (n, win, avg). Under it: "Bought next morning instead: {avg}%". If `live.n < 30`: "Too few live calls to judge yet."
- Table "By call type": Type, Calls, Won, Avg, and avg per half-year. Note under it: "Past results by type did not predict later results, so calls are not ranked by type."

### 5.2 `scripts/owner_fills.py` (new) — depends on the `fills` table from phase 3

`run`: for each connected broker fetch today's executed trades and `INSERT OR IGNORE` into `fills` with `src = 'api'`. Use the session helpers in `owner_portfolio.py` (`_cfg`/`_token`/`_call` for Angel, `_kite_headers`, `_dhan_auth`, `_http`). Endpoints — **from memory; verify against each broker's current documentation before use**:
- Angel: `GET {ANGEL_API}/order/v1/getTradeBook`
- Kite: `GET https://api.kite.trade/trades`
- Dhan: `GET https://api.dhan.co/v2/trades`
Read-only. On error log one line and go on to the next broker. Cron (needs approval): `45 15 * * 1-5` and `10 16 * * 1-5`.

### Accept

`live.n` per engine equals `select count(*) from closed_trades where upper(origin)='LIVE' and lower(engine_version)=…`. One market day of fills matches the broker app (the owner checks).

---

## Phase 6 — Weekly report (depends on phase 3)

`scripts/owner_weekly.py run`:
- Week = the Monday–Friday just ended. From `follow`: calls made, taken, skipped; calls closed this week: your average vs the AI's; exits followed and late; best and worst closed call you took. From `broker_holdings_daily`: change in portfolio value over the week.
- "One thing to fix", first rule that matches: still holding after an AI exit ("Sell {SYMS}: the AI exited and you still hold them") → skipped ≥ 2 calls ("You skipped {n} calls this week") → bought below entry ≥ 1 → bought `late` ≥ 2 → "Nothing to fix this week".
- Store in owner.db: `CREATE TABLE IF NOT EXISTS weekly (week TEXT PRIMARY KEY, built_at TEXT, body_json TEXT, text TEXT, sent INTEGER)`. `text` = 6–8 plain lines.
- Telegram only when `owner_alerts.chat_id` is set (reuse the sender in `owner_alerts.py`); set `sent`.
- `GET /api/owner/weekly` → latest `{ week, body, text, sent }`.
- Cron (needs approval): `0 18 * * 6`.

`views/calls.js`: from Saturday 18:00 to Monday 09:00 IST show a "Your week" card at the top with the lines of `text`.

---

## Phase 7 — Fixes

1. **Settlement artefacts in activity** (`OP._track_moves`): before inserting a move, look for an opposite move (`bought/added` vs `sold/reduced`) with the same source, symbol and qty in the last 2 calendar days; if found, delete that earlier move and insert nothing. Where the broker payload has a T1 quantity (Angel `t1quantity`, Kite `t1_quantity`), use `quantity + t1` as the holding in the fetcher. A one-off clean-up of existing cancelling pairs: list them for the owner first, delete after approval.
2. **SILVERBEES**: the portfolio shows ltp 168.85 against average 268.85 (exactly −100). Compare `OP._quotes(['SILVERBEES'])`, the Angel holdings `ltp`, and the last close in `StockHistory`. Report which source is wrong before changing anything.
3. **68 closed calls whose `entry_price` is more than 3% from that day's close**: classify each as intraday trigger entry, split/bonus adjustment, or data error. Output a CSV. No data change.
4. **42 closed calls ending at exactly +1.5%** (`exit_reason = 'SYSTEM_TARGET_OR_TRAIL'`): find the rule in the engine and explain it in two lines. No change.
5. **Angel cash on closed days**: when `_funds()` gets an Angel error outside market hours return `{"status": "closed"}`; the cash line shows "market closed".
6. **Live-quote volume and day-low errors**: reproduce first, then fix in the quote collector.

---

## Phase 8 — Basket orders (blocked)

**Do not start until the owner writes that he has placed one real order and one real stop-loss from /rahul himself and both showed up in the broker app.** The stop-loss requests to Angel (`/gtt/v1/createRule`), Kite (`POST /gtt/triggers`) and Dhan (`POST /v2/forever/orders`) have never been run against the brokers; check each request body against the broker's current documentation first.

### 8.1 Server

Refactor in `api/owner_portfolio.py`, no behaviour change: move everything in `place_order` after `_check_pin(...)` into

```python
def _send_order(broker, sym, side, qty, otype, px, nonce) -> Dict[str, Any]:
    """Limit checks, nonce mark, _place, order_log row. Returns {'ok', 'order_id', 'message'}. Raises HTTPException(400/409) on bad input."""
```

New endpoint in `api/owner_edge.py` (it already imports `OP`; this avoids a circular import):

```python
MAX_BASKET = 5

@router.post("/orders")
def place_orders(request: Request, body: Dict[str, Any] = Body(...)):
    """Several BUY LIMIT orders with one trade-code check. body: {pin, orders: [{broker, symbol, qty, price, nonce, stop?}]}"""
```

Checks in order (a failure before step 5 sends nothing):
1. `OP._owner(request)`.
2. `orders` has 1..`MAX_BASKET` items; each: broker in `OP.FETCHERS`, valid symbol, `qty > 0`, `price > 0`, nonce not seen in the last 120 s; nonces distinct; no symbol twice. Else 400.
3. Each order value ≤ `owner_trade.max_order_value` (default 50000). Else 400 naming the stock.
4. Per broker: `OP._funds()[broker].status == 'ok'`, and the sum of its order values ≤ its free cash. Else 400 with both numbers. (This is the broker's own limit, not a display rule: an order above free cash is rejected by the broker anyway.)
5. `OP._check_pin(pin)` once.
6. For each order: `OP._send_order(broker, sym, 'BUY', qty, 'LIMIT', price, nonce)` in try/except. If ok and `stop` given and `price × 0.7 <= stop < price`: `_place_stop(...)` in try/except, logged to `order_log` as `/stop` does. A failure never stops the rest. 0.3 s pause between orders.
7. 200 `{ "results": [ { "symbol", "broker", "ok", "order_id", "message", "stop": {…}|null } ] }`, `NOSTORE`.

Never retry. Never switch to MARKET.

### 8.2 Frontend (`views/trade.js`, `views/calls.js`)

```js
/** opts: { calls: Call[], funds, onDone? } */
export function basketSheet(opts)
```

- Step 1: one row per call: checkbox (on), symbol, quantity input (default `Math.floor(buySize() / c.now)`), limit price (default `c.now` rounded to 0.05), the call's stop. One broker select (brokers with `status === 'ok'`). Tick "Also place a stop-loss at each call's stop" (on). Footer "Total ₹X · free cash ₹Y"; Continue disabled when 0 or more than 5 are ticked; when X > Y show "Add ₹{X−Y} to {broker} first, or untick some." and disable Continue.
- Step 2: list "Buy {qty} {SYM} at ₹{price}", total, trade-code field, button "Place {k} orders" → `ownerSend('POST', '/owner/orders', { pin, orders })` with a fresh `crypto.randomUUID()` per row.
- Step 3: per row a tick or cross with the broker's message; stop result under it; Done → `onDone(true)`.
- Errors (403, 400, 429): show the message, clear the code field, stay on step 2.
- `calls.js`: button on the "Buy today" heading when it has ≥ 2 calls not already held: "Buy all {k}".

### Accept (no real orders)

Wrong code → 403 and no new `order_log` rows. 6 orders → 400. Duplicate symbol → 400. Total above cash → 400. Unknown broker → 400. The single-order path still behaves as before.

---

## 4. Deploy checklist (each release)

1. Server files: copy down → edit → `python3 -m py_compile` → show the diff → **owner approval** → backup → upload → `systemctl restart quantsync-api` → `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/owner/follow` prints `404` (no token).
2. Run `venv/bin/python3 scripts/edge_build.py daily` once; check the log line.
3. New cron lines: show them, **owner approval**, append; keep the old crontab in the backup folder.
4. Frontend: test with the phase 0 fixture → commit → **owner approval** → push `main` → check each new file returns 200 on `https://rsitradingplatform.vercel.app/rahul/`.
5. Report what was tested and what was not. Real orders are never tested by the coder.

## 5. Not to be built

Grades or gates by call type · hiding or folding any call · cash-based greying of calls · time-based exits · move-stop-to-entry rules · a "may be called soon" list from Patterns · any order without the trade code · any automatic order.
