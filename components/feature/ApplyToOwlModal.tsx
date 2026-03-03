"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { getProfileFieldValues } from "@/lib/eligibility";
import { decodeHtmlEntities, displayScholarshipTitle } from "@/lib/utils";
import { ensureApplication, updateApplicationOwlStatus } from "@/lib/applicationStorage";
import { getIdToken } from "@/hooks/useAdmin";
import { useUser } from "@/hooks/useUser";
import type { Scholarship } from "@/types";
import type { Profile } from "@/types";

const OWL_STATUS_LABELS: Record<string, string> = {
  received: "Received",
  review: "Under review",
  accepted: "Accepted",
  rejected: "Rejected",
};

interface ApplyToOwlModalProps {
  open: boolean;
  scholarship: Scholarship | null;
  profile: Profile | null;
  onClose: () => void;
  onSuccess: (status?: string) => void;
}

export function ApplyToOwlModal({
  open,
  scholarship,
  profile,
  onClose,
  onSuccess
}: ApplyToOwlModalProps) {
  const { user } = useUser();
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [requirementValues, setRequirementValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileValues = useMemo(
    () =>
      getProfileFieldValues(
        profile ?? { academics: {}, activities: [], awards: [], financial: {} },
        user
      ),
    [profile, user]
  );

  useEffect(() => {
    if (!open || !scholarship) return;
    setError(null);
    const initial: Record<string, string> = {};
    for (const [key, value] of Object.entries(profileValues)) {
      if (value) initial[key] = value;
    }
    scholarship.owlFields?.forEach((f) => {
      const v = profileValues[f.id] ?? initial[f.id];
      if (v != null) initial[f.id] = v;
    });
    setFieldValues(initial);
    setRequirementValues({});
  }, [open, scholarship, profileValues]);

  const owlFields = scholarship?.owlFields ?? [];
  const owlRequirements = scholarship?.owlRequirements ?? [];

  const validateBeforeSubmit = useCallback((): string | null => {
    if (!scholarship) return "No scholarship selected.";
    for (const f of owlFields) {
      if (!f.optional) {
        const v = fieldValues[f.id]?.trim();
        if (v == null || v === "") return `"${f.name}" is required.`;
      }
    }
    for (const r of owlRequirements) {
      if (!r.optional) {
        const v = requirementValues[r.id]?.trim();
        if (v == null || v === "") {
          const label = r.title ?? r.description ?? "This requirement";
          return `${label} is required.`;
        }
      }
    }
    return null;
  }, [scholarship, owlFields, owlRequirements, fieldValues, requirementValues]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (scholarship?.source !== "scholarship_owl") return;
      setError(null);
      const validationError = validateBeforeSubmit();
      if (validationError) {
        setError(validationError);
        return;
      }
      setSubmitting(true);
      try {
        const token = await getIdToken();
        if (!token) {
          setError("You must be signed in to apply.");
          setSubmitting(false);
          return;
        }

        const attributes: Record<string, string | Record<string, string>> = {};
        if (user?.email) attributes.email = user.email;
        if (user?.displayName) attributes.name = user.displayName;
        const d = profile?.demographics ?? {};
        if (d.phone) attributes.phone = d.phone;
        if (d.state) attributes.state = d.state;
        owlFields.forEach((f) => {
          const v = fieldValues[f.id]?.trim();
          if (v != null && v !== "") attributes[f.id] = v;
        });
        const requirements: Record<string, string> = {};
        owlRequirements.forEach((r) => {
          const v = requirementValues[r.id]?.trim();
          if (v != null && v !== "") requirements[r.id] = v;
        });
        if (Object.keys(requirements).length > 0) attributes.requirements = requirements;
        attributes.source = "ApplyPilot";

        const res = await fetch(`/api/scholarship-owl/apply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            scholarshipId: scholarship.id,
            attributes
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.message ?? data.error ?? `Apply failed (${res.status})`);
          setSubmitting(false);
          return;
        }

        await ensureApplication(scholarship.id);
        const statusId = (data.status ?? data.data?.relationships?.status?.data?.id ?? "received") as string;
        if (["received", "review", "accepted", "rejected"].includes(statusId)) {
          await updateApplicationOwlStatus(
            scholarship.id,
            statusId as "received" | "review" | "accepted" | "rejected"
          );
        }
        const statusLabel = OWL_STATUS_LABELS[statusId] ?? statusId;
        onSuccess(statusLabel);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setSubmitting(false);
      }
    },
    [scholarship, owlFields, owlRequirements, fieldValues, requirementValues, user, profile, validateBeforeSubmit, onSuccess, onClose]
  );

  if (!open || !scholarship) return null;

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const textInputLinkRequirements = owlRequirements.filter(
    (r) =>
      r.requirementType === "text" ||
      r.requirementType === "input" ||
      r.requirementType === "link"
  );
  const fileImageRequirements = owlRequirements.filter(
    (r) => r.requirementType === "file" || r.requirementType === "image"
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--overlay)] px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Apply with ScholarshipOwl"
      onClick={handleBackdropClick}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-sm font-semibold font-heading">Apply with ScholarshipOwl</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">{displayScholarshipTitle(scholarship.title)}</p>
        </div>
        <form
          id="apply-owl-form"
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4 text-sm"
        >
          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
          )}

          {owlFields.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-[var(--muted)]">Your information</h3>
              {owlFields.map((f) => {
                if (f.type === "option" && f.options && typeof f.options === "object") {
                  const opts = f.options as Record<string, string | { name: string }>;
                  return (
                    <div key={f.id} className="space-y-1.5">
                      <label className="block text-xs font-medium text-[var(--muted)]">
                        {f.name}
                        {!f.optional && <span className="text-red-400"> *</span>}
                      </label>
                      <select
                        className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        value={fieldValues[f.id] ?? ""}
                        onChange={(e) =>
                          setFieldValues((prev) => ({ ...prev, [f.id]: e.target.value }))
                        }
                        required={!f.optional}
                      >
                        <option value="">Select...</option>
                        {Object.entries(opts).map(([val, label]) => (
                          <option key={val} value={val}>
                            {typeof label === "string" ? label : (label as { name: string })?.name ?? val}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                const inputType = f.id === "email" ? "email" : f.id === "phone" ? "tel" : "text";
                return (
                  <Input
                    key={f.id}
                    label={f.name}
                    name={f.id}
                    type={inputType}
                    value={fieldValues[f.id] ?? ""}
                    onChange={(e) =>
                      setFieldValues((prev) => ({ ...prev, [f.id]: e.target.value }))
                    }
                    required={!f.optional}
                  />
                );
              })}
            </div>
          )}

          {textInputLinkRequirements.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-[var(--muted)]">Requirements</h3>
              {textInputLinkRequirements.map((r) => (
                <div key={r.id}>
                  {r.requirementType === "text" ? (
                    <Textarea
                      label={r.title ?? r.description ?? "Response"}
                      value={requirementValues[r.id] ?? ""}
                      onChange={(e) =>
                        setRequirementValues((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      required={!r.optional}
                      placeholder={r.description}
                    />
                  ) : (
                    <Input
                      label={r.title ?? r.description ?? "Response"}
                      type={r.requirementType === "link" ? "url" : "text"}
                      value={requirementValues[r.id] ?? ""}
                      onChange={(e) =>
                        setRequirementValues((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      required={!r.optional}
                      placeholder={r.description}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {fileImageRequirements.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-[var(--muted)]">File / image</h3>
              <p className="text-xs text-[var(--muted-2)]">
                If the scholarship accepts a link to your file or image, paste the URL below. Otherwise you may need to complete these on the provider&apos;s site.
              </p>
              {fileImageRequirements.map((r) => (
                <Input
                  key={r.id}
                  label={r.title ?? r.description ?? (r.requirementType === "image" ? "Image URL" : "File URL")}
                  type="url"
                  value={requirementValues[r.id] ?? ""}
                  onChange={(e) =>
                    setRequirementValues((prev) => ({ ...prev, [r.id]: e.target.value }))
                  }
                  required={!r.optional}
                  placeholder="https://..."
                />
              ))}
            </div>
          )}

          {owlRequirements.length === 0 && owlFields.length > 0 && (
            <p className="text-xs text-[var(--muted-2)]">
              Submit your information to apply. The provider may contact you for next steps.
            </p>
          )}
        </form>
        <div className="shrink-0 flex justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="apply-owl-form" size="sm" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit application"}
          </Button>
        </div>
      </div>
    </div>
  );
}
