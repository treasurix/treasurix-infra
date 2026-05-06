import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";
import { ApiKeysPanel } from "@/app/components/dashboard/ApiKeysPanel";

export default function ApiKeysPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <DashboardPageHeader
        title="API keys"
        description="Server-side keys for treasurix-checkout-sdk. Checkout links created with a key are tied to your account and treasury pool."
      />
      <ApiKeysPanel />
    </div>
  );
}
