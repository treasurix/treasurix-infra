"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { TreasurixMark } from "./TreasurixMark";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useCreateWallet, type ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { getDevnetConnection } from "@/lib/solana-devnet";
import { CLOAK_DEVNET_RELAY_URL } from "@/lib/cloak-devnet-reference";
import { syncUserWithServer } from "@/lib/auth-sync-client";
import { SuccessModal } from "./ui/SuccessModal";
import { AssetLogo, assetKindFromLabel } from "@/app/components/assets/AssetLogo";
import type { DemoCheckoutLink } from "./CheckoutConsole";

/* ── Wallet helper ──────────────────────────────────────────────────── */

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

/* ── Component ──────────────────────────────────────────────────────── */

export function PaymentCheckout({ link }: { link: DemoCheckoutLink }) {
  const { authenticated, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const primaryWallet = useMemo(() => wallets[0] ?? null, [wallets]);

  const [status, setStatus] = useState<"idle" | "busy" | "success" | "error">("idle");
  const [log, setLog] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [isSettledLocal, setIsSettledLocal] = useState(false);

  const isSettled = link.status === "settled" || isSettledLocal;
  const isExpired = link.status === "expired";

  const handlePay = useCallback(async () => {
    if (!primaryWallet) return;

    // Merchant "private treasury" in the dashboard uses a persisted owner key + UtxoWallet.
    // This hosted pay path still uses ephemeral payer keys and an internal shield-to-shield step;
    // use dashboard checkout shield to accrue funds into the merchant private balance.
    
    setStatus("busy");
    setLog("Initializing Cloak SDK…");
    setErrorMessage(null);

    try {
      const {
        CLOAK_PROGRAM_ID,
        DEVNET_MOCK_USDC_MINT: SDK_USDC_MINT,
        createUtxo,
        createZeroUtxo,
        generateUtxoKeypair,
        getNkFromUtxoPrivateKey,
        NATIVE_SOL_MINT,
        transact,
      } = await import("@cloak.dev/sdk-devnet");

      const connection = getDevnetConnection();
      const walletOpts = buildCloakWalletOptions(primaryWallet);
      
      const amount = Number(link.amount);
      const isUsdc = (link.asset as string) === "Mock USDC" || (link.asset as string) === "USDC";
      const decimals = isUsdc ? 6 : 9;
      const mint = isUsdc ? SDK_USDC_MINT : NATIVE_SOL_MINT;
      const finalAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));



      setLog("Generating cryptographic keypairs…");
      const senderUtxoKeypair = await generateUtxoKeypair();
      const senderNk = getNkFromUtxoPrivateKey(senderUtxoKeypair.privateKey);

      // 1. Register Viewing Key
      setLog("Registering viewing key for privacy…");
      const { registerViewingKey } = await import("@cloak.dev/sdk-devnet");
      await registerViewingKey(
        CLOAK_DEVNET_RELAY_URL,
        walletOpts.walletPublicKey,
        senderNk,
        walletOpts.signMessage
      ).catch(() => { /* may already be registered */ });

      // 2. Deposit into the shield pool
      // CRITICAL: For USDC, the zero UTXO must match the output mint.
      // Docs: "createZeroUtxo(MINT) — circuit requires the padding zero UTXO to match the output mint."
      setLog(`Shielding ${amount} ${isUsdc ? "USDC" : "SOL"}…`);
      const depositOutput = await createUtxo(finalAmount, senderUtxoKeypair, mint);
      const zeroUtxo = isUsdc
        ? await createZeroUtxo(SDK_USDC_MINT)
        : await createZeroUtxo();


      setLog("Generating zk-SNARK proof (this may take up to 45 seconds)…");

      const depositResult = await transact(
        {
          inputUtxos: [zeroUtxo],
          outputUtxos: [depositOutput],
          externalAmount: finalAmount,
          depositor: walletOpts.depositorPublicKey,
        },
        {
          connection,
          programId: CLOAK_PROGRAM_ID,
          relayUrl: CLOAK_DEVNET_RELAY_URL,
          chainNoteViewingKeyNk: senderNk,
          ...walletOpts,
          enforceViewingKeyRegistration: false,
          onProgress: (msg) => {
            setLog(msg);
          },
        }
      );

      const shieldedUtxo = depositResult.outputUtxos[0];

      setLog("Deposit confirmed. Preparing merchant transfer…");

      // 3. Transfer shielded funds to the merchant's wallet
      // Wait for on-chain commitment to settle (required by docs)
      setLog("Waiting for on-chain commitment to settle (≈20s)…");
      await new Promise((resolve) => setTimeout(resolve, 20_000));

      // Generate a recipient UTXO keypair for the merchant
      const recipientUtxoKeypair = await generateUtxoKeypair();
      const recipientOutput = await createUtxo(finalAmount, recipientUtxoKeypair, mint);

      setLog("Transferring shielded funds to merchant…");


      const transferResult = await transact(
        {
          inputUtxos: [shieldedUtxo],
          outputUtxos: [recipientOutput],
          externalAmount: BigInt(0), // shield-to-shield, no external flow
        },
        {
          connection,
          programId: CLOAK_PROGRAM_ID,
          relayUrl: CLOAK_DEVNET_RELAY_URL,
          chainNoteViewingKeyNk: senderNk,
          ...walletOpts,
          cachedMerkleTree: depositResult.merkleTree,
          useUniqueNullifiers: true,
          enforceViewingKeyRegistration: false,
          onProgress: (msg) => {
            setLog(msg);
          },
        }
      );


      setTxSignature(transferResult.signature);
      setIsSettledLocal(true);
      setStatus("success");
      setLog("Settlement confirmed.");

      // Update link status in DB
      await fetch("/api/checkout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: link.id,
          status: "settled",
          txSignature: transferResult.signature,
        }),
      });

      // Sync user
      void syncUserWithServer(getAccessToken, {
        transaction: { signature: transferResult.signature, kind: "checkout_payment" }
      });

    } catch (err: unknown) {
      const e = err as { message?: string; name?: string; logs?: string[]; getLogs?: () => Promise<string[]> };
      let msg = e.message || "Payment failed. Please try again.";

      if (e.name === "SendTransactionError" || (e.message && e.message.includes("simulation failed"))) {
        try {
          if (e.logs?.length) {
            msg += ` (Details: ${e.logs[e.logs.length - 1]})`;
          } else if (typeof e.getLogs === "function") {
            const logs = await e.getLogs();
            if (Array.isArray(logs) && logs.length > 0) {
              msg += ` (Details: ${logs[logs.length - 1]})`;
            }
          }
        } catch {
          /* ignore log fetch errors */
        }

        fetch("/api/checkout", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: link.id,
            status: "failed",
            txSignature: null,
          }),
        }).catch(() => {});
      }

      setErrorMessage(msg);
      setStatus("error");
      setLog(null);
    }
  }, [link, primaryWallet, getAccessToken]);

  const explorerUrl = (sig: string) =>
    `https://solscan.io/tx/${encodeURIComponent(sig)}?cluster=devnet`;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-canvas">
      {/* ── Left Side: Order Summary ────────────────────────────────── */}
      <div className="flex w-full flex-col justify-between border-b border-hairline bg-surface-soft/30 p-8 lg:fixed lg:bottom-0 lg:left-0 lg:top-0 lg:w-[42%] lg:border-b-0 lg:border-r lg:p-16">
        <div className="space-y-16">
          <Link href="/" className="flex items-center gap-3 animate-fade-in">
            <TreasurixMark size={36} className="text-accent" />
            <span className="font-display text-lg font-bold tracking-tight text-ink">Treasurix</span>
          </Link>

          <div className="space-y-4 animate-fade-up">
            <div className="space-y-1">
              <p className="text-[10px] font-extreme uppercase tracking-[0.2em] text-quiet">Paying Merchant</p>
              <p className="font-mono text-xs font-bold text-ink">{link.merchantId.split(':')[2] || link.merchantId}</p>
            </div>
            
            <div className="pt-8">
              <h1 className="font-display text-6xl font-extreme tracking-tighter text-ink lg:text-7xl">
                {link.amount}
                <span className="ml-3 inline-flex items-center gap-2 text-2xl font-medium text-accent">
                  <AssetLogo kind={assetKindFromLabel(link.asset)} className="h-8 w-8 lg:h-10 lg:w-10" title={link.asset} />
                  {link.asset}
                </span>
              </h1>
              <p className="mt-4 text-lg font-medium text-subtext leading-relaxed">{link.label}</p>
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-8 animate-fade-in">
          <div className="space-y-4 rounded-3xl border border-hairline bg-elevated/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-subtext">Amount</span>
              <span className="flex items-center gap-2 font-bold text-ink">
                <span className="tabular-nums">{link.amount}</span>
                <AssetLogo kind={assetKindFromLabel(link.asset)} className="h-4 w-4" title={link.asset} />
                {link.asset}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-subtext">Fee</span>
              <span className="flex items-center gap-2 font-bold text-emerald-500">
                <span className="tabular-nums">0.00</span>
                <AssetLogo kind={assetKindFromLabel(link.asset)} className="h-4 w-4" title={link.asset} />
                {link.asset}
              </span>
            </div>
            <div className="border-t border-hairline pt-4 flex items-center justify-between">
              <span className="text-base font-extreme text-ink">Total due</span>
              <span className="flex items-center gap-2 text-xl font-extreme text-accent">
                <span className="tabular-nums">{link.amount}</span>
                <AssetLogo kind={assetKindFromLabel(link.asset)} className="h-5 w-5" title={link.asset} />
                {link.asset}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-4 opacity-60">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-[11px] font-medium leading-relaxed text-subtext">
              This transaction is protected by zero-knowledge proofs. Your wallet balance and history remain private on Cloak.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Side: Payment Methods ─────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 lg:ml-[42%] lg:p-16">
        <div className="w-full max-w-md animate-fade-in">
          {isSettled || status === "success" ? (
            <div className="flex flex-col items-center text-center">
              <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5">
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-display text-3xl font-extreme tracking-tight text-ink">Payment Successful</h2>
              <p className="mt-4 text-base font-medium text-subtext">
                Your payment has been shielded and settled securely.
              </p>
              {(txSignature || link.txSignature) && (
                <a 
                  href={explorerUrl(txSignature || link.txSignature || "")} 
                  target="_blank" 
                  rel="noreferrer"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-hairline bg-elevated px-6 py-3 text-sm font-bold text-ink shadow-sm hover:shadow-md transition-all"
                >
                  View on Solscan
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              <Link href="/" className="mt-12 text-sm font-extreme text-accent hover:underline">
                Return to Treasurix
              </Link>
            </div>
          ) : isExpired ? (
            <div className="flex flex-col items-center text-center">
              <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 text-stone-400">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="font-display text-2xl font-extreme tracking-tight text-ink">Link Expired</h2>
              <p className="mt-4 text-sm font-medium text-subtext">
                This payment link is no longer active. Please contact the merchant for a new one.
              </p>
              <Link href="/" className="mt-12 text-sm font-extreme text-accent hover:underline">
                Return Home
              </Link>
            </div>
          ) : (
            <div className="space-y-10">
              <div>
                <h2 className="font-display text-2xl font-extreme tracking-tight text-ink">Payment method</h2>
                <p className="mt-2 text-sm font-medium text-subtext">Connect your wallet to pay securely.</p>
              </div>

              {!authenticated ? (
                <button
                  onClick={() => login()}
                  className="w-full rounded-[2rem] bg-accent p-5 text-base font-extreme text-white shadow-lift hover:bg-accent-hover transition-all active:scale-95"
                >
                  Connect with Privy
                </button>
              ) : !primaryWallet ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-subtext">No Solana wallet connected to this account.</p>
                  <button
                    onClick={() => createWallet()}
                    className="w-full rounded-[2rem] bg-ink p-5 text-base font-extreme text-white shadow-lift transition-all active:scale-95 dark:bg-accent"
                  >
                    Create Embedded Wallet
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Wallet Info Card */}
                  <div className="rounded-[2rem] border-2 border-accent/20 bg-elevated p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extreme uppercase tracking-widest text-quiet">Wallet Address</p>
                        <button 
                          onClick={() => {
                            void navigator.clipboard.writeText(primaryWallet.address);
                            setLog("Address copied to clipboard");
                            setTimeout(() => setLog(null), 2000);
                          }}
                          className="mt-1 block w-full text-left truncate font-mono text-sm font-bold text-ink hover:text-accent transition-colors active:scale-[0.98]"
                          title="Click to copy address"
                        >
                          {primaryWallet.address}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Payment Logic Card */}
                  <div className="space-y-4">
                    <button
                      disabled={status === "busy"}
                      onClick={handlePay}
                      className="group relative w-full overflow-hidden rounded-[2rem] bg-ink p-5 text-base font-extreme text-white shadow-lift transition-all enabled:active:scale-95 dark:bg-accent"
                    >
                      <div className="relative z-10 flex items-center justify-center gap-3">
                        {status === "busy" && (
                          <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        )}
                        {status === "busy" ? "Processing..." : "Pay Privately"}
                      </div>
                      {status !== "busy" && (
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                      )}
                    </button>
                    <p className="text-center text-[10px] font-extreme uppercase tracking-widest text-quiet">
                      Settles instantly via Shielded Protocol
                    </p>
                  </div>

                  {/* Log or Error */}
                  {log && (
                    <div className="flex items-center gap-3 rounded-2xl bg-surface-soft px-4 py-3 border border-hairline">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                      <p className="text-xs font-bold text-subtext">{log}</p>
                    </div>
                  )}
                  {errorMessage && (
                    <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4">
                      <p className="text-xs font-bold text-red-500">{errorMessage}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {status === "success" && (
        <SuccessModal 
          message={`Successfully shielded and settled ${link.amount} ${link.asset}.`} 
          onClose={() => setStatus("idle")} 
        />
      )}
    </div>
  );
}
