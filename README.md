# Treasurix (monorepo)

Private checkout, treasury, and dashboard on **Next.js** + **Solana devnet** (Cloak). Includes the publishable **`treasurix-checkout-sdk`** package.

## Node.js

- **Required:** Node **≥ 20.9** (LTS **22** or **20** recommended).
- Lock the version locally with [nvm](https://github.com/nvm-sh/nvm): `nvm use` (reads [`.nvmrc`](./.nvmrc)) or [fnm](https://github.com/Schniz/fnm).

```bash
node -v   # should be v20.9+ or v22.x
```

## Install & run (pick one package manager)

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

## Layout

| Path | Role |
|------|------|
| [`apps/web`](./apps/web) | Next.js app — see its [README](./apps/web/README.md) |
| [`packages/treasurix-checkout-sdk`](./packages/treasurix-checkout-sdk) | npm package — see its [README](./packages/treasurix-checkout-sdk/README.md) |

## License

MIT — see [apps/web/LICENSE](./apps/web/LICENSE) and [packages/treasurix-checkout-sdk/LICENSE](./packages/treasurix-checkout-sdk/LICENSE).
