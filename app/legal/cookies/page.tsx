import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "ApplyPilot Cookie Policy – how we use cookies and similar technologies.",
};

const LAST_UPDATED = "March 3, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold font-heading text-[var(--text)] mb-3">{title}</h2>
      <div className="text-sm text-[var(--muted)] leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function CookiesPage() {
  return (
    <article className="text-[var(--text)]">
      <h1 className="text-2xl font-bold font-heading tracking-tight mb-1">Cookie Policy</h1>
      <p className="text-sm text-[var(--muted-2)] mb-8">Last updated: {LAST_UPDATED}</p>

      <Section title="1. What Are Cookies?">
        <p>Cookies are small text files stored on your device to improve user experience.</p>
      </Section>

      <Section title="2. How We Use Cookies">
        <p>ApplyPilot uses cookies to:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Maintain login sessions</li>
          <li>Store theme preferences</li>
          <li>Improve site performance</li>
          <li>Analyze usage trends</li>
        </ul>
      </Section>

      <Section title="3. Types of Cookies We Use">
        <p><strong className="text-[var(--text)]">Essential Cookies:</strong> Required for authentication and core functionality.</p>
        <p><strong className="text-[var(--text)]">Preference Cookies:</strong> Store settings like dark/light mode.</p>
        <p><strong className="text-[var(--text)]">Analytics Cookies:</strong> Help us understand how users interact with the platform.</p>
      </Section>

      <Section title="4. Managing Cookies">
        <p>You can control cookies through your browser settings. Disabling essential cookies may limit platform functionality.</p>
      </Section>

      <Section title="5. Updates">
        <p>We may update this Cookie Policy periodically.</p>
      </Section>
    </article>
  );
}
