# Treasurix

Treasurix is a **self-hosted** stack for **Solana devnet** payments and treasury: hosted checkout pages, a merchant dashboard, **Cloak**-backed treasury flows, **API keys** for server integrations, and optional email / webhook hooks. This repository ships the deployable **Next.js** app and the publishable **`treasurix-checkout-sdk`** npm package so merchants can create payment links from their own backends without exposing secrets in the browser.

## What Treasurix offers

| Area | Description |
|------|-------------|
| **Hosted checkout** | Payers open a Treasurix-hosted `/pay/:slug` page. You create links from the dashboard or via API using a `trx_live_` key. Amounts use decimal strings; supported assets on devnet include **SOL** and **Mock USDC** (see SDK types). |
| **Merchant dashboard** | Sign in (Privy), manage checkout links, see activity aligned with your merchant account. |
| **Treasury** | Treasury state and withdrawals integrate with **Cloak** on **Solana devnet** for private / shielded-style flows in development. |
| **Developers → API keys** | Issue, revoke, and optionally set a **public checkout URL** per key so hosted pay links resolve to the right origin (CDN, custom domain, or `NEXT_PUBLIC_APP_URL`). Keys are hashed at rest; use a pepper in production (`TREASURIX_API_KEY_PEPPER`). |
| **`treasurix-checkout-sdk`** | **Server-only** TypeScript client (ESM). Creates sessions, lists sessions, and resolves pay URLs by calling Treasurix’s `/api/checkout` and `/api/checkout/sdk-config`. |

**Important:** Never put `trx_live_` keys in frontends or mobile apps. Only your server should call the SDK or Treasurix checkout APIs with `Authorization: Bearer …`.

## Architecture at a glance

```text
┌─────────────────────┐     Bearer trx_live_      ┌──────────────────────────┐
│  Merchant backend   │ ────────────────────────► │  Treasurix (Next.js)     │
│  + checkout SDK     │     /api/checkout,        │  Postgres · Privy ·      │
└─────────────────────┘     /api/checkout/        │  Solana devnet / Cloak   │
         │                  sdk-config            └───────────┬──────────────┘
         │                                                    │
         └──────── redirect / email payer ───────────────────►│  Hosted /pay/:slug
```

- **Treasurix app** (`apps/web`): Next.js, Prisma + PostgreSQL, Privy auth.
- **SDK** (`packages/treasurix-checkout-sdk`): thin `fetch` client; `TREASURIX_ORIGIN` (or constructor option) points at wherever Treasurix serves `/api/checkout`.

## Monorepo layout

| Path | Role |
|------|------|
| [`apps/web`](./apps/web) | Next.js application — env vars, DB, scripts: [apps/web/README.md](./apps/web/README.md) |
| [`packages/treasurix-checkout-sdk`](./packages/treasurix-checkout-sdk) | Published npm library — API and env reference: [packages/treasurix-checkout-sdk/README.md](./packages/treasurix-checkout-sdk/README.md) |

Root scripts delegate to the web app and SDK workspaces (see [`package.json`](./package.json)).

## Requirements

- **Node.js ≥ 20.9** (LTS **22** or **20** recommended). Lock locally with [nvm](https://github.com/nvm-sh/nvm) (`nvm use` reads [`.nvmrc`](./.nvmrc)) or [fnm](https://github.com/Schniz/fnm).

```bash
node -v   # expect v20.9+ or v22.x
```

Running Treasurix itself also needs **PostgreSQL** (e.g. [Neon](https://neon.tech)) and a **[Privy](https://dashboard.privy.io)** app (App ID + secret). Full variable list: [`apps/web/env.example`](./apps/web/env.example).

## Install and run

### Bun (default for root scripts)

```bash
bun install
bun run dev          # Next.js in apps/web
```

### npm (workspaces)

From the repo root:

```bash
npm install
npm run dev:npm      # same as: npm run dev -w web
npm run build:npm
npm run lint:npm
```

Build the SDK from root:

```bash
npm run sdk:build:npm
```

### First-time setup (web app)

```bash
cd apps/web
cp env.example .env
# Edit .env: DATABASE_URL, NEXT_PUBLIC_PRIVY_APP_ID, PRIVY_APP_SECRET, NEXT_PUBLIC_APP_URL, …
bun run db:push      # or: npm run db:push
bun run dev          # open http://localhost:3000
```

Per-package npm details for web and SDK remain in the linked READMEs above.

## Example: create a checkout session from your server

Install the SDK on the merchant service:

```bash
npm install treasurix-checkout-sdk
```

Set **`TREASURIX_API_KEY`** to a dashboard key (`trx_live_…`) and **`TREASURIX_ORIGIN`** to the origin where Treasurix is deployed (e.g. `https://checkout.yourcompany.com`), so application code only passes the key.

```typescript
import { TreasurixCheckoutClient } from "treasurix-checkout-sdk";

const client = new TreasurixCheckoutClient({
  apiKey: process.env.TREASURIX_API_KEY!,
  // treasurixOrigin optional if TREASURIX_ORIGIN is set on this host
});

const session = await client.createCheckoutSession({
  label: "Order #1042",
  amount: "12.50",
  asset: "Mock USDC",
  customerEmail: "payer@example.com", // optional
});

// Send this URL to the payer (email, SMS, redirect after order creation)
console.log(session.checkoutUrl);
```

Optional: validate configuration at startup with `TreasurixCheckoutClient.create({ apiKey: … })`. List links with `client.listCheckoutSessions()` and build URLs with `await client.payUrl(session.slug)`. Full options, env table, and ESM notes: [packages/treasurix-checkout-sdk/README.md](./packages/treasurix-checkout-sdk/README.md).

## License

MIT — see [apps/web/LICENSE](./apps/web/LICENSE) and [packages/treasurix-checkout-sdk/LICENSE](./packages/treasurix-checkout-sdk/LICENSE).
