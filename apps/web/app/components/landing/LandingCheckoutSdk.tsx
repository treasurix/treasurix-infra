import Link from "next/link";
import { codeToHtml } from "shiki";

/** Source shown on the marketing site — keep in sync with `treasurix-checkout-sdk` API. */
export const LANDING_CHECKOUT_SDK_SNIPPET = `import { TreasurixCheckoutClient } from "treasurix-checkout-sdk";

// Integrators pass only the secret. Owner sets TREASURIX_ORIGIN on this server (Treasurix API origin).
// Public pay-link host is configured by the owner in the dashboard (per API key).
const client = new TreasurixCheckoutClient({
  apiKey: process.env.TREASURIX_API_KEY!,
});

const session = await client.createCheckoutSession({
  label: "Invoice #4291",
  amount: "25.00",
  asset: "Mock USDC",
  customerEmail: "billing@customer.com",
});

console.log(session.checkoutUrl);`;

/** Server-rendered checkout SDK sample using Shiki (Node runtime — avoid Edge). */
export async function LandingCheckoutSdk() {
  const html = await codeToHtml(LANDING_CHECKOUT_SDK_SNIPPET, {
    lang: "typescript",
    theme: "github-dark",
  });

  return (
    <section
      id="developers"
      className="relative scroll-mt-28 border-y border-hairline bg-gradient-to-b from-surface-soft/40 via-canvas to-canvas py-24 sm:py-32"
      aria-labelledby="landing-developers-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/25 to-transparent" />
      <div className="mx-auto max-w-content px-6 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-[2rem] border border-hairline bg-elevated p-8 shadow-[0_28px_90px_-32px_rgba(92,46,255,0.22)] ring-1 ring-black/[0.03] dark:shadow-[0_28px_90px_-32px_rgba(139,92,246,0.18)] dark:ring-white/[0.06] sm:p-10 md:p-12">
            <h2
              id="landing-developers-heading"
              className="font-display text-2xl font-extreme tracking-tight text-ink sm:text-3xl"
            >
              Create checkout in a few lines
            </h2>
            <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-subtext">
              Developers wire up checkout with a server-side API key; you choose the public pay-link URL per key in the dashboard
              (or rely on Treasurix defaults). Hosted links still settle into the same treasury you see here.
            </p>

            <div className="landing-sdk-shiki mt-8 overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0d1117] shadow-inner dark:border-slate-700/90">
              <div
                className="[&_pre.shiki]:m-0 [&_pre.shiki]:overflow-x-auto [&_pre.shiki]:px-5 [&_pre.shiki]:py-5 [&_pre.shiki]:sm:px-6 [&_pre.shiki]:sm:py-6 [&_pre.shiki]:text-[13px] [&_pre.shiki]:leading-[1.7]"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>

            <div className="mt-6 flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium leading-relaxed text-subtext">
                <span className="font-extreme text-ink">Server-side only</span> — never expose{" "}
                <code className="rounded-md bg-surface-soft px-1.5 py-0.5 font-mono text-[11px] text-ink">trx_live_</code> keys in
                the browser. Install:{" "}
                <code className="rounded-md bg-surface-soft px-1.5 py-0.5 font-mono text-[11px] text-ink">treasurix-checkout-sdk</code>
              </p>
              <Link
                href="/login?start=1"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-extreme text-white shadow-sm transition hover:bg-accent-hover active:scale-[0.98]"
              >
                Get an API key
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
