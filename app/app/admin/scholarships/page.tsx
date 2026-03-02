"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { getScholarships, invalidateScholarshipCache } from "@/lib/scholarshipStorage";
import { useAdmin, getIdToken } from "@/hooks/useAdmin";
import type { Scholarship } from "@/types";
import type { ScholarshipCategory } from "@/types";

const CATEGORIES: ScholarshipCategory[] = ["STEM", "Arts", "Community", "Leadership", "FinancialNeed"];

const emptyForm = {
  title: "",
  sponsor: "",
  amount: "",
  deadline: "",
  description: "",
  estimatedTime: "2–3 hours",
  categoryTags: [] as string[],
  eligibilityTags: "" as string,
  prompts: "" as string
};

function parseLines(s: string): string[] {
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export default function AdminScholarshipsPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { showToast } = useToast();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Scholarship | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Scholarship | null>(null);

  const load = useCallback(async () => {
    const list = await getScholarships();
    setScholarships(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (adminLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader title="Admin" subtitle="Manage scholarships" />
        <p className="text-sm text-[var(--muted)]">
          You don&apos;t have permission to access this page. Add your email to ADMIN_EMAILS in the server environment to grant access.
        </p>
      </div>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (s: Scholarship) => {
    setEditing(s);
    setForm({
      title: s.title,
      sponsor: s.sponsor,
      amount: String(s.amount),
      deadline: s.deadline,
      description: s.description,
      estimatedTime: s.estimatedTime,
      categoryTags: s.categoryTags,
      eligibilityTags: s.eligibilityTags.join("\n"),
      prompts: s.prompts.join("\n")
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Not signed in", variant: "danger" });
      return;
    }
    const categoryTags = form.categoryTags.filter(Boolean);
    const eligibilityTags = parseLines(form.eligibilityTags);
    const prompts = parseLines(form.prompts);
    if (!form.title.trim()) {
      showToast({ title: "Title is required", variant: "danger" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/admin/scholarships/${editing.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: form.title.trim(),
            sponsor: form.sponsor.trim(),
            amount: form.amount ? Number(form.amount) : undefined,
            deadline: form.deadline.trim() || undefined,
            description: form.description.trim() || undefined,
            estimatedTime: form.estimatedTime.trim() || undefined,
            categoryTags: categoryTags.length ? categoryTags : undefined,
            eligibilityTags: eligibilityTags.length ? eligibilityTags : undefined,
            prompts: prompts.length ? prompts : undefined
          })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Update failed");
        }
        showToast({ title: "Scholarship updated", variant: "success" });
      } else {
        const res = await fetch("/api/admin/scholarships", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: form.title.trim(),
            sponsor: form.sponsor.trim(),
            amount: form.amount ? Number(form.amount) : 0,
            deadline: form.deadline.trim() || "2026-12-31",
            description: form.description.trim(),
            estimatedTime: form.estimatedTime.trim(),
            categoryTags,
            eligibilityTags,
            prompts
          })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Create failed");
        }
        showToast({ title: "Scholarship added", variant: "success" });
      }
      invalidateScholarshipCache();
      closeForm();
      load();
    } catch (e) {
      showToast({
        title: editing ? "Update failed" : "Create failed",
        message: e instanceof Error ? e.message : "Something went wrong",
        variant: "danger"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: Scholarship) => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/scholarships/${s.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Delete failed");
      invalidateScholarshipCache();
      setDeleteConfirm(null);
      load();
      showToast({ title: "Scholarship deleted", variant: "success" });
    } catch {
      showToast({ title: "Delete failed", variant: "danger" });
    }
  };

  const toggleCategory = (c: string) => {
    setForm((prev) => ({
      ...prev,
      categoryTags: prev.categoryTags.includes(c)
        ? prev.categoryTags.filter((x) => x !== c)
        : [...prev.categoryTags, c]
    }));
  };

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Admin: Scholarships"
        subtitle="Add, edit, or remove scholarships. Changes appear for all users."
        primaryAction={
          <Button type="button" onClick={openCreate}>
            Add scholarship
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : (
        <div className="space-y-3">
          {scholarships.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              No scholarships yet. Click &quot;Add scholarship&quot; to add one.
            </p>
          ) : (
            scholarships.map((s) => (
              <Card key={s.id} className="flex min-w-0 flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{s.title}</p>
                  <p className="text-xs text-[var(--muted-2)]">{s.sponsor} · ${s.amount.toLocaleString()} · {s.deadline}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(s)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setDeleteConfirm(s)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <Modal
        open={formOpen}
        title={editing ? "Edit scholarship" : "Add scholarship"}
        onClose={closeForm}
        primaryLabel={saving ? "Saving…" : editing ? "Save" : "Create"}
        onPrimary={handleSubmit}
        onSecondary={closeForm}
        secondaryLabel="Cancel"
        closeOnPrimaryClick={false}
        primaryDisabled={saving}
      >
        <div className="space-y-3 text-sm">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. STEM Innovation Scholarship"
          />
          <Input
            label="Sponsor"
            value={form.sponsor}
            onChange={(e) => setForm((p) => ({ ...p, sponsor: e.target.value }))}
            placeholder="e.g. National Science Alliance"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              placeholder="5000"
            />
            <Input
              label="Deadline (YYYY-MM-DD)"
              value={form.deadline}
              onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              placeholder="2026-04-15"
            />
          </div>
          <Input
            label="Estimated time"
            value={form.estimatedTime}
            onChange={(e) => setForm((p) => ({ ...p, estimatedTime: e.target.value }))}
            placeholder="2–3 hours"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted-2)]">Description (1–2 sentences)</label>
            <textarea
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm placeholder:text-[var(--muted-2)]"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="What this scholarship is about..."
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted-2)]">Categories</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    form.categoryTags.includes(c)
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "border border-[var(--border)] text-[var(--muted)] hover:border-amber-500/30"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted-2)]">Eligibility (one per line)</label>
            <textarea
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm placeholder:text-[var(--muted-2)]"
              rows={3}
              value={form.eligibilityTags}
              onChange={(e) => setForm((p) => ({ ...p, eligibilityTags: e.target.value }))}
              placeholder="Undergraduate&#10;3.0+ GPA"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted-2)]">Essay prompts (one per line)</label>
            <textarea
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm placeholder:text-[var(--muted-2)]"
              rows={4}
              value={form.prompts}
              onChange={(e) => setForm((p) => ({ ...p, prompts: e.target.value }))}
              placeholder="Describe a problem you'd like to solve..."
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteConfirm}
        title="Delete scholarship?"
        description={`"${deleteConfirm?.title}" will be removed. Students with an application in progress will see "Application not found."`}
        primaryLabel="Delete"
        onClose={() => setDeleteConfirm(null)}
        onPrimary={() => { if (deleteConfirm) void handleDelete(deleteConfirm); }}
        closeOnPrimaryClick={false}
        destructive
      />
    </div>
  );
}
