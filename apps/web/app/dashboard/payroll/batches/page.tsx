import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";

/**
 * Payroll batches — temporarily disabled while checkout and treasury are in focus.
 * Re-enable navigation in `DashboardSidebar.tsx` when this module ships.
 */
export default function PayrollBatchesPlaceholder() {
  return (
    <div className="mx-auto max-w-3xl">
      <DashboardPageHeader
        title="Payroll · Batches"
        description="This area is commented out of the product navigation for now. Batch CSV upload, approvals, and compliance export will return in a later milestone."
      />
      {/*
      <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white/60 p-8 text-center text-sm text-subtext">
        Batch table and upload dropzone will live here.
      </div>
      */}
      <div className="mt-6 rounded-2xl border border-stone-200 bg-amber-50/50 p-6 text-sm text-amber-950 ring-1 ring-amber-200/60">
        <p className="font-medium">Payroll is paused in this build.</p>
        <p className="mt-2 text-subtext text-amber-950/90">
          Use <strong className="text-ink">Checkout</strong> for payment links and{" "}
          <strong className="text-ink">Treasury</strong> for Cloak devnet shielding.
        </p>
      </div>
    </div>
  );
}
