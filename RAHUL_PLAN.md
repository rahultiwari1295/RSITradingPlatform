# /rahul — plan, version 2

15 Nov 2026. Nothing here is built yet. The full coding detail is in `RAHUL_IMPLEMENTATION_SPEC.md`.

## What the tests decided

| Idea | Result | In the plan? |
|---|---|---|
| Most profit comes from about 1 call in 10 | Holds | Yes: show every call, track skipped calls |
| Follow the AI exit | Holds (stocks did nothing after exits) | Yes |
| Do not buy an open call that is below its entry | Holds in both periods (27% and 30% won) | Yes |
| Grades or a gate by call type | Failed the blind test (C beat A afterwards) | No |
| "Already ran" calls are bad | Weak; they still won 47–60% | Label only |
| Sell early if below entry; move stop to entry | No gain | No |
| Patterns page predicts calls | 0 of 213 "near" rows became a call in 14 days (7 weeks of history) | Moved under More |
| Market gauge sizes | Not blind-tested | Shown as information only |

## Your decisions

- Every call is shown. No cash limit.
- News is the home page.
- Trade-book import for the follow tracker.
- No coding until you say so.

## Phases

| Release | Phase | What you get | Needs from you |
|---|---|---|---|
| A | 0 | Fake-data test set-up (not visible on the site) | — |
| A | 1 | News as home with a "2 to sell · 3 new calls" strip; tabs News, Calls, Portfolio, More; no big headlines | — |
| A | 2 | Calls page: Sell card, then "Buy today", "Still open to buy", "Below entry"; Buy buttons on the cards | — |
| B | 3 | "Did you follow the AI" tracker, with import of your broker trade-book file | One export file from each broker; approve deploy, 2 tables, 1 cron job |
| B | 4 | Portfolio header (AI part vs non-AI part) and clean-up list for non-AI holdings | — |
| C | 5 | Live-only track record, call-type table (information), real fill prices | Approve deploy and 1 cron job |
| C | 6 | Weekly report | Approve 1 cron job; private Telegram chat if you want it sent |
| C | 7 | Fixes: SILVERBEES price, phantom activity rows, four others | — |
| D | 8 | Buy several calls with one trade code | Blocked until you place one order and one stop-loss yourself |

## Known limits

- The clean-up groups in phase 4 are my judgement, not a tested rule. The page will say so.
- Broker trade-book and stop-loss requests are written from memory of the brokers' formats and must be checked against their documentation.
- The trade-book file column names are a starting list. The importer needs one real file from each broker to be tested.
- The Patterns finding rests on 7 weeks of history.

## Status, 15 Nov 2026

- Release A, B, C and D are built and deployed. Server files are in `tools/server-files/release-b` and `release-c`.
- Phase 7 findings:
  - SILVERBEES: the price (168.76) matches Angel, the quote feed and the price history, and the average 268.85 is a price the ETF really traded at. The -37% is real; the exactly 100 gap is a coincidence. No fix needed.
  - Angel cash: the funds call failed with "Invalid Token" because it did not log in again like the holdings call does. Fixed; it now returns the real balance.
  - 65 closed calls have an entry price more than 3% from that day's close (`tools/reports/entry_price_check.csv`): 42 are plausible intraday entries, 2 look like split adjustments, 21 are entries outside the day's low-to-high range (mostly Gap and Breakout entries below the day's low, which could not have been bought, plus 4 BHAGYANGR rows with unadjusted prices).
  - The +1.5% exits: V2 moves its stop to entry +1.5% once the price touches +5%, so a fall back gives exactly +1.5%. 42 of 378 calls ended this way.
  - Phantom activity rows: not changed. Angel, Kite and Dhan holdings already include the T+1 quantity, and deleting buy/sell pairs could hide real quick trades. The follow tracker ignores such pairs only when it has no better evidence.
  - Live-quote volume and day-low errors: could not reproduce with the market closed; the table is clean (9 of 2,741 rows have zero volume, none has a low above the price).
- Not yet verified against real broker data: the trade-fills reader for Angel (field names not in a page I could read), the trade-book import on real files, stop-loss orders on all brokers, basket orders.
