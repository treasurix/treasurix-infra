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

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TREASURIX_API_KEY` | Yes (typical) | Secret key from the Treasurix dashboard — must start with `trx_live_`. |
| `TREASURIX_BASE_URL` | No | Origin of your Treasurix app (e.g. `https://app.example.com`). Defaults to `http://localhost:3000` if unset. You can pass `baseUrl` in the constructor instead. |

## Example

```typescript
import { TreasurixCheckoutClient } from "treasurix-checkout-sdk";

const client = new TreasurixCheckoutClient({
  apiKey: process.env.TREASURIX_API_KEY!,
  baseUrl: process.env.TREASURIX_BASE_URL, // optional if env is set
});

const session = await client.createCheckoutSession({
  label: "Invoice #4291",
  amount: "25.00",
  asset: "Mock USDC", // or "SOL"
  customerEmail: "billing@customer.com", // optional
});

// Hosted pay page for the payer
console.log(session.checkoutUrl);

// List sessions for this API key’s merchant
const links = await client.listCheckoutSessions();
```

## API key

Create and revoke keys under **Dashboard → Developers → API keys** on your Treasurix deployment.

## License

MIT — see [LICENSE](./LICENSE).
