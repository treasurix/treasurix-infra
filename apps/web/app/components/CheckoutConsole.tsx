"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useCreateWallet, type ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { LAMPORTS_PER_SOL, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { DashboardMetricCard } from "@/app/components/dashboard/DashboardMetricCard";
import {
  CLOAK_DEVNET_PROGRAM_ID,
  CLOAK_DEVNET_RELAY_URL,
  DEVNET_MOCK_USDC_MINT,
} from "@/lib/cloak-devnet-reference";
import { getDevnetConnection, getDevnetRpcUrl } from "@/lib/solana-devnet";
import {
  getTreasuryOwnerKeypair,
  loadTreasuryUtxoWallet,
  saveTreasuryUtxoWallet,
} from "@/lib/treasurix-treasury-cloak-wallet";
import { syncUserWithServer } from "@/lib/auth-sync-client";
import { Toast } from "@/app/components/ui/Toast";
import { SuccessModal } from "@/app/components/ui/SuccessModal";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { AssetBadge, AssetLogo, assetKindFromLabel } from "@/app/components/assets/AssetLogo";

export type DemoCheckoutLink = {
  id: string;
  slug: string;
  label: string;
  amount: string;
  asset: "SOL" | "Mock USDC";
  status: "active" | "settled" | "expired";
  createdAt: string;
  merchantId: string;
  txSignature?: string;
  customerEmail?: string | null;
  merchantWalletAddress?: string | null;
};

/* ── Wallet helpers ─────────────────────────────────────────────────── */

function buildCloakWalletOptions(wallet: ConnectedStandardSolanaWallet) {
  const depositorPublicKey = new PublicKey(wallet.address);

  const signTransaction = async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
    const raw =
      tx instanceof VersionedTransaction
        ? tx.serialize()
        : Uint8Array.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false }));
    const { signedTransaction } = await wallet.signTransaction({ transaction: raw, chain: "solana:devnet" });
    return (
      tx instanceof VersionedTransaction
        ? VersionedTransaction.deserialize(signedTransaction)
        : Transaction.from(signedTransaction)
    ) as T;
  };

  const signMessage = async (message: Uint8Array) => {
    const { signature } = await wallet.signMessage({ message });
    return signature;
  };

  return { depositorPublicKey, walletPublicKey: depositorPublicKey, signTransaction, signMessage };
}

/* ── Icons ──────────────────────────────────────────────────────────── */

function IconLink() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

function IconClock() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function statusPill(status: DemoCheckoutLink["status"]) {
  if (status === "active") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20";
  if (status === "settled") return "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/20";
  return "bg-stone-500/10 text-stone-600 dark:text-stone-400 ring-1 ring-stone-500/20";
}

/* ── Component ──────────────────────────────────────────────────────── */

