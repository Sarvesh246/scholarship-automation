"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { getIdToken } from "@/hooks/useAdmin";

export default function SubmitScholarshipPage() {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Sign in required", variant: "danger" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/scholarships/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          sponsor: sponsor.trim(),
          amount: amount.trim() ? parseInt(amount.replace(/\D/g, ""), 10) || undefined : undefined,
          deadline: deadline.trim() || undefined,
          description: description.trim() || undefined,
          applicationUrl: applicationUrl.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ title: data.error ?? "Submit failed", variant: "danger" });
        return;
      }
      showToast({
        title: "Submitted",
        message: "Thanks! Your submission is in the moderation queue. We’ll review it soon.",
        variant: "success",
      });
      setTitle("");
      setSponsor("");
      setAmount("");
      setDeadline("");
      setDescription("");
      setApplicationUrl("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        title="Submit a scholarship"
        subtitle="Suggest a scholarship for the catalog. Submissions go to our moderation queue and will be reviewed before publishing."
      />

      <Card className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--muted-2)] mb-1">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Smith Family STEM Scholarship"
              required
              minLength={3}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-2)] mb-1">Sponsor / organization *</label>
            <Input
              value={sponsor}
              onChange={(e) => setSponsor(e.target.value)}
              placeholder="e.g. Community Foundation of Texas"
              required
              minLength={2}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-2)] mb-1">Award amount (optional)</label>
              <Input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 5000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-2)] mb-1">Deadline (optional)</label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-2)] mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description and eligibility..."
              rows={4}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted-2)] focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-2)] mb-1">Application URL (optional)</label>
            <Input
              type="url"
              value={applicationUrl}
              onChange={(e) => setApplicationUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit for review"}
            </Button>
            <Link href="/app/scholarships" className="text-sm text-[var(--muted-2)] hover:text-[var(--text)]">
              Back to scholarships
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
