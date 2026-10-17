# QuantSync — Next build plan

Status: **planning only, nothing built yet.** Work top to bottom. Tick items as they land.
Repos: website `RSITradingPlatform` (UI, Vercel) · backend `QuantSync-Phone-VPS` (phone VPS: Lab, intel, DB).

---

## 0. Guiding rule: "read from DB, never compute on request"

Every screen reads **precomputed rows** from the DB. The phone does heavy work only in scheduled jobs.

| Data | How it is served | Refresh |
|---|---|---|
| Live price / CMP / % change | Live (the only on-request data), cached 15–30 s | Market hours |
| Screens board (all 59 cards) | Precomputed table | Every 15 min in market hours + after close |
| X-Ray (overview, filings, price stats, business, owners, peers) | Precomputed per-stock row/JSON | After close (filings: every 15 min) |
| Strategy results, backtests, equity curves | Precomputed | Nightly / weekly |
| News home, briefs, mood line | Precomputed | Every 15 min + 07:00 / 17:00 briefs |
| Market strip (indices, world, commodities, FX) | Precomputed snapshot | 1–5 min in market hours |
| Custom user query | Runs on the in-memory **today snapshot** only (fast) | On request, limited |

Target: every page answers in **< 300 ms**; the phone handles about one request per cache window, not one per visitor.

---

## 1. Backend speed and caching (do first)

### 1.1 Precomputed tables (VPS)
- [ ] `screen_results(screen_id, as_of, rows_json, count)` — all board screens, filled by job `screens`.
- [ ] `xray_cache(symbol, section, as_of, json)` — one row per stock per X-Ray tab.
- [ ] `market_snapshot(key, group, price, chg, chg_pct, spark_json, as_of)` — strip data.
- [ ] `news_home(as_of, json)` — mood line, top 3, three sections with dots.
- [ ] `strategy_results(strategy_id, tier, as_of, stats_json, trades_json, curve_json)`.
- [ ] Each table carries `as_of`; the API returns it so the UI can show "updated 2 min ago".

### 1.2 Jobs (cron, `python -m intel.run <job>` / `lab.cli`)
- [ ] `screens` — every 15 min 09:15–15:30 IST, plus 16:00.
- [ ] `xray` — 16:30 daily for all stocks; filings section every 15 min for changed stocks only.
- [ ] `markets` — every 2 min in Indian hours, every 5 min otherwise.
- [ ] `newshome` — every 15 min.
- [ ] `strategies` — nightly for the free universe, weekly for the full universe.
- [ ] The job lock prevents two runs overlapping; failures keep the last good rows.

### 1.3 In-memory today snapshot (for custom scans)
- [ ] Load the latest row per stock (plus 20 bars of look-back) into memory after each data update.
- [ ] Custom scans run on it: target ~50 ms instead of ~13 s.
- [ ] Full history is only touched by backtests.

### 1.4 API
- [ ] `GET /api/v1/screens/board` → all cards in one response (~30–60 KB, gzip).
- [ ] `GET /api/v1/xray/{symbol}?section=` → from `xray_cache`.
- [ ] `GET /api/v1/markets/strip`, `GET /api/intel2/home`.
- [ ] Reads switch from POST to **GET** so they can be cached.
- [ ] `Cache-Control: s-maxage=…, stale-while-revalidate=…` per endpoint; `ETag`.
- [ ] `Server-Timing` header on every response, so slow parts are visible in DevTools.
- [ ] GZip middleware.

### 1.5 Transport
- [ ] Vercel proxy: pass cache headers through, 15 s upstream timeout, clear error JSON.
- [ ] Replace ngrok free with **Cloudflare Tunnel** (India POPs, no warning page, no cap). Gemini step on the phone. Update `QS_SERVER` in Vercel.
- [ ] Check Vercel plan (Hobby ≈ 10 s function limit).

### 1.6 Frontend data layer
- [ ] Screens: one board request instead of 59 scans.
- [ ] Show the saved copy instantly (localStorage), refresh in background, "updated X ago" label.
- [ ] Per-card scans (custom only) load on scroll, max 2 at a time.
- [ ] 15 s timeout + 1 retry; card shows "Couldn't load — tap to retry".
- [ ] Cancel pending requests on page change (AbortController).

---

## 2. Free vs full: limited universe for strategies and backtests

Keep the phone light until the audience grows; the same switch becomes the pricing tiers later.

