# Treasurix

Private **Solana devnet** checkout, treasury, and merchant dashboard. Settlement and treasury shielding go through the **Cloak** protocol; merchants integrate checkout from their servers with **`treasurix-checkout-sdk`**.

## Live demo and source

| | |
|--|--|
| **Public repository** | [github.com/treasurix/treasurix-infra](https://github.com/treasurix/treasurix-infra) — full project code (Next.js app, SDK, configs). |
| **Live deployment** | [https://treasurix.vercel.app](https://treasurix.vercel.app). |

**Suggested entry points after deploy or locally:** `/` (landing), `/pay/<slug>` (hosted checkout), `/dashboard` (requires [Privy](https://privy.io) sign-in).

---

## The problem and who this is for

**Problem:** Teams that want **business-grade checkout and treasury** on Solana often face a gap between “public ledger transfers” and **private settlement**: invoice and payroll semantics live in product databases, but moving value without exposing every counterparty and amount on-chain is hard. Treasurix combines **hosted payment links**, a **dashboard**, and **shielded treasury flows** so operators can run checkout and treasury in one place while routing sensitive settlement through Cloak’s devnet stack.

**Who it’s for:**

- **Merchants / operators** who need branded or API-driven checkout and a unified view of links and treasury.
- **Developers** who call Treasurix from a **backend only** with `trx_live_` API keys and the published SDK (keys never ship to browsers).
- **Hackathon / review contexts** where a runnable Next.js app plus documented **Cloak devnet** program IDs and relay matter for verification.

---

## How the Cloak SDK is used and why it’s central

Treasurix is not “Solana transfers only”: **value movement for shielding and treasury uses `@cloak.dev/sdk-devnet`**. That package supplies the **devnet program id**, **relay URL**, UTXO helpers, and `transact` entry points; the app wires them to Privy-connected wallets and persisted treasury state.

**Why Cloak is central**

- **Privacy posture:** Checkout and treasury flows that shield into Cloak move balances into the **Cloak shield pool** with Groth16-style proving (devnet), instead of only posting simple SPL transfers.
- **Single product story:** Landing, checkout, and treasury UI all describe settlement through Cloak; email copy references shielded settlement where applicable.

**How the SDK is used in this repo (browser, dynamic import)**

Client components load the SDK with `import("@cloak.dev/sdk-devnet")` so heavy crypto loads on demand. Typical building blocks:

| SDK surface | Role in Treasurix |
|-------------|-------------------|
| `CLOAK_PROGRAM_ID` | Passed to `transact` as `programId` (matches documented devnet program below). |
| `transact(...)` | Submits shield / transfer flows to Solana devnet via the Cloak relay. |
| `createUtxo`, `createZeroUtxo`, `generateUtxoKeypair` | Build outputs and padding notes for circuits (e.g. mock USDC requires zero UTXO matching output mint). |
| `getNkFromUtxoPrivateKey` | Derives viewing-key material for treasury owner keys. |
| `registerViewingKey` | Registers payer viewing keys with the relay where required (hosted checkout path). |
| `NATIVE_SOL_MINT`, `DEVNET_MOCK_USDC_MINT` | Asset selection for SOL vs devnet mock USDC. |

**Where it appears in the app**

- **Hosted checkout** ([`PaymentCheckout.tsx`](./apps/web/app/components/PaymentCheckout.tsx)): payer wallet + Cloak `transact` path for paying a `/pay/:slug` link.
- **Dashboard checkout / shield** ([`CheckoutConsole.tsx`](./apps/web/app/components/CheckoutConsole.tsx)): merchant-side shield of checkout proceeds toward treasury private balance.
- **Treasury pool** ([`TreasuryPoolDashboard.tsx`](./apps/web/app/components/TreasuryPoolDashboard.tsx), [`TreasuryCloakDevnetPanel.tsx`](./apps/web/app/components/TreasuryCloakDevnetPanel.tsx)): deposits and ledger-alignment shields using the same `transact` + relay pattern.
- **Persisted treasury keys / UTXO wallet** ([`treasurix-treasury-cloak-wallet.ts`](./apps/web/lib/treasurix-treasury-cloak-wallet.ts), [`/api/treasury/cloak-state`](./apps/web/app/api/treasury/cloak-state/route.ts)): server-backed storage of treasury Cloak material (authenticated with Privy), so the dashboard can reload shielded state safely.

Relay URL and program id used in UI and docs are centralized in [`apps/web/lib/cloak-devnet-reference.ts`](./apps/web/lib/cloak-devnet-reference.ts) (aligned with the SDK’s devnet defaults).

---

## Solana devnet: program IDs, relay, and explorers

These are the **Cloak devnet** and related addresses Treasurix uses (see [`cloak-devnet-reference.ts`](./apps/web/lib/cloak-devnet-reference.ts)).

| Item | Value |
|------|--------|
| **Cloak program (devnet)** | `Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h` — [Solscan (devnet)](https://solscan.io/account/Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h?cluster=devnet) |
| **Cloak relay** | `https://api.devnet.cloak.ag` |
| **Default Solana RPC** | `https://api.devnet.solana.com` (override with `NEXT_PUBLIC_SOLANA_DEVNET_RPC`) |
| **Native SOL mint (convention)** | `So11111111111111111111111111111111111111112` |
| **Devnet mock USDC (6 decimals)** | `61ro7AExqfk4dZYoCyRzTahahCC2TdUUZ4M5epMPunJf` — mint test USDC from the [Cloak devnet faucet](https://devnet.cloak.ag/privacy/faucet) when testing USDC paths |

---

## Setup and run

For **judges:** if no live URL is listed above, follow these steps and open `http://localhost:3000`.

**Prerequisites:** Node **≥ 20.9**, PostgreSQL ([Neon](https://neon.tech) is fine), a [Privy](https://dashboard.privy.io) application (App ID + App Secret).

1. **Clone and install** (from repo root)

   ```bash
   git clone https://github.com/treasurix/treasurix-infra.git
   cd treasurix-infra
   ```

   With **Bun** (root default):

   ```bash
   bun install
   ```

   Or **npm** workspaces:

   ```bash
   npm install
   ```

2. **Configure the web app**

   ```bash
   cd apps/web
   cp env.example .env
   ```

   Edit `.env` at minimum ([full reference](./apps/web/env.example)):

   | Variable | Purpose |
   |----------|---------|
   | `DATABASE_URL` | Postgres connection string |
   | `NEXT_PUBLIC_PRIVY_APP_ID` | Privy client identifier |
   | `PRIVY_APP_SECRET` | Privy server secret |
   | `NEXT_PUBLIC_APP_URL` | e.g. `http://localhost:3000` for local checkout links |

3. **Apply database schema**

   ```bash
   cd apps/web
   bun run db:push
   # or: npm run db:push
   ```

4. **Run Next.js**

   From **monorepo root**:

   ```bash
   bun run dev
   # or: npm run dev:npm
   ```

   Or from `apps/web`: `bun run dev` / `npm run dev`.

5. **Open** [http://localhost:3000](http://localhost:3000). Sign in with Privy, connect a **Solana devnet** wallet, fund SOL (and mock USDC via Cloak faucet if testing USDC).

**Build SDK (optional, for packaging):** from root, `npm run sdk:build:npm` or `bun run sdk:build:bun`. Consumer docs: [packages/treasurix-checkout-sdk/README.md](./packages/treasurix-checkout-sdk/README.md).

**Deploy (e.g. Vercel):** set Vercel **Root Directory** to `apps/web`, add the same env vars in the dashboard, set `NEXT_PUBLIC_APP_URL` to your production HTTPS origin, run `prisma db push` (or migrate deploy) once against production Postgres from your machine, and add your deployment URL to the [live demo](#live-demo-and-source) table at the top of this README.

---

## What Treasurix offers (feature summary)

| Area | Description |
|------|-------------|
| **Hosted checkout** | Payers use `/pay/:slug`. Links are created in the dashboard or via API with a `trx_live_` key. Assets on devnet: **SOL**, **Mock USDC**. |
| **Merchant dashboard** | Privy auth, checkout, treasury pool, API keys, settings. |
| **Treasury** | Cloak-backed shielding and pool views on **Solana devnet**. |
| **API keys** | Dashboard **Developers → API keys**; optional per-key public checkout base URL; keys hashed at rest (`TREASURIX_API_KEY_PEPPER` recommended in production). |
| **`treasurix-checkout-sdk`** | Server-only ESM client for `POST/GET /api/checkout` and sdk-config. Never expose `trx_live_` in the browser. |

**Architecture**

```text
┌─────────────────────┐     Bearer trx_live_      ┌──────────────────────────┐
│  Merchant backend   │ ────────────────────────► │  Treasurix (Next.js)     │
│  + checkout SDK     │     /api/checkout,        │  Postgres · Privy ·      │
└─────────────────────┘     /api/checkout/        │  Solana devnet / Cloak   │
         │                  sdk-config            └───────────┬──────────────┘
         │                                                    │
         └──────── redirect / email payer ───────────────────►│  Hosted /pay/:slug
```

---

## Monorepo layout

| Path | Role |
|------|------|
| [`apps/web`](./apps/web) | Next.js app — [apps/web/README.md](./apps/web/README.md) |
| [`packages/treasurix-checkout-sdk`](./packages/treasurix-checkout-sdk) | Publishable npm SDK — [package README](./packages/treasurix-checkout-sdk/README.md) |

---

## Example: create a checkout session from your server

```bash
npm install treasurix-checkout-sdk
```

```typescript
import { TreasurixCheckoutClient } from "treasurix-checkout-sdk";

const client = new TreasurixCheckoutClient({
  apiKey: process.env.TREASURIX_API_KEY!,
});

const session = await client.createCheckoutSession({
  label: "Order #1042",
  amount: "12.50",
  asset: "Mock USDC",
  customerEmail: "payer@example.com",
});

console.log(session.checkoutUrl);
```

Set `TREASURIX_ORIGIN` only when your backend should not use the default hosted API at `https://treasurix.vercel.app` (e.g. self-hosted Treasurix or `http://localhost:3000` for local dev). Details: [packages/treasurix-checkout-sdk/README.md](./packages/treasurix-checkout-sdk/README.md).

---

## License

MIT — [apps/web/LICENSE](./apps/web/LICENSE), [packages/treasurix-checkout-sdk/LICENSE](./packages/treasurix-checkout-sdk/LICENSE).
