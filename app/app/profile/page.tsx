"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StateSelect } from "@/components/ui/StateSelect";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { MajorPillInput } from "@/components/ui/MajorPillInput";
import { LoadingScreenBlock } from "@/components/ui/LoadingScreen";
import { useToast } from "@/components/ui/Toast";
import { getProfile, saveProfile } from "@/lib/profileStorage";
import { updateUserDisplayName } from "@/lib/auth";
import { useUser } from "@/hooks/useUser";
import { invalidateMatchCache } from "@/lib/matchEngine";
import { getProfileCompletion, getMissingItemsForMatchUnlock } from "@/lib/profileCompletion";
import { expandMajor } from "@/lib/majorAbbreviations";
import type { Profile } from "@/types";

export default function ProfilePage() {
  const { showToast } = useToast();
  const { user, displayName, email, initials } = useUser();
  const [fullName, setFullName] = useState("");
  const [academics, setAcademics] = useState({ gpa: "", major: "", graduationYear: "" });
  const [activities, setActivities] = useState<{ id: string; name: string; role: string }[]>([]);
  const [awards, setAwards] = useState<{ id: string; name: string; year: string }[]>([]);
  const [financial, setFinancial] = useState<Record<string, string>>({ context: "" });
  const [location, setLocation] = useState({ country: "", state: "", city: "" });
  const [schoolName, setSchoolName] = useState("");
  const [gpaScale, setGpaScale] = useState<"4.0" | "5.0" | "custom">("4.0");
  const [gpaScaleCustom, setGpaScaleCustom] = useState("");
  const [intendedMajors, setIntendedMajors] = useState<string[]>([]);
  const [majorsFreeText, setMajorsFreeText] = useState("");
  const [timeBudgetPreference, setTimeBudgetPreference] = useState<"low" | "medium" | "high">("medium");
  const [essayPreference, setEssayPreference] = useState(true);
  const [needBasedInterest, setNeedBasedInterest] = useState(false);
  const [optionalEligibility, setOptionalEligibility] = useState<Profile["optionalEligibility"]>({});
  const [showOptionalSection, setShowOptionalSection] = useState(false);
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
      setLocation({
        country: p.location?.country ?? p.demographics?.country ?? "",
        state: p.location?.state ?? p.demographics?.state ?? "",
        city: p.location?.city ?? p.demographics?.city ?? "",
      });
      setSchoolName(p.schoolName ?? p.demographics?.school ?? "");
      setGpaScale(p.academics?.gpaScale === "5.0" ? "5.0" : p.academics?.gpaScale === "custom" ? "custom" : "4.0");
      setGpaScaleCustom(p.academics?.gpaScaleCustom != null ? String(p.academics.gpaScaleCustom) : "");
      setIntendedMajors(
        Array.isArray(p.intendedMajors) && p.intendedMajors.length > 0
          ? p.intendedMajors
          : (p.majorsFreeText ?? "")
              .split(/[,;]/)
              .map((s) => expandMajor(s.trim()))
              .filter(Boolean)
      );
      setMajorsFreeText(p.majorsFreeText ?? "");
      setTimeBudgetPreference(p.timeBudgetPreference ?? "medium");
      setEssayPreference(p.essayPreference ?? true);
      setNeedBasedInterest(p.needBasedInterest ?? false);
      setOptionalEligibility(p.optionalEligibility ?? {});
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const customScaleNum = (() => {
    const n = parseFloat(gpaScaleCustom);
    return Number.isFinite(n) && n >= 1 && n <= 1000 ? n : 0;
  })();

  const profile: Profile = {
    academics: {
      ...academics,
      gpaScale: gpaScale === "custom" && customScaleNum > 0 ? "custom" : gpaScale === "5.0" ? "5.0" : "4.0",
      gpaScaleCustom: gpaScale === "custom" && customScaleNum > 0 ? customScaleNum : undefined,
    },
    activities: [...activities],
    awards: [...awards],
    financial: { ...financial },
    location: location.country || location.state || location.city ? location : undefined,
    educationLevel: "high_school",
    schoolName: schoolName.trim() || undefined,
    intendedMajors: intendedMajors.length ? intendedMajors : undefined,
    majorsFreeText: intendedMajors.length ? undefined : majorsFreeText.trim() || undefined,
    timeBudgetPreference,
    essayPreference,
    needBasedInterest,
    optionalEligibility: Object.keys(optionalEligibility ?? {}).length ? optionalEligibility : undefined,
  };
  const { percent: completion } = getProfileCompletion(profile);
  const { count: missingCount, suggestions } = getMissingItemsForMatchUnlock(profile);

  const handleSaveAll = async () => {
    const gpaMax = gpaScale === "custom" && customScaleNum > 0 ? customScaleNum : gpaScale === "5.0" ? 5 : 4;
    if (academics.gpa && (isNaN(Number(academics.gpa)) || Number(academics.gpa) < 0 || Number(academics.gpa) > gpaMax)) {
      showToast({ title: "Invalid GPA", message: gpaScale === "custom" ? `GPA must be between 0 and ${gpaMax} on your scale.` : `GPA must be between 0 and ${gpaMax} for a ${gpaScale} scale.`, variant: "danger" });
      return;
    }
    if (gpaScale === "custom" && academics.gpa && (!gpaScaleCustom.trim() || customScaleNum <= 0)) {
      showToast({ title: "Invalid scale", message: "Enter a custom scale between 1 and 1000 (e.g. 6 or 100).", variant: "danger" });
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
    if (user?.uid) invalidateMatchCache(user.uid);
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
    return <LoadingScreenBlock message="Loading profile…" />;
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
          <p className="font-medium text-[var(--muted)]">Profile strength</p>
          <p className="text-amber-400 font-semibold">{completion}%</p>
        </div>
        <ProgressBar value={completion} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <span className={academics.gpa?.trim() ? "text-emerald-500 dark:text-emerald-400" : "text-amber-500"}>
            {academics.gpa?.trim() ? "✓" : "⚠"} GPA
          </span>
          <span className={academics.major?.trim() || intendedMajors.length > 0 || majorsFreeText.trim() ? "text-emerald-500 dark:text-emerald-400" : "text-amber-500"}>
            {academics.major?.trim() || intendedMajors.length > 0 || majorsFreeText.trim() ? "✓" : "⚠"} Major
          </span>
          <span className={location.state?.trim() || location.country?.trim() ? "text-emerald-500 dark:text-emerald-400" : "text-amber-500"}>
            {location.state?.trim() || location.country?.trim() ? "✓" : "⚠"} State / location
          </span>
          <span className={activities.length > 0 ? "text-emerald-500 dark:text-emerald-400" : "text-amber-500"}>
            {activities.length > 0 ? "✓" : "⚠"} Activities
          </span>
          <span className={awards.length > 0 ? "text-emerald-500 dark:text-emerald-400" : "text-amber-500"}>
            {awards.length > 0 ? "✓" : "⚠"} Awards
          </span>
        </div>
        {missingCount > 0 ? (
          <p className="text-[11px] text-[var(--muted-2)]">
            Add {suggestions.join(", ").toLowerCase()} to unlock more matches.
          </p>
        ) : (
          <p className="text-[11px] text-emerald-400/90">Profile complete — you get the best match accuracy.</p>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-orange-500 text-lg font-bold text-[var(--on-primary)] shrink-0">
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
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">GPA scale</p>
            <div className="flex flex-wrap items-center gap-2">
              {(["4.0", "5.0", "custom"] as const).map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => setGpaScale(scale)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${gpaScale === scale ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "border border-[var(--border)] text-[var(--muted)]"}`}
                >
                  {scale === "custom" ? "Custom" : scale}
                </button>
              ))}
              {gpaScale === "custom" && (
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="text-[var(--muted)]">max</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 6 or 100"
                    value={gpaScaleCustom}
                    onChange={(e) => setGpaScaleCustom(e.target.value)}
                    className="w-20 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-amber-500/50 focus:outline-none"
                  />
                </span>
              )}
            </div>
            {gpaScale === "custom" && customScaleNum > 0 && academics.gpa && (() => {
              const g = parseFloat(academics.gpa);
              const valid = Number.isFinite(g) && g >= 0 && g <= customScaleNum;
              const equiv = valid ? ((g / customScaleNum) * 4).toFixed(2) : null;
              return equiv != null ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Converted to 4.0 scale for matching: <strong>{equiv}</strong>
                </p>
              ) : (
                <p className="mt-1 text-xs text-[var(--muted)]">Enter a valid GPA (0–{customScaleNum}) to see the 4.0-scale equivalent.</p>
              );
            })()}
          </div>
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
          <Input
            label="School name (optional)"
            placeholder="e.g. Lincoln High"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
          />
          <Button type="button" size="sm" onClick={handleSaveAll} disabled={saving}>
            Save academics
          </Button>
        </Card>

        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold font-heading">Location</h3>
          <p className="text-[11px] text-[var(--muted-2)]">Used to personalize your Greenlight experience. Your curated list updates when you save.</p>
          <form autoComplete="off" className="space-y-3">
            <CountrySelect
              label="Country"
              value={location.country}
              onChange={(code) => setLocation((prev) => ({ ...prev, country: code }))}
              placeholder="Type or choose country"
            />
            <StateSelect
            label="State"
            value={location.state}
            onChange={(code) => setLocation((prev) => ({ ...prev, state: code }))}
            placeholder="Type or choose state"
          />
          <Input
            label="City (optional)"
            name="profile-city"
            autoComplete="nope"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="e.g. San Francisco"
            value={location.city}
            onChange={(e) => setLocation((prev) => ({ ...prev, city: e.target.value }))}
          />
          </form>
          <Button type="button" size="sm" onClick={handleSaveAll} disabled={saving}>
            Save location
          </Button>
        </Card>

        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold font-heading">Preferences</h3>
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">Time budget per week</p>
            <div className="flex flex-wrap gap-2">
              {(["low", "medium", "high"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeBudgetPreference(t)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${timeBudgetPreference === t ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "border border-[var(--border)] text-[var(--muted)] hover:border-amber-500/30 hover:text-[var(--text)]"}`}
                >
                  {t === "low" ? "Low" : t === "medium" ? "Medium" : "High"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">Okay with essays</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEssayPreference(true)}
                className={`rounded-lg px-3 py-1.5 text-sm ${essayPreference ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "border border-[var(--border)] text-[var(--muted)] hover:border-amber-500/30 hover:text-[var(--text)]"}`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setEssayPreference(false)}
                className={`rounded-lg px-3 py-1.5 text-sm ${!essayPreference ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "border border-[var(--border)] text-[var(--muted)] hover:border-amber-500/30 hover:text-[var(--text)]"}`}
              >
                No
              </button>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-[var(--muted)]">Interested in need-based scholarships</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setNeedBasedInterest(true)}
                className={`rounded-lg px-3 py-1.5 text-sm ${needBasedInterest ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "border border-[var(--border)] text-[var(--muted)] hover:border-amber-500/30 hover:text-[var(--text)]"}`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setNeedBasedInterest(false)}
                className={`rounded-lg px-3 py-1.5 text-sm ${!needBasedInterest ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "border border-[var(--border)] text-[var(--muted)] hover:border-amber-500/30 hover:text-[var(--text)]"}`}
              >
                No
              </button>
            </div>
          </div>
          <Button type="button" size="sm" onClick={handleSaveAll} disabled={saving}>
            Save preferences
          </Button>
        </Card>

        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold font-heading">Intended major(s)</h3>
          <p className="text-[11px] text-[var(--muted-2)]">Refines your Greenlight curation. Type CS, Bio, etc. — space, comma, or enter to add a pill. We expand abbreviations automatically.</p>
          <MajorPillInput
            value={intendedMajors}
            onChange={setIntendedMajors}
            placeholder="e.g. CS, Biology — space, comma, or enter to add"
          />
          <Button type="button" size="sm" onClick={handleSaveAll} disabled={saving}>
            Save majors
          </Button>
        </Card>

        <Card className="space-y-3 p-4">
          <button
            type="button"
            onClick={() => setShowOptionalSection((v) => !v)}
            className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)] text-left"
          >
            {showOptionalSection ? "−" : "+"} Optional eligibility (only used to filter scholarships)
          </button>
          {showOptionalSection && (
            <>
              <p className="text-[11px] text-[var(--muted-2)]">We never require this. Adding it unlocks more targeted matches.</p>
              <div className="space-y-2 pt-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalEligibility?.firstGen ?? false}
                  onChange={(e) => setOptionalEligibility((p) => ({ ...p, firstGen: e.target.checked }))}
                  className="rounded border-[var(--border)] text-amber-500"
                />
                First-gen
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalEligibility?.militaryFamily ?? false}
                  onChange={(e) => setOptionalEligibility((p) => ({ ...p, militaryFamily: e.target.checked }))}
                  className="rounded border-[var(--border)] text-amber-500"
                />
                Military family
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalEligibility?.disability ?? false}
                  onChange={(e) => setOptionalEligibility((p) => ({ ...p, disability: e.target.checked }))}
                  className="rounded border-[var(--border)] text-amber-500"
                />
                Disability (general)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalEligibility?.fosterCare ?? false}
                  onChange={(e) => setOptionalEligibility((p) => ({ ...p, fosterCare: e.target.checked }))}
                  className="rounded border-[var(--border)] text-amber-500"
                />
                Foster care
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalEligibility?.underrepresentedBackground ?? false}
                  onChange={(e) => setOptionalEligibility((p) => ({ ...p, underrepresentedBackground: e.target.checked }))}
                  className="rounded border-[var(--border)] text-amber-500"
                />
                Underrepresented background
              </label>
              <Input
                label="Citizenship / residency (optional)"
                placeholder="e.g. US citizen, DACA"
                value={optionalEligibility?.citizenshipResidency ?? ""}
                onChange={(e) => setOptionalEligibility((p) => ({ ...p, citizenshipResidency: e.target.value }))}
              />
              <Button type="button" size="sm" onClick={handleSaveAll} disabled={saving}>
                Save optional eligibility
              </Button>
              </div>
            </>
          )}
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
