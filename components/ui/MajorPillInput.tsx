"use client";

import { useState, useRef, useCallback } from "react";
import { expandMajor } from "@/lib/majorAbbreviations";
import { cn } from "@/lib/utils";

interface MajorPillInputProps {
  label?: string;
  value: string[];
  onChange: (majors: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MajorPillInput({ label, value, onChange, placeholder = "e.g. CS, Biology — space, comma, or enter to add", className }: MajorPillInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addCurrent = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const expanded = expandMajor(trimmed);
    if (!expanded) return;
    if (value.includes(expanded)) {
      setInputValue("");
      return;
    }
    onChange([...value, expanded]);
    setInputValue("");
  }, [inputValue, value, onChange]);

  const removeMajor = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addCurrent();
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeMajor(value.length - 1);
    }
  };

  return (
    <div className={cn("space-y-1.5 text-sm", className)}>
      {label && (
        <label className="block text-xs font-medium text-[var(--muted)]">
          {label}
        </label>
      )}
      <div
        className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm focus-within:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/20"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((major, index) => (
          <span
            key={`${major}-${index}`}
            className="group inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 pl-2.5 pr-2.5 py-0.5 text-xs font-medium text-amber-400 transition-[padding,width] duration-150"
          >
            {major}
            <button
              type="button"
              aria-label={`Remove ${major}`}
              className="inline-flex min-w-0 w-0 overflow-hidden opacity-0 rounded-full p-0.5 text-amber-500/70 transition-[width,opacity,margin] duration-150 group-hover:ml-0.5 group-hover:w-4 group-hover:min-w-[1rem] group-hover:opacity-100 group-hover:overflow-visible hover:bg-amber-500/20"
              onClick={(e) => {
                e.stopPropagation();
                removeMajor(index);
              }}
            >
              <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          placeholder={value.length === 0 ? placeholder : ""}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addCurrent}
          className="min-w-[8rem] flex-1 shrink-0 border-0 bg-transparent p-0 text-[var(--text)] placeholder:text-[var(--muted-2)] focus:outline-none focus:ring-0"
        />
      </div>
    </div>
  );
}
