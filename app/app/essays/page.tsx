"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EssayCard } from "@/components/feature/EssayCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getEssays } from "@/lib/essayStorage";
import { htmlToMarkdown, htmlToPlainText } from "@/lib/richText";
import type { Essay } from "@/types";

type SortOption = "updated" | "wordCount" | "title";

export default function EssaysPage() {
  const router = useRouter();
  const [items, setItems] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const [exporting, setExporting] = useState(false);

  const loadEssays = useCallback(async () => {
    const essays = await getEssays();
    setItems(essays);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEssays();
  }, [loadEssays]);

  useEffect(() => {
    const onFocus = () => { loadEssays(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadEssays]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((e) => (e.tags ?? []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          (e.title ?? "").toLowerCase().includes(q) ||
          htmlToPlainText(e.content ?? "").toLowerCase().includes(q)
      );
    }
    if (tagFilter) {
      list = list.filter((e) => (e.tags ?? []).includes(tagFilter));
    }
    const sorted = [...list];
    if (sortBy === "updated") {
      sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sortBy === "wordCount") {
      sorted.sort((a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0));
    } else if (sortBy === "title") {
      sorted.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    }
    return sorted;
  }, [items, query, tagFilter, sortBy]);

  const handleNewEssay = () => {
    router.push("/app/essays/new");
  };

  const handleExportAll = async (format: "txt" | "zip") => {
    setExporting(true);
    try {
      const ext = format === "zip" ? "md" : "txt";
      const files = filtered.map((e) => ({
        name: `${e.title.replace(/[^a-z0-9-]/gi, "_").slice(0, 50)}.${ext}`,
        content: ext === "md" ? `# ${e.title}\n\n${htmlToMarkdown(e.content ?? "")}` : htmlToPlainText(e.content ?? ""),
      }));
      if (files.length === 0) return;
      if (format === "txt" && files.length === 1) {
        const blob = new Blob([files[0].content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = files[0].name;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "zip" || files.length > 1) {
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        files.forEach((f) => zip.file(f.name, f.content));
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `essays-${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([files[0].content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = files[0].name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Essays"
        subtitle="Keep reusable essay drafts in one place."
        primaryAction={
          <div className="flex gap-2">
            {filtered.length > 0 && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExportAll("txt")}
                  disabled={exporting}
                >
                  {exporting ? "Exporting…" : "Export .txt"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExportAll("zip")}
                  disabled={exporting}
                >
                  Export .zip
                </Button>
              </div>
            )}
            <Button type="button" onClick={handleNewEssay}>
              New essay
            </Button>
          </div>
        }
      />

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <Input
            placeholder="Search by title or content"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="w-40"
          >
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-44"
          >
            <option value="updated">Last updated</option>
            <option value="wordCount">Word count (high→low)</option>
            <option value="title">Title A–Z</option>
          </Select>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="No essays yet"
          description="Start your first essay draft — reuse it across similar scholarships."
          actionLabel="New essay"
          onAction={handleNewEssay}
        />
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">
          No essays match your search or filters.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((essay) => (
            <EssayCard key={essay.id} essay={essay} onReload={loadEssays} />
          ))}
        </div>
      )}
    </div>
  );
}
