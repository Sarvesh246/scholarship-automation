"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Strike from "@tiptap/extension-strike";
import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  minHeight?: string;
  /** HTML content expected. Pass through contentForEditor() if you have markdown. */
}

function FormatBtn({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={cn(
        "rounded px-2 py-1 text-xs min-w-[28px] text-center transition-colors",
        active
          ? "bg-amber-500/20 text-amber-400"
          : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  label,
  className,
  minHeight = "200px",
}: RichTextEditorProps) {
  const isInitialMount = useRef(true);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Strike,
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] px-3 py-2 focus:outline-none text-[var(--text)] [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-1 [&_h3]:mb-0.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1 [&_li]:my-0.5 [&_blockquote]:border-l-2 [&_blockquote]:border-amber-500/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[var(--muted)] [&_blockquote]:my-1 [&_code]:bg-[var(--surface-2)] [&_code]:px-1 [&_code]:rounded [&_code]:text-amber-400 [&_code]:text-xs [&_pre]:bg-[var(--surface-2)] [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:my-1 [&_strong]:font-bold [&_em]:italic [&_s]:line-through",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html === "<p></p>") {
        onChange("");
      } else {
        onChange(html);
      }
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const current = editor.getHTML();
    const normalized = value || "<p></p>";
    if (current !== normalized) {
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
  }, [value, editor]);

  const setBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const setItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const setStrike = useCallback(() => editor?.chain().focus().toggleStrike().run(), [editor]);
  const setHeading2 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 2 }).run(), [editor]);
  const setBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const setOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor]);
  const setBlockquote = useCallback(() => editor?.chain().focus().toggleBlockquote().run(), [editor]);
  const setCode = useCallback(() => editor?.chain().focus().toggleCode().run(), [editor]);

  if (!editor) {
    return (
      <div className={cn("space-y-1.5 text-sm", className)}>
        {label && (
          <label className="block text-xs font-medium text-[var(--muted)]">{label}</label>
        )}
        <LoadingScreen message="Preparing editor…" compact className="rounded-lg border border-[var(--border)]" style={{ minHeight }} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5 text-sm", className)}>
      {label && (
        <label className="block text-xs font-medium text-[var(--muted)]">{label}</label>
      )}
      <div
        className="rounded-lg border border-[var(--border)] bg-[var(--bg)] overflow-hidden focus-within:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all"
        style={{ minHeight }}
      >
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--border)] bg-[var(--surface)] p-1">
          <FormatBtn active={editor.isActive("bold")} onClick={setBold} title="Bold (Ctrl+B)">
            <span className="font-bold">B</span>
          </FormatBtn>
          <FormatBtn active={editor.isActive("italic")} onClick={setItalic} title="Italic (Ctrl+I)">
            <span className="italic">I</span>
          </FormatBtn>
          <FormatBtn active={editor.isActive("strike")} onClick={setStrike} title="Strikethrough">
            <span className="line-through">S</span>
          </FormatBtn>
          <div className="mx-0.5 w-px h-4 bg-[var(--border)]" aria-hidden />
          <FormatBtn active={editor.isActive("heading", { level: 2 })} onClick={setHeading2} title="Heading 2">
            H₂
          </FormatBtn>
          <FormatBtn active={editor.isActive("bulletList")} onClick={setBulletList} title="Bullet list">
            •
          </FormatBtn>
          <FormatBtn active={editor.isActive("orderedList")} onClick={setOrderedList} title="Numbered list">
            1.
          </FormatBtn>
          <FormatBtn active={editor.isActive("blockquote")} onClick={setBlockquote} title="Blockquote">
            &ldquo;
          </FormatBtn>
          <FormatBtn active={editor.isActive("code")} onClick={setCode} title="Inline code">
            &lt;/&gt;
          </FormatBtn>
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
