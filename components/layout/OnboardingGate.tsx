"use client";

import { ReactNode, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { getProfile } from "@/lib/profileStorage";
import type { Profile } from "@/types";

interface OnboardingGateProps {
  children: ReactNode;
}

// Don't block the app on profile fetch (keeps mobile sign-in fast). Render children
// immediately; redirect to onboarding in background when profile loads if needed.
export function OnboardingGate({ children }: OnboardingGateProps) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameFetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      pathnameFetchedRef.current = null;
      return;
    }
    getProfile().then((profile: Profile | null) => {
      if (!profile) return;
      pathnameFetchedRef.current = pathname;
      if (profile.onboardingComplete) return;
      if (profile.academics?.graduationYear?.trim()) return;
      if (pathname === "/app/onboarding") return;
      if (pathnameFetchedRef.current !== pathname) return;
      router.replace("/app/onboarding");
    });
  }, [user, pathname, router]);

  return <>{children}</>;
}
