"use client";

import { AssetBadge, AssetLogo } from "@/app/components/assets/AssetLogo";
import { DashboardMetricCard } from "@/app/components/dashboard/DashboardMetricCard";
import { TreasurixMark } from "./TreasurixMark";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { useState, useEffect, useCallback, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, type ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { PublicKey, Transaction, VersionedTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { getSolPrice } from "@/lib/goldrush-prices";
import { syncUserWithServer } from "@/lib/auth-sync-client";
import { Toast } from "./ui/Toast";
import {
  CLOAK_DEVNET_RELAY_URL,
  DEVNET_MOCK_USDC_MINT,
} from "@/lib/cloak-devnet-reference";
import { getDevnetConnection } from "@/lib/solana-devnet";
import {
  getTreasuryOwnerKeypair,
  loadTreasuryUtxoWallet,
  saveTreasuryUtxoWallet,
} from "@/lib/treasurix-treasury-cloak-wallet";

function serializeForSigning(tx: Transaction | VersionedTransaction): Uint8Array {
  if (tx instanceof VersionedTransaction) {
    return tx.serialize();
  }
  return Uint8Array.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false }));
}

function parseSignedTx<T extends Transaction | VersionedTransaction>(
  original: T,
  signedBytes: Uint8Array,
): T {
  if (original instanceof VersionedTransaction) {
    return VersionedTransaction.deserialize(signedBytes) as T;
  }
  return Transaction.from(signedBytes) as T;
}

function buildCloakWalletOptions(wallet: ConnectedStandardSolanaWallet) {
  const depositorPublicKey = new PublicKey(wallet.address);

  const signTransaction = async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
    const { signedTransaction } = await wallet.signTransaction({
      transaction: serializeForSigning(tx),
      chain: "solana:devnet",
    });
    return parseSignedTx(tx, signedTransaction);
  };

  const signMessage = async (message: Uint8Array) => {
    const { signature } = await wallet.signMessage({ message });
    return signature;
  };

  return {
    depositorPublicKey,
    walletPublicKey: depositorPublicKey,
    signTransaction,
    signMessage,
  };
}

function IconShield() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function IconSwap() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

type TreasuryWithdrawalRow = {
  id: string;
  asset: string;
  amount: string;
  createdAt: string;
  txSignature?: string | null;
};

type ActivityRow =
  | { kind: "deposit"; id: string; asset: string; amount: string; createdAt: string }
  | { kind: "withdrawal"; id: string; asset: string; amount: string; createdAt: string };

async function loadRecipientBalances(pubkey: PublicKey): Promise<{ sol: number; usdc: number }> {
  const connection = getDevnetConnection();
  const lamports = await connection.getBalance(pubkey);
  const mintPk = new PublicKey(DEVNET_MOCK_USDC_MINT);
  const ata = await getAssociatedTokenAddress(mintPk, pubkey);
  let usdc = 0;
  try {
    const b = await connection.getTokenAccountBalance(ata);
    usdc = Number(b.value.uiAmount ?? 0);
  } catch {
    /* no ATA */
  }
  return { sol: lamports / LAMPORTS_PER_SOL, usdc };
}

