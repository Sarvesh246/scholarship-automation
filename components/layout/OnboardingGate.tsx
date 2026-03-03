"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { getProfile } from "@/lib/profileStorage";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Profile } from "@/types";

interface OnboardingGateProps {
  children: ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const pathnameFetchedRef = useRef<string | null>(null);

  // Refetch profile when user or pathname changes so we see updated onboardingComplete after finishing onboarding
  useEffect(() => {
    if (!user) {
      setLoading(false);
      setProfile(null);
      pathnameFetchedRef.current = null;
      return;
    }
    setLoading(true);
    getProfile().then((p) => {
      setProfile(p);
      pathnameFetchedRef.current = pathname;
      setLoading(false);
    });
  }, [user, pathname]);

  useEffect(() => {
    if (loading || !profile) return;
    // Only show onboarding to first-time users: not completed and no existing profile data
    if (profile.onboardingComplete) return;
    if (profile.academics?.graduationYear?.trim()) return; // existing user with data
    if (pathname === "/app/onboarding") return;
    // Only redirect after we've refetched for this pathname (avoids redirect loop when navigating away from onboarding)
    if (pathnameFetchedRef.current !== pathname) return;
    router.replace("/app/onboarding");
  }, [loading, profile, pathname, router]);

  if (user && loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return <>{children}</>;
}
