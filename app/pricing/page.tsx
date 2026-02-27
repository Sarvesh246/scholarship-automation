import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex max-w-4xl flex-col px-6 pb-16 pt-10">
        <header className="flex items-center justify-between gap-4 pb-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary-soft)] text-xs font-semibold text-[var(--primary)] shadow-sm">
              SW
            </div>
            <span className="text-sm font-medium text-[var(--muted)]">
              Scholarship Workflow
            </span>
          </Link>
          <Link
            href="/auth/sign-in"
            className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)] hover:border-[var(--text)] hover:text-[var(--text)]"
          >
            Sign in
          </Link>
        </header>

        <section className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
          <p className="max-w-xl text-sm text-[var(--muted)]">
            Start with the Free plan. Upgrade only if Scholarship Workflow
            becomes essential to how you manage applications.
          </p>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-[var(--surface)] p-6 shadow-md ring-1 ring-[var(--border)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-2)]">
              Free
            </p>
            <p className="mt-2 text-3xl font-semibold">$0</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              For students testing a more structured workflow.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <li>Up to 10 active scholarships</li>
              <li>Application pipeline board</li>
              <li>Essay workspace</li>
              <li>Basic deadline reminders (UI only)</li>
            </ul>
            <Link
              href="/auth/sign-up"
              className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-hover)]"
            >
              Get started
            </Link>
          </div>

          <div className="rounded-xl bg-[var(--surface)] p-6 shadow-md ring-1 ring-[var(--border)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-2)]">
              Pro (coming soon)
            </p>
            <p className="mt-2 text-3xl font-semibold">$8</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Per month.</p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <li>Unlimited scholarships and essays</li>
              <li>Advanced organization tools</li>
              <li>Priority updates</li>
            </ul>
            <button
              disabled
              className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-dashed border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted)]"
            >
              Pro is in design—Free is ready
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

