import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex max-w-6xl flex-col px-6 pb-16 pt-10">
        <header className="flex items-center justify-between gap-4 pb-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary)] shadow-sm">
              SW
            </div>
            <span className="text-sm font-medium text-[var(--muted)]">
              Scholarship Workflow
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/pricing"
              className="text-[var(--muted)] hover:text-[var(--text)]"
            >
              Pricing
            </Link>
            <Link
              href="/auth/sign-in"
              className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--muted)] hover:border-[var(--text)] hover:text-[var(--text)]"
            >
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-hover)]"
            >
              Start free
            </Link>
          </div>
        </header>

        <section className="grid gap-10 pb-16 pt-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--muted)] ring-1 ring-[var(--border)]">
              Built for focused scholarship workflows
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              A calm workspace for scholarship applications.
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-[var(--muted)] md:text-base">
              Track deadlines, organize documents, and keep essays in one
              structured dashboard. No noise, no gimmicks—just a clear path from
              “maybe I should apply” to submitted.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/auth/sign-up"
                className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-hover)]"
              >
                Start free
              </Link>
              <Link
                href="/auth/sign-in"
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:border-[var(--text)]"
              >
                See demo
              </Link>
              <p className="text-xs text-[var(--muted)]">
                No credit card required. Designed for real students.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--surface)] p-4 shadow-md ring-1 ring-[var(--border)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-[var(--muted)]">This week</span>
              </div>
              <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                Calm dashboard preview
              </span>
            </div>
            <div className="grid gap-4 pt-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-md bg-[var(--surface-2)] p-3">
                    <p className="text-[var(--muted)]">Deadlines this week</p>
                    <p className="mt-1 text-lg font-semibold">3</p>
                  </div>
                  <div className="rounded-md bg-[var(--surface-2)] p-3">
                    <p className="text-[var(--muted)]">In progress</p>
                    <p className="mt-1 text-lg font-semibold">5</p>
                  </div>
                </div>
                <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-2)]/60 p-3 text-xs">
                  <p className="font-medium">Next up</p>
                  <p className="mt-1 text-[var(--muted)]">
                    Finish essay for Horizon STEM Scholars and upload transcript
                    for Community Impact Grant.
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <p className="text-[var(--muted)]">Today&apos;s timeline</p>
                <div className="space-y-2 rounded-md bg-[var(--surface-2)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)]">Essay session</span>
                    <span className="text-[var(--muted-2)]">45 min</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--border)]">
                    <div className="h-1.5 w-2/3 rounded-full bg-[var(--primary)]" />
                  </div>
                  <p className="text-[10px] text-[var(--muted-2)]">
                    Small, focused steps. Clear next actions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 border-t border-[var(--border)] pt-10 md:grid-cols-3">
          <div>
            <h2 className="text-sm font-semibold">Why students feel stuck</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Scholarship tasks scatter across tabs, emails, and documents.
              It&apos;s easy to miss deadlines or lose momentum.
            </p>
          </div>
          <div className="space-y-3 text-sm text-[var(--muted)]">
            <p className="font-medium text-[var(--text)]">No clear next step</p>
            <p>
              Requirements, essays, and forms are split across sites. You have
              to remember what&apos;s done and what&apos;s not.
            </p>
          </div>
          <div className="space-y-3 text-sm text-[var(--muted)]">
            <p className="font-medium text-[var(--text)]">Hard to see progress</p>
            <p>
              Without a single view of your pipeline, it&apos;s hard to tell if
              you&apos;re on track—or where to focus today.
            </p>
          </div>
        </section>

        <section className="mt-12 grid gap-8 md:grid-cols-3">
          <div>
            <h2 className="text-sm font-semibold">How it works</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              A simple, guided workflow from idea to submitted application.
            </p>
          </div>
          <div className="space-y-3 rounded-lg bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--border)]">
            <p className="text-xs font-medium text-[var(--muted-2)]">
              Step 1
            </p>
            <p className="text-sm font-semibold">Collect scholarships</p>
            <p className="text-sm text-[var(--muted)]">
              Add scholarships you&apos;re considering and see them in a single,
              calm dashboard.
            </p>
          </div>
          <div className="space-y-3 rounded-lg bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--border)]">
            <p className="text-xs font-medium text-[var(--muted-2)]">
              Step 2
            </p>
            <p className="text-sm font-semibold">Work in focused steps</p>
            <p className="text-sm text-[var(--muted)]">
              Track documents, prompts, and essays in structured checklists so
              you always know what&apos;s next.
            </p>
          </div>
        </section>

        <section className="mt-12 rounded-xl bg-[var(--surface)] p-6 shadow-md ring-1 ring-[var(--border)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Pricing</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Start with the Free plan. Upgrade only if it becomes essential.
              </p>
            </div>
            <div className="grid gap-4 text-sm md:grid-cols-2 md:gap-6">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <p className="text-xs font-medium text-[var(--muted-2)]">
                  Free
                </p>
                <p className="mt-1 text-lg font-semibold">$0</p>
                <ul className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                  <li>Up to 10 active scholarships</li>
                  <li>Application pipeline board</li>
                  <li>Essay workspace</li>
                </ul>
              </div>
              <div className="rounded-lg border border-[var(--primary-soft)] bg-[var(--primary-soft)]/60 p-4">
                <p className="text-xs font-medium text-[var(--muted-2)]">
                  Pro (coming soon)
                </p>
                <p className="mt-1 text-lg font-semibold">$8 / month</p>
                <ul className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                  <li>Unlimited scholarships and essays</li>
                  <li>Advanced organization tools</li>
                  <li>Priority product updates</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-10 flex flex-col gap-3 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)] md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Scholarship Workflow.</p>
          <div className="flex gap-4">
            <button className="text-[var(--muted)] hover:text-[var(--text)]">
              Privacy
            </button>
            <button className="text-[var(--muted)] hover:text-[var(--text)]">
              Terms
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}

