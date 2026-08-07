"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useFieldSuggestions } from "@/lib/useFieldSuggestions";
import { useDebounced } from "@/lib/useDebounce";

export function SearchFieldAutocomplete({
  value,
  onChange,
  placeholder = "Sample code, diagnosis, notes… or field-name:value",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only look up field names while the person hasn't typed a ":" yet --
  // once there's a colon, they've picked a field and are typing its query.
  const hasColon = value.includes(":");
  const fieldQuery = hasColon ? "" : value;
  const debouncedQuery = useDebounced(fieldQuery, 150);
  const suggestions = useFieldSuggestions(debouncedQuery);

  const showDropdown = focused && !hasColon && fieldQuery.length > 0 && suggestions.length > 0;

  useEffect(() => {
    setHighlighted(0);
  }, [suggestions]);

  function complete(index: number) {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    onChange(`${suggestion.key}:`);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      complete(highlighted);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  }

  return (
    <div className="relative">
      <Search size={15} className="pointer-events-none absolute left-2.5 top-2.5 text-ink-400" />
      <input
        ref={inputRef}
        className="input pl-8"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        autoComplete="off"
      />

      {showDropdown && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded border border-line bg-panel py-1 shadow-panel">
          {suggestions.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                // onMouseDown (not onClick) fires before the input's onBlur,
                // so the field completes without the dropdown closing first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  complete(i);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${
                  i === highlighted ? "bg-slate-50 text-slate-700" : "text-ink hover:bg-ink-50"
                }`}
              >
                <span>
                  {s.label} <span className="font-mono text-xs text-ink-400">{s.key}</span>
                </span>
                <span className="text-xs text-ink-400">{s.type}</span>
              </button>
            </li>
          ))}
          <li className="border-t border-line px-3 py-1 text-xs text-ink-400">
            Tab to complete
          </li>
        </ul>
      )}
    </div>
  );
}