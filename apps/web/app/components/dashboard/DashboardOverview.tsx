"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";
import { DashboardMetricCard } from "./DashboardMetricCard";
import { Toast } from "@/app/components/ui/Toast";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { getSolPrice } from "@/lib/goldrush-prices";

/* ── illustrative data ─────────────────────────────────────────────── */

const mockVolume = [
  { label: "W1", h: 32 },
  { label: "W2", h: 48 },
  { label: "W3", h: 40 },
  { label: "W4", h: 56 },
  { label: "W5", h: 44 },
  { label: "W6", h: 62 },
  { label: "W7", h: 38 },
  { label: "W8", h: 50 },
];

const mockActivity = [
  {
    id: "—",
    title: "No live payments yet",
    status: "pending",
    ref: "—",
    customer: "Create a checkout or shield funds on devnet",
    updated: "—",
  },
];

/* ── tiny icon helpers ──────────────────────────────────────────────── */

function IconBolt() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

export function IconLink() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

function IconShield() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function IconCode() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}

function statusPill(status: string) {
  const s = status.toLowerCase();
  if (s === "pending")
    return "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80";
  if (s === "settled" || s === "completed")
    return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80";
  return "bg-stone-100 text-stone-700 ring-1 ring-stone-200/80";
}

/* ── Overview component ────────────────────────────────────────────── */

