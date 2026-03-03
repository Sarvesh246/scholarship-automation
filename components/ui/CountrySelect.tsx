"use client";

import { useState, useRef, useEffect } from "react";
import { COUNTRIES, filterCountries, findCountry } from "@/lib/countries";
import { cn } from "@/lib/utils";

interface CountrySelectProps {
  label?: string;
  value: string;
  onChange: (countryCode: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

/** Resolve value to a country code (handles legacy "USA" or "United States" etc.). */
function toCountryCode(value: string): string {
  if (!value || !value.trim()) return "";
  const q = value.trim().toUpperCase();
  if (q.length === 2) return COUNTRIES.some((c) => c.code === q) ? q : value.trim();
  const found = findCountry(value);
  return found ? found.code : value.trim();
}

export function CountrySelect({
  label,
  value,
  onChange,
  placeholder = "Type or choose country",
  className,
  id,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const userInteractedRef = useRef(false);

  const code = toCountryCode(value);
  const selectedCountry = code ? COUNTRIES.find((c) => c.code === code) : null;
  const displayValue = inputValue !== "" ? inputValue : (selectedCountry?.name ?? "");
  const filtered = filterCountries(inputValue);

  useEffect(() => {
    if (!value) setInputValue("");
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        const found = findCountry(inputValue);
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
        const c = filtered[focusedIndex];
        if (c) {
          onChange(c.code);
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
          name="profile-country"
          autoComplete="nope"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => {
            const v = e.target.value;
            if (code && v !== selectedCountry?.name) {
              onChange("");
            }
            if (!v.trim()) onChange("");
            setInputValue(v);
            if (userInteractedRef.current) {
              setOpen(true);
              setFocusedIndex(0);
            }
            const found = findCountry(v);
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
              <li className="px-3 py-2 text-xs text-[var(--muted-2)]">No country found</li>
            ) : (
              filtered.map((c, i) => (
                <li
                  key={c.code}
                  role="option"
                  aria-selected={focusedIndex === i}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-sm",
                    focusedIndex === i ? "bg-amber-500/20 text-amber-400" : "text-[var(--text)] hover:bg-[var(--surface-2)]"
                  )}
                  onMouseEnter={() => setFocusedIndex(i)}
                  onClick={() => {
                    onChange(c.code);
                    setInputValue("");
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-[var(--muted-2)]">({c.code})</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
