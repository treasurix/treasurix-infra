# Treasurix

Treasurix is a **self-hostable** stack for **Solana devnet** payments and treasury workflows using **Cloak**. It ships as a **Next.js** web application plus a **publishable npm package** (`treasurix-checkout-sdk`) so merchants can create hosted checkout links from their own backends.

Use it when you want a single deployment that combines **hosted pay pages**, a **merchant dashboard**, **treasury** views, **API keys** for server integrations, and optional **email / webhook** hooks — without exposing secret keys in the browser.

## What Treasurix offers

| Area | Description |
|------|-------------|
| **Hosted checkout** | Payers open a Treasurix-hosted URL (`/pay/:slug`) for a link you create. Amounts use decimal strings; supported assets on devnet include **SOL** and **Mock USDC** (see SDK types). |
| **Merchant dashboard** | Sign-in (Privy), overview, and tools aligned with your deployment — including **Developers → API keys** for `trx_live_…` secrets. |
| **Treasury (Cloak)** | Treasury state and flows tied to Solana **devnet** and Cloak’s devnet relay (configurable RPC). |
| **Server SDK** | **`treasurix-checkout-sdk`** — ESM-only TypeScript client: create sessions, list links, resolve pay URLs. **Never** put `trx_live_` keys in frontend code. |
| **Per-key checkout base** | Each API key can set an optional **public checkout URL** so pay links use your chosen host; otherwise the app uses `NEXT_PUBLIC_APP_URL` or the request origin (see SDK `sdk-config` behavior). |
| **Data layer** | **PostgreSQL** (e.g. Neon) with **Prisma**; users, organizations, checkout links, API keys, treasury-related models. |

**Typical flow:** you deploy `apps/web`, configure env (database, Privy, public URL), create an API key in the dashboard, then from **your** server you call the SDK with `TREASURIX_API_KEY` and `TREASURIX_ORIGIN` pointing at **your** Treasurix deployment’s `/api/checkout`.

## Architecture (monorepo)

```
treasurix-infra/
├── apps/web/                      # Next.js — private deployable app
└── packages/treasurix-checkout-sdk/   # npm library for merchant servers
```

- **`apps/web`** — Next.js app: checkout UI, dashboard, APIs (`/api/checkout`, `/api/checkout/sdk-config`, etc.). Not published to npm; deploy to Vercel or similar.
- **`treasurix-checkout-sdk`** — Server-only client; published or vendored from `packages/treasurix-checkout-sdk`.

Detailed setup, env tables, and scripts: [apps/web/README.md](./apps/web/README.md). SDK install, env vars, and API notes: [packages/treasurix-checkout-sdk/README.md](./packages/treasurix-checkout-sdk/README.md).

## Node.js

- **Required:** Node **≥ 20.9** (LTS **22** or **20** recommended).
- Lock locally with [nvm](https://github.com/nvm-sh/nvm): `nvm use` (reads [`.nvmrc`](./.nvmrc)) or [fnm](https://github.com/Schniz/fnm).

```bash
node -v   # should be v20.9+ or v22.x
```

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

### Per-package with npm

**Web app:**

```bash
cd apps/web
npm install
cp env.example .env
npm run db:push
npm run dev
```

**Checkout SDK (library):**

```bash
cd packages/treasurix-checkout-sdk
npm install
npm run build
```

Open the app at [http://localhost:3000](http://localhost:3000) after `dev` (unless you override the port).

## Example: create a checkout session from your server

Install the SDK on **your** backend (or use the workspace package while developing):

```bash
npm install treasurix-checkout-sdk
```

Set environment variables on the merchant server:

- `TREASURIX_API_KEY` — secret from Treasurix **Dashboard → Developers → API keys** (`trx_live_…`).
- `TREASURIX_ORIGIN` — origin where **your** Treasurix app serves `/api/checkout` (e.g. `https://pay.yourcompany.com`), no trailing slash.

```typescript
import { TreasurixCheckoutClient } from "treasurix-checkout-sdk";

const client = new TreasurixCheckoutClient({
  apiKey: process.env.TREASURIX_API_KEY!,
  // treasurixOrigin optional if TREASURIX_ORIGIN is set
});

const session = await client.createCheckoutSession({
  label: "Invoice #4291",
  amount: "25.00",
  asset: "Mock USDC", // or "SOL"
  customerEmail: "billing@customer.com", // optional
});

// Send this URL to the payer (host comes from dashboard / NEXT_PUBLIC_APP_URL / sdk-config)
console.log(session.checkoutUrl);
```

Optional: validate configuration at startup:

```typescript
await TreasurixCheckoutClient.create({ apiKey: process.env.TREASURIX_API_KEY! });
```

List sessions or build a pay URL from a slug:

```typescript
const links = await client.listCheckoutSessions();
const url = await client.payUrl(session.slug);
```

The SDK is **ESM-only** (use `import` / dynamic `import()`, not `require`). Full tables for `TREASURIX_ORIGIN` vs per-key public checkout URL: [packages/treasurix-checkout-sdk/README.md](./packages/treasurix-checkout-sdk/README.md).

## Layout

| Path | Role |
|------|------|
| [`apps/web`](./apps/web) | Next.js app — [README](./apps/web/README.md), [`env.example`](./apps/web/env.example) |
| [`packages/treasurix-checkout-sdk`](./packages/treasurix-checkout-sdk) | npm package — [README](./packages/treasurix-checkout-sdk/README.md) |

## License

MIT — see [apps/web/LICENSE](./apps/web/LICENSE) and [packages/treasurix-checkout-sdk/LICENSE](./packages/treasurix-checkout-sdk/LICENSE).
