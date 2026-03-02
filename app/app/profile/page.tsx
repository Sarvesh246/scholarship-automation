"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { getProfile, saveProfile } from "@/lib/profileStorage";
import { updateUserDisplayName } from "@/lib/auth";
import { useUser } from "@/hooks/useUser";
import type { Profile } from "@/types";

function computeCompletion(p: Profile): number {
  let filled = 0;
  if (p.academics?.gpa?.trim()) filled++;
  if (p.academics?.major?.trim()) filled++;
  if (p.academics?.graduationYear?.trim()) filled++;
  if ((p.activities?.length ?? 0) > 0) filled++;
  if ((p.awards?.length ?? 0) > 0) filled++;
  const finKeys = p.financial && typeof p.financial === "object" ? Object.values(p.financial) : [];
  if (finKeys.some((v) => typeof v === "string" && v.trim())) filled++;
  const total = 6;
  return Math.round((filled / total) * 100);
}

export default function ProfilePage() {
  const { showToast } = useToast();
  const { displayName, email, initials } = useUser();
  const [fullName, setFullName] = useState("");
  const [academics, setAcademics] = useState({ gpa: "", major: "", graduationYear: "" });
  const [activities, setActivities] = useState<{ id: string; name: string; role: string }[]>([]);
  const [awards, setAwards] = useState<{ id: string; name: string; year: string }[]>([]);
  const [financial, setFinancial] = useState<Record<string, string>>({ context: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (displayName) setFullName(displayName);
  }, [displayName]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await getProfile();
      if (cancelled) return;
      setAcademics({
        gpa: p.academics?.gpa ?? "",
        major: p.academics?.major ?? "",
        graduationYear: p.academics?.graduationYear ?? ""
      });
      setActivities(Array.isArray(p.activities) ? p.activities : []);
      setAwards(Array.isArray(p.awards) ? p.awards : []);
      setFinancial(p.financial && Object.keys(p.financial).length > 0 ? p.financial : { context: "" });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const profile: Profile = {
    academics: { ...academics },
    activities: [...activities],
    awards: [...awards],
    financial: { ...financial }
  };
  const completion = Math.min(100, computeCompletion(profile));

  const handleSaveAll = async () => {
    if (academics.gpa && (isNaN(Number(academics.gpa)) || Number(academics.gpa) < 0 || Number(academics.gpa) > 5)) {
      showToast({ title: "Invalid GPA", message: "GPA must be a number between 0 and 5.0.", variant: "danger" });
      return;
    }
    const yr = academics.graduationYear;
    if (yr && (isNaN(Number(yr)) || Number(yr) < 2000 || Number(yr) > 2040)) {
      showToast({ title: "Invalid year", message: "Graduation year must be between 2000 and 2040.", variant: "danger" });
      return;
    }
    setSaving(true);
    if (fullName.trim() && fullName.trim() !== displayName) {
      await updateUserDisplayName(fullName.trim());
    }
    await saveProfile(profile);
    setSaving(false);
    showToast({
      title: "Profile saved",
      message: "Your profile has been saved.",
      variant: "success"
    });
  };

  const addActivity = () => {
    setActivities((prev) => [...prev, { id: `act-${Date.now()}`, name: "", role: "" }]);
  };
  const updateActivity = (id: string, field: "name" | "role", value: string) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };
  const removeActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const addAward = () => {
    setAwards((prev) => [...prev, { id: `award-${Date.now()}`, name: "", year: "" }]);
  };
  const updateAward = (id: string, field: "name" | "year", value: string) => {
    setAwards((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };
  const removeAward = (id: string) => {
    setAwards((prev) => prev.filter((a) => a.id !== id));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-16 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Share enough context for strong applications."
        primaryAction={
          <Button type="button" size="sm" onClick={handleSaveAll} disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </Button>
        }
      />

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between text-xs">
          <p className="font-medium text-[var(--muted)]">Profile completion</p>
          <p className="text-amber-400">{completion}%</p>
        </div>
        <ProgressBar value={completion} />
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-orange-500 text-lg font-bold text-black shrink-0">
            {initials}
          </div>
          <div className="flex-1 space-y-2">
            <Input
              label="Full name"
              placeholder="e.g. Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <p className="text-[10px] text-[var(--muted-2)]">{email || "No email on file"}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold font-heading">Academics</h3>
          </div>
          <Input
            label="GPA"
            placeholder="e.g. 3.7"
            value={academics.gpa}
            onChange={(e) => setAcademics((prev) => ({ ...prev, gpa: e.target.value }))}
          />
          <Input
            label="Major / area of study"
            placeholder="e.g. Computer Science"
            value={academics.major}
            onChange={(e) => setAcademics((prev) => ({ ...prev, major: e.target.value }))}
          />
          <Input
            label="Expected graduation year"
            placeholder="e.g. 2027"
            value={academics.graduationYear}
            onChange={(e) => setAcademics((prev) => ({ ...prev, graduationYear: e.target.value }))}
          />
          <Button type="button" size="sm" onClick={handleSaveAll} disabled={saving}>
            Save academics
          </Button>
        </Card>

        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold font-heading">Activities</h3>
            <Button type="button" variant="ghost" size="sm" onClick={addActivity}>
              Add
            </Button>
          </div>
          {activities.length === 0 ? (
            <p className="text-xs text-[var(--muted-2)]">No activities yet. Click Add to add one.</p>
          ) : (
            <div className="space-y-2">
              {activities.map((a) => (
                <div key={a.id} className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                  <Input
                    label="Activity"
                    placeholder="e.g. Community tutoring"
                    value={a.name}
                    onChange={(e) => updateActivity(a.id, "name", e.target.value)}
                  />
                  <Input
                    label="Role"
                    placeholder="e.g. Tutor"
                    value={a.role}
                    onChange={(e) => updateActivity(a.id, "role", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-end text-red-400"
                    onClick={() => removeActivity(a.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button type="button" size="sm" onClick={handleSaveAll} disabled={saving}>
            Save activities
          </Button>
        </Card>

        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold font-heading">Awards</h3>
            <Button type="button" variant="ghost" size="sm" onClick={addAward}>
              Add
            </Button>
          </div>
          {awards.length === 0 ? (
            <p className="text-xs text-[var(--muted-2)]">No awards yet. Click Add to add one.</p>
          ) : (
            <div className="space-y-2">
              {awards.map((a) => (
                <div key={a.id} className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                  <Input
                    label="Award name"
                    placeholder="e.g. Dean's List"
                    value={a.name}
                    onChange={(e) => updateAward(a.id, "name", e.target.value)}
                  />
                  <Input
                    label="Year"
                    placeholder="e.g. 2024"
                    value={a.year}
                    onChange={(e) => updateAward(a.id, "year", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-end text-red-400"
                    onClick={() => removeAward(a.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button type="button" size="sm" onClick={handleSaveAll} disabled={saving}>
            Save awards
          </Button>
        </Card>

        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold font-heading">Financial (optional)</h3>
          <Input
            label="Context"
            placeholder="Brief notes on your financial situation"
            value={financial.context ?? ""}
            onChange={(e) => setFinancial((prev) => ({ ...prev, context: e.target.value }))}
          />
          <Button type="button" size="sm" onClick={handleSaveAll} disabled={saving}>
            Save financial section
          </Button>
        </Card>
      </div>
    </div>
  );
}
