"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getEssay, saveEssay, deleteEssay } from "@/lib/essayStorage";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

const AUTOSAVE_DELAY_MS = 1500;
type SaveStatus = "idle" | "saving" | "saved" | "unsaved";

export default function EssayEditorPage() {
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

  useEffect(() => {
    if (isNew) {
      setTitle("");
      setContent("");
      setTags(["General"]);
      setEssayId(null);
      return;
    }
    const stored = getEssay(id);
    if (stored) {
      setEssayId(stored.id);
      setTitle(stored.title);
      setContent(stored.content);
      setTags(stored.tags?.length ? stored.tags : ["General"]);
    }
  }, [id, isNew]);

  const performSave = useCallback(() => {
    setSaveStatus("saving");
    try {
      const saved = saveEssay({
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
    } catch (e) {
      setSaveStatus("unsaved");
      return null;
    }
  }, [essayId, title, tags, content, isNew, router]);

  useEffect(() => {
    if (isNew && !title && !content.trim()) return;
    setSaveStatus((prev) => (prev === "saved" ? "saved" : "unsaved"));
    const t = setTimeout(() => {
      if (!title && !content.trim()) return;
      performSave();
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [title, content, tags, performSave, isNew]);

  const handleSaveClick = () => {
    const saved = performSave();
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

  const handleDelete = () => {
    if (essayId) {
      deleteEssay(essayId);
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
