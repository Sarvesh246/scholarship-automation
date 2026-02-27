import { Textarea } from "@/components/ui/Textarea";

interface PromptBlockProps {
  prompt: string;
  value: string;
  onChange: (value: string) => void;
}

export function PromptBlock({ prompt, value, onChange }: PromptBlockProps) {
  return (
    <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-sm shadow-sm">
      <p className="text-xs font-medium text-[var(--text)]">{prompt}</p>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Draft your response here..."
      />
      <p className="text-[10px] text-[var(--muted-2)]">
        Autosave: <span className="font-medium">Saved just now</span>
      </p>
    </div>
  );
}

