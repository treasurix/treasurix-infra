"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { TreasurixMark } from "./TreasurixMark";
import { ThemeToggle } from "./ThemeToggle";
import { LoadingOverlay } from "./LoadingOverlay";
import { privyWalletOrEmailLogin } from "@/lib/privy-login";

const links = [
  { href: "#product", label: "Product" },
  { href: "#developers", label: "Developers" },
  { href: "#how", label: "Infrastructure" },
  { href: "#pricing", label: "Pricing" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { authenticated, login } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleAuth = useCallback(async () => {
    if (authenticated) {
      router.push("/dashboard");
      return;
    }
    setIsAuthenticating(true);
    try {
      await login(privyWalletOrEmailLogin);
      // login doesn't return a promise that waits for complete auth in some versions of privy, 
      // but usually the page will redirect or we can handle it in a useEffect.
      // For now, we'll keep the overlay until navigation.
    } catch (err) {
      console.error("Auth failed:", err);
      setIsAuthenticating(false);
    }
  }, [authenticated, login, router]);

  useEffect(() => {
    if (authenticated && isAuthenticating) {
      router.push("/dashboard");
    }
  }, [authenticated, isAuthenticating, router]);

  return (
    <>
      {isAuthenticating && <LoadingOverlay message="Authenticating..." />}
      <header
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${scrolled ? "py-4" : "py-6"
          }`}
      >
        <div className="mx-auto max-w-content px-6 sm:px-8">
          <div className={`flex items-center justify-between gap-6 rounded-[2rem] px-6 py-4 transition-all duration-500 border border-transparent ${scrolled
            ? "bg-canvas/80 backdrop-blur-xl shadow-2xl border-hairline translate-y-2"
            : "bg-transparent"
            }`}>
            <Link href="/" className="group flex items-center gap-3">
              <TreasurixMark
                size={32}
                className="shrink-0 transition-transform group-hover:scale-110"
              />
              <span className="font-display text-xl font-extreme tracking-tighter text-ink">
                Treasurix
              </span>
            </Link>

            <nav className="hidden items-center gap-10 md:flex" aria-label="Primary">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-sm font-bold text-subtext transition-colors hover:text-accent tracking-tight"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="h-6 w-px bg-hairline hidden sm:block" />
              <span className={`relative inline-flex ${authenticated ? "rounded-2xl" : ""}`}>
                {authenticated ? (
                  <span
                    className="absolute inset-0 rounded-2xl bg-accent opacity-35 animate-ping pointer-events-none"
                    aria-hidden
                  />
                ) : null}
                <button
                  onClick={handleAuth}
                  className={`relative rounded-2xl bg-accent px-8 py-3 text-sm font-extreme text-white shadow-lift transition-all hover:scale-105 hover:bg-accent-hover active:scale-95 ${
                    authenticated ? "ring-2 ring-white/25 ring-offset-2 ring-offset-[var(--bg)] dark:ring-white/20 dark:ring-offset-[var(--bg)]" : ""
                  }`}
                >
                  {authenticated ? "Dashboard" : "Launch app"}
                </button>
              </span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
