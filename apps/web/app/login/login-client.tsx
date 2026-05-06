"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { privyWalletFirstLogin, privyWalletOrEmailLogin } from "@/lib/privy-login";
import { syncUserWithServer } from "@/lib/auth-sync-client";
import { LoadingOverlay } from "../components/LoadingOverlay";

/** Opens the modal on the Solana wallet tab so Wallet Standard / extension wallets are used first. */
export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const autoLoginStarted = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let cancelled = false;
    (async () => {
      await syncUserWithServer(getAccessToken);
      if (!cancelled) router.replace("/dashboard");
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, router, getAccessToken]);

  useEffect(() => {
    if (!ready || authenticated) return;
    if (searchParams.get("start") !== "1" || autoLoginStarted.current) return;
    autoLoginStarted.current = true;
    void login(privyWalletFirstLogin);
  }, [ready, authenticated, searchParams, login]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-subtext">
        Loading…
      </div>
    );
  }

  if (authenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
        <LoadingOverlay />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
      <h1 className="font-display text-3xl font-medium text-ink">Log in to Treasurix</h1>
      <p className="mt-3 max-w-md text-center text-sm text-subtext">
        Use a browser extension (e.g. Phantom) or another Solana wallet detected on this page. Email
        sign-in is available if you prefer.
      </p>
      <button
        type="button"
        onClick={() => login(privyWalletOrEmailLogin)}
        className="mt-10 rounded-full bg-accent px-10 py-3.5 text-sm font-semibold text-white shadow-lift"
      >
        Connect wallet
      </button>
      <button
        type="button"
        onClick={() => login({ loginMethods: ["email"] })}
        className="mt-4 text-sm font-medium text-accent hover:underline"
      >
        Continue with email instead
      </button>
      <Link href="/" className="mt-8 text-sm text-subtext hover:text-ink">
        ← Back to home
      </Link>
    </div>
  );
}
