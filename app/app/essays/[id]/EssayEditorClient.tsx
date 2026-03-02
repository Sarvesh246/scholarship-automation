"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getEssay, saveEssay, deleteEssay } from "@/lib/essayStorage";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

const AUTOSAVE_DELAY_MS = 1500;
type SaveStatus = "idle" | "saving" | "saved" | "unsaved";

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(!isNew);
  const savingRef = useRef(false);

  useEffect(() => {
    if (isNew) {
      setTitle("");
      setContent("");
      setTags(["General"]);
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
        setContent(stored.content);
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
      return null;
    } finally {
      savingRef.current = false;
    }
  }, [essayId, title, tags, content, isNew, router]);

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
      showToast({
        title: "Saved",
        message: "Your essay has been saved.",
        variant: "success"
      });
    } else {
      showToast({
        title: "Save failed",
        message: "Could not save. Try again.",
        variant: "danger"
      });
    }
  };

  const handleDelete = async () => {
    if (essayId) {
      await deleteEssay(essayId);
      showToast({
        title: "Essay deleted",
        variant: "success"
      });
    }
    router.push("/app/essays");
  };

  const statusText =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved just now"
        : saveStatus === "unsaved"
          ? "Unsaved changes"
          : "Autosave on";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={essayId ? "Edit essay" : "New essay"}
        subtitle="Draft once, adapt for multiple scholarships."
        primaryAction={
          <div className="flex gap-2">
            {essayId && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
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
          <Textarea
            label="Essay"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
          />
          <p className="text-[10px] text-[var(--muted-2)]">
            Autosave:{" "}
            <span
              className={
                saveStatus === "saving"
                  ? "text-amber-400"
                  : saveStatus === "saved"
                    ? "font-medium text-emerald-400"
                    : "font-medium"
              }
            >
              {statusText}
            </span>
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs">
          <div>
            <h3 className="text-sm font-semibold font-heading">Tags</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold font-heading">Details</h3>
            <p className="mt-1 text-[10px] text-[var(--muted-2)]">
              Word count: ~{content.trim() ? content.trim().split(/\s+/).length : 0}
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
    </div>
  );
}
