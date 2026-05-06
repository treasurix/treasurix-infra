"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function setDarkClass(nextDark: boolean) {
  if (nextDark) document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

function SunGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M3 12h2.25m.386-6.364l1.591 1.591M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
      />
    </svg>
  );
}

function MoonGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
      />
    </svg>
  );
}

export type ThemeToggleProps = {
  /** Extra classes on the switch button */
  className?: string;
};

/**
 * Sliding light/dark switch; syncs with `class="dark"` on `document.documentElement`.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    setDarkClass(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "relative inline-flex h-9 w-14 shrink-0  items-center rounded-full border border-hairline bg-surface-soft shadow-inner",
        "transition-[background-color,border-color,box-shadow] duration-300 ease-out",
        "hover:border-hairline/80 active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "dark:bg-stone-900/80 dark:shadow-inner dark:shadow-black/20",
        "motion-reduce:transition-none motion-reduce:active:scale-100",
        className,
      )}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
    >
      <span className="pointer-events-none absolute inset-y-0 left-2 flex w-4 items-center justify-center text-quiet opacity-35 dark:opacity-25">
        <MoonGlyph className="h-3 w-3" />
      </span>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex w-4 items-center justify-center text-quiet opacity-35 dark:opacity-50">
        <SunGlyph className="h-3 w-3" />
      </span>

      <span
        className={cn(
          "absolute top-1 left-1 z-10 flex  h-6 w-6 items-center justify-center rounded-full bg-elevated text-ink shadow-md ring-1 ring-black/[0.08] dark:text-subtext dark:ring-white/[0.12]",
          "ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-safe:transition-[transform,box-shadow] motion-safe:duration-[320ms]",
          dark ? "translate-x-5 shadow-lg" : "translate-x-0",
        )}
      >
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out",
            dark ? "scale-90 opacity-0" : "scale-100 opacity-100",
          )}
        >
          <SunGlyph className="h-4 w-4 text-amber-500" />
        </span>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out",
            dark ? "scale-100 opacity-100" : "scale-90 opacity-0",
          )}
        >
          <MoonGlyph className="h-4 w-4 text-violet-400" />
        </span>
      </span>
    </button>
  );
}
