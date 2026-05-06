"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TreasurixMark } from "@/app/components/TreasurixMark";
import type { DemoCheckoutLink } from "@/app/components/CheckoutConsole";
import { PaymentCheckout } from "@/app/components/PaymentCheckout";
import Link from "next/link";

export default function PayPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [row, setRow] = useState<DemoCheckoutLink | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setRow(null);
      return;
    }

    const fetchLink = async () => {
      try {
        const res = await fetch(`/api/checkout/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setRow(data);
        } else if (res.status === 404) {
          setRow(null);
        } else {
          setError("Failed to load payment link.");
        }
      } catch (err) {
        console.error("Error fetching checkout link:", err);
        setError("An error occurred while loading the link.");
      }
    };

    fetchLink();
  }, [slug]);

  if (!slug || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
        <TreasurixMark size={40} className="mb-4" />
        <h1 className="font-display text-xl font-medium text-ink">{error || "Invalid link"}</h1>
        <p className="mt-2 max-w-md text-sm text-subtext">
          The link provided is invalid or could not be loaded. Please check the URL or contact the merchant.
        </p>
        <Link href="/" className="mt-8 text-sm font-semibold text-accent hover:underline">
          Return Home
        </Link>
      </div>
    );
  }

  if (row === undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas space-y-4">
        <div className="h-12 w-12 animate-spin text-accent">
          <svg className="h-full w-full" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-xs font-extreme uppercase tracking-widest text-subtext">Loading checkout...</p>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
        <TreasurixMark size={40} className="mb-4" />
        <h1 className="font-display text-xl font-medium text-ink">Link not found</h1>
        <p className="mt-2 max-w-md text-center text-sm text-subtext">
          This checkout link (<code className="rounded bg-surface-soft px-1.5 py-0.5 font-mono text-xs text-ink">{slug}</code>)
          does not exist or has been deleted.
        </p>
        <Link href="/" className="mt-8 text-sm font-semibold text-accent hover:underline">
          Go to Home
        </Link>
      </div>
    );
  }

  return <PaymentCheckout link={row} />;
}
