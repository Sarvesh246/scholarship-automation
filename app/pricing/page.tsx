import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] relative overflow-hidden">
      <div className="gradient-orb orb-gold" style={{ top: "-300px", right: "-200px" }} />
      <div className="gradient-orb orb-blue" style={{ bottom: "-200px", left: "-200px" }} />

      <div className="mx-auto flex max-w-4xl flex-col px-6 pb-16 pt-10 relative z-10">
        <header className="flex items-center justify-between gap-4 pb-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-600 shadow-md">
              <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
            <span className="text-sm font-bold font-heading">
              ApplyPilot
            </span>
          </Link>
          <Link
            href="/auth/sign-in"
            className="btn-outline text-xs py-1.5 px-4"
          >
            Sign in
          </Link>
        </header>

        <section className="space-y-3">
          <h1 className="text-3xl font-bold font-heading tracking-tight">Pricing</h1>
          <p className="max-w-xl text-sm text-[var(--muted)]">
            Start with the Free plan. Upgrade only if ApplyPilot
            becomes essential to how you manage applications.
          </p>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-[var(--surface)] p-6 shadow-md border border-[var(--border)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-2)]">
              Free
            </p>
            <p className="mt-2 text-3xl font-bold font-heading">$0</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              For students testing a more structured workflow.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Up to 10 active scholarships
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Application pipeline board
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Essay workspace
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Basic deadline reminders
              </li>
            </ul>
            <Link
              href="/auth/sign-up"
              className="btn-gold mt-6 w-full block text-center text-sm py-2.5"
            >
              Get started
            </Link>
          </div>

          <div className="rounded-2xl bg-[var(--surface)] p-6 shadow-md border border-amber-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-600 to-amber-400" />
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
              Pro (coming soon)
            </p>
            <p className="mt-2 text-3xl font-bold font-heading">$10</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Per month.</p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Unlimited scholarships and essays
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Advanced organization tools
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Priority updates
              </li>
            </ul>
            <button
              disabled
              className="mt-6 w-full rounded-lg border border-dashed border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] cursor-not-allowed"
            >
              Pro is in design — Free is ready
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
