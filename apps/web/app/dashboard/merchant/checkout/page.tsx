import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { CheckoutConsole } from "@/app/components/CheckoutConsole";

export default function MerchantCheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <DashboardPageHeader
        title="Checkout"
        description="Create and manage payment links — customers pay privately through Cloak on Solana devnet. SOL checkouts can be shielded directly; settlement produces Groth16-verified chain notes."
      />
      <CheckoutConsole />
    </div>
  );
}
