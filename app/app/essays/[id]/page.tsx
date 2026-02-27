"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { essays } from "@/data/mockData";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export default function EssayEditorPage() {
  const params = useParams();
  const id = params?.id as string;
  const existing = id === "new" ? null : essays.find((e) => e.id === id);
  const router = useRouter();
  const { showToast } = useToast();

  const [title, setTitle] = useState(existing?.title ?? "");
  const [content, setContent] = useState(existing?.content ?? "");
  const [tags, setTags] = useState(existing?.tags ?? ["General"]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    showToast({
      title: "Saved",
      message: "Essay draft saved locally in this mock.",
      variant: "success"
    });
  };

  const handleDelete = () => {
    showToast({
      title: "Essay deleted",
      message: "In a real app this would remove the essay.",
      variant: "warning"
    });
    router.push("/app/essays");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={existing ? "Edit essay" : "New essay"}
        subtitle="Draft once, adapt for multiple scholarships."
        primaryAction={
          <div className="flex gap-2">
            {existing && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            )}
            <Button type="button" size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
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
            Autosave: <span className="font-medium">Saved just now</span>
          </p>
        </div>

        <div className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-xs">
          <div>
            <h3 className="text-sm font-semibold">Tags</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Details</h3>
            <p className="mt-1 text-[10px] text-[var(--muted-2)]">
              Word count is approximate in this base UI.
            </p>
          </div>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        title="Delete this essay?"
        description="This is a mock deletion in the base UI, but in production it would be permanent."
        destructive
        primaryLabel="Delete"
        onClose={() => setConfirmDelete(false)}
        onPrimary={handleDelete}
      />
    </div>
  );
}

