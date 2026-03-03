import { ReactNode } from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { OnboardingGate } from "@/components/layout/OnboardingGate";

export const metadata: Metadata = {
  title: "Workspace"
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <OnboardingGate>
        <AppShell>{children}</AppShell>
      </OnboardingGate>
    </AuthGate>
  );
}

