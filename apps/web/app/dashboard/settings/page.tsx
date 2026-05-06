import { DashboardPageHeader } from "@/app/components/dashboard/DashboardPageHeader";

export default function DashboardSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <DashboardPageHeader
        title="Settings"
        description="Organization defaults, notification channels, and compliance exports."
      />
      <div className="rounded-2xl border border-dashed border-stone-300 bg-hairline p-8 text-center text-sm text-subtext">
        Account preferences UI coming soon.
      </div>
    </div>
  );
}
