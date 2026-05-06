import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { TreasuryPoolDashboard } from "@/app/components/TreasuryPoolDashboard";

export default function TreasuryPoolPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <DashboardPageHeader
        title="Treasury"
        description="Monitor your shielded pool balances, deposit SOL or mock USDC into the Cloak devnet pool, and manage treasury operations — all settlement uses Groth16 proofs on Solana devnet."
      />
      <TreasuryPoolDashboard />
    </div>
  );
}
