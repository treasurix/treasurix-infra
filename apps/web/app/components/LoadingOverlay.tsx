"use client";

import { TreasurixMark } from "./TreasurixMark";

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-canvas/60 backdrop-blur-2xl animate-fade-in">
      <div className="relative flex items-center justify-center">
        {/* Large premium spinner */}
        <div className="absolute h-32 w-32 animate-spin rounded-full border-[3px] border-accent/20 border-t-accent" />
        <div className="absolute h-24 w-24 animate-spin-slow rounded-full border-[2px] border-fuchsia-500/10 border-t-fuchsia-500/40" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-elevated shadow-2xl border border-hairline">
          <TreasurixMark size={40} className="animate-pulse" />
        </div>
      </div>
      {message && (
        <div className="mt-12 flex flex-col items-center gap-2">
          <p className="font-display text-2xl font-extreme tracking-tight text-ink animate-pulse">
            {message}
          </p>
          <p className="text-sm font-bold text-subtext uppercase tracking-widest opacity-60">
            Securing shielded session
          </p>
        </div>
      )}
    </div>
  );
}
