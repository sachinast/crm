"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { CountryCode } from "libphonenumber-js";
import { Search, ChevronDown, Check, X } from "lucide-react";

import { getCountryList, type CountryOption } from "@/lib/phone";
import FlagIcon from "@/components/shared/FlagIcon";

// Popular countries pinned at top of list for instant convenience
const PRIORITY_COUNTRY_CODES: CountryCode[] = ["IN", "US", "GB", "AE", "CA", "AU", "SG", "SA"];

interface PhoneInputProps {
  country: CountryCode;
  nationalNumber: string;
  onCountryChange: (country: CountryCode) => void;
  onNationalNumberChange: (value: string) => void;
  disabled?: boolean;
}

export default function PhoneInput({
  country,
  nationalNumber,
  onCountryChange,
  onNationalNumberChange,
  disabled = false,
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const allCountries = useMemo(() => getCountryList(), []);

  // Selected country option
  const selectedCountry = useMemo(() => {
    return allCountries.find((c) => c.code === country) ?? allCountries[0];
  }, [allCountries, country]);

  // Filtered & Ranked countries based on search query
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^\+/, "");
    if (!q) {
      const priority = allCountries.filter((c) => PRIORITY_COUNTRY_CODES.includes(c.code));
      const rest = allCountries.filter((c) => !PRIORITY_COUNTRY_CODES.includes(c.code));
      return [...priority, ...rest];
    }

    return allCountries
      .filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(q);
        const codeMatch = c.code.toLowerCase().includes(q);
        const dialMatch = c.dialCode.includes(q);
        return nameMatch || codeMatch || dialMatch;
      })
      .sort((a, b) => {
        // Exact dial code match comes first (e.g. '91' -> India +91)
        if (a.dialCode === q && b.dialCode !== q) return -1;
        if (b.dialCode === q && a.dialCode !== q) return 1;

        // Dial code starts with query
        const aDialStart = a.dialCode.startsWith(q);
        const bDialStart = b.dialCode.startsWith(q);
        if (aDialStart && !bDialStart) return -1;
        if (bDialStart && !aDialStart) return 1;

        // Name starts with query (e.g. 'i' -> India)
        const aNameStart = a.name.toLowerCase().startsWith(q);
        const bNameStart = b.name.toLowerCase().startsWith(q);
        if (aNameStart && !bNameStart) return -1;
        if (bNameStart && !aNameStart) return 1;

        // ISO code starts with query
        const aCodeStart = a.code.toLowerCase().startsWith(q);
        const bCodeStart = b.code.toLowerCase().startsWith(q);
        if (aCodeStart && !bCodeStart) return -1;
        if (bCodeStart && !aCodeStart) return 1;

        return a.name.localeCompare(b.name);
      });
  }, [allCountries, searchQuery]);

  // Reset focus index whenever filtered list changes
  useEffect(() => {
    setFocusedIndex(filteredCountries.length > 0 ? 0 : -1);
  }, [filteredCountries]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = useCallback(
    (c: CountryOption) => {
      onCountryChange(c.code);
      setIsOpen(false);
      setSearchQuery("");
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 10);
    },
    [onCountryChange]
  );

  // Keyboard navigation strictly inside dropdown / search
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setFocusedIndex((prev) => {
        const next = prev < filteredCountries.length - 1 ? prev + 1 : 0;
        scrollIndexIntoView(next);
        return next;
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setFocusedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : filteredCountries.length - 1;
        scrollIndexIntoView(next);
        return next;
      });
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (focusedIndex >= 0 && focusedIndex < filteredCountries.length) {
        handleSelect(filteredCountries[focusedIndex]);
      }
      return;
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(true);
    }
  };

  const scrollIndexIntoView = (index: number) => {
    if (!listRef.current) return;
    const item = listRef.current.children[index] as HTMLElement | undefined;
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  };

  return (
    <div ref={containerRef} className="relative flex w-full gap-2">
      {/* Country Code Selector Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={`input flex w-[7.8rem] shrink-0 items-center justify-between gap-1.5 px-3 font-medium transition-all hover:border-accent focus:border-accent ${
          isOpen ? "bg-surface-raised border-accent" : "bg-surface-sunken"
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          <FlagIcon code={selectedCountry.code} />
          <span className="font-mono text-sm font-semibold text-ink">+{selectedCountry.dialCode}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform duration-200 ${
            isOpen ? "rotate-180 text-accent" : ""
          }`}
        />
      </button>

      {/* National Number Input - Completely isolated from dropdown key interceptors */}
      <input
        ref={phoneInputRef}
        required
        disabled={disabled}
        type="tel"
        inputMode="numeric"
        value={nationalNumber}
        onChange={(e) => onNationalNumberChange(e.target.value.replace(/\D/g, ""))}
        className="input flex-1 pr-9 font-mono text-sm tracking-wider"
        placeholder="Phone number"
      />

      {/* Searchable Dropdown Popover */}
      {isOpen && (
        <div
          onKeyDown={handleDropdownKeyDown}
          className="absolute left-0 top-full z-50 mt-1.5 w-84 max-w-[90vw] overflow-hidden rounded-2xl border border-hairline-strong bg-surface p-2.5 shadow-2xl backdrop-blur-xl"
        >
          {/* Search Header */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country or code (91, India)..."
              className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface-sunken)] py-2 pl-8 pr-7 text-sm text-[var(--ink)] placeholder-[var(--ink-faint)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Helper Badge */}
          <div className="mb-1.5 px-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
            {searchQuery ? `Results (${filteredCountries.length})` : "Popular & All Countries"}
          </div>

          {/* Scrollable Country List */}
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className="scrollbar-thin max-h-56 overflow-y-auto space-y-0.5"
          >
            {filteredCountries.length === 0 ? (
              <li className="py-4 text-center text-sm text-[var(--ink-muted)]">
                No matching countries found.
              </li>
            ) : (
              filteredCountries.map((c, index) => {
                const isSelected = c.code === country;
                const isFocused = index === focusedIndex;
                return (
                  <li
                    key={c.code}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(c);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(c);
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                      isSelected
                        ? "bg-[var(--accent-soft)] text-[var(--accent-ink)] font-semibold"
                        : isFocused
                          ? "bg-[var(--surface-raised)] text-[var(--ink)]"
                          : "text-[var(--ink)] hover:bg-[var(--surface-raised)]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FlagIcon code={c.code} />
                      <span className="truncate">{c.name}</span>
                      <span className="text-xs text-[var(--ink-faint)]">({c.code})</span>
                    </div>

                    <div className="flex items-center gap-1.5 pl-2">
                      <span className="font-mono text-xs text-[var(--ink-muted)]">+{c.dialCode}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
