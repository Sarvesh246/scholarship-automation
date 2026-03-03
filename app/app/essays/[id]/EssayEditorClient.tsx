"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getEssay,
  saveEssay,
  deleteEssay,
  duplicateEssay,
  getEssayVersions,
  restoreEssayVersion,
  type EssayVersion,
} from "@/lib/essayStorage";
import { contentForEditor, htmlToMarkdown, htmlToPlainText } from "@/lib/richText";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Modal } from "@/components/ui/Modal";
import { LoadingScreenBlock } from "@/components/ui/LoadingScreen";
import { useToast } from "@/components/ui/Toast";

const AUTOSAVE_DELAY_MS = 1500;
type SaveStatus = "idle" | "saving" | "saved" | "unsaved";

const PRESET_TAGS = ["STEM", "Leadership", "Financial need", "Community", "Arts", "General"];

export default function EssayEditorClient() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { showToast } = useToast();

  const isNew = id === "new";
  const [essayId, setEssayId] = useState<string | null>(isNew ? null : id);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>(["General"]);
  const [tagInput, setTagInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(!isNew);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<EssayVersion[]>([]);
  const [duplicating, setDuplicating] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (isNew) {
      setTitle("");
      setContent("");
      setTags(["General"]);
      setTagInput("");
      setEssayId(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const stored = await getEssay(id);
      if (cancelled) return;
      if (stored) {
        setEssayId(stored.id);
        setTitle(stored.title);
        setContent(contentForEditor(stored.content ?? ""));
        setTags(stored.tags?.length ? stored.tags : ["General"]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, isNew]);

  const performSave = useCallback(async () => {
    if (savingRef.current) return null;
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const saved = await saveEssay({
        id: essayId ?? undefined,
        title,
        tags,
        content
      });
      setEssayId(saved.id);
      setSaveStatus("saved");
      if (isNew && saved.id) {
        router.replace(`/app/essays/${saved.id}`);
      }
      return saved;
    } catch {
      setSaveStatus("unsaved");
      showToast({
        title: "Autosave failed",
        message: "Click Save to retry, or check your connection.",
        variant: "danger",
      });
      return null;
    } finally {
      savingRef.current = false;
    }
  }, [essayId, title, tags, content, isNew, router, showToast]);

  useEffect(() => {
    if (loading) return;
    if (isNew && !title && !content.trim()) return;
    setSaveStatus((prev) => (prev === "saved" ? "saved" : "unsaved"));
    const t = setTimeout(() => {
      if (!title && !content.trim()) return;
      performSave();
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [title, content, tags, performSave, isNew, loading]);

  const handleSaveClick = async () => {
    const saved = await performSave();
    if (saved) {
      showToast({ title: "Saved", message: "Your essay has been saved.", variant: "success" });
    } else {
      showToast({ title: "Save failed", message: "Could not save. Try again.", variant: "danger" });
    }
  };

  const handleDelete = async () => {
    if (essayId) {
      await deleteEssay(essayId);
      showToast({ title: "Essay deleted", variant: "success" });
    }
    router.push("/app/essays");
  };

  const handleDuplicate = async () => {
    if (!essayId) return;
    setDuplicating(true);
    try {
      const copy = await duplicateEssay(essayId);
      if (copy) {
        showToast({ title: "Duplicated", message: "Copy created.", variant: "success" });
        router.push(`/app/essays/${copy.id}`);
      }
    } finally {
      setDuplicating(false);
    }
  };

  const handleExport = (format: "txt" | "md") => {
    const text =
      format === "md"
        ? `# ${title}\n\n${htmlToMarkdown(content)}`
        : htmlToPlainText(content);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9-]/gi, "_").slice(0, 50)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast({ title: "Exported", variant: "success" });
  };

  const loadVersions = useCallback(async () => {
    if (!essayId) return;
    const v = await getEssayVersions(essayId);
    setVersions(v);
  }, [essayId]);

  useEffect(() => {
    if (historyOpen && essayId) loadVersions();
  }, [historyOpen, essayId, loadVersions]);

  const handleRestore = async (version: EssayVersion) => {
    if (!essayId) return;
    await restoreEssayVersion(essayId, version);
    setTitle(version.title);
    setContent(contentForEditor(version.content ?? ""));
    setTags(version.tags);
    setHistoryOpen(false);
    showToast({ title: "Restored", message: "Previous version restored.", variant: "success" });
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const statusText =
    saveStatus === "saving" ? "Saving..." :
    saveStatus === "saved" ? "Saved just now" :
    saveStatus === "unsaved" ? "Unsaved changes" : "Autosave on";

  if (loading) {
    return <LoadingScreenBlock message="Loading essay…" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={essayId ? "Edit essay" : "New essay"}
        subtitle="Draft once, adapt for multiple scholarships."
        primaryAction={
          <div className="flex flex-wrap gap-2">
            {essayId && (
              <>
                <Button type="button" variant="secondary" size="sm" onClick={handleDuplicate} disabled={duplicating}>
                  {duplicating ? "Copying…" : "Duplicate"}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setHistoryOpen(true)}>
                  History
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => handleExport("txt")}>
                  Export .txt
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => handleExport("md")}>
                  Export .md
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              </>
            )}
            <Button type="button" size="sm" onClick={handleSaveClick}>
              Save
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <RichTextEditor
            label="Essay"
            value={content}
            onChange={setContent}
            placeholder="Start writing your essay..."
            minHeight="280px"
          />
          <p className="text-[10px] text-[var(--muted-2)]">
            Autosave:{" "}
            <span className={saveStatus === "saving" ? "text-amber-400" : saveStatus === "saved" ? "font-medium text-emerald-400" : "font-medium"}>
              {statusText}
            </span>
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs">
          <div>
            <h3 className="text-sm font-semibold font-heading">Tags</h3>
            <p className="mt-1 text-[10px] text-[var(--muted-2)]">Add preset or type custom (comma-separated).</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addTag(t)}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    tags.includes(t)
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "border border-[var(--border)] text-[var(--muted)] hover:border-amber-500/30 hover:text-[var(--text)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[var(--bg)] px-2.5 py-1">
                  <Tag>{tag}</Tag>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-[var(--muted-2)] hover:text-red-400"
                    aria-label={`Remove ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <Input
              className="mt-2"
              placeholder="Add tag (press Enter)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const parts = tagInput.split(/[,\s]+/).filter(Boolean);
                  parts.forEach((p) => addTag(p));
                }
              }}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-heading">Details</h3>
            <p className="mt-1 text-[10px] text-[var(--muted-2)]">
              Word count: ~{htmlToPlainText(content).trim().split(/\s+/).filter(Boolean).length}
            </p>
          </div>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        title="Delete this essay?"
        description="This will remove the essay from your saved drafts."
        destructive
        primaryLabel="Delete"
        onClose={() => setConfirmDelete(false)}
        onPrimary={handleDelete}
      />

      <Modal
        open={historyOpen}
        title="Version history"
        primaryLabel="Close"
        secondaryLabel="Cancel"
        onClose={() => setHistoryOpen(false)}
        onPrimary={() => setHistoryOpen(false)}
      >
        <div className="max-h-80 overflow-y-auto space-y-2 text-sm">
          {versions.length === 0 ? (
            <p className="text-[var(--muted)]">No previous versions yet. Versions are saved when you edit.</p>
          ) : (
            versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{v.title || "Untitled"}</p>
                <p className="text-[10px] text-[var(--muted-2)]">
                  {new Date(v.at).toLocaleString()} · {(v.content ?? "").replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length} words
                </p>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => handleRestore(v)}>
                  Restore
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}