export function DashboardOverview() {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const primaryWallet = useMemo(() => wallets[0] ?? null, [wallets]);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [solPrice, setSolPrice] = useState(150);
  const [, setWalletBalance] = useState<{ sol: string; usdc: string } | null>(null);
  const [stats, setStats] = useState<{
    shieldedVolume: { SOL: string; USDC: string };
    openCheckouts: number;
    treasuryBalance: { SOL: string; USDC: string };
    recentActivity: Array<{
      id: string;
      title: string;
      status: string;
      ref: string;
      customer: string;
      updated: string;
    }>;
  } | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [statsRes, price] = await Promise.all([
        fetch(`/api/dashboard/stats?merchantId=${encodeURIComponent(user.id)}`),
        getSolPrice(),
      ]);
      setSolPrice(price);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch on-chain wallet balance
  useEffect(() => {
    if (!primaryWallet?.address) return;
    const fetchBalance = async () => {
      try {
        const res = await fetch(`/api/wallet/balance?address=${primaryWallet.address}`);
        if (res.ok) {
          const data = await res.json();
          setWalletBalance(data);
        }
      } catch (err) {
        console.error("Failed to fetch wallet balance:", err);
      }
    };
    fetchBalance();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, [primaryWallet?.address]);

  useEffect(() => {
    if (user?.id) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user?.id, fetchStats]);

  const rows = useMemo(() => {
    const data = stats?.recentActivity ?? mockActivity;
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((r) =>
      [r.id, r.title, r.ref, r.customer].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [search, stats]);

  const displayValues = useMemo(() => {
    if (!stats) return null;
    const solVol = parseFloat(stats.shieldedVolume.SOL);
    const usdcVol = parseFloat(stats.shieldedVolume.USDC);
    const totalUsd = solVol * solPrice + usdcVol;

    return {
      volume: `${solVol > 0 ? `${solVol.toFixed(3)} SOL` : ""}${solVol > 0 && usdcVol > 0 ? " + " : ""}${usdcVol > 0 ? `${usdcVol.toFixed(2)} USDC` : ""}` || "0.00",
      volumeUsd: `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      balance: `${solVol > 0 ? `${solVol.toFixed(3)} SOL` : ""}${solVol > 0 && usdcVol > 0 ? " + " : ""}${usdcVol > 0 ? `${usdcVol.toFixed(2)} USDC` : ""}` || "0.00",
      balanceUsd: `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    };
  }, [stats, solPrice]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Overview</h1>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-extreme uppercase tracking-widest text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Secured by Cloak
            </span>
          </div>
          <p className="mt-2 max-w-xl text-sm text-subtext">
            Operator home — metrics, quick actions, and recent activity. Checkout and treasury are
            live; payments settle on shielded network.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-2xl border border-hairline bg-elevated px-4 py-4 text-xs font-semibold text-ink shadow-sm hover:bg-stone-200 dark:hover:bg-stone-900"
            onClick={() => {
              const blob = new Blob(
                [
                  JSON.stringify(
                    { generatedAt: new Date().toISOString(), note: "Treasurix dashboard export" },
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              );
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "treasurix-dashboard-report.json";
              a.click();
              URL.revokeObjectURL(a.href);
              setToast("Report exported successfully");
            }}
          >
            Export report
          </button>
          <Link
            href="/dashboard/merchant/checkout"
            className="rounded-2xl bg-accent px-4 py-4 text-xs font-semibold text-white shadow-lift hover:bg-accent-hover"
          >
            New checkout
          </Link>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────────── */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-quiet">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activity"
          aria-label="Search activity"
          className="w-full rounded-2xl border border-hairline bg-elevated py-2.5 pl-10 pr-4 text-sm text-ink shadow-sm placeholder:text-quiet focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {/* ── Metric cards ───────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <div className="rounded-[2.5rem] border border-hairline bg-elevated p-8 shadow-sm">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-10 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="rounded-[2.5rem] border border-hairline bg-elevated p-8 shadow-sm">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-10 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="rounded-[2.5rem] border border-hairline bg-elevated p-8 shadow-sm">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-10 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="rounded-[2.5rem] border border-hairline bg-elevated p-8 shadow-sm">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-10 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
          </>
        ) : (
          <>
            <DashboardMetricCard
              label="Shielded volume"
              value={displayValues?.volume ?? "—"}
              subValue={displayValues?.volumeUsd}
              caption="Cloak · devnet"
              trendLabel="Treasury deposit flow"
              icon={<IconShield />}
            />
            <DashboardMetricCard
              label="Open checkouts"
              value={String(stats?.openCheckouts ?? 0)}
              caption="Payment links · active"
              icon={<IconLink />}
            />
            <DashboardMetricCard
              label="Treasury balance"
              value={displayValues?.balance ?? "—"}
              subValue={displayValues?.balanceUsd}
              caption="Shield pool · SOL + USDC"
              icon={<IconWallet />}
            />
            <DashboardMetricCard
              label="Webhook health"
              value="100%"
              caption="Operational"
              icon={<IconCode />}
            />
          </>
        )}
      </div>



      {/* ── Volume trend + Summary ─────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="group/card rounded-2xl border border-hairline bg-elevated p-6 shadow-sm transition-all hover:-translate-y-1 lg:col-span-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-medium text-ink">Settlement trend</h2>
              <p className="mt-1 text-xs text-subtext">
                Illustrative weekly bars — replace with real volume when analytics ships.
              </p>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-subtext">
              Last 8 periods
            </span>
          </div>
          <div className="mt-8 flex h-40 items-end gap-2">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 h-full rounded-t-md" />
              ))
            ) : (
              mockVolume.map((p) => (
                <div key={p.label} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full max-w-[2.5rem] rounded-t-md bg-gradient-to-t from-accent to-violet-400 opacity-90"
                    style={{ height: `${p.h}%` }}
                  />
                  <span className="text-[10px] font-medium text-quiet">{p.label}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-hairline bg-elevated p-6 shadow-sm lg:col-span-2">
          <h2 className="font-display text-lg font-medium text-ink">Summary</h2>
          <ul className="mt-4 space-y-3">
            {[
              { label: "Network", value: "Solana devnet" },
              { label: "Privacy", value: "Cloak shield pool" },
              { label: "Auth", value: "Privy" },
              { label: "SDK", value: "@cloak.dev/sdk-devnet" },
            ].map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0 last:pb-0"
              >
                <span className="text-xs font-medium text-subtext">{row.label}</span>
                <span className="text-sm font-semibold text-ink">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-medium text-ink">Quick actions</h2>
        <p className="mt-1 text-sm text-subtext">
          Jump to the tasks you run most often — checkout sessions and treasury operations.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/dashboard/merchant/checkout",
              title: "Checkout",
              body: "Sessions & payment links",
              icon: <IconLink />,
            },
            {
              href: "/dashboard/treasury/pool",
              title: "Treasury",
              body: "Shield pool · deposit & withdraw",
              icon: <IconShield />,
            },
            {
              href: "/dashboard/developers/webhooks",
              title: "Webhooks",
              body: "Endpoints & retries",
              icon: <IconBolt />,
            },
            {
              href: "/dashboard/developers/api-keys",
              title: "API keys",
              body: "Provision access",
              icon: <IconCode />,
            },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-start gap-3 rounded-2xl border border-hairline bg-elevated p-4 shadow-sm transition hover:border-accent/30 hover:shadow-md"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                {a.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink group-hover:text-accent">{a.title}</p>
                <p className="mt-1 text-xs text-subtext">{a.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent activity table ───────────────────────────────────── */}
      <div className="rounded-2xl border border-hairline bg-elevated shadow-sm">
        <div className="flex flex-col gap-2 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-medium text-ink">Recent activity</h2>
            <p className="text-xs text-subtext">Payments, shield events, and webhooks.</p>
          </div>
          <span className="text-xs font-medium text-quiet">{rows.length} shown</span>
        </div>
        <div className="overflow-x-auto max-h-[365px] overflow-y-auto scrollbar-thin">
          <table className="w-full min-w-[640px] text-left text-sm border-collapse">
            <thead className="sticky top-0 bg-elevated z-10 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
              <tr className="border-b border-stone-100 bg-elevated text-[10px] font-semibold uppercase tracking-wider text-quiet">
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Detail</th>
                <th className="px-5 py-3 text-right">Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-stone-50 last:border-0">
                    <td className="px-5 py-6"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-5 py-6"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-5 py-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-6"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-5 py-6"><Skeleton className="h-4 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-stone-50 last:border-0">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-ink">{row.id}</span>
                      <p className="text-xs text-subtext">{row.title}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusPill(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-subtext">{row.ref}</td>
                    <td className="px-5 py-3 text-xs text-subtext">{row.customer}</td>
                    <td className="px-5 py-3 text-right text-xs text-quiet">{row.updated}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {toast && <Toast message={toast} onBlur={() => setToast(null)} />}
    </div>
  );
}
