import Link from "next/link";
import type { ReactNode } from "react";
import { TreasurixMark } from "@/app/components/TreasurixMark";


const navSections = [
  {
    title: "Core",
    items: [
      { label: "Overview", active: true },
      { label: "Checkout", active: false },
      { label: "Treasury", active: false },
    ],
  },
  {
    title: "Developers",
    items: [
      { label: "API keys", active: false },
      { label: "Webhooks", active: false },
    ],
  },
  {
    title: "Business",
    items: [{ label: "Settings", active: false }],
  },
] as const;

const mockVolume = [
  { label: "W1", h: 32 },
  { label: "W2", h: 48 },
  { label: "W3", h: 40 },
  { label: "W4", h: 56 },
  { label: "W5", h: 44 },
  { label: "W6", h: 62 },
  { label: "W7", h: 38 },
  { label: "W8", h: 50 },
] as const;

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function IconLink({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

function IconWallet({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}

function IconCode({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

/** Static replica of the logged-in Treasurix dashboard (dark shell) for the marketing hero. */
export function LandingHeroDashboardPreview() {
  return (
    <div className="w-full hidden lg:block backdrop-blur-sm transition-all duration-300">
      

      <div className="relative mx-auto max-w-6xl">
        <div className="pointer-events-none absolute -inset-8 rounded-[2.75rem] bg-gradient-to-br from-accent/25 via-violet-600/15 to-fuchsia-500/10 blur-3xl opacity-80" />

        {/* Dark dashboard chrome — matches in-app `dark` tokens */}
        <div className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.08] bg-[#09090b] text-zinc-100 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.06] sm:rounded-[1.5rem]">
          <div className="flex min-h-[420px] flex-col lg:min-h-[460px] lg:flex-row">
            {/* Sidebar — mirrors DashboardSidebar */}
            <aside className="flex w-full shrink-0 flex-col border-b border-white/[0.08] bg-[#111114] lg:w-[260px] lg:border-b-0 lg:border-r">
              <div className="px-5 py-6">
                <Link href="/dashboard" className="flex items-center gap-3">
                  <TreasurixMark size={36} className="shrink-0" />
                  <span className="font-display text-lg font-extreme tracking-tight text-zinc-50">Treasurix</span>
                </Link>
              </div>
              <nav className="flex-1 overflow-hidden px-3 pb-4">
                {navSections.map((section) => (
                  <div key={section.title} className="mb-8 last:mb-0">
                    <p className="mb-3 px-3 text-[10px] font-extreme uppercase tracking-[0.2em] text-zinc-500">
                      {section.title}
                    </p>
                    <ul className="space-y-1">
                      {section.items.map((item) => (
                        <li key={item.label}>
                          <span
                            className={`block rounded-2xl px-3 py-2.5 text-[13px] font-bold transition-colors ${
                              item.active
                                ? "bg-accent text-white shadow-lg shadow-accent/25"
                                : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                            }`}
                          >
                            {item.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
              <div className="mt-auto border-t border-white/[0.06] p-4">
                <div className="flex w-full items-center gap-3 rounded-3xl border border-white/[0.08] bg-[#16161a] p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#1c1c21] text-xs font-extreme text-accent">
                    G
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate font-mono text-xs font-semibold text-zinc-100">Wallet address</p>
                    <p className="text-[10px] font-bold uppercase tracking-tight text-zinc-500">Wallet</p>
                  </div>
                  <IconLink className="h-4 w-4 shrink-0 text-zinc-500" />
                </div>
              </div>
              <div className="px-5 pb-5">
                <p className="text-[10px] font-extreme uppercase tracking-[0.2em] text-zinc-600">Powered by Treasurix Shield</p>
              </div>
            </aside>

            {/* Main */}
            <div className="flex min-w-0 flex-1 flex-col bg-[#09090b]">
              {/* Top bar — mirrors dashboard shell */}
              <div className="flex flex-wrap items-center justify-end gap-2 border-b border-white/[0.06] px-4 py-3 sm:px-5">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#111114] text-zinc-300"
                  aria-label="Theme"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M3 12h2.25m.386-6.364l1.591 1.591M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                    />
                  </svg>
                </button>
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#111114] px-3 py-1.5 font-mono text-[11px] font-semibold text-zinc-200">
                  Wallet address
                  <IconLink className="h-3.5 w-3.5 text-zinc-500" />
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-white/[0.08] bg-[#111114] px-3 py-2 text-[11px] font-bold text-zinc-300 hover:bg-white/[0.04]"
                >
                  Disconnect
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-hidden p-4 sm:p-6">
                {/* Page header — mirrors DashboardOverview */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <h2 className="font-display text-2xl font-medium tracking-tight text-zinc-50">Overview</h2>
                      <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-extreme uppercase tracking-widest text-emerald-400">
                        Secured by Cloak
                      </span>
                    </div>
                    <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-zinc-400">
                      Operator home — metrics, quick actions, and recent activity. Checkout and treasury are live; payments
                      settle on shielded network.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-2xl border border-white/[0.1] bg-[#111114] px-4 py-3 text-[11px] font-semibold text-zinc-200 hover:bg-white/[0.04]"
                    >
                      Export report
                    </button>
                    <span className="rounded-2xl bg-accent px-4 py-3 text-[11px] font-semibold text-white shadow-lg shadow-accent/30">
                      New checkout
                    </span>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <div className="rounded-2xl border border-white/[0.08] bg-[#111114] py-2.5 pl-10 pr-4 text-[13px] text-zinc-500">
                    Search activity
                  </div>
                </div>

                {/* Metric cards — same labels as DashboardOverview */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricMini
                    label="Shielded volume"
                    value="1.000 SOL + 15.00 USDC"
                    sub="$104.61"
                    caption="Cloak Shield Pool"
                    trend="Treasury deposit flow"
                    icon={<IconShield className="h-4 w-4" />}
                  />
                  <MetricMini
                    label="Open checkouts"
                    value="0"
                    caption="Payment links · active"
                    icon={<IconLink className="h-4 w-4" />}
                  />
                  <MetricMini
                    label="Treasury balance"
                    value="1.000 SOL + 15.00 USDC"
                    sub="$104.61"
                    caption="Shield pool · SOL + USDC"
                    icon={<IconWallet className="h-4 w-4" />}
                  />
                  <MetricMini
                    label="Webhook health"
                    value="100%"
                    caption="Operational"
                    icon={<IconCode className="h-4 w-4" />}
                  />
                </div>

                {/* Settlement trend + Summary */}
                <div className="grid gap-4 lg:grid-cols-5">
                  <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5 lg:col-span-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-medium text-zinc-50">Settlement trend</h3>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          Illustrative weekly bars — replace with real volume when analytics ships.
                        </p>
                      </div>
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
                        Last 8 periods
                      </span>
                    </div>
                    <div className="mt-6 flex h-28 items-end gap-1.5 sm:h-32 sm:gap-2">
                      {mockVolume.map((p) => (
                        <div key={p.label} className="flex flex-1 flex-col items-center gap-2">
                          <div
                            className="w-full max-w-[2rem] rounded-t-md bg-gradient-to-t from-accent to-violet-400 opacity-90 sm:max-w-[2.5rem]"
                            style={{ height: `${p.h}%` }}
                          />
                          <span className="text-[9px] font-medium text-zinc-600">{p.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5 lg:col-span-2">
                    <h3 className="font-display text-base font-medium text-zinc-50">Summary</h3>
                    <ul className="mt-4 space-y-3">
                      {[
                        { label: "Network", value: "Solana devnet" },
                        { label: "Privacy", value: "Cloak shield pool" },
                        { label: "Auth", value: "Privy" },
                        { label: "SDK", value: "@cloak.dev/sdk-devnet" },
                      ].map((row) => (
                        <li
                          key={row.label}
                          className="flex items-center justify-between border-b border-white/[0.06] pb-3 text-[12px] last:border-0 last:pb-0"
                        >
                          <span className="font-medium text-zinc-500">{row.label}</span>
                          <span className="font-semibold text-zinc-100">{row.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricMini({
  label,
  value,
  sub,
  caption,
  trend,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  caption?: string;
  trend?: string;
  icon: ReactNode;
}) {
  return (
    <div className="group rounded-[1.35rem] border border-white/[0.08] bg-[#111114] p-5 shadow-sm transition hover:border-accent/25 hover:shadow-lg hover:shadow-accent/5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-extreme uppercase tracking-[0.18em] text-zinc-500 group-hover:text-zinc-300">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#16161a] text-accent">
          {icon}
        </span>
      </div>
      <p className="mt-3 font-display text-xl font-extreme leading-tight tracking-tight text-zinc-50 sm:text-2xl">{value}</p>
      {sub ? <p className="mt-1 text-xs font-extreme tabular-nums text-accent/90">≈ {sub}</p> : null}
      {caption ? <p className="mt-2 text-[12px] font-bold leading-snug text-zinc-500">{caption}</p> : null}
      {trend ? (
        <div className="mt-4 flex items-center gap-2">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <p className="text-[10px] font-extreme uppercase tracking-wider text-emerald-400">{trend}</p>
        </div>
      ) : null}
    </div>
  );
}
