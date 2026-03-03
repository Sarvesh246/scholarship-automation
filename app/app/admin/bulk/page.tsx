"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useAdmin, getIdToken } from "@/hooks/useAdmin";
import { getScholarshipsForAdmin, invalidateScholarshipCache } from "@/lib/scholarshipStorage";
import type { Scholarship } from "@/types";
import type { ScholarshipCategory } from "@/types";

const CATEGORIES: ScholarshipCategory[] = ["STEM", "Arts", "Community", "Leadership", "FinancialNeed"];

export default function AdminBulkPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { showToast } = useToast();
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEdit, setBulkEdit] = useState({
    categoryTags: [] as string[],
    deadline: "",
    sponsor: "",
    featured: "" as "" | "true" | "false",
    status: "" as "" | "draft" | "published",
  });
  const [bulkEditing, setBulkEditing] = useState(false);

  const loadScholarships = useCallback(async () => {
    const list = await getScholarshipsForAdmin();
    setScholarships(list);
  }, []);

  useEffect(() => {
    if (isAdmin) loadScholarships();
  }, [isAdmin, loadScholarships]);

  const handleImport = async () => {
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Not signed in", variant: "danger" });
      return;
    }
    let items: unknown[];
    try {
      const trimmed = importText.trim();
      if (trimmed.startsWith("[")) {
        items = JSON.parse(trimmed);
      } else if (trimmed.startsWith("{")) {
        const obj = JSON.parse(trimmed);
        items = obj.scholarships ?? obj.data ?? (Array.isArray(obj) ? obj : []);
      } else {
        const lines = trimmed.split("\n").filter(Boolean);
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        items = lines.slice(1).map((line, idx) => {
          const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
          return {
            id: row.id || (row.title?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `import-${Date.now()}-${idx}`),
            title: row.title,
            sponsor: row.sponsor,
            amount: parseInt(row.amount || "0", 10),
            deadline: row.deadline || "2026-12-31",
            description: row.description,
            categoryTags: row.categoryTags ? row.categoryTags.split(";") : ["Community"],
            eligibilityTags: row.eligibilityTags ? row.eligibilityTags.split(";") : [],
          };
        });
      }
    } catch (e) {
      showToast({ title: "Invalid JSON or CSV", message: e instanceof Error ? e.message : "Parse error", variant: "danger" });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      showToast({ title: "No items to import", variant: "danger" });
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/admin/scholarships/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scholarships: items }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast({
          title: "Import complete",
          message: `${data.created ?? 0} created, ${data.updated ?? 0} updated`,
          variant: "success",
        });
        setImportText("");
      } else {
        showToast({ title: "Import failed", message: data.error, variant: "danger" });
      }
    } catch (e) {
      showToast({ title: "Import failed", message: e instanceof Error ? e.message : "Request failed", variant: "danger" });
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(scholarships.map((s) => s.id)));
  };

  const selectNone = () => setSelectedIds(new Set());

  const handleBulkEdit = async () => {
    const token = await getIdToken();
    if (!token || selectedIds.size === 0) {
      showToast({ title: "Select at least one scholarship", variant: "danger" });
      return;
    }
    const updates: Record<string, unknown> = {};
    if (bulkEdit.categoryTags.length) updates.categoryTags = bulkEdit.categoryTags;
    if (bulkEdit.deadline.trim()) updates.deadline = bulkEdit.deadline.trim();
    if (bulkEdit.sponsor.trim()) updates.sponsor = bulkEdit.sponsor.trim();
    if (bulkEdit.featured === "true") updates.featured = true;
    if (bulkEdit.featured === "false") updates.featured = false;
    if (bulkEdit.status) updates.status = bulkEdit.status;
    if (Object.keys(updates).length === 0) {
      showToast({ title: "Set at least one field to update", variant: "danger" });
      return;
    }
    setBulkEditing(true);
    try {
      const res = await fetch("/api/admin/bulk-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: Array.from(selectedIds), updates }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast({ title: "Bulk edit complete", message: `${data.updated ?? 0} updated`, variant: "success" });
        invalidateScholarshipCache();
        loadScholarships();
        setSelectedIds(new Set());
      } else {
        showToast({ title: "Bulk edit failed", message: data.error, variant: "danger" });
      }
    } catch (e) {
      showToast({ title: "Bulk edit failed", message: e instanceof Error ? e.message : "Request failed", variant: "danger" });
    } finally {
      setBulkEditing(false);
    }
  };

  const toggleCategory = (c: string) => {
    setBulkEdit((prev) => ({
      ...prev,
      categoryTags: prev.categoryTags.includes(c)
        ? prev.categoryTags.filter((x) => x !== c)
        : [...prev.categoryTags, c],
    }));
  };

  const handleExport = async (format: "json" | "csv") => {
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Not signed in", variant: "danger" });
      return;
    }
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scholarships-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast({ title: "Export downloaded", variant: "success" });
    } catch (e) {
      showToast({ title: "Export failed", message: e instanceof Error ? e.message : "Request failed", variant: "danger" });
    } finally {
      setExporting(false);
    }
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Bulk import / export" />
        {!isAdmin && <p className="text-sm text-[var(--muted)]">You don&apos;t have permission.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk import / export"
        subtitle="Import scholarships from JSON or CSV. Export for backup."
      />

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">Import</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">Paste JSON array or CSV. CSV must have headers: id, title, sponsor, amount, deadline, description, categoryTags, eligibilityTags.</p>
        <textarea
          className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-xs font-mono"
          rows={6}
          placeholder='[{"id":"my-scholarship","title":"...","sponsor":"...","amount":5000,"deadline":"2026-12-31",...}]'
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <Button type="button" onClick={handleImport} disabled={importing || !importText.trim()} className="mt-3">
          {importing ? "Importing…" : "Import"}
        </Button>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">Export</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">Download all valid scholarships.</p>
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="secondary" onClick={() => handleExport("json")} disabled={exporting}>
            Export JSON
          </Button>
          <Button type="button" variant="secondary" onClick={() => handleExport("csv")} disabled={exporting}>
            Export CSV
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">Bulk edit</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">Select scholarships and apply changes to category, deadline, sponsor, featured, or status.</p>
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={selectAll}>
            Select all
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={selectNone}>
            Clear selection
          </Button>
          <span className="text-xs text-[var(--muted)] self-center">{selectedIds.size} selected</span>
        </div>
        <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
          {scholarships.slice(0, 100).map((s) => (
            <label key={s.id} className="flex items-center gap-2 py-1 text-xs cursor-pointer hover:bg-[var(--surface)] rounded px-2">
              <input
                type="checkbox"
                checked={selectedIds.has(s.id)}
                onChange={() => toggleSelect(s.id)}
                className="rounded border-[var(--border)] text-amber-500"
              />
              <span className="truncate">{s.title}</span>
              <span className="text-[var(--muted-2)] shrink-0">${(s.amount ?? 0).toLocaleString()}</span>
            </label>
          ))}
          {scholarships.length > 100 && (
            <p className="text-xs text-[var(--muted)] py-2">Showing first 100 of {scholarships.length}. Use filters or export to edit more.</p>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-[var(--muted-2)] mb-1">Categories (replace)</p>
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className={`rounded-full px-2 py-1 text-xs ${
                    bulkEdit.categoryTags.includes(c)
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "border border-[var(--border)] text-[var(--muted)] hover:border-amber-500/30"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Deadline (YYYY-MM-DD)"
            value={bulkEdit.deadline}
            onChange={(e) => setBulkEdit((p) => ({ ...p, deadline: e.target.value }))}
            placeholder="2026-12-31"
          />
          <Input
            label="Sponsor"
            value={bulkEdit.sponsor}
            onChange={(e) => setBulkEdit((p) => ({ ...p, sponsor: e.target.value }))}
            placeholder="New sponsor"
          />
          <div>
            <p className="text-xs font-medium text-[var(--muted-2)] mb-1">Featured</p>
            <Select
              value={bulkEdit.featured}
              onChange={(e) => setBulkEdit((p) => ({ ...p, featured: e.target.value as "" | "true" | "false" }))}
            >
              <option value="">No change</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--muted-2)] mb-1">Status</p>
            <Select
              value={bulkEdit.status}
              onChange={(e) => setBulkEdit((p) => ({ ...p, status: e.target.value as "" | "draft" | "published" }))}
            >
              <option value="">No change</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </div>
        </div>
        <Button
          type="button"
          onClick={handleBulkEdit}
          disabled={bulkEditing || selectedIds.size === 0}
          className="mt-4"
        >
          {bulkEditing ? "Applying…" : `Apply to ${selectedIds.size} selected`}
        </Button>
      </Card>
    </div>
  );
}
