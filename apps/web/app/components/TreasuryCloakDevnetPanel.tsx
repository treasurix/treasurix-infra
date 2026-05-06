"use client";

import { usePrivy } from "@privy-io/react-auth";
import {
  type ConnectedStandardSolanaWallet,
  useCreateWallet,
  useWallets,
} from "@privy-io/react-auth/solana";
import { LAMPORTS_PER_SOL, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { useCallback, useMemo, useState } from "react";
import { syncUserWithServer } from "@/lib/auth-sync-client";
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
import { Toast } from "./ui/Toast";
import { AssetLogo } from "./assets/AssetLogo";

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

export function TreasuryCloakDevnetPanel() {
  const { getAccessToken, user } = usePrivy();
  const { wallets, ready } = useWallets();
  const { createWallet } = useCreateWallet();
  const [solAmount, setSolAmount] = useState("0.05");
  const [usdcAmount, setUsdcAmount] = useState("10");
  const [log, setLog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastSig, setLastSig] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const primaryWallet = useMemo(() => wallets[0] ?? null, [wallets]);

  const explorerUrl = (sig: string) =>
    `https://solscan.io/tx/${encodeURIComponent(sig)}?cluster=devnet`;

  const handleShieldSol = useCallback(async () => {
    setError(null);
    setLastSig(null);
    if (!primaryWallet) {
      setError("Connect a Solana wallet (Privy embedded or external on devnet).");
      return;
    }
    if (!user?.id) {
      setError("Sign in so deposits attach to your treasury private balance.");
      return;
    }

    const parsed = Number(solAmount);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 2) {
      setError("Enter a SOL amount between 0 and 2 (devnet).");
      return;
    }

    const lamports = BigInt(Math.floor(parsed * LAMPORTS_PER_SOL));
    setBusy(true);
    setLog("Loading Cloak SDK…");

    try {
      const {
        CLOAK_PROGRAM_ID,
        createUtxo,
        getNkFromUtxoPrivateKey,
        NATIVE_SOL_MINT,
        transact,
      } = await import("@cloak.dev/sdk-devnet");

      const connection = getDevnetConnection();
      const walletOpts = buildCloakWalletOptions(primaryWallet);
      setLog("Preparing treasury shield note…");
      const treasuryOwner = await getTreasuryOwnerKeypair(getAccessToken);
      const senderNk = getNkFromUtxoPrivateKey(treasuryOwner.privateKey);
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
          onProgress: (s) => setLog(s),
        },
      );

      const uw = await loadTreasuryUtxoWallet(getAccessToken);
      uw.addUtxo(result.outputUtxos[0], NATIVE_SOL_MINT);
      await saveTreasuryUtxoWallet(getAccessToken, uw);

      setLastSig(result.signature);
      setLog("SOL shielded into treasury private balance.");
      void syncUserWithServer(getAccessToken, {
        transaction: { signature: result.signature, kind: "cloak_devnet_sol_deposit" },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setLog(null);
    } finally {
      setBusy(false);
    }
  }, [primaryWallet, solAmount, getAccessToken, user?.id]);

  const handleShieldUsdc = useCallback(async () => {
    setError(null);
    setLastSig(null);
    if (!primaryWallet) {
      setError("Connect a Solana wallet (Privy embedded or external on devnet).");
      return;
    }
    if (!user?.id) {
      setError("Sign in so deposits attach to your treasury private balance.");
      return;
    }

    const parsed = Number(usdcAmount);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
      setError("Enter mock USDC between 0 and 100 (devnet, 6 decimals). Mint via faucet first.");
      return;
    }

    const micro = BigInt(Math.floor(parsed * 1_000_000));
    setBusy(true);
    setLog("Loading Cloak SDK…");

    try {
      const {
        CLOAK_PROGRAM_ID,
        createUtxo,
        getNkFromUtxoPrivateKey,
        DEVNET_MOCK_USDC_MINT,
        transact,
      } = await import("@cloak.dev/sdk-devnet");

      const connection = getDevnetConnection();
      const walletOpts = buildCloakWalletOptions(primaryWallet);
      setLog("Preparing treasury mock-USDC shield note…");
      const treasuryOwner = await getTreasuryOwnerKeypair(getAccessToken);
      const senderNk = getNkFromUtxoPrivateKey(treasuryOwner.privateKey);
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
          onProgress: (s) => setLog(s),
        },
      );

      const uw = await loadTreasuryUtxoWallet(getAccessToken);
      uw.addUtxo(result.outputUtxos[0], DEVNET_MOCK_USDC_MINT);
      await saveTreasuryUtxoWallet(getAccessToken, uw);

      setLastSig(result.signature);
      setLog("Mock USDC shielded into treasury private balance.");
      void syncUserWithServer(getAccessToken, {
        transaction: { signature: result.signature, kind: "cloak_devnet_usdc_deposit" },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setLog(null);
    } finally {
      setBusy(false);
    }
  }, [primaryWallet, usdcAmount, getAccessToken, user?.id]);

  const handleCreateSolanaWallet = async () => {
    setError(null);
    try {
      await createWallet();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleFaucetUsdc = async () => {
    if (!primaryWallet) {
      setError("Connect a Solana wallet first.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("https://devnet.cloak.ag/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: primaryWallet.address,
          amount: 100_000_000,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { signature?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? `Faucet HTTP ${res.status}`);
        return;
      }
      if (data.signature) {
        setLastSig(data.signature);
        setLog("Mock USDC mint requested.");
        void syncUserWithServer(getAccessToken, {
          transaction: { signature: data.signature, kind: "cloak_devnet_mock_usdc_faucet" },
        });
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} — open https://devnet.cloak.ag/privacy/faucet if the browser blocks the request.`
          : String(e),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-hairline bg-elevated p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-medium text-ink">Treasurix Shield Pool</h2>
          <p className="mt-1 max-w-xl text-sm text-subtext">
            Relay <span className="font-mono text-xs text-ink">{CLOAK_DEVNET_RELAY_URL.replace(/^https:\/\//, "")}</span>
            {" · "}
            Program <span className="font-mono text-xs text-ink">{CLOAK_DEVNET_PROGRAM_ID.slice(0, 8)}…</span>
            . Deposit SOL with <code className="rounded bg-stone-100 px-1 font-mono text-[11px]">transact</code> per
            the SDK quickstart. Fund SOL from{" "}
            <a className="text-accent underline" href="https://faucet.solana.com/" target="_blank" rel="noreferrer">
              faucet.solana.com
            </a>
            . Mock USDC mint{" "}
            <span className="font-mono text-[11px] text-quiet">{DEVNET_MOCK_USDC_MINT.slice(0, 6)}…</span>
            :{" "}
            <a
              className="text-accent underline"
              href="https://devnet.cloak.ag/privacy/faucet"
              target="_blank"
              rel="noreferrer"
            >
              Shield faucet
            </a>
            .
          </p>
        </div>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">
          RPC · {getDevnetRpcUrl().replace(/^https:\/\//, "")}
        </span>
      </div>

      {!ready ? (
        <div className="mt-4 flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
          <p className="text-xs font-bold text-subtext uppercase tracking-widest opacity-60">Initializing wallets</p>
        </div>
      ) : !primaryWallet ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-950">
          <p>No Solana wallet on this account yet.</p>
          <button
            type="button"
            onClick={handleCreateSolanaWallet}
            className="mt-3 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white"
          >
            Create embedded Solana wallet
          </button>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <p className="font-mono text-xs text-subtext">
            Signer: <span className="text-ink">{primaryWallet.address}</span>
          </p>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(primaryWallet.address);
              setToast("Wallet address copied");
            }}
            className="rounded-lg bg-surface-soft p-1.5 text-subtext hover:bg-surface-solid hover:text-accent transition-all active:scale-90"
            title="Copy address"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="inline-flex items-center gap-2 font-medium text-ink">
            <AssetLogo kind="sol" className="h-4 w-4" title="SOL" />
            SOL to shield
          </span>
          <input
            type="number"
            min={0.001}
            step={0.01}
            max={2}
            value={solAmount}
            onChange={(e) => setSolAmount(e.target.value)}
            className="w-40 rounded-lg border border-hairline bg-transparent py-2 text-ink"
            disabled={busy || !primaryWallet}
          />
        </label>
        <button
          type="button"
          disabled={busy || !primaryWallet}
          onClick={handleShieldSol}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Working…" : "Shield SOL (devnet)"}
        </button>
        <button
          type="button"
          disabled={busy || !primaryWallet}
          onClick={handleFaucetUsdc}
          className="rounded-full border border-stone-200 px-6 py-2.5 text-sm font-semibold text-ink bg-transparent active:bg-accent active:text-white disabled:opacity-50"
        >
          Mint 100 mock USDC
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="inline-flex items-center gap-2 font-medium text-ink">
            <AssetLogo kind="usdc" className="h-4 w-4" title="Mock USDC" />
            Mock USDC to shield
          </span>
          <input
            type="number"
            min={0.000001}
            step={0.01}
            max={100}
            value={usdcAmount}
            onChange={(e) => setUsdcAmount(e.target.value)}
            className="w-40 rounded-lg border border-hairline bg-transparent py-2 text-ink"
            disabled={busy || !primaryWallet}
          />
        </label>
        <button
          type="button"
          disabled={busy || !primaryWallet}
          onClick={handleShieldUsdc}
          className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Working…" : "Shield mock USDC"}
        </button>
      </div>

      {log ? <p className="mt-4 text-sm text-subtext">{log}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {lastSig ? (
        <p className="mt-2 text-sm">
          <a className="text-accent underline" href={explorerUrl(lastSig)} target="_blank" rel="noreferrer">
            View transaction on Solscan
          </a>
        </p>
      ) : null}

      {toast && <Toast message={toast} onBlur={() => setToast(null)} />}
    </div>
  );
}