export function TreasuryPoolDashboard() {
  const { user, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const primaryWallet = useMemo(() => wallets[0] ?? null, [wallets]);

  const [loading, setLoading] = useState(true);
  const [solPrice, setSolPrice] = useState(150);
  const [history, setHistory] = useState<Array<{ id: string; asset: string; amount: string; createdAt: string }>>([]);
  const [withdrawals, setWithdrawals] = useState<TreasuryWithdrawalRow[]>([]);

  /** Mint-scoped shield pool PDAs — loaded from `@cloak.dev/sdk-devnet` (same derivation as on-chain settlement). */
  const [, setShieldPdAs] = useState<{
    sol: { pool: string; merkleTree: string };
    usdc: { pool: string; merkleTree: string };
  } | null>(null);

  // Withdrawal States
  const [withdrawAsset, setWithdrawAsset] = useState<"SOL" | "USDC">("SOL");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawRecipient, setWithdrawRecipient] = useState("");
  const [withdrawLog, setWithdrawLog] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawSig, setWithdrawSig] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [walletBalances, setWalletBalances] = useState<{ sol: number; usdc: number } | null>(null);
  const [walletBalancesLoading, setWalletBalancesLoading] = useState(false);
  const [walletBalancesFetched, setWalletBalancesFetched] = useState(false);
  const [, setRecipientBalances] = useState<{ sol: number; usdc: number } | null>(null);
  /** Shielded balance from server-persisted UtxoWallet (see `/api/treasury/cloak-state`). */
  const [privateTreasurySol, setPrivateTreasurySol] = useState<string | null>(null);
  const [privateTreasuryUsdc, setPrivateTreasuryUsdc] = useState<string | null>(null);
  const [privateUtxoCount, setPrivateUtxoCount] = useState(0);
  const [shieldLedgerBusy, setShieldLedgerBusy] = useState(false);
  const [shieldLedgerError, setShieldLedgerError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { getShieldPoolPDAs, CLOAK_PROGRAM_ID, NATIVE_SOL_MINT, DEVNET_MOCK_USDC_MINT } =
          await import("@cloak.dev/sdk-devnet");
        const sol = getShieldPoolPDAs(CLOAK_PROGRAM_ID, NATIVE_SOL_MINT);
        const usdc = getShieldPoolPDAs(CLOAK_PROGRAM_ID, DEVNET_MOCK_USDC_MINT);
        if (!cancelled) {
          setShieldPdAs({
            sol: { pool: sol.pool.toBase58(), merkleTree: sol.merkleTree.toBase58() },
            usdc: { pool: usdc.pool.toBase58(), merkleTree: usdc.merkleTree.toBase58() },
          });
        }
      } catch (e) {
        console.error("Failed to resolve Cloak shield pool PDAs:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [res, wdRes, price] = await Promise.all([
        fetch(`/api/checkout?merchantId=${encodeURIComponent(user.id)}`),
        fetch(`/api/treasury/withdrawals?merchantId=${encodeURIComponent(user.id)}`),
        getSolPrice(),
      ]);
      setSolPrice(price);
      if (res.ok) {
        const data = await res.json();
        const settled = data.filter((l: { status?: string }) => l.status === "settled");
        setHistory(settled);
      }
      if (wdRes.ok) {
        const wd = (await wdRes.json()) as TreasuryWithdrawalRow[];
        setWithdrawals(Array.isArray(wd) ? wd : []);
      }
    } catch (err) {
      console.error("Failed to fetch treasury history:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const refreshPrivateTreasuryBalances = useCallback(async () => {
    if (!user?.id) {
      setPrivateTreasurySol(null);
      setPrivateTreasuryUsdc(null);
      setPrivateUtxoCount(0);
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      setPrivateTreasurySol(null);
      setPrivateTreasuryUsdc(null);
      setPrivateUtxoCount(0);
      return;
    }
    try {
      const { NATIVE_SOL_MINT: SDK_SOL_MINT, DEVNET_MOCK_USDC_MINT: SDK_USDC_MINT } =
        await import("@cloak.dev/sdk-devnet");
      const w = await loadTreasuryUtxoWallet(getAccessToken);
      const solBal = w.getBalance(SDK_SOL_MINT);
      const usdcBal = w.getBalance(SDK_USDC_MINT);
      setPrivateTreasurySol((Number(solBal) / LAMPORTS_PER_SOL).toFixed(6));
      setPrivateTreasuryUsdc((Number(usdcBal) / 1_000_000).toFixed(2));
      setPrivateUtxoCount(w.getUnspentUtxos(SDK_SOL_MINT).length + w.getUnspentUtxos(SDK_USDC_MINT).length);
    } catch (e) {
      console.error("Private treasury balance refresh failed:", e);
      setPrivateTreasurySol(null);
      setPrivateTreasuryUsdc(null);
      setPrivateUtxoCount(0);
    }
  }, [user?.id, getAccessToken]);

  useEffect(() => {
    void refreshPrivateTreasuryBalances();
  }, [refreshPrivateTreasuryBalances]);

  const refreshWalletBalances = useCallback(async () => {
    if (!primaryWallet?.address) {
      setWalletBalances(null);
      setWalletBalancesLoading(false);
      setWalletBalancesFetched(false);
      return;
    }
    setWalletBalancesLoading(true);
    try {
      const pk = new PublicKey(primaryWallet.address);
      const b = await loadRecipientBalances(pk);
      setWalletBalances(b);
    } catch (e) {
      console.error("Wallet balance fetch failed:", e);
      setWalletBalances(null);
    } finally {
      setWalletBalancesFetched(true);
      setWalletBalancesLoading(false);
    }
  }, [primaryWallet?.address]);

  useEffect(() => {
    void refreshWalletBalances();
  }, [refreshWalletBalances]);

  useEffect(() => {
    const raw = withdrawRecipient.trim() || primaryWallet?.address || "";
    if (!raw) {
      setRecipientBalances(null);
      return;
    }
    let pk: PublicKey;
    try {
      pk = new PublicKey(raw);
    } catch {
      setRecipientBalances(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void loadRecipientBalances(pk).then(
        (b) => {
          if (!cancelled) setRecipientBalances(b);
        },
        () => {
          if (!cancelled) setRecipientBalances(null);
        },
      );
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [withdrawRecipient, primaryWallet?.address]);

  const handleWithdraw = async () => {
    setWithdrawError(null);
    setWithdrawLog(null);
    setWithdrawSig(null);
    setWithdrawSuccess(false);

    if (!primaryWallet) {
      setWithdrawError("Please connect your Solana wallet first.");
      return;
    }

    if (!user?.id) {
      setWithdrawError("Sign in to load your treasury private balance.");
      return;
    }

    const amountNum = parseFloat(withdrawAmount);
    if (!amountNum || amountNum <= 0) {
      setWithdrawError("Please enter a valid positive withdrawal amount.");
      return;
    }

    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(withdrawRecipient.trim() || primaryWallet.address);
    } catch {
      setWithdrawError("Please enter a valid Solana recipient public key.");
      return;
    }

    setWithdrawBusy(true);
    setWithdrawLog("Loading Cloak treasury wallet…");

    try {
      const {
        CLOAK_PROGRAM_ID,
        DEVNET_MOCK_USDC_MINT: SDK_USDC_MINT,
        computeUtxoCommitment,
        getNkFromUtxoPrivateKey,
        NATIVE_SOL_MINT: SDK_SOL_MINT,
        partialWithdraw,
        selectUtxos,
        verifyUtxos,
      } = await import("@cloak.dev/sdk-devnet");

      const mint = withdrawAsset === "SOL" ? SDK_SOL_MINT : SDK_USDC_MINT;

      const baseAmount =
        withdrawAsset === "SOL"
          ? BigInt(Math.round(amountNum * Number(LAMPORTS_PER_SOL)))
          : BigInt(Math.round(amountNum * 1_000_000));

      const connection = getDevnetConnection();
      const walletOpts = buildCloakWalletOptions(primaryWallet);

      const ownerKp = await getTreasuryOwnerKeypair(getAccessToken);
      const nk = getNkFromUtxoPrivateKey(ownerKp.privateKey);

      const treasuryWallet = await loadTreasuryUtxoWallet(getAccessToken);
      const tracked = treasuryWallet.getUnspentUtxos(mint);

      let enrichedCommitments = false;
      for (const u of tracked) {
        if (u.mintAddress === undefined) {
          Object.assign(u, { mintAddress: mint });
          enrichedCommitments = true;
        }
        if (u.commitment === undefined) {
          const c = await computeUtxoCommitment(u);
          Object.assign(u, { commitment: c });
          enrichedCommitments = true;
        }
      }
      if (enrichedCommitments) {
        await saveTreasuryUtxoWallet(getAccessToken, treasuryWallet);
      }

      setWithdrawLog("Checking note spend-state on devnet…");
      const { spent, unspent, skipped } = await verifyUtxos(tracked, connection, CLOAK_PROGRAM_ID);
      const unusable = skipped.filter((u) => u.amount > BigInt(0));
      if (unusable.length > 0) {
        const missingIdx = unusable.some((u) => u.index === undefined || u.index < 0);
        setWithdrawError(
          missingIdx
            ? "Shielded notes are still waiting for on-chain indices. Wait a few seconds, refresh the page, and try again."
            : "Some notes could not be verified for spending. Refresh and try again.",
        );
        setWithdrawBusy(false);
        return;
      }
      for (const s of spent) {
        treasuryWallet.markSpent(s, mint);
      }
      await saveTreasuryUtxoWallet(getAccessToken, treasuryWallet);

      const sorted = [...unspent].sort((a, b) => (a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : 0));
      const selected = selectUtxos(sorted, baseAmount);
      if (!selected?.length) {
        const privateAvail = withdrawAsset === "SOL" ? privateTreasurySol : privateTreasuryUsdc;
        setWithdrawError(
          `Not enough shielded ${withdrawAsset} (${privateAvail ?? "0"} available). Use Shield ledger gap or add funds and shield.`,
        );
        return;
      }

      setWithdrawLog(
        `Spending shielded notes via partialWithdraw → recipient (SDK may consolidate notes first).`,
      );
      const withdrawResult = await partialWithdraw(selected, recipientPubkey, baseAmount, {
        connection,
        programId: CLOAK_PROGRAM_ID,
        relayUrl: CLOAK_DEVNET_RELAY_URL,
        depositorKeypair: undefined as never,
        walletPublicKey: walletOpts.depositorPublicKey,
        signTransaction: walletOpts.signTransaction,
        signMessage: walletOpts.signMessage,
        chainNoteViewingKeyNk: nk,
        enforceViewingKeyRegistration: false,
        useUniqueNullifiers: true,
        useChainRootForProof: true,
        onProgress: (s: string) => setWithdrawLog(s),
      });

      for (const u of selected) {
        treasuryWallet.markSpent(u, mint);
      }
      for (const out of withdrawResult.outputUtxos) {
        treasuryWallet.addUtxo(out, mint);
      }
      await saveTreasuryUtxoWallet(getAccessToken, treasuryWallet);

      setWithdrawSig(withdrawResult.signature);
      setWithdrawLog(`Withdrawal successful! ${withdrawAmount} ${withdrawAsset} sent from private balance.`);
      setWithdrawSuccess(true);

      try {
        const token = await getAccessToken();
        if (token) {
          const rec = await fetch("/api/treasury/withdrawals", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              asset: withdrawAsset === "SOL" ? "SOL" : "Mock USDC",
              amount: withdrawAmount,
              txSignature: withdrawResult.signature,
            }),
          });
          if (!rec.ok) {
            console.error("Failed to persist treasury withdrawal:", await rec.text());
            setToast("Withdrawal confirmed on-chain; ledger row failed to save. Try refreshing.");
          }
        } else {
          setToast("Withdrawal confirmed — sign in to update net treasury totals.");
        }
      } catch (err) {
        console.error("Treasury withdrawal POST failed:", err);
      }

      try {
        await syncUserWithServer(getAccessToken, {
          transaction: { signature: withdrawResult.signature, kind: "cloak_devnet_withdrawal" },
        });
      } catch (err) {
        console.error("Failed to sync withdrawal:", err);
      }

      setTimeout(() => {
        void fetchHistory();
        void refreshWalletBalances();
        void refreshPrivateTreasuryBalances();
      }, 1500);

    } catch (e: unknown) {
      console.error("Withdrawal flow failed:", e);
      setWithdrawError(e instanceof Error ? e.message : String(e));
    } finally {
      setWithdrawBusy(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchHistory();
    } else {
      setLoading(false);
    }
  }, [user?.id, fetchHistory]);

  const activityRows = useMemo((): ActivityRow[] => {
    const dep: ActivityRow[] = history.map((tx) => ({
      kind: "deposit",
      id: tx.id,
      asset: tx.asset,
      amount: tx.amount,
      createdAt: tx.createdAt,
    }));
    const wd: ActivityRow[] = withdrawals.map((w) => ({
      kind: "withdrawal",
      id: w.id,
      asset: w.asset,
      amount: w.amount,
      createdAt: typeof w.createdAt === "string" ? w.createdAt : String(w.createdAt),
    }));
    return [...dep, ...wd].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [history, withdrawals]);

  const stats = useMemo(() => {
    const sumAsset = (rows: typeof history, asset: string) =>
      rows.filter((l) => l.asset === asset).reduce((acc, curr) => acc + parseFloat(curr.amount || "0"), 0);
    const withdrawnSol = withdrawals
      .filter((w) => w.asset === "SOL")
      .reduce((acc, w) => acc + parseFloat(w.amount || "0"), 0);
    const withdrawnUsdc = withdrawals
      .filter((w) => w.asset === "Mock USDC")
      .reduce((acc, w) => acc + parseFloat(w.amount || "0"), 0);

    const depositedSol = sumAsset(history, "SOL");
    const depositedUsdc = sumAsset(history, "Mock USDC");
    const sol = Math.max(0, depositedSol - withdrawnSol);
    const usdc = Math.max(0, depositedUsdc - withdrawnUsdc);
    const totalUsd = sol * solPrice + usdc;

    return {
      poolBalance: `${sol > 0 ? `${sol.toFixed(3)} SOL` : ""}${sol > 0 && usdc > 0 ? " + " : ""}${usdc > 0 ? `${usdc.toFixed(2)} USDC` : ""}` || "0.00",
      poolBalanceUsd: `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      deposits: history.length,
      withdrawalCount: withdrawals.length,
      netSol: sol,
      netUsdc: usdc,
    };
  }, [history, withdrawals, solPrice]);

  const shieldedBalanceLabel = useMemo(() => {
    if (!user?.id) return "—";
    if (privateTreasurySol === null || privateTreasuryUsdc === null) return "…";
    const s = parseFloat(privateTreasurySol);
    const u = parseFloat(privateTreasuryUsdc);
    return `${s.toFixed(3)} SOL · ${u.toFixed(2)} USDC`;
  }, [user?.id, privateTreasurySol, privateTreasuryUsdc]);

  const showShieldLedgerAction = useMemo(() => {
    if (!user?.id || loading) return false;
    if (privateTreasurySol === null || privateTreasuryUsdc === null) return false;
    const s = parseFloat(privateTreasurySol);
    const u = parseFloat(privateTreasuryUsdc);
    return stats.netSol > s + 1e-9 || stats.netUsdc > u + 1e-9;
  }, [user?.id, loading, privateTreasurySol, privateTreasuryUsdc, stats.netSol, stats.netUsdc]);

  const handleShieldLedgerGaps = useCallback(async () => {
    setShieldLedgerError(null);
    if (!primaryWallet) {
      setShieldLedgerError("Connect a Solana wallet first.");
      return;
    }
    if (!user?.id) return;

    const shieldedSol = parseFloat(privateTreasurySol ?? "0");
    const shieldedUsdc = parseFloat(privateTreasuryUsdc ?? "0");
    const gapSol = Math.max(0, stats.netSol - shieldedSol);
    const gapUsdc = Math.max(0, stats.netUsdc - shieldedUsdc);
    if (gapSol < 1e-9 && gapUsdc < 1e-9) return;

    setShieldLedgerBusy(true);
    try {
      const pk = new PublicKey(primaryWallet.address);
      let { sol: walletSol, usdc: walletUsdc } = await loadRecipientBalances(pk);

      const {
        CLOAK_PROGRAM_ID,
        createUtxo,
        getNkFromUtxoPrivateKey,
        NATIVE_SOL_MINT,
        DEVNET_MOCK_USDC_MINT,
        transact,
      } = await import("@cloak.dev/sdk-devnet");

      const connection = getDevnetConnection();
      const walletOpts = buildCloakWalletOptions(primaryWallet);
      const treasuryOwner = await getTreasuryOwnerKeypair(getAccessToken);
      const senderNk = getNkFromUtxoPrivateKey(treasuryOwner.privateKey);

      let didShield = false;
      const feeBufferSol = 0.02;
      const shieldSolAmt = Math.min(gapSol, Math.max(0, walletSol - feeBufferSol));
      const lamports = BigInt(Math.floor(shieldSolAmt * LAMPORTS_PER_SOL));

      if (lamports > BigInt(0)) {
        const depositOutput = await createUtxo(lamports, treasuryOwner, NATIVE_SOL_MINT);
        const result = await transact(
          {
            inputUtxos: [],
            outputUtxos: [depositOutput],
            externalAmount: lamports,
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
          },
        );
        const uw = await loadTreasuryUtxoWallet(getAccessToken);
        uw.addUtxo(result.outputUtxos[0], NATIVE_SOL_MINT);
        await saveTreasuryUtxoWallet(getAccessToken, uw);
        didShield = true;
        void syncUserWithServer(getAccessToken, {
          transaction: { signature: result.signature, kind: "cloak_ledger_sync_sol" },
        });
        ({ sol: walletSol, usdc: walletUsdc } = await loadRecipientBalances(pk));
      }

      const shieldUsdcAmt = Math.min(gapUsdc, walletUsdc);
      const micro = BigInt(Math.floor(shieldUsdcAmt * 1_000_000));
      if (micro > BigInt(0)) {
        const depositOutput = await createUtxo(micro, treasuryOwner, DEVNET_MOCK_USDC_MINT);
        const result = await transact(
          {
            inputUtxos: [],
            outputUtxos: [depositOutput],
            externalAmount: micro,
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
          },
        );
        const uw = await loadTreasuryUtxoWallet(getAccessToken);
        uw.addUtxo(result.outputUtxos[0], DEVNET_MOCK_USDC_MINT);
        await saveTreasuryUtxoWallet(getAccessToken, uw);
        didShield = true;
        void syncUserWithServer(getAccessToken, {
          transaction: { signature: result.signature, kind: "cloak_ledger_sync_usdc" },
        });
      }

      await refreshPrivateTreasuryBalances();
      void refreshWalletBalances();

      if (!didShield) {
        setShieldLedgerError(
          "Fund this wallet with SOL (fees + deposit) and/or mock USDC, then try again.",
        );
        return;
      }

      setToast("Ledger synced to shielded balance.");
    } catch (e) {
      setShieldLedgerError(e instanceof Error ? e.message : String(e));
    } finally {
      setShieldLedgerBusy(false);
    }
  }, [
    primaryWallet,
    user?.id,
    getAccessToken,
    privateTreasurySol,
    privateTreasuryUsdc,
    stats.netSol,
    stats.netUsdc,
    refreshPrivateTreasuryBalances,
    refreshWalletBalances,
  ]);

  return (
    <div className="space-y-10">
      {/* Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <div className="rounded-[2.5rem] border border-hairline bg-elevated p-8 shadow-sm">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-10 w-20 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="rounded-[2.5rem] border border-hairline bg-elevated p-8 shadow-sm">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-10 w-20 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="rounded-[2.5rem] border border-hairline bg-elevated p-8 shadow-sm">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-10 w-20 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="rounded-[2.5rem] border border-hairline bg-elevated p-8 shadow-sm">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-10 w-20 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
          </>
        ) : (
          <>
            <DashboardMetricCard
              label="Ledger net position"
              value={stats.poolBalance}
              subValue={stats.poolBalanceUsd}
              caption="Settled checkouts minus withdrawals"
              icon={<IconShield />}
            />
            <DashboardMetricCard label="Deposits" value={String(stats.deposits)} caption="Settled checkout links" icon={<IconWallet />} />
            <DashboardMetricCard
              label="Withdrawals"
              value={String(stats.withdrawalCount)}
              caption="Recorded on-chain withdrawals"
              icon={<IconSwap />}
            />
            <DashboardMetricCard
              label="Shielded balance"
              value={shieldedBalanceLabel}
              caption={`${privateUtxoCount} notes · withdraw only after shielding`}
              icon={<IconLock />}
            />
          </>
        )}
      </div>

      {showShieldLedgerAction ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface-soft/60 px-5 py-4">
          <p className="max-w-xl text-sm font-semibold text-subtext leading-relaxed">
            <span className="text-ink">Shield before you withdraw:</span> move SOL / mock USDC from your connected wallet into Cloak notes until{" "}
            <span className="text-ink">Shielded balance</span> matches your ledger. Withdrawals only spend shielded notes.
          </p>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <button
              type="button"
              title="Moves SOL and mock USDC from your connected wallet into Cloak notes until shielded balance matches the ledger."
              disabled={shieldLedgerBusy || !primaryWallet}
              onClick={() => void handleShieldLedgerGaps()}
              className="rounded-full bg-ink px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50 dark:bg-accent"
            >
              {shieldLedgerBusy ? "Shielding…" : "Shield ledger gap"}
            </button>
            {shieldLedgerError ? (
              <p className="max-w-md text-right text-xs font-medium text-red-600">{shieldLedgerError}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      

      {/* Withdraw — mint-scoped shield pool (SDK `getShieldPoolPDAs(programId, mint)`) */}
      <div className="rounded-[2.5rem] border border-hairline bg-elevated shadow-card overflow-hidden">
        <div className="border-b border-hairline px-8 py-6 bg-surface-soft/30">
          <h2 className="font-display text-2xl font-extreme tracking-tight text-ink">Secure withdrawal</h2>
          <p className="mt-1 text-sm font-bold text-subtext leading-relaxed">
            {user?.id ? (
              <>
                You must <span className="text-ink">shield</span> funds into Cloak notes before anything can be withdrawn here — withdrawals use{" "}
                <span className="text-ink">Shielded balance</span> only, not ledger totals. Shield via{" "}
                <span className="text-ink">Shield ledger gap</span> (when shown above), <span className="text-ink">Shield &amp; Settle</span> on Checkout, or{" "}
                <span className="text-ink">Treasurix Shield Pool</span> below. Your wallet pays fees and signs protocol transactions.
              </>
            ) : (
              <>
                Sign in to shield and withdraw. Withdrawals only spend <span className="text-ink">shielded</span> Cloak notes; shield first, then use this form.
              </>
            )}
          </p>
        </div>

        <div className="p-8 flex flex-col gap-8 lg:flex-row lg:items-start">

          <div className="min-w-0 flex-1 flex flex-col justify-between gap-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawAsset("SOL");
                    setWithdrawAmount("");
                  }}
                  disabled={withdrawBusy}
                  className={`flex items-center gap-3 rounded-2xl border p-4 transition-all disabled:opacity-50 ${
                    withdrawAsset === "SOL"
                      ? "border-accent bg-accent/5 text-ink"
                      : "border-hairline bg-transparent text-subtext hover:border-accent/30"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 p-1.5 ring-1 ring-violet-500/15">
                    <AssetLogo kind="sol" className="h-7 w-7" title="SOL" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-ink">Solana</p>
                    <p className="text-[10px] text-quiet">Native Devnet</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWithdrawAsset("USDC");
                    setWithdrawAmount("");
                  }}
                  disabled={withdrawBusy}
                  className={`flex items-center gap-3 rounded-2xl border p-4 transition-all disabled:opacity-50 ${
                    withdrawAsset === "USDC"
                      ? "border-accent bg-accent/5 text-ink"
                      : "border-hairline bg-transparent text-subtext hover:border-accent/30"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 p-1.5 ring-1 ring-emerald-500/15">
                    <AssetLogo kind="usdc" className="h-7 w-7" title="USDC" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-ink">Mock USDC</p>
                    <p className="text-[10px] text-quiet">6 Decimals</p>
                  </div>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extreme text-ink uppercase tracking-widest">Amount to Withdraw</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    disabled={withdrawBusy}
                    className="w-full rounded-2xl border border-hairline bg-surface-soft px-5 py-4 text-lg font-bold text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all disabled:opacity-50"
                  />
                  <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                    <AssetLogo kind={withdrawAsset === "SOL" ? "sol" : "usdc"} className="h-5 w-5" />
                    <span className="text-sm font-bold text-subtext uppercase">{withdrawAsset}</span>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] font-medium text-subtext leading-relaxed space-y-1">
                  <span className="block">
                    <span className="font-semibold text-ink">Shielded</span>{" "}
                    {withdrawAsset === "SOL" ? (
                      <span className="inline-flex items-center gap-1.5 tabular-nums text-ink">
                        <AssetLogo kind="sol" className="h-3.5 w-3.5" />
                        {privateTreasurySol ?? "…"} SOL
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 tabular-nums text-ink">
                        <AssetLogo kind="usdc" className="h-3.5 w-3.5" />
                        {privateTreasuryUsdc ?? "…"} mock USDC
                      </span>
                    )}
                    <span className="text-quiet"> · withdraw limit</span>
                  </span>
                  <span className="block">
                    {walletBalancesLoading ? (
                      <span>Loading public wallet balances…</span>
                    ) : walletBalances ? (
                      <>
                        Public wallet (devnet, fees + rent):{" "}
                        <span className="inline-flex items-center gap-1 tabular-nums font-semibold text-ink">
                          <AssetLogo kind="sol" className="h-3.5 w-3.5" />
                          {walletBalances.sol.toFixed(4)} SOL
                        </span>
                        {" · "}
                        <span className="inline-flex items-center gap-1 tabular-nums font-semibold text-ink">
                          <AssetLogo kind="usdc" className="h-3.5 w-3.5" />
                          {walletBalances.usdc.toFixed(2)} mock USDC
                        </span>
                      </>
                    ) : walletBalancesFetched && primaryWallet ? (
                      <span className="text-quiet">Could not load public wallet balances from devnet RPC.</span>
                    ) : primaryWallet ? (
                      <span className="text-quiet">Loading connected wallet balances…</span>
                    ) : (
                      <>Connect a Solana wallet to sign withdrawals.</>
                    )}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extreme text-ink uppercase tracking-widest">Recipient Wallet Address</label>
                  {primaryWallet && (
                    <button
                      type="button"
                      onClick={() => setWithdrawRecipient(primaryWallet.address)}
                      disabled={withdrawBusy}
                      className="text-[10px] font-extreme text-accent uppercase tracking-wider hover:underline disabled:opacity-50"
                    >
                      Use Connected Wallet
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Paste Solana public key (defaults to your connected signer)"
                  value={withdrawRecipient}
                  onChange={(e) => setWithdrawRecipient(e.target.value)}
                  disabled={withdrawBusy}
                  className="w-full rounded-2xl border border-hairline bg-surface-soft px-5 py-4 text-xs font-bold text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all font-mono disabled:opacity-50"
                />
                
              </div>

              {withdrawLog && (
                <div className="rounded-2xl border border-hairline bg-surface-soft p-4 space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-ping rounded-full bg-accent" />
                    <span className="text-[10px] font-extreme text-ink uppercase tracking-widest">Withdrawal log</span>
                  </div>
                  <p className="text-[11px] font-semibold text-subtext leading-relaxed font-mono whitespace-pre-line">{withdrawLog}</p>
                </div>
              )}

              {withdrawError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-4 text-xs font-semibold text-red-600 dark:text-red-400 animate-fade-in leading-relaxed">
                  Error: {withdrawError}
                </div>
              )}

              {withdrawSuccess && withdrawSig && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50 p-4 space-y-2 animate-fade-in">
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Withdrawal confirmed</p>
                  <a
                    href={`https://solscan.io/tx/${withdrawSig}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
                  >
                    <span>View signature on Solscan</span>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={withdrawBusy || !withdrawAmount}
              onClick={handleWithdraw}
              className="w-full rounded-2xl bg-ink py-4 text-sm font-extreme text-white shadow-lift hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed dark:bg-accent flex items-center justify-center gap-2"
            >
              {withdrawBusy ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <span>Processing Private Withdrawal...</span>
                </>
              ) : (
                <span>Withdraw from private balance</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Composition + History */}
      <div className="lg:col-span-3">
        {/* Treasury activity */}
        <div className="rounded-[2.5rem] border border-hairline bg-elevated shadow-card lg:col-span-3 overflow-hidden flex flex-col min-h-[320px]">
          <div className="border-b border-hairline px-8 py-6 bg-surface-soft/30">
            <h2 className="font-display text-2xl font-extreme tracking-tight text-ink">Treasury Activity</h2>
            <p className="mt-1 text-sm font-bold text-subtext">
              Settled checkouts and recorded withdrawals (newest first).
            </p>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto flex-1">
            <table className="w-full min-w-[480px] text-left">
              <thead>
                <tr className="border-b border-hairline text-[11px] font-extreme uppercase tracking-[0.2em] text-quiet">
                  <th className="px-8 py-5">Type</th>
                  <th className="px-8 py-5">Asset</th>
                  <th className="px-8 py-5">Amount</th>
                  <th className="px-8 py-5 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-8 py-8"><Skeleton className="h-6 w-20 rounded-xl" /></td>
                      <td className="px-8 py-8"><Skeleton className="h-4 w-12" /></td>
                      <td className="px-8 py-8"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-8 py-8 text-right"><Skeleton className="h-4 w-32 ml-auto" /></td>
                    </tr>
                  ))
                ) : activityRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-subtext font-medium">
                      No treasury activity yet. Settle a checkout or complete a withdrawal to see entries here.
                    </td>
                  </tr>
                ) : (
                  activityRows.map((tx) => (
                    <tr key={`${tx.kind}-${tx.id}`} className="transition-all hover:bg-surface-soft/50">
                      <td className="px-8 py-6">
                        {tx.kind === "deposit" ? (
                          <span className="inline-flex rounded-xl bg-emerald-500 px-3 py-1.5 text-[10px] font-extreme uppercase tracking-widest text-white shadow-lift">
                            Deposit
                          </span>
                        ) : (
                          <span className="inline-flex rounded-xl bg-violet-500 px-3 py-1.5 text-[10px] font-extreme uppercase tracking-widest text-white shadow-lift">
                            Withdrawal
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <AssetBadge asset={tx.asset} size="sm" />
                      </td>
                      <td className="px-8 py-6 tabular-nums font-bold text-ink text-sm">{tx.amount}</td>
                      <td className="px-8 py-6 text-right text-xs font-bold text-subtext">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Policy card */}
      <div className="rounded-[2.5rem] border border-hairline bg-surface-solid p-10 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <TreasurixMark size={160} />
        </div>
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h3 className="font-display text-2xl font-extreme tracking-tight text-ink">Treasury Policy</h3>
              <p className="mt-2 text-sm font-medium text-subtext max-w-2xl">
                Define your target pool composition. The AI Treasury Advisor monitors drift and
                recommends <code className="rounded-lg bg-surface-soft border border-hairline px-2 py-1 font-mono text-xs font-bold text-accent">swapWithChange()</code> rebalancing
                when allocation deviates.
              </p>
            </div>
            <span className="shrink-0 rounded-2xl bg-surface-soft px-5 py-2.5 text-xs font-extreme text-ink border border-hairline shadow-sm">
              Auto-advisor: <span className="text-accent animate-pulse">Coming Soon</span>
            </span>
          </div>
          <dl className="mt-10 grid gap-6 sm:grid-cols-3">
            {(
              [
                { label: "Target SOL", value: "30%", kind: "sol" as const },
                { label: "Target USDC", value: "70%", kind: "usdc" as const },
                { label: "Drift threshold", value: "5%", kind: null },
              ] as const
            ).map((row) => (
              <div key={row.label} className="flex flex-col gap-2 rounded-[1.5rem] border border-hairline bg-surface-soft p-6 shadow-sm">
                <dt className="flex items-center gap-2 text-[10px] font-extreme uppercase tracking-widest text-quiet">
                  {row.kind ? <AssetLogo kind={row.kind} className="h-4 w-4" title={row.label} /> : null}
                  {row.label}
                </dt>
                <dd className="text-xl font-extreme text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {toast && <Toast message={toast} onBlur={() => setToast(null)} />}
    </div>
  );
}
