"use client";

import Link from "next/link";
import { TreasurixMark } from "@/app/components/TreasurixMark";
import { Toast } from "@/app/components/ui/Toast";
import { useState } from "react";

export type DashboardNavSection = {
  title: string;
  items: { href: string; label: string; key: string }[];
};

const sections: DashboardNavSection[] = [
  {
    title: "Core",
    items: [
      { href: "/dashboard", label: "Overview", key: "overview" },
      { href: "/dashboard/merchant/checkout", label: "Checkout", key: "checkout" },
      // Payroll — paused: see `app/dashboard/payroll/batches/page.tsx`
      // { href: "/dashboard/payroll/batches", label: "Payroll", key: "payroll" },
      { href: "/dashboard/treasury/pool", label: "Treasury", key: "treasury" },
    ],
  },
  {
    title: "Developers",
    items: [
      { href: "/dashboard/developers/api-keys", label: "API keys", key: "api-keys" },
      { href: "/dashboard/developers/webhooks", label: "Webhooks", key: "webhooks" },
    ],
  },
  {
    title: "Business",
    items: [{ href: "/dashboard/settings", label: "Settings", key: "settings" }],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type DashboardSidebarProps = {
  pathname: string;
  onNavigate?: () => void;
  userLine: string;
  userSub?: string | null;
};

export function DashboardSidebar({ pathname, onNavigate, userLine, userSub }: DashboardSidebarProps) {
  const [toast, setToast] = useState<string | null>(null);
  const initials = userLine
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "T";

  return (
    <div className="flex h-full flex-col bg-elevated transition-theme">
      <div className="px-6 py-8">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3.5"
        >
          <TreasurixMark size={36} className="shrink-0" />
          <span className="font-display text-xl font-extreme tracking-tight text-ink">Treasurix</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        {sections.map((section) => (
          <div key={section.title} className="mb-10 last:mb-0">
            <p className="mb-4 px-4 text-[11px] font-extreme uppercase tracking-[0.2em] text-quiet opacity-60">
              {section.title}
            </p>
            <ul className="space-y-1.5">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={`block rounded-2xl px-4 py-3 text-sm font-bold transition-[background-color,color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${active
                          ? "bg-accent text-white shadow-lift scale-[1.02]"
                          : "text-subtext hover:bg-surface-soft hover:text-ink active:scale-95"
                        }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-6">
        <button
          onClick={() => {
            void navigator.clipboard.writeText(userLine);
            setToast("Address copied");
          }}
          className="group flex w-full items-center gap-4 rounded-3xl bg-surface-soft p-4 shadow-sm border border-hairline hover:bg-surface-solid transition-theme transition-[transform,box-shadow] duration-300 active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-solid text-sm font-extreme text-accent shadow-sm border border-hairline group-hover:bg-accent group-hover:text-white transition-colors">
            {initials}
          </div>
          <div className="flex min-w-0 flex-1 flex-col text-left">
            <p className="truncate text-sm font-extreme text-ink group-hover:text-accent transition-colors">{`${userLine.slice(0, 6)}…${userLine.slice(-4)}`}</p>
            {userSub ? <p className="truncate text-[10px] font-bold text-subtext uppercase tracking-tight">{userSub}</p> : null}
          </div>
          <div className="text-quiet group-hover:text-accent transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        </button>
      </div>

      <div className="px-8 pb-8">
        <p className="text-[10px] font-extreme uppercase tracking-[0.2em] text-quiet opacity-40">
          Powered by Treasurix Shield
        </p>
      </div>

      {toast && <Toast message={toast} onBlur={() => setToast(null)} />}
    </div>
  );
}
