"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getProfile, saveProfile } from "@/lib/profileStorage";
import { updateUserDisplayName } from "@/lib/auth";
import type { Profile } from "@/types";

const ONBOARDING_JUST_COMPLETE_KEY = "onboarding_just_complete";

export default function OnboardingPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [school, setSchool] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [gpa, setGpa] = useState("");
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradYear.trim()) {
      showToast({ title: "Graduation year is required", variant: "danger" });
      return;
    }
    const year = parseInt(gradYear, 10);
    if (isNaN(year) || year < 2000 || year > 2040) {
      showToast({ title: "Enter a valid graduation year (2000–2040)", variant: "danger" });
      return;
    }
    setSaving(true);
    try {
      const existing = await getProfile();
      if (name.trim()) await updateUserDisplayName(name.trim());
      const profile: Profile = {
        ...existing,
        academics: {
          ...existing.academics,
          graduationYear: gradYear.trim(),
          gpa: gpa.trim() || undefined,
        },
        demographics: {
          ...(existing.demographics ?? {}),
          ...(state.trim() && { state: state.trim() }),
          ...(school.trim() && { school: school.trim() }),
        },
        schoolName: school.trim() || existing.schoolName,
        onboardingComplete: true,
      };
      await saveProfile(profile);
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(ONBOARDING_JUST_COMPLETE_KEY, "1");
      showToast({ title: "Welcome! Set up complete.", variant: "success" });
      router.replace("/app/dashboard");
    } catch (err) {
      const message = err instanceof Error && err.message.includes("sign in") ? "Session expired. Please sign in again." : "Something went wrong. Try again.";
      showToast({ title: message, variant: "danger" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Welcome to ApplyPilot"
        subtitle="A few details help us personalize your experience. You can update these anytime in Profile."
      />
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
          />
          <Input
            label="State (optional)"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="e.g. CA"
          />
          <Input
            label="School (optional)"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="School or college name"
          />
          <Input
            label="Graduation year"
            value={gradYear}
            onChange={(e) => setGradYear(e.target.value)}
            placeholder="e.g. 2026"
            required
          />
          <Input
            label="GPA (optional)"
            value={gpa}
            onChange={(e) => setGpa(e.target.value)}
            placeholder="e.g. 3.5"
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Finish and go to Dashboard"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving || skipping}
              onClick={async () => {
                setSkipping(true);
                try {
                  const p = await getProfile();
                  await saveProfile({ ...p, onboardingComplete: true });
                  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(ONBOARDING_JUST_COMPLETE_KEY, "1");
                  router.replace("/app/dashboard");
                } catch {
                  showToast({ title: "Could not skip. Try again.", variant: "danger" });
                } finally {
                  setSkipping(false);
                }
              }}
            >
              {skipping ? "Skipping…" : "Skip for now"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