export function CheckoutConsole() {
  const { user, getAccessToken } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const [links, setLinks] = useState<DemoCheckoutLink[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState<DemoCheckoutLink["asset"]>("Mock USDC");
  const [customerEmail, setCustomerEmail] = useState("");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "settled" | "expired">("all");

  /* Feedback state */
  const [toast, setToast] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /* Cloak shield state */
  const [shieldBusy, setShieldBusy] = useState(false);
  const [shieldLog, setShieldLog] = useState<string | null>(null);
  const [shieldError, setShieldError] = useState<string | null>(null);
  const [lastSig, setLastSig] = useState<string | null>(null);

  const primaryWallet = useMemo(() => wallets[0] ?? null, [wallets]);

  const merchantId = user?.id;

  const fetchLinks = useCallback(async () => {
    if (!merchantId) return;
    try {
      const res = await fetch(`/api/checkout?merchantId=${encodeURIComponent(merchantId)}`);
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch (err) {
      console.error("Failed to fetch links:", err);
    } finally {
      setIsLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    if (merchantId) {
      fetchLinks();
    } else {
      setIsLoading(false);
    }
    setMounted(true);
  }, [merchantId, fetchLinks]);

  const stats = useMemo(() => {
    const active = links.filter((l) => l.status === "active").length;
    const settled = links.filter((l) => l.status === "settled").length;
    const expired = links.filter((l) => l.status === "expired").length;
    return { active, settled, expired, total: links.length };
  }, [links]);

  const filtered = useMemo(() => {
    let base = links;
    if (activeTab !== "all") base = base.filter((l) => l.status === activeTab);
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.slug.toLowerCase().includes(q) ||
        l.amount.includes(q) ||
        l.asset.toLowerCase().includes(q),
    );
  }, [links, search, activeTab]);

  const handleToggleCreate = async () => {
    const nextState = !showCreate;
    setShowCreate(nextState);
    if (nextState && merchantId) {
      try {
        const res = await fetch(`/api/user/settings?privyDid=${merchantId}`);
        if (res.ok) {
          const data = await res.json();
          setEmailNotificationsEnabled(data.emailNotifications === true);
        }
      } catch (err) {
        console.error("Failed to fetch merchant settings:", err);
      }
    }
  };

  const createLink = async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0 || !merchantId) return;
    const slug =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().slice(0, 8)
        : `${Date.now().toString(36)}`;

    if (!emailNotificationsEnabled && customerEmail.trim() !== "") {
      setToast("Please enable Email Notifications in Webhooks to capture customer emails.");
      return;
    }

    const payload = {
      slug,
      label: label.trim() || "Untitled checkout",
      amount: parsed.toFixed(asset === "SOL" ? 4 : 2),
      asset,
      merchantId,
      customerEmail: customerEmail.trim() || undefined,
    };

    setIsGenerating(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newLink = await res.json();
        setLinks([newLink, ...links]);
        setLabel("");
        setCustomerEmail("");
        setShowCreate(false);
      }
    } catch (err) {
      console.error("Failed to create link:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPayUrl = (slug: string) => {
    const path = `/pay/${slug}`;
    const full = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    void navigator.clipboard.writeText(full);
    setToast("Link copied to clipboard");
  };

  /* ── Shield payment through Cloak ─────────────────────────────── */
  const handleShieldCheckout = useCallback(
    async (link: DemoCheckoutLink) => {
      if (!primaryWallet) {
        setShieldError("Connect a Solana wallet first.");
        return;
      }
      if (!merchantId) {
        setShieldError("Sign in so shielded funds accrue to your treasury private balance.");
        return;
      }

      setShieldError(null);
      setShieldLog(null);
      setLastSig(null);
      setShieldBusy(true);
      setShieldLog("Loading Cloak SDK…");

      try {
        const {
          CLOAK_PROGRAM_ID,
          createUtxo,
          getNkFromUtxoPrivateKey,
          NATIVE_SOL_MINT,
          DEVNET_MOCK_USDC_MINT,
          transact,
        } = await import("@cloak.dev/sdk-devnet");

        const mint = link.asset === "SOL" ? NATIVE_SOL_MINT : DEVNET_MOCK_USDC_MINT;
        const externalAmount =
          link.asset === "SOL"
            ? BigInt(Math.floor(Number(link.amount) * LAMPORTS_PER_SOL))
            : BigInt(Math.floor(Number(link.amount) * 1_000_000));

        const connection = getDevnetConnection();
        const walletOpts = buildCloakWalletOptions(primaryWallet);

        setShieldLog(
          link.asset === "SOL"
            ? "Preparing treasury shield note (private deposit)…"
            : "Preparing treasury shield note (mock USDC, 6 decimals)…",
        );
        const treasuryOwner = await getTreasuryOwnerKeypair(getAccessToken);
        const senderNk = getNkFromUtxoPrivateKey(treasuryOwner.privateKey);
        const depositOutput = await createUtxo(externalAmount, treasuryOwner, mint);

        const result = await transact(
          {
            inputUtxos: [],
            outputUtxos: [depositOutput],
            externalAmount,
            depositor: walletOpts.depositorPublicKey,
          },
          {
            connection,
            programId: CLOAK_PROGRAM_ID,
            relayUrl: CLOAK_DEVNET_RELAY_URL,
            chainNoteViewingKeyNk: senderNk,
            ...walletOpts,
            enforceViewingKeyRegistration: false,
            useUniqueNullifiers: true,
            useChainRootForProof: true,
            onProgress: (s: string) => setShieldLog(s),
          },
        );

        const uw = await loadTreasuryUtxoWallet(getAccessToken);
        uw.addUtxo(result.outputUtxos[0], mint);
        await saveTreasuryUtxoWallet(getAccessToken, uw);

        setLastSig(result.signature);
        setShieldLog("Checkout payment shielded into your treasury private balance.");
        setSuccessMessage(`Successfully shielded ${link.amount} ${link.asset}.`);

        // Update database via API
        try {
          const res = await fetch("/api/checkout", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: link.id,
              status: "settled",
              txSignature: result.signature,
            }),
          });
          if (res.ok) {
            setLinks((prev) =>
              prev.map((l) =>
                l.id === link.id ? { ...l, status: "settled", txSignature: result.signature } : l,
              ),
            );
          }
        } catch (err) {
          console.error("Failed to update link status after shield:", err);
        }

        void syncUserWithServer(getAccessToken, {
          transaction: { signature: result.signature, kind: "cloak_devnet_checkout_shield" },
        });
      } catch (e: unknown) {
        console.error("Shielding failed:", e);
        const err = e as { message?: string; name?: string; logs?: string[]; getLogs?: () => Promise<string[]> };
        let msg = err.message || String(e);

        if (err.name === "SendTransactionError" || (err.message && err.message.includes("simulation failed"))) {
          try {
            if (err.logs?.length) {
              msg += ` (Details: ${err.logs[err.logs.length - 1]})`;
            } else if (typeof err.getLogs === "function") {
              const logs = await err.getLogs();
              if (Array.isArray(logs) && logs.length > 0) {
                msg += ` (Details: ${logs[logs.length - 1]})`;
              }
            }
          } catch (logErr) {
            console.warn("Failed to retrieve shield transaction logs:", logErr);
          }
        }

        setShieldError(msg);
        setShieldLog(null);
      } finally {
        setShieldBusy(false);
      }
    },
    [primaryWallet, getAccessToken, merchantId],
  );

  if (!mounted) {
    return <div className="mt-6 h-64 animate-pulse rounded-[2.5rem] bg-surface-soft" aria-hidden />;
  }

  const explorerUrl = (sig: string) =>
    `https://solscan.io/tx/${encodeURIComponent(sig)}?cluster=devnet`;

  return (
    <div className="space-y-10">
      {/* ── Metric cards ─────────────────────────────────────────── */}
      <div className="grid gap-6 sm:grid-cols-3">
        {isLoading ? (
          <>
            <div className="rounded-[2.5rem] border border-hairline bg-elevated p-8 shadow-sm transition-theme">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="rounded-[2.5rem] border border-hairline bg-elevated p-8 shadow-sm transition-theme">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="rounded-[2.5rem] border border-hairline bg-elevated p-8 shadow-sm transition-theme">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
          </>
        ) : (
          <>
            <DashboardMetricCard
              label="Active links"
              value={String(stats.active)}
              caption="Hosted sessions · devnet"
              icon={<IconLink />}
            />
            <DashboardMetricCard
              label="Settled"
              value={String(stats.settled)}
              caption="Shielded via Protocol"
              trendLabel={stats.settled > 0 ? `${stats.settled} confirmed` : undefined}
              icon={<IconCheck />}
            />
            <DashboardMetricCard
              label="Awaiting payment"
              value={String(stats.active)}
              caption="Pending checkout sessions"
              icon={<IconClock />}
            />
          </>
        )}
      </div>

      {/* ── Wallet status ────────────────────────────────────────── */}
      {!walletsReady ? (
        <div className="flex h-32 items-center justify-center rounded-[2rem] border border-hairline bg-surface-soft transition-theme">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
            <p className="text-[10px] font-extreme uppercase tracking-widest text-subtext opacity-60">Syncing wallets</p>
          </div>
        </div>
      ) : walletsReady && !primaryWallet ? (
        <div className="rounded-[2rem] border-2 border-amber-500/20 bg-amber-500/5 p-7 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-extreme text-ink">No Solana wallet connected</p>
              <p className="mt-0.5 text-sm font-medium text-subtext">
                Create or connect a wallet to shield checkout payments via shielded protocol.
              </p>
            </div>
            <button
              type="button"
              onClick={() => createWallet()}
              className="ml-auto rounded-2xl bg-amber-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all active:scale-95"
            >
              Create embedded wallet
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Tab filter + search + create ─────────────────────────── */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          {(["all", "active", "settled", "expired"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-2xl px-6 py-2.5 text-xs font-extreme transition-[background-color,border-color,color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${activeTab === tab
                ? "bg-accent text-white shadow-lift scale-105"
                : "bg-surface-soft text-subtext hover:bg-surface-solid hover:text-ink border border-hairline shadow-sm"
                }`}
            >
              {tab === "all" ? `All (${stats.total})` : `${tab.charAt(0).toUpperCase() + tab.slice(1)} (${tab === "active" ? stats.active : tab === "settled" ? stats.settled : stats.expired})`}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-lg flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-quiet">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payment links..."
              className="w-full rounded-2xl border border-hairline bg-surface-solid py-4 pl-12 pr-6 text-sm font-bold text-ink shadow-sm placeholder:text-quiet focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-theme transition-[transform] duration-300"
            />
          </div>
          <button
            type="button"
            onClick={handleToggleCreate}
            className="rounded-2xl bg-accent px-5 py-4 text-sm font-extreme text-white shadow-lift hover:bg-accent-hover transition-all active:scale-95 flex items-center gap-2"
          >
            {showCreate ? (
              <>
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Create Payment Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Create form ──────────────────────────────────────────── */}
      {showCreate ? (
        <div className="rounded-[2.5rem] border-2 border-accent/20 bg-elevated p-10 shadow-2xl animate-fade-up transition-theme">
          <div className="mb-8">
            <h3 className="font-display text-2xl font-extreme tracking-tight text-ink">New payment link</h3>
            <p className="mt-2 text-sm font-medium text-subtext">
              Configure a secure, private checkout session for your customers.
            </p>
          </div>
          <div className="space-y-2">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 items-end">
              <label className="flex flex-col gap-2 text-sm font-extreme text-ink">
                Label
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Q3 Invoice"
                  className="rounded-2xl border border-hairline bg-surface-soft px-5 py-3.5 text-sm font-bold text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all transition-theme"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-extreme text-ink">
                Amount
                <div className="relative">
                  <input
                    type="number"
                    min={0.0001}
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-2xl border border-hairline bg-surface-soft px-5 py-3.5 text-sm font-bold text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all transition-theme"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-2 text-sm font-extreme text-ink">
                <span className="flex items-center gap-2">
                  Asset
                  <AssetLogo kind={assetKindFromLabel(asset)} className="h-5 w-5" title={asset} />
                </span>
                <div className="relative">
                  <select
                    value={asset}
                    onChange={(e) => setAsset(e.target.value as DemoCheckoutLink["asset"])}
                    className="w-full rounded-2xl border border-hairline bg-surface-soft px-3 py-3.5 text-sm font-bold text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all transition-theme appearance-none cursor-pointer"
                  >
                    <option value="Mock USDC">Mock USDC (devnet)</option>
                    <option value="SOL">SOL (devnet)</option>
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-subtext">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </label>
              <label className={`flex flex-col gap-2 text-sm font-extreme transition-opacity ${!emailNotificationsEnabled ? "opacity-60 text-quiet" : "text-ink"}`}>
                Customer Email (Optional)
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full rounded-2xl border border-hairline bg-surface-soft px-5 py-3.5 text-sm font-bold text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all transition-theme"
                />
              </label>
              <button
                type="button"
                onClick={createLink}
                disabled={isGenerating}
                className="w-full rounded-2xl bg-ink dark:bg-accent px-8 py-3.5 text-sm font-extreme text-white shadow-lift transition-theme transition-[opacity,transform] duration-300 hover:opacity-90 active:scale-95 disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    <span>Processing...</span>
                  </>
                ) : (
                  "Generate Link"
                )}
              </button>
            </div>
            {!emailNotificationsEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
                <div className="lg:col-start-4">
                  <p className="text-[10px] leading-tight font-medium text-subtext animate-fade-in pl-1">
                    Automated receipts are disabled. <Link href="/dashboard/developers/webhooks" className="text-accent hover:underline">Enable them in Webhooks</Link> to notify your customers.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Shield status ────────────────────────────────────────── */}
      {(shieldLog || shieldError || lastSig) ? (
        <div className="rounded-3xl border border-hairline bg-accent-soft p-6 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-accent animate-ping" />
            <h3 className="text-sm font-extreme text-accent uppercase tracking-widest">Shield Status</h3>
          </div>
          <div className="mt-4 space-y-2">
            {shieldLog ? <p className="text-sm font-bold text-ink">{shieldLog}</p> : null}
            {shieldError ? <p className="text-sm font-bold text-red-500">{shieldError}</p> : null}
            {lastSig ? (
              <a
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-extreme text-white shadow-sm hover:opacity-90 transition-all"
                href={explorerUrl(lastSig)}
                target="_blank"
                rel="noreferrer"
              >
                Verify on Solscan
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── Links table ──────────────────────────────────────────── */}
      <div className="rounded-[2.5rem] border border-hairline bg-elevated shadow-card overflow-hidden transition-theme">
        <div className="flex flex-col gap-4 border-b border-hairline px-8 py-8 sm:flex-row sm:items-center sm:justify-between bg-surface-soft/30 transition-theme">
          <div>
            <h3 className="font-display text-2xl font-extreme tracking-tight text-ink">Payment Links</h3>
            <p className="text-sm font-bold text-subtext mt-1">
              {filtered.length} active sessions on Solana Devnet
            </p>
          </div>

        </div>

        {filtered.length === 0 ? (
          <div className="px-8 py-24 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-surface-soft text-subtext mb-4">
              <IconLink />
            </div>
            <p className="text-base font-bold text-ink">No payment links found</p>
            <p className="text-sm font-medium text-subtext mt-1">Create your first link to start accepting private payments.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr className="border-b border-hairline text-[11px] font-extreme uppercase tracking-[0.2em] text-quiet">
                  <th className="px-8 py-5">Product / Label</th>
                  <th className="px-8 py-5">Amount</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Created At</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-8 py-8"><Skeleton className="h-4 w-40 mb-2" /><Skeleton className="h-3 w-20" /></td>
                      <td className="px-8 py-8"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-8 py-8"><Skeleton className="h-6 w-16 rounded-xl" /></td>
                      <td className="px-8 py-8"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-8 py-8 text-right"><Skeleton className="h-9 w-20 ml-auto rounded-xl" /></td>
                    </tr>
                  ))
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="group transition-[background-color,color] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] hover:bg-surface-soft/50">
                      <td className="px-8 py-6">
                        <p className="text-sm font-extreme text-ink group-hover:text-accent transition-colors">{row.label}</p>
                        <p className="mt-1 font-mono text-[10px] font-bold text-quiet tracking-tighter">/pay/{row.slug}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extreme tabular-nums text-ink">{row.amount}</span>
                          <AssetBadge asset={row.asset} size="sm" />
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex rounded-xl px-3 py-1.5 text-[10px] font-extreme uppercase tracking-widest ${statusPill(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-xs font-bold text-subtext">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex flex-wrap justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => copyPayUrl(row.slug)}
                            className="rounded-xl border border-hairline bg-surface-solid px-4 py-2 text-xs font-extreme text-ink hover:bg-surface-soft transition-theme shadow-sm hover:shadow-md active:scale-[0.98]"
                          >
                            Copy
                          </button>
                          {row.status === "active" && primaryWallet && row.asset === "SOL" ? (
                            <button
                              type="button"
                              disabled={shieldBusy}
                              onClick={() => handleShieldCheckout(row)}
                              className="rounded-xl bg-accent px-4 py-2 text-xs font-extreme text-white hover:bg-accent-hover disabled:opacity-50 shadow-lift transition-all"
                            >
                              {shieldBusy ? "Shielding..." : "Shield & Settle"}
                            </button>
                          ) : null}
                          {row.txSignature ? (
                            <a
                              href={explorerUrl(row.txSignature)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border-2 border-violet-500/20 bg-violet-500/10 px-4 py-2 text-xs font-extreme text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-all"
                            >
                              TX ↗
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Cloak devnet info ────────────────────────────────────── */}
      <div className="rounded-[2.5rem] border border-hairline bg-elevated p-8 shadow-sm transition-theme">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="font-display text-xl font-extreme tracking-tight text-ink">Infrastructure</h3>
            <p className="mt-2 text-sm font-medium text-subtext max-w-xl">
              Treasurix operates on Cloak Devnet. All transactions are shielded using zk-SNARKs before settlement on Solana.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-surface-soft px-4 py-2 border border-hairline transition-theme">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-extreme uppercase tracking-widest text-ink">
              {getDevnetRpcUrl().split('.')[1]} Connected
            </span>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Relay Engine", CLOAK_DEVNET_RELAY_URL],
            ["ZK Program ID", CLOAK_DEVNET_PROGRAM_ID],
            ["Test Liquidity", DEVNET_MOCK_USDC_MINT.slice(0, 16) + "..."],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-surface-soft p-4 border border-hairline transition-theme">
              <dt className="text-[10px] font-extreme uppercase tracking-[0.15em] text-quiet mb-1">{k}</dt>
              <dd className="break-all font-mono text-[11px] font-bold text-ink">{v}</dd>
            </div>
          ))}
        </div>
      </div>

      {toast && <Toast message={toast} onBlur={() => setToast(null)} />}
      {successMessage && (
        <SuccessModal
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}
    </div>
  );
}
