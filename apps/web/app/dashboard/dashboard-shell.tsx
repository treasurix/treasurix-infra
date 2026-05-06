"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { AuthSync } from "@/app/components/AuthSync";
import { TreasurixMark } from "@/app/components/TreasurixMark";
import { DashboardSidebar } from "@/app/components/dashboard/DashboardSidebar";
import { privyWalletOrEmailLogin } from "@/lib/privy-login";
import { Toast } from "@/app/components/ui/Toast";
import { LoadingOverlay } from "@/app/components/LoadingOverlay";
import { ThemeToggle } from "@/app/components/ThemeToggle";

function useDashboardUserLines(user: ReturnType<typeof usePrivy>["user"]) {
  return useMemo(() => {
    const email = user?.email?.address;
    if (email) return { line: email, sub: "Signed in with email" as string | null };
    const w = user?.linkedAccounts?.find((a) => a.type === "wallet");
    if (w && "address" in w) {
      const addr = (w as { address: string }).address;
      return {
        line: `${addr}`,
        sub: "Wallet",
      };
    }
    return { line: "Connected", sub: null as string | null };
  }, [user]);
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { line: userLine, sub: userSub } = useDashboardUserLines(user);

  if (!ready) {
    return <LoadingOverlay />;
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
        <div className="mb-8 scale-125">
          <TreasurixMark size={48} />
        </div>
        <h1 className="text-2xl font-extreme tracking-tight text-ink">Sign in to Treasurix</h1>
        <p className="mt-3 max-w-sm text-center text-sm font-medium text-subtext">
          Access your private treasury and checkout infrastructure. Your profile syncs securely with our Solana devnet nodes.
        </p>
        <button
          type="button"
          onClick={() => login(privyWalletOrEmailLogin)}
          className="mt-10 rounded-2xl bg-accent px-10 py-4 text-sm font-bold text-white shadow-lift hover:bg-accent-hover transition-all active:scale-95"
        >
          Connect Account
        </button>
        <Link href="/" className="mt-8 text-sm font-semibold text-accent hover:opacity-80">
          ← Back to home
        </Link>
      </div>
    );
  }

  const closeMobile = () => setMobileNavOpen(false);

  return (
    <>
      <AuthSync />
      <div className="min-h-screen bg-canvas transition-theme md:flex">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-hairline bg-elevated shadow-sm transition-theme md:block">
          <DashboardSidebar pathname={pathname} userLine={userLine} userSub={userSub} />
        </aside>

        {/* Mobile drawer */}
        {mobileNavOpen ? (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-ink/60 backdrop-blur-md"
              aria-label="Close menu"
              onClick={closeMobile}
            />
            <div className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] shadow-2xl animate-fade-up transition-theme">
              <DashboardSidebar
                pathname={pathname}
                onNavigate={closeMobile}
                userLine={userLine}
                userSub={userSub}
              />
            </div>
          </div>
        ) : null}

        <div className="flex min-h-screen flex-1 flex-col md:pl-72">
          <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/80 backdrop-blur-xl transition-theme">
            <div className="flex h-20 items-center justify-between gap-3 px-6 md:px-10">
              <div className="flex min-w-0 items-center gap-4">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-hairline bg-elevated text-ink shadow-sm md:hidden hover:bg-surface-soft transition-all"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open navigation"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <Link href="/dashboard" className="flex items-center gap-3 md:hidden">
                  <TreasurixMark size={32} className="shrink-0" />
                  <span className="truncate font-display text-lg font-extreme tracking-tight text-ink">Treasurix</span>
                </Link>

              </div>
              <div className="flex shrink-0 items-center gap-4">
                <ThemeToggle />
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(userLine);
                    setToast("Address copied");
                  }}
                  className="group hidden items-center gap-3 rounded-xl border border-hairline bg-elevated px-3 py-1.5 transition-all hover:bg-surface-soft active:scale-95 sm:flex"
                >
                  <div className="flex flex-col items-end">
                    <span className="max-w-[120px] truncate text-[11px] font-extreme text-ink group-hover:text-accent transition-colors">
                      {`${userLine.slice(0, 6)}…${userLine.slice(-4)}`}
                    </span>
                    <span className="text-[9px] font-bold text-subtext uppercase tracking-tighter">
                      {userSub ?? "User"}
                    </span>
                  </div>
                  <div className="text-quiet group-hover:text-accent transition-colors">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="flex items-center gap-2 rounded-xl border border-hairline bg-elevated px-5 py-2.5 text-xs font-extreme text-ink hover:bg-surface-soft hover:text-rose-500 transition-all shadow-sm active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    className="lucide lucide-unplug w-4 h-4 shrink-0 transition-colors group-hover:text-rose-500 dark:group-hover:text-rose-400">
                    <path d="m19 5 3-3"></path>
                    <path d="m2 22 3-3"></path>
                    <path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"></path>
                    <path d="M7.5 13.5 10 11"></path>
                    <path d="M10.5 16.5 13 14"></path>
                    <path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"></path>
                  </svg>

                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-10 md:px-12 max-w-7xl mx-auto w-full transition-theme">{children}</main>
        </div>
      </div>
      {toast && <Toast message={toast} onBlur={() => setToast(null)} />}
    </>
  );
}
