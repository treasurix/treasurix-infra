"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useMemo } from "react";
import { syncUserWithServer } from "@/lib/auth-sync-client";

function solanaWalletFromUser(
  user: NonNullable<ReturnType<typeof usePrivy>["user"]>,
): string | null {
  for (const acc of user.linkedAccounts ?? []) {
    if (acc.type === "wallet" && "address" in acc && "chainType" in acc) {
      const ct = (acc as { chainType?: string }).chainType;
      if (ct === "solana") return (acc as { address: string }).address;
    }
  }
  return null;
}

/**
 * Keeps Neon in sync with Privy: runs after authentication and whenever linked email / Solana
 * wallet changes. Server always re-fetches the latest profile from Privy.
 */
export function AuthSync() {
  const { authenticated, ready, getAccessToken, user } = usePrivy();

  const authKey = useMemo(() => {
    if (!authenticated) return null;
    if (!user?.id) return "pending";
    return `${user.id}:${user.email?.address ?? ""}:${solanaWalletFromUser(user) ?? ""}`;
  }, [authenticated, user]);

  useEffect(() => {
    if (!ready || !authenticated || !authKey) return;

    let cancelled = false;

    (async () => {
      try {
        let ok = await syncUserWithServer(getAccessToken);
        if (!ok && !cancelled) {
          await new Promise((r) => setTimeout(r, 450));
          if (!cancelled) ok = await syncUserWithServer(getAccessToken);
        }
      } catch {
        // Non-fatal
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticated, ready, authKey, getAccessToken]);

  return null;
}