### 2.1 Stock flags (in the stock master / history DB)
- [ ] `free_universe` (bool) — ~500 liquid stocks.
- [ ] `universe_tier` (`free` | `full`) — future-proof; can add `pro` later.
- [ ] `liquidity_rank`, `avg_turnover_20d` — stored, so the list is explainable.
- [ ] Selection rule (monthly job `universe`): NIFTY 500 members + top by 3-month median turnover, minimum price ₹20, listed > 1 year. Recompute on the first trading day of each month; keep `added_on` / `removed_on` to avoid survivorship bias in backtests.

### 2.2 How it is used
- [ ] Backtests and strategy library runs: free universe only (≈ 5× less work).
- [ ] Screens board: free universe by default, with a "Showing top 500 liquid stocks" label.
- [ ] X-Ray: available for all stocks (it is precomputed cheaply), heavy extras only for the free universe.
- [ ] Full universe runs weekly (Saturday) so the full data exists for later paid users.

### 2.3 Ready for pricing later (no payment built now)
- [ ] `plans` config: `free` (500 stocks, N custom scans/day, 3 saved strategies, alerts on watchlist ≤ 20) vs `pro` (all stocks, more scans, unlimited strategies, intraday refresh, PDF deep audits).
- [ ] `user.plan` field (default `free`) on the account; API checks limits in one place (`entitlements.py`).
- [ ] UI shows a soft "Pro" badge on locked items instead of hiding them.
- [ ] Rate limit per user/IP for custom scans (e.g. 30/hour free).

---

## 3. Screens page: market strip (Option A)

- [ ] A horizontal heat strip above the search bar, three groups divided by thin lines:
  - **India:** NIFTY 50, BANK NIFTY, MIDCAP, SMALLCAP, INDIA VIX
  - **World:** S&P 500, NASDAQ, DOW, HANG SENG, NIKKEI, FTSE, DAX
  - **Commodities & FX:** DOLLAR INDEX, USD/INR, GOLD, SILVER, CRUDE (Brent)
- [ ] Tile: name, % change, background tinted green→red by size of move.
- [ ] Swipes sideways like the board.
- [ ] Tap a tile → bottom sheet: 1-day sparkline, day high/low, related news.
- [ ] Brief green/red pulse when a value updates.
- [ ] Market closed: grey tiles + "Asia open · US opens in 4h".
- [ ] Move > 1.5% → sheet shows "why it moved" (linked news item).
- [ ] Data from `market_snapshot` only.

---

## 4. News home ("Today")

Order, top to bottom:
- [ ] **Mood line** — one sentence with a dot (e.g. "Mildly positive: FII buying, crude down, US futures flat"). Reuses the strip data.
- [ ] **Top 3 impact stories** — big cards: headline, one line on why it matters, impact score, stock chips → X-Ray.
- [ ] **Indian stocks** — one simple paragraph (Gemma) + 5–6 dotted bullets.
- [ ] **India economy & policy** (RBI, SEBI, govt, rupee, GST, data) — paragraph + dotted bullets.
- [ ] **Global** (Fed, China, oil, wars, tariffs) — paragraph + dotted bullets.
- [ ] Dots: 🟢 positive · 🔴 negative · 🔵 unclear/mixed · hollow ring = your watchlist.
- [ ] Extras (to confirm): "Since you last opened: 4 new · 1 watchlist" strip; "Read in 60 sec" mode.
- [ ] All from `news_home`, built every 15 min.
- [ ] Model: Qwen 2.5 3B for frequent extraction, Qwen 2.5 7B for the 07:00 / 17:00 briefs (test on 20 real filings first).

---

## 5. X-Ray tabs on phone

- [ ] Phone: each tab (Overview, Filings, Price, Business, Owners, Peers) shows only its own section.
- [ ] On switch: remember the old tab's scroll, open the new tab at its top (just under the sticky tab bar).
- [ ] Tapping the current tab scrolls to its top.
- [ ] Tab in the URL (`#price`) so back button and shared links work.
- [ ] Web layout unchanged.
- [ ] Sections read from `xray_cache`.

---

## 6. Build order

1. §1.1–1.4 backend tables, jobs, snapshot, endpoints (VPS repo).
2. §2.1 universe flags + monthly job; switch backtests to free universe.
3. §1.6 frontend data layer + §5 X-Ray tabs.
4. §1.5 Vercel cache headers; Cloudflare Tunnel (Gemini prompt).
5. §3 market strip.
6. §4 news home.
7. §2.3 plan/entitlement scaffolding (no payments).
8. Check: DevTools timings < 300 ms, Screens page one request, all tests pass, phone and web screenshots.

## Open decisions
- [ ] Cloudflare Tunnel instead of ngrok? (free account; own domain optional)
- [ ] Vercel plan: Hobby or Pro?
- [ ] News extras: "since you last opened" and "Read in 60 sec" — yes/no?
- [ ] Free universe size: 500 (default) or another number?
