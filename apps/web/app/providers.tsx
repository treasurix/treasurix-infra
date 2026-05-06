"use client";

import { PrivyProvider, type PrivyClientConfig, type WalletListEntry } from "@privy-io/react-auth";
import { defaultSolanaRpcsPlugin, toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { useMemo, type ReactNode } from "react";

const appIdRaw = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ?? "";
/** Allow CI / local builds without a real Privy app id (Privy throws on invalid strings). */
const appId =
  !appIdRaw || appIdRaw === "placeholder" || appIdRaw === "your-privy-app-id" ? "" : appIdRaw;

/**
 * Stable Solana connector config is required so Wallet Standard listeners stay registered;
 * recreating `toSolanaWalletConnectors()` every render breaks browser extension discovery.
 */
function usePrivySolanaConfig() {
  const solanaWalletConnectors = useMemo(() => toSolanaWalletConnectors(), []);

  return useMemo(
    () => ({
      loginMethods: ["wallet", "email"] as PrivyClientConfig["loginMethods"],
      appearance: {
        theme: "light" as const,
        accentColor: "#6d28d9" as const,
        walletChainType: "solana-only" as const,
        showWalletLoginFirst: true,
        /** Extensions first (Wallet Standard), then named Solana wallets. */
        walletList: [
          "detected_solana_wallets",
          "phantom",
          "solflare",
          "backpack",
        ] as WalletListEntry[],
      },
      embeddedWallets: {
        solana: {
          createOnLogin: "users-without-wallets" as const,
        },
      },
      /** Prefer injected / Wallet Standard; WalletConnect QR competes with extension flows on desktop. */
      externalWallets: {
        walletConnect: { enabled: false },
        solana: {
          connectors: solanaWalletConnectors,
        },
      },
      plugins: [defaultSolanaRpcsPlugin()],
    }),
    [solanaWalletConnectors],
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const config = usePrivySolanaConfig();

  if (!appId) {
    return (
      <>
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          Set <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_PRIVY_APP_ID</code> and{" "}
          <code className="rounded bg-amber-100 px-1">PRIVY_APP_SECRET</code> in{" "}
          <code className="rounded bg-amber-100 px-1">apps/web/.env</code> to enable Privy login.
        </div>
        {children}
      </>
    );
  }

  return (
    <PrivyProvider appId={appId} config={config}>
      {children}
    </PrivyProvider>
  );
}
