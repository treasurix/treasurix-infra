import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">404</p>
      <h1 className="mt-3 font-display text-2xl font-medium text-ink">Page not found</h1>
      <Link
        href="/"
        className="mt-8 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-accent-hover"
      >
        Return home
      </Link>
    </div>
  );
}
