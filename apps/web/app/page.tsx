import Link from "next/link";
import { SiteHeader } from "./components/SiteHeader";
import { TreasurixMark } from "./components/TreasurixMark";
import { LandingCheckoutSdk } from "./components/landing/LandingCheckoutSdk";
import { LandingHeroDashboardPreview } from "./components/landing/LandingHeroDashboardPreview";



const featureBlocks = [
  {
    title: "Hosted flows",
    body: "Branded payment links, checkout sessions, and recipient portals — polished UX that still settles through Cloak.",
    tags: "Links · expiry · success URLs",
  },
  {
    title: "Developer SDKs",
    body: "Issue hosted checkouts from your backend with treasurix-checkout-sdk — API keys map to your treasury pool and dashboard.",
    tags: "TypeScript · trx_live_ keys · retries",
  },
  {
    title: "Proofs & compliance",
    body: "Groth16-verified transfers, viewing-key exports, and AI-assisted audit memos when you need plain-language records.",
    tags: "ZK · exports · narratives",
  },
] as const;

const steps = [
  {
    n: "1",
    title: "Create a payment",
    body: "Define amount, currency (SOL or mock USDC), and flow — invoice, checkout, or treasury move.",
  },
  {
    n: "2",
    title: "Shield & route",
    body: "Treasurix submits Cloak transacts on Solana devnet; amounts and parties stay off the public ledger.",
  },
  {
    n: "3",
    title: "Notify & reconcile",
    body: "Webhooks fire across shielding, transfer, and withdrawal; your systems automate fulfillment and reporting.",
  },
] as const;

const pricing = [
  {
    name: "Pilot",
    price: "$0",
    period: "/ mo",
    blurb: "Hackathon & early teams",
    features: ["Devnet flows", "Dashboard placeholders", "Webhook test mode"],
    cta: "Start building",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$29",
    period: "/ mo",
    blurb: "Illustrative — active merchants",
    features: ["Custom branding", "Webhook logs & retries", "Org-scoped API keys"],
    cta: "Contact sales",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    blurb: "Volume, SLAs, dedicated envs",
    features: ["Priority support", "Custom integrations", "Compliance reviews"],
    cta: "Talk to us",
    highlight: false,
  },
] as const;

const faqs = [
  {
    q: "What does Treasurix provide?",
    a: "Private business payments on Solana: checkout, invoices, and treasury — with Cloak shielding, business-level SDKs, and webhook-driven automation.",
  },
  {
    q: "Who is it for?",
    a: "Merchants, finance teams, treasury operators, and developers who need stablecoin or SOL payouts without exposing amounts and routing on-chain.",
  },
  {
    q: "How fast can we integrate?",
    a: "You can model flows in minutes with the SDK and devnet; production hardening follows your auth, key management, and compliance requirements.",
  },
  {
    q: "What about compliance?",
    a: "Viewing keys stay with your organisation. Export periods, scan notes, and generate audit narratives — shielded history is not leaked by default.",
  },
] as const;

function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="ambient-blur absolute -left-24 top-0 h-[500px] w-[500px] rounded-full bg-violet-600/10 dark:bg-violet-600/20" />
      <div className="ambient-blur absolute right-0 top-32 h-[600px] w-[600px] rounded-full bg-accent/10 dark:bg-accent/20" />
      <div className="ambient-blur absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-fuchsia-600/10 dark:bg-fuchsia-600/20" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,var(--bg)_85%)]" />
    </div>
  );
}

