# treasurix-checkout-sdk

Server-side TypeScript client for [Treasurix](https://github.com/treasurix/treasurix-infra) hosted checkout. Create payment links that resolve to your merchant account and treasury (same as the dashboard).

**Use only on your backend.** Never expose `trx_live_` API keys in browsers or mobile clients.

## Install

```bash
npm install treasurix-checkout-sdk
```

```bash
bun add treasurix-checkout-sdk
```

```bash
pnpm add treasurix-checkout-sdk
```

## Node.js

- **Required:** Node **≥ 20.9** (global `fetch`; align with repo [`.nvmrc`](../../.nvmrc)).
- `package.json` declares `"engines": { "node": ">=20.9.0" }`.
- **ESM only:** use `import { TreasurixCheckoutClient } from "treasurix-checkout-sdk"` (or dynamic `import()`). CommonJS `require()` is not supported by this package export map.

Check:

```bash
node -v
```

## Develop this package in the monorepo

From repo root:

```bash
npm install
npm run sdk:build:npm
```

Or:

```bash
cd packages/treasurix-checkout-sdk
npm install
npm run build
```

(Bun: `bun run sdk:build:bun` from root, or `cd packages/treasurix-checkout-sdk && bun run build`.)

### Version bumps in this monorepo

If `npm version patch` fails with **`Cannot read properties of null (reading 'matches')`**, npm still may have updated `package.json` before crashing. That error comes from **npm’s arborist** reconciling the workspace tree against **`node_modules/.bun/`** (Bun’s layout).

Bump the SDK version from the **repo root** without triggering that step:

```bash
npm pkg set version=0.1.8 -w treasurix-checkout-sdk
```

Then commit, optionally tag (`git tag treasurix-checkout-sdk-v0.1.8`), run `npm run build -w treasurix-checkout-sdk`, and publish from `packages/treasurix-checkout-sdk` with `npm publish`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TREASURIX_API_KEY` | Yes (typical) | Secret key from the Treasurix dashboard — must start with `trx_live_`. |
| `TREASURIX_ORIGIN` | No* | Origin where Treasurix serves **`/api/checkout`** (scheme + host, no trailing path). **Owner / DevOps** sets this once per deployment so application code only needs `apiKey`. Defaults to `http://localhost:3000` for local Treasurix. |
| `TREASURIX_BASE_URL` | No | Legacy alias for `TREASURIX_ORIGIN`. |

\*In production you should set `TREASURIX_ORIGIN` (or pass `treasurixOrigin` in the constructor) unless Treasurix runs on `localhost:3000`.

### Where pay links point

The **public** URL for `/pay/:slug` is resolved server-side from:

1. **Per–API-key “public checkout URL”** (Treasurix dashboard → API keys), if set  
2. Else **`NEXT_PUBLIC_APP_URL`** on the Treasurix deployment  
3. Else the incoming request origin  

The SDK loads this via **`GET /api/checkout/sdk-config`** (authenticated with your key) before calling checkout APIs, so integrators do not hard-code the pay-page host.

## Example

```typescript
import { TreasurixCheckoutClient } from "treasurix-checkout-sdk";

const client = new TreasurixCheckoutClient({
  apiKey: process.env.TREASURIX_API_KEY!,
  // treasurixOrigin: optional — defaults from TREASURIX_ORIGIN / TREASURIX_BASE_URL / http://localhost:3000
});

const session = await client.createCheckoutSession({
  label: "Invoice #4291",
  amount: "25.00",
  asset: "Mock USDC", // or "SOL"
  customerEmail: "billing@customer.com", // optional
});

// Hosted pay page for the payer (uses owner-configured public base)
console.log(session.checkoutUrl);

// Optional: fail fast on startup
await TreasurixCheckoutClient.create({ apiKey: process.env.TREASURIX_API_KEY! });

// List sessions for this API key’s merchant
const links = await client.listCheckoutSessions();

// Build a pay URL from a slug (async — uses cached public base)
const url = await client.payUrl(session.slug);
```

## API key

Create keys, set optional **public checkout URL** per key, and revoke under **Dashboard → Developers → API keys** on your Treasurix deployment.

## License

MIT — see [LICENSE](./LICENSE).
