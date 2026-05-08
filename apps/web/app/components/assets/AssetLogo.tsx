import { cn } from "@/lib/utils";

export type AssetLogoKind = "sol" | "usdc";

const SRC: Record<AssetLogoKind, string> = {
  sol: "/assets/solana.png",
  usdc: "/assets/usdc.png",
};

/** Map checkout / treasury asset strings to logo kind (mock USDC → USDC logo). */
export function assetKindFromLabel(asset: string): AssetLogoKind {
  const a = asset.trim().toUpperCase();
  if (a === "SOL") return "sol";
  return "usdc";
}

type AssetLogoProps = {
  kind: AssetLogoKind;
  className?: string;
  title?: string;
  /** When the asset name is shown beside the logo, hide duplicate text from assistive tech / broken-image fallback. */
  decorative?: boolean;
};

export function AssetLogo({ kind, className, title, decorative }: AssetLogoProps) {
  const defaultAlt = kind === "sol" ? "Solana" : "USDC";
  return (
    <img
      src={SRC[kind]}
      alt={decorative ? "" : (title ?? defaultAlt)}
      title={title}
      aria-hidden={decorative ? true : undefined}
      decoding="async"
      className={cn("object-contain", className ?? "h-8 w-8")}
    />
  );
}

const badgeBox: Record<"sm" | "md" | "lg", string> = {
  sm: "h-6 w-6 p-0.5",
  md: "h-8 w-8 p-1",
  lg: "h-11 w-11 p-1.5",
};

/** Logo + asset label for tables and summaries. */
export function AssetBadge({
  asset,
  size = "md",
  className,
}: {
  asset: string;
  size?: keyof typeof badgeBox;
  className?: string;
}) {
  const kind = assetKindFromLabel(asset);
  const imgSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-6 w-6";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-surface-soft ring-1 ring-hairline",
          badgeBox[size],
        )}
      >
        <AssetLogo kind={kind} className={cn("object-contain", imgSize)} title={asset} decorative />
      </span>
      <span className="font-extreme text-ink text-sm">{asset}</span>
    </span>
  );
}
