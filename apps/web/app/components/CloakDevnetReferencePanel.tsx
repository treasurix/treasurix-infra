import {
  CLOAK_DEVNET_FAUCET_URL,
  CLOAK_DEVNET_PROGRAM_ID,
  CLOAK_DEVNET_RELAY_URL,
  DEVNET_MOCK_USDC_MINT,
  NATIVE_SOL_MINT,
  SOLANA_DEVNET_FAUCET_URL,
} from "@/lib/cloak-devnet-reference";
import { getDevnetRpcUrl } from "@/lib/solana-devnet";
import { AssetLogo } from "@/app/components/assets/AssetLogo";

export function CloakDevnetReferencePanel() {
  const rpc = getDevnetRpcUrl();

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm ring-1 ring-stone-100/80">
        <h2 className="font-display text-lg font-medium text-ink">Devnet infrastructure</h2>
        <p className="mt-1 text-sm text-subtext">
          Same endpoints as the Cloak devnet quickstart — relay, RPC, and program ID your wallet uses
          when shielding from this dashboard.
        </p>
        <dl className="mt-5 grid gap-3 font-mono text-xs sm:grid-cols-2">
          <div className="rounded-xl bg-stone-50 px-3 py-2 ring-1 ring-stone-100">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-quiet">Relay</dt>
            <dd className="mt-1 break-all text-ink">{CLOAK_DEVNET_RELAY_URL}</dd>
          </div>
          <div className="rounded-xl bg-stone-50 px-3 py-2 ring-1 ring-stone-100">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-quiet">Solana RPC</dt>
            <dd className="mt-1 break-all text-ink">{rpc}</dd>
          </div>
          <div className="rounded-xl bg-stone-50 px-3 py-2 ring-1 ring-stone-100 sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-quiet">Program</dt>
            <dd className="mt-1 break-all text-ink">{CLOAK_DEVNET_PROGRAM_ID}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-stone-200/90 bg-white shadow-sm ring-1 ring-stone-100/80">
        <div className="border-b border-stone-100 px-5 py-4">
          <h3 className="font-display text-base font-medium text-ink">Supported assets</h3>
          <p className="mt-1 text-xs text-subtext">
            Real Circle USDC and USDT are not on devnet — use SOL or mock USDC below.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-[10px] font-semibold uppercase tracking-wider text-quiet">
                <th className="px-5 py-3">Token</th>
                <th className="px-5 py-3">Mint</th>
                <th className="px-5 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="text-subtext">
              <tr className="border-b border-stone-50">
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-2 font-medium text-ink">
                    <AssetLogo kind="sol" className="h-5 w-5" title="SOL" />
                    SOL
                  </span>
                </td>
                <td className="px-5 py-3 font-mono text-xs">{NATIVE_SOL_MINT}</td>
                <td className="px-5 py-3 text-xs">
                  Native — fund via{" "}
                  <a className="text-accent underline" href={SOLANA_DEVNET_FAUCET_URL} target="_blank" rel="noreferrer">
                    faucet.solana.com
                  </a>
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-2 font-medium text-ink">
                    <AssetLogo kind="usdc" className="h-5 w-5" title="Mock USDC" />
                    Mock USDC
                  </span>
                </td>
                <td className="px-5 py-3 font-mono text-xs">{DEVNET_MOCK_USDC_MINT}</td>
                <td className="px-5 py-3 text-xs">
                  6 decimals, devnet-only — mint from the{" "}
                  <a className="text-accent underline" href={CLOAK_DEVNET_FAUCET_URL} target="_blank" rel="noreferrer">
                    Cloak faucet
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-quiet">
        Install <code className="rounded bg-stone-100 px-1 py-0.5 font-mono">@cloak.dev/sdk-devnet</code> for a
        surface identical to mainnet, with program ID, relay, and{" "}
        <code className="rounded bg-stone-100 px-1 py-0.5 font-mono">DEVNET_MOCK_USDC_MINT</code> pre-wired.
      </p>
    </div>
  );
}
