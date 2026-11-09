# Test results — 2026-11-09 (local, Node 24, PORT 3000)

Server started clean from a deleted `data/db.json` (seeded demo data).

## Pages (HTTP 200)
- `/`, `/login`, `/dashboard`, `/store-preview`, `/dashboard.js`, `/styles.css`, `/api/health` — all 200.

## Auth
- Register `+234811228700` — ok.
- Login — returned `needVerify: true` + test code (no BOT_TOKEN).
- Verify with that code — ok, JWT cookie issued; `/api/auth/me` returned merchant + store.
- Forgot password — returned test reset code.
- Unauthenticated `GET /api/stats` — 401 (correct).

## Commerce / dashboard flows (all passed)
- Categories: 16 seeded; create TestCat — ok (17 total).
- Create product (Instant, Live, offer 5 USDT) — ok; invalid category ID falls back to first category.
- Add inventory units (bulk, 2 units) — ok.
- Create deposit code (20 USDT) + redeem for demo customer — balance credited.
- Place order via `/api/store/order` (instant) — Delivered, unit `TEST-CODE-1` assigned/consumed, balance deducted. Order IDs unique after counter fix (ORD-1003, ORD-1004).
- Manual product (Notion Business): order → `Pending manual`; approve with no stock → `Needs inventory` (correct); refund → `Refunds`, balance credited back.
- Insufficient funds: qty 5 × 9 USDT for a low-balance customer → `Insufficient funds — top up first`; qty over max → `Quantity must be 1–5`.
- Adjust customer balance (+10, reason) — ok, ledger entry created.
- Payment method add (Cryptomus) — ok.
- Supplier: connect (profit 20%) + import "Supplier VPN" base 10 → 12 USDT, status Draft — ok.
- Broadcast create + send — Completed (test run, `sentViaBot: false` without token).
- Analytics 30d: sales 62.5 USDT, 3 orders, top products/customers listed.
- Languages: 11 returned; Bot Design: 19 buttons, 7 commands.
- Public catalog: 17 categories, 3 live products.

## Bugs found and fixed during testing
1. Seeded orders/transactions collided with ID counters (ORD-1001 / TX-5001 reused) — counters seeded to 1002 / 5003.
2. Product create with an unknown category ID stored it raw — now falls back to the first category.
3. Analytics period buttons re-rendered the default 30d view — now pass the selected period through.

## Not tested live
- Real Telegram bot (no BOT_TOKEN in this environment) — polling code is in place; store preview covers the same flows.
- Real Cryptomus / Binance Pay payments (no credentials) — configuration + Pending-deposit review flow tested.
- Render deploy — `render.yaml` prepared, not deployed (no Render account connected).
