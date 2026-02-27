interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

interface ChecklistProps {
  title?: string;
  items: ChecklistItem[];
  onToggle?: (id: string) => void;
}

export function Checklist({ title, items, onToggle }: ChecklistProps) {
  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
      )}
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-md bg-[var(--surface-2)] px-3 py-2 text-xs"
          >
            <button
              type="button"
              aria-pressed={item.completed}
              onClick={() => onToggle?.(item.id)}
              className="flex h-4 w-4 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface)] text-[10px]"
            >
              {item.completed ? "✓" : ""}
            </button>
            <span
              className={
                item.completed
                  ? "text-[var(--muted-2)] line-through"
                  : "text-[var(--text)]"
              }
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