export default function Home() {
  return (
    <div className="bg-canvas transition-colors duration-300">
      <SiteHeader />

      <main className="relative">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-32 pb-24 sm:pt-48 sm:pb-32">
          <HeroBackdrop />
          <div className="relative mx-auto max-w-content px-6 sm:px-8">
            <div className="flex flex-col items-center text-center mb-20">
              <h1 className="font-display text-balance text-[clamp(2.5rem,8vw,5.5rem)] font-extreme leading-[1] tracking-tight text-ink animate-fade-up">
                Private payments for
                <span className="block bg-gradient-to-r from-accent via-fuchsia-500 to-indigo-500 bg-clip-text text-transparent pb-2">
                  modern finance.
                </span>
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed font-medium text-subtext sm:text-xl animate-fade-up" style={{ animationDelay: '0.1s' }}>
                Your money behaves the way you planned—allocated as intended, privately executed, and governed by your rules.
              </p>
              
              <div className="mt-12 flex flex-wrap items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
                <Link
                  href="/login?start=1"
                  className="group relative inline-flex items-center gap-2 rounded-2xl bg-accent px-10 py-5 text-base font-extreme text-white shadow-lift transition-all hover:scale-105 hover:bg-accent-hover active:scale-95"
                >
                  Launch app
                  <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <a
                  href="#developers"
                  className="inline-flex rounded-2xl border border-hairline bg-surface-solid px-10 py-5 text-base font-extreme text-ink shadow-sm transition-all hover:bg-surface-soft active:scale-95"
                >
                  View SDK
                </a>
              </div>
              <p className="mt-6 animate-fade-up text-center" style={{ animationDelay: '0.25s' }}>
                <a
                  href="#how"
                  className="text-sm font-bold text-accent underline-offset-4 hover:underline"
                >
                  How shielding works →
                </a>
              </p>
            </div>

            {/* Dashboard product preview */}
            <div className="relative mx-auto max-w-6xl animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <LandingHeroDashboardPreview />
            </div>
          </div>
        </section>

        {/* LOGO STRIP / STATS */}
        <section className="py-20 border-y border-hairline bg-surface-soft/30">
          <div className="mx-auto max-w-content px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 items-center justify-items-center opacity-60 grayscale hover:grayscale-0 transition-all">
              {['Solana', 'Cloak', 'ZK-SNARKs', 'Neon Postgres'].map(l => (
                <span key={l} className="text-xl font-extreme text-ink tracking-tighter">{l}</span>
              ))}
            </div>
          </div>
        </section>

        <LandingCheckoutSdk />

        {/* FEATURES GRID */}
        <section id="product" className="py-32 bg-canvas">
          <div className="mx-auto max-w-content px-6">
            <div className="mb-20 text-center">
              <h2 className="font-display text-4xl sm:text-5xl font-extreme tracking-tight text-ink">Built for Scale.</h2>
              <p className="mt-4 text-lg font-medium text-subtext max-w-2xl mx-auto">
                Modern payment infrastructure that respects privacy and meets your operational needs.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {featureBlocks.map((f, i) => (
                <article
                  key={f.title}
                  className="group relative rounded-[2.5rem] border border-hairline bg-elevated p-10 shadow-sm transition-all hover:shadow-card hover:-translate-y-2"
                >
                  <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-accent-soft text-2xl text-accent group-hover:bg-accent group-hover:text-white transition-all shadow-sm">
                    {i === 0 ? '✦' : i === 1 ? '◆' : '❖'}
                  </div>
                  <h3 className="text-xl font-extreme text-ink tracking-tight">{f.title}</h3>
                  <p className="mt-4 text-base font-medium leading-relaxed text-subtext">{f.body}</p>
                  <p className="mt-8 text-[11px] font-extreme text-quiet uppercase tracking-[0.2em]">{f.tags}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="py-32 bg-surface-soft/50 border-y border-hairline relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
            <TreasurixMark size={800} className="absolute -top-1/2 -left-1/4 rotate-12" />
          </div>
          <div className="mx-auto max-w-content px-6 relative z-10">
            <div className="grid gap-20 lg:grid-cols-2 items-center">
              <div>
                <h2 className="font-display text-4xl sm:text-5xl font-extreme tracking-tight text-ink">Three Steps to<br />Private Payouts.</h2>
                <div className="mt-12 space-y-6">
                  {steps.map((s) => (
                    <div
                      key={s.n}
                      className="group flex gap-6 rounded-[2rem] border border-hairline bg-elevated p-8 transition-all hover:border-accent/40 hover:shadow-card"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white font-extreme text-lg shadow-lift">
                        {s.n}
                      </span>
                      <div>
                        <h3 className="text-lg font-extreme text-ink tracking-tight">{s.title}</h3>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-subtext">{s.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[3rem] border border-hairline bg-elevated p-12 shadow-2xl">
                <div className="mb-10 inline-flex rounded-xl bg-accent-soft px-4 py-1.5 text-xs font-extreme text-accent uppercase tracking-widest">
                  Infrastructure Log
                </div>
                <dl className="space-y-6 font-mono text-[11px] font-bold">
                  {[
                    ["Circuit Type", "PLONK / Groth16"],
                    ["Public Data", "0 bytes leaked"],
                    ["On-Chain Asset", "Shielded SOL"],
                    ["Verifier", "Cloak Pool V1.5"],
                    ["Finality", "Confirmed"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-hairline pb-4 group">
                      <dt className="text-quiet group-hover:text-ink transition-colors uppercase tracking-widest">{k}</dt>
                      <dd className={v === "Confirmed" ? "text-emerald-500" : "text-ink"}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-10 p-6 rounded-2xl bg-surface-soft border border-hairline">
                  <p className="text-[10px] font-extreme text-subtext uppercase tracking-widest mb-2 leading-relaxed">
                    All operations are verified locally before being submitted to the Solana Devnet.
                  </p>
                  <div className="h-1.5 w-full bg-hairline rounded-full">
                    <div className="h-full w-full bg-accent rounded-full shimmer" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-32 bg-canvas">
          <div className="mx-auto max-w-content px-6">
            <div className="mb-20 text-center">
              <h2 className="font-display text-4xl sm:text-5xl font-extreme tracking-tight text-ink">Transparent Pricing.</h2>
              <p className="mt-4 text-lg font-medium text-subtext">Built for individuals and teams of all sizes.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {pricing.map((tier) => (
                <div
                  key={tier.name}
                  className={`relative flex flex-col rounded-[2.5rem] p-10 border-2 transition-all hover:scale-[1.02] ${tier.highlight
                    ? "border-accent bg-elevated shadow-lift"
                    : "border-hairline bg-elevated shadow-sm hover:shadow-card"
                    }`}
                >
                  {tier.highlight && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-[10px] font-extreme text-white uppercase tracking-widest shadow-lift">
                      Most Popular
                    </span>
                  )}
                  <p className="text-sm font-extreme text-ink uppercase tracking-widest opacity-60">{tier.name}</p>
                  <p className="mt-8 flex items-baseline gap-1">
                    <span className="font-display text-5xl font-extreme text-ink tracking-tighter">{tier.price}</span>
                    <span className="text-sm font-bold text-subtext">{tier.period}</span>
                  </p>
                  <p className="mt-4 text-sm font-medium text-subtext">{tier.blurb}</p>
                  <ul className="mt-10 flex-1 space-y-4">
                    {tier.features.map((f) => (
                      <li key={f} className="flex gap-3 text-sm font-bold text-ink items-center">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {tier.name === "Pilot" ? (
                    <Link
                      href="/login?start=1"
                      className={`mt-10 block w-full rounded-2xl py-4 text-center text-sm font-extreme transition-all active:scale-95 ${tier.highlight
                        ? "bg-accent text-white shadow-lift hover:bg-accent-hover"
                        : "bg-surface-soft text-ink hover:bg-surface-solid border border-hairline shadow-sm"
                        }`}
                    >
                      {tier.cta}
                    </Link>
                  ) : (
                    <a
                      href="#cta"
                      className={`mt-10 block w-full rounded-2xl py-4 text-center text-sm font-extreme transition-all active:scale-95 ${tier.highlight
                        ? "bg-accent text-white shadow-lift hover:bg-accent-hover"
                        : "bg-surface-soft text-ink hover:bg-surface-solid border border-hairline shadow-sm"
                        }`}
                    >
                      {tier.cta}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-hairline bg-surface-soft/20 py-24 sm:py-28">
          <div className="mx-auto max-w-content px-6 sm:px-8">
            <h2 className="text-center font-display text-3xl font-extreme tracking-tight text-ink sm:text-4xl">
              Questions
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-sm font-medium text-subtext">
              Straight answers for operators evaluating private settlement on Solana.
            </p>
            <div className="mx-auto mt-12 max-w-2xl space-y-3">
              {faqs.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-hairline bg-elevated px-5 py-4 shadow-sm open:shadow-md transition-shadow"
                >
                  <summary className="cursor-pointer list-none font-extreme text-ink [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {item.q}
                      <span className="text-accent transition-transform group-open:rotate-180">▾</span>
                    </span>
                  </summary>
                  <p className="mt-3 border-t border-hairline pt-3 text-sm font-medium leading-relaxed text-subtext">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section id="cta" className="py-40 bg-canvas relative overflow-hidden">
          <div className="absolute inset-0 bg-accent/5 dark:bg-accent/10 blur-3xl rounded-full scale-150 pointer-events-none" />
          <div className="relative z-10 mx-auto max-w-content px-6 text-center">
            <h2 className="font-display text-5xl sm:text-7xl font-extreme tracking-tighter text-ink leading-[1]">
              Ready to build the future<br />of private finance?
            </h2>
            <p className="mx-auto mt-10 max-w-2xl text-lg sm:text-xl font-medium text-subtext leading-relaxed">
              Start accepting private payments on Solana today with Treasurix Checkout and Treasury infrastructure.
            </p>
            <div className="mt-12 flex flex-wrap justify-center gap-6">
              <Link
                href="/login"
                className="rounded-2xl bg-accent px-12 py-6 text-lg font-extreme text-white shadow-lift hover:scale-105 hover:bg-accent-hover transition-all active:scale-95"
              >
                Launch app for Free
              </Link>
              <a
                href="#how"
                className="rounded-2xl border border-hairline bg-surface-solid px-12 py-6 text-lg font-extreme text-ink shadow-sm hover:bg-surface-soft transition-all active:scale-95"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-elevated border-t border-hairline py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-16 md:grid-cols-2 lg:grid-cols-4">
            <div className="col-span-1 md:col-span-2 lg:col-span-1">
              <Link href="/" className="flex items-center gap-3">
                <TreasurixMark size={40} />
                <span className="font-display text-2xl font-extreme tracking-tighter text-ink">Treasurix</span>
              </Link>
              <p className="mt-6 text-base font-medium text-subtext leading-relaxed max-w-xs">
                Private business payments on Solana. Built for modern finance teams and privacy-conscious builders.
              </p>
            </div>
            {['Product', 'Developers', 'Company'].map((title, i) => (
              <div key={title}>
                <p className="text-xs font-extreme text-ink uppercase tracking-[0.2em] mb-8">{title}</p>
                <ul className="space-y-4">
                  {(
                    i === 0
                      ? [
                          ["Hosted Checkout", "#product"],
                          ["Treasury pool", "/dashboard/treasury/pool"],
                          ["Shielding flow", "#how"],
                        ]
                      : i === 1
                        ? [
                            ["Checkout SDK", "#developers"],
                            ["API keys", "/dashboard/developers/api-keys"],
                            ["Webhooks", "/dashboard/developers/webhooks"],
                          ]
                        : [
                            ["About", "#cta"],
                            ["Security", "#how"],
                            ["Legal", "#cta"],
                          ]
                  ).map(([l, href]) => (
                    <li key={l}>
                      <Link
                        href={href}
                        className="text-sm font-bold text-subtext hover:text-accent transition-colors"
                      >
                        {l}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-24 pt-8 border-t border-hairline flex flex-col md:flex-row justify-between items-center gap-6 opacity-60">
            <p className="text-xs font-bold text-subtext tracking-widest uppercase">
              &copy; 2026 Treasurix Infrastructure. Solana Devnet.
            </p>
            <div className="flex gap-8">
              <span className="text-[10px] font-extreme text-ink uppercase tracking-widest">Privacy Policy</span>
              <span className="text-[10px] font-extreme text-ink uppercase tracking-widest">Security Audit</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
