import { useRef } from "react";
import { Button } from "@/components/ui/Button";

interface DocumentSlotProps {
  label: string;
  uploaded?: boolean;
  onUpload?: (file: File) => void;
}

export function DocumentSlot({ label, uploaded, onUpload }: DocumentSlotProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleBrowse = () => {
    inputRef.current?.click();
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload?.(file);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-xs">
      <div className="flex flex-col">
        <span className="font-medium">{label}</span>
        <span className={`text-[10px] ${uploaded ? "text-emerald-400" : "text-[var(--muted-2)]"}`}>
          {uploaded ? "Uploaded" : "Not uploaded"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleBrowse}
        >
          {uploaded ? "Replace" : "Upload"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          aria-label={`Upload ${label}`}
        />
      </div>
    </div>
  );
}
