# PixelShop — Telegram Store Dashboard (replica)

Original code, inspired by the layout/functionality of GG Builder. No GG Builder
assets, text, images or branding were copied. Seeded demo store name is
"PixelShop", the store the user already owns.

## What it is

- Public landing page (`/`) — hero, product cards, 3 steps, FAQ.
- Merchant dashboard (`/dashboard`, dark theme, purple accent) — Home,
  Customers, Catalog, Inventory, Orders, Analytics, Settings, Languages,
  Bot Design, Broadcast, Payment methods, Transactions, Deposit codes,
  Store guide, Notifications.
- Telegram store bot (real, via Telegram Bot API fetch polling) — browse
  categories → products → quantity → review → confirm (wallet payment,
  instant inventory delivery or manual pending), profile, wallet, deposits,
  deposit-code redeem, referrals/help/policy.
- Web store preview (`/store-preview`) — the same commerce flow in-browser,
  no Telegram token needed.
- Wallet/ledger — every deposit, purchase, refund and balance adjustment is
  a ledger transaction; deposits can be Pending → Approve/Reject.

## Run locally

```bash
cd ggbuilder-replica
npm install
cp .env.example .env   # set JWT_SECRET, and BOT_TOKEN if you have a bot
npm start              # http://localhost:3000
```

First run seeds demo data: store PixelShop (DRAFT), 16 categories,
11 languages, 2 demo customers, 3 demo products (ChatGPT Plus 1m,
Lovable Pro 12m, Notion Business), inventory units, 2 demo orders,
demo deposits, deposit code `PIXEL-10` (10 USDT).

Register a merchant account at `/login` (phone + password), then sign in —
a 6-digit verification code is required. With no `BOT_TOKEN` set, the code
is shown on the verify page in a clearly-labelled test notice and logged
server-side. With a bot token and an operator Telegram ID in Settings, the
code is sent via Telegram instead.

## Deploy on Render (temporary test deploy)

1. Push this folder to a GitHub repo (do **not** commit `data/` or `.env`).
2. In Render: **New → Web Service → Build and deploy from a Git repo**,
   pick the repo. Render detects `render.yaml` (Node 20, `npm install`,
   `npm start`).
3. Set environment variables in Render:
   - `JWT_SECRET` — generated automatically by `render.yaml`
   - `BOT_TOKEN` — optional; from @BotFather. Without it the bot shows
     Disconnected and the dashboard + store preview still work fully.
4. Deploy. Open the service URL → `/login` → register → sign in.
   Note: the free Render service has an ephemeral filesystem, so demo data
   in `data/db.json` resets on redeploy/restart. That is fine for a
   temporary test; for a permanent deploy, add a Render Postgres database
   and swap the JSON store for it.

## What needs real credentials to go live

- `BOT_TOKEN` from @BotFather for the real store bot (polling is already
  implemented; set the token and restart).
- Cryptomus Merchant UUID + API key (Payment methods → Cryptomus setup)
  for live crypto checkout; Binance Pay API credentials for live Binance Pay.
- A real Telegram operator ID in Settings for verification codes via bot.

## Intentionally simplified vs the original

- Auth is phone + password + 6-digit code on the web (the original creates
  accounts inside its Telegram bot first); web registration is allowed here
  for testing.
- Verification codes are shown in a test notice when no bot is connected.
- Supplier catalog is a mock "GGsoma" card (connect + profit % + import);
  no real supplier API is wired.
- Broadcast image upload accepts a URL (no file storage on the free tier).
- Payment methods record configuration and create Pending deposits for
  merchant review; no live crypto payment is processed without the
  credentials above.
- The dashboard is a single-page app with vanilla JS; the original is a
  larger multi-page app, but every sidebar page and workflow listed in
  the spec is implemented and working.

## Test results

See `TESTS.md` — all API flows were curl-tested on 2026-11-09, including
register/login/verify, catalog, inventory, deposit codes, orders
(instant + manual + refund + insufficient funds), balance adjustment,
payment methods, broadcast, analytics, and unauthenticated 401s.
