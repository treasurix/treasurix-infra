# Treasurix Web (`apps/web`)

Next.js app for **hosted checkout**, **merchant dashboard**, **treasury** (Cloak on Solana devnet), **API keys**, and webhooks.

This package is **`private`** in npm terms — it is meant to be deployed (e.g. Vercel), not published as a library. See [`packages/treasurix-checkout-sdk`](../packages/treasurix-checkout-sdk) for the server SDK consumers install from npm.

## Requirements

- **Node.js ≥ 20.9** (see repo root [`.nvmrc`](../.nvmrc); Node **22** or **20** LTS recommended)
- **npm**, **pnpm**, **yarn**, or **Bun** for installs
- PostgreSQL ([Neon](https://neon.tech) works)
- [Privy](https://dashboard.privy.io) app (App ID + secret)

## Node & package managers

Check Node:

```bash
node -v   # v20.9+ or v22.x
```

Using **nvm**:

```bash
cd ..   # monorepo root
nvm use
```

**Bun** (from monorepo root):

```bash
bun install
bun run dev
```

**npm** workspaces — from monorepo root:

```bash
npm install
npm run dev -w web
# or
npm run dev:npm
```

**npm** — only this app:

```bash
cd apps/web
npm install
npm run dev
```

## Setup

From the monorepo root:

```bash
bun install
cd apps/web
cp env.example .env
```

Or with npm from root:

```bash
npm install
cd apps/web && cp env.example .env
```

Edit `.env` — full reference is in [`env.example`](./env.example). Minimum for local dev:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy client |
| `PRIVY_APP_SECRET` | Privy server token verification |
| `NEXT_PUBLIC_APP_URL` | Public origin (emails, checkout URLs) |

Optional:

| Variable | Purpose |
|----------|---------|
| `TREASURIX_API_KEY_PEPPER` | Extra entropy for hashing `trx_live_` merchant API keys |
| `NEXT_PUBLIC_SOLANA_DEVNET_RPC` | Solana RPC override |
| SMTP / Brevo | Email delivery (see `env.example`) |

## Database

```bash
cd apps/web
bun run db:push
```

Or with npm:

```bash
cd apps/web
npm run db:push
```

## Dev

From repo root:

```bash
bun run dev
```

Or from root with npm workspaces:

```bash
npm run dev:npm
```

Or:

```bash
cd apps/web && bun run dev
```

```bash
cd apps/web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Merchant checkout SDK

Server-side integration uses **`treasurix-checkout-sdk`** with:

- `TREASURIX_API_KEY` — dashboard **Developers → API keys** (`trx_live_…`)
- `TREASURIX_ORIGIN` (or legacy `TREASURIX_BASE_URL`) — optional on the merchant server; the SDK defaults to **`https://treasurix.vercel.app`**. Set this when the merchant backend should call **this** app or another origin for `/api/checkout` (e.g. `http://localhost:3000` during local Treasurix development).
- Optional **public checkout URL** per key in the dashboard — where `/pay/…` links open for that key (the SDK reads it from `/api/checkout/sdk-config`).

Docs: [`packages/treasurix-checkout-sdk/README.md`](../packages/treasurix-checkout-sdk/README.md).

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` / `npm run dev` | Next.js dev server |
| `bun run build` / `npm run build` | Prisma generate + production build |
| `bun run start` / `npm run start` | Production server |
| `bun run lint` / `npm run lint` | ESLint |
| `bun run db:push` / `npm run db:push` | Push Prisma schema to DB |
| `bun run db:studio` / `npm run db:studio` | Prisma Studio |

## License

MIT — see [LICENSE](./LICENSE).
