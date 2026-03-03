import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ApplyPilot Privacy Policy – how we collect, use, and protect your data.",
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

export default function PrivacyPage() {
  return (
    <article className="text-[var(--text)]">
      <h1 className="text-2xl font-bold font-heading tracking-tight mb-1">Privacy Policy</h1>
      <p className="text-sm text-[var(--muted-2)] mb-8">Last updated: {LAST_UPDATED}</p>

      <Section title="1. Introduction">
        <p>
          ApplyPilot (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is a scholarship management and application workflow platform. We are committed to protecting your privacy and handling your data transparently.
        </p>
        <p>By using ApplyPilot, you agree to the practices described in this Privacy Policy.</p>
      </Section>

      <Section title="2. Information We Collect">
        <p>We collect the following types of information:</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-[var(--text)]">Account Information:</strong> Name, email address, authentication provider (e.g., Google), and profile details you choose to add.</li>
          <li><strong className="text-[var(--text)]">Scholarship Data:</strong> Applications you create, essays and uploaded content, deadlines and tracking information, and status updates.</li>
          <li><strong className="text-[var(--text)]">Usage Data:</strong> Log data (IP address, browser type, device info), pages visited, and interaction data.</li>
          <li><strong className="text-[var(--text)]">Cookies &amp; Similar Technologies:</strong> We use cookies to maintain login sessions, store preferences (e.g., theme), and improve performance.</li>
        </ul>
      </Section>

      <Section title="3. How We Use Your Information">
        <p>We use your data to:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Provide and operate the platform</li>
          <li>Store and manage your scholarship applications</li>
          <li>Send deadline reminders (if enabled)</li>
          <li>Improve performance and user experience</li>
          <li>Ensure security and prevent abuse</li>
        </ul>
        <p className="mt-3">We do not sell your personal data.</p>
      </Section>

      <Section title="4. Data Storage &amp; Security">
        <p>Your data is stored securely using trusted infrastructure providers (e.g., cloud database and authentication services). We implement reasonable safeguards to protect your data. However, no system is 100% secure.</p>
      </Section>

      <Section title="5. Data Sharing">
        <p>We do not sell or rent your data. We may share limited data with service providers that help operate the platform (e.g., hosting, authentication) and with legal authorities if required by law.</p>
      </Section>

      <Section title="6. Data Retention">
        <p>We retain your information as long as your account is active. If you delete your account, your data will be permanently removed from our systems, subject to reasonable backup retention periods.</p>
      </Section>

      <Section title="7. Your Rights">
        <p>Depending on your location, you may have the right to access your data, correct inaccurate data, delete your data, and export your data. You can export your data from your Settings page.</p>
      </Section>

      <Section title="8. Children&apos;s Privacy">
        <p>ApplyPilot is intended for users 13 years and older. If we become aware that we have collected personal data from a child under 13 without parental consent, we will delete that data.</p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p>We may update this Privacy Policy from time to time. Continued use of the platform means you accept the updated policy.</p>
      </Section>

      <Section title="10. Contact">
        <p>For questions regarding this policy, contact: <a href={`mailto:${CONTACT_EMAIL}`} className="text-[var(--primary)] hover:underline">{CONTACT_EMAIL}</a></p>
      </Section>
    </article>
  );
}
