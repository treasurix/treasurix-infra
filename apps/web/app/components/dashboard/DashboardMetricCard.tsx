type DashboardMetricCardProps = {
  label: string;
  value: string;
  subValue?: string;
  caption?: string;
  trendLabel?: string;
  icon?: React.ReactNode;
};

export function DashboardMetricCard({
  label,
  value,
  subValue,
  caption,
  trendLabel,
  icon,
}: DashboardMetricCardProps) {
  return (
    <div className="rounded-[2rem] border border-hairline bg-elevated p-7 shadow-sm transition-[background-color,border-color,color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] hover:shadow-card hover:-translate-y-1 group">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-extreme uppercase tracking-[0.18em] text-quiet group-hover:text-ink transition-colors">
          {label}
        </p>
        {icon ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-soft text-accent group-hover:bg-accent group-hover:text-white transition-all shadow-sm border border-hairline">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex flex-col gap-1">
        <p className="font-display text-4xl font-extreme tracking-tight tabular-nums text-ink">
          {value}
        </p>
        {subValue && (
          <p className="text-sm font-extreme text-accent/80 tabular-nums">
            ≈ {subValue}
          </p>
        )}
        {caption ? (
          <p className="text-sm font-bold text-subtext leading-relaxed">
            {caption}
          </p>
        ) : null}
      </div>
      {trendLabel ? (
        <div className="mt-5 flex items-center gap-2">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-xs font-extreme text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            {trendLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}
