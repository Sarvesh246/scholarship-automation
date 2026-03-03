"use client";

import { useState, useRef, useEffect } from "react";
import { US_STATES, filterStates, findState } from "@/lib/usStates";
import { cn } from "@/lib/utils";

interface StateSelectProps {
  label?: string;
  value: string;
  onChange: (stateCode: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function StateSelect({ label, value, onChange, placeholder = "Type or choose state", className, id }: StateSelectProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const userInteractedRef = useRef(false);

  const selectedState = value ? US_STATES.find((s) => s.code === value) : null;
  const displayValue = inputValue !== "" ? inputValue : (selectedState?.name ?? "");
  const filtered = filterStates(inputValue);

  useEffect(() => {
    if (!value) setInputValue("");
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        const found = findState(inputValue);
        if (found) {
          onChange(found.code);
          setInputValue("");
        }
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open, inputValue, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") userInteractedRef.current = true;
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      setFocusedIndex(0);
      e.preventDefault();
      return;
    }
    if (open) {
      if (e.key === "ArrowDown") {
        setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1));
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        setFocusedIndex((i) => Math.max(i - 1, 0));
        e.preventDefault();
      } else if (e.key === "Enter") {
        const s = filtered[focusedIndex];
        if (s) {
          onChange(s.code);
          setInputValue("");
          setOpen(false);
        }
        e.preventDefault();
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
  };

  return (
    <div ref={containerRef} className={cn("space-y-1.5 text-sm", className)}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-[var(--muted)]">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          name="profile-state"
          autoComplete="nope"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => {
            const v = e.target.value;
            if (value && v !== selectedState?.name) {
              onChange("");
            }
            if (!v.trim()) onChange("");
            setInputValue(v);
            if (userInteractedRef.current) {
              setOpen(true);
              setFocusedIndex(0);
            }
            const found = findState(v);
            if (found && v.trim().toLowerCase() === found.name.toLowerCase()) {
              onChange(found.code);
            }
          }}
          onBlur={() => {
            userInteractedRef.current = false;
          }}
          onKeyDown={handleKeyDown}
          className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] shadow-sm placeholder:text-[var(--muted-2)] focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
        />
        {open && (
          <ul
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-[var(--muted-2)]">No state found</li>
            ) : (
              filtered.map((s, i) => (
                <li
                  key={s.code}
                  role="option"
                  aria-selected={focusedIndex === i}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-sm",
                    focusedIndex === i ? "bg-amber-500/20 text-amber-400" : "text-[var(--text)] hover:bg-[var(--surface-2)]"
                  )}
                  onMouseEnter={() => setFocusedIndex(i)}
                  onClick={() => {
                    onChange(s.code);
                    setInputValue("");
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-2 text-[var(--muted-2)]">({s.code})</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
