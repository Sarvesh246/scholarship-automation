import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "ApplyPilot Terms of Service – rules and conditions for using the platform.",
};

const CONTACT_EMAIL = "contact@applypilot.com";
const LAST_UPDATED = "March 3, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold font-heading text-[var(--text)] mb-3">{title}</h2>
      <div className="text-sm text-[var(--muted)] leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <article className="text-[var(--text)]">
      <h1 className="text-2xl font-bold font-heading tracking-tight mb-1">Terms of Service</h1>
      <p className="text-sm text-[var(--muted-2)] mb-8">Last updated: {LAST_UPDATED}</p>

      <Section title="1. Acceptance of Terms">
        <p>By accessing or using ApplyPilot, you agree to these Terms of Service. If you do not agree, do not use the platform.</p>
      </Section>

      <Section title="2. Description of Service">
        <p>ApplyPilot provides tools to discover scholarships, track deadlines, store essays and applications, and manage submission workflows. We do not guarantee scholarship awards or acceptance.</p>
      </Section>

      <Section title="3. User Responsibilities">
        <p>You agree to provide accurate information, keep your login secure, use the platform legally, and not attempt to exploit or disrupt the system. You are responsible for verifying scholarship requirements and deadlines.</p>
      </Section>

      <Section title="4. No Guarantee of Results">
        <p>ApplyPilot does not guarantee scholarship approval, application submission, or eligibility. You are responsible for confirming all details before submitting applications.</p>
      </Section>

      <Section title="5. Intellectual Property">
        <p>You retain ownership of your essays and content. You grant ApplyPilot permission to store and process your content for the purpose of providing the service. The platform design, branding, and software remain the property of ApplyPilot.</p>
      </Section>

      <Section title="6. Account Termination">
        <p>We may suspend or terminate accounts that violate these terms, abuse the platform, or attempt unauthorized access. You may delete your account at any time via Settings.</p>
      </Section>

      <Section title="7. Limitation of Liability">
        <p>ApplyPilot is provided &quot;as is.&quot; We are not liable for missed deadlines, lost data, scholarship rejection, or indirect damages. Use of the platform is at your own risk.</p>
      </Section>

      <Section title="8. Modifications">
        <p>We may modify these Terms at any time. Continued use constitutes acceptance.</p>
      </Section>

      <Section title="9. Governing Law">
        <p>These Terms are governed by the laws of the United States and the State of Texas.</p>
      </Section>

      <Section title="10. Contact">
        <p>For questions about these Terms: <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--primary)] hover:underline">{CONTACT_EMAIL}</a></p>
      </Section>
    </article>
  );
}
