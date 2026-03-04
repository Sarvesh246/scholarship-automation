"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getIdToken } from "@/hooks/useAdmin";

const FEEDBACK_TYPES = [
  { value: "general", label: "General feedback" },
  { value: "bug", label: "Bug or issue" },
  { value: "suggestion", label: "Suggestion" },
  { value: "other", label: "Other" },
] as const;

export default function FeedbackPage() {
  const { showToast } = useToast();
  const [type, setType] = useState<string>("general");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      showToast({ title: "Please enter at least 10 characters", variant: "danger" });
      return;
    }
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Sign in required", variant: "danger" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, message: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ title: data.error ?? "Could not submit", variant: "danger" });
        return;
      }
      showToast({
        title: "Feedback submitted",
        message: "Thank you. We review all feedback and use it to improve.",
        variant: "success",
      });
      setMessage("");
    } catch {
      showToast({ title: "Could not submit feedback", variant: "danger" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        title="Submit feedback"
        subtitle="Suggestions, bug reports, or general feedback. We read everything and use it to improve ApplyPilot."
      />

      <Card className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--muted-2)] mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
            >
              {FEEDBACK_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-2)] mb-1.5">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind (at least 10 characters)..."
              rows={4}
              required
              minLength={10}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted-2)] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Submit feedback"}
            </Button>
            <Link href="/app/dashboard" className="text-sm text-[var(--muted-2)] hover:text-[var(--text)]">
              Back to dashboard
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
