"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, X, Loader2, Navigation } from "lucide-react";

export interface PlaceSuggestion {
  description: string;
  primary: string;
  secondary: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  types?: string[];
  uppercase?: boolean;
}

/**
 * Formats raw Photon GeoJSON properties into clean primary and secondary strings
 */
function formatPhotonProperties(p: Record<string, any>): PlaceSuggestion {
  const { name, housenumber, street, city, state, postcode, country } = p;

  let streetPart = "";
  if (housenumber && street) {
    streetPart = `${housenumber} ${street}`;
  } else if (street) {
    streetPart = street;
  }

  const primary = name && name !== housenumber ? name : streetPart || city || country || "";
  const secondaryParts = [
    primary !== streetPart ? streetPart : null,
    city,
    state,
    postcode,
    country,
  ].filter(Boolean);

  const unique = Array.from(new Set(secondaryParts));
  const secondary = unique.join(", ");
  const description = primary && secondary ? `${primary}, ${secondary}` : primary || secondary || "";

  return { description, primary, secondary };
}

/**
 * Fetch suggestions from local free proxy or directly from Photon open API (no key required)
 */
async function fetchOpenAddressSuggestions(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Try local route first
  try {
    const res = await fetch(`/api/geo/autocomplete?q=${encodeURIComponent(q)}`, { signal });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        return data.suggestions;
      }
    }
  } catch {
    // Fall back to direct Photon open API
  }

  // Direct Photon fallback (Komoot OpenStreetMap geocoder, 100% free, CORS-enabled, no key needed)
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`,
      { headers: { Accept: "application/json" }, signal }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.features)) {
        const seen = new Set<string>();
        const results: PlaceSuggestion[] = [];
        for (const f of data.features) {
          if (!f.properties) continue;
          const formatted = formatPhotonProperties(f.properties);
          if (formatted.description && !seen.has(formatted.description.toLowerCase())) {
            seen.add(formatted.description.toLowerCase());
            results.push(formatted);
          }
        }
        return results;
      }
    }
  } catch {
    // Graceful silent fallback if offline
  }

  return [];
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Enter address or location…",
  className = "",
  disabled = false,
  required = false,
  id,
  name,
  uppercase = false,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value ?? "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync internal input value if prop value changes externally
  useEffect(() => {
    setInputValue(value ?? "");
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!isOpen || disabled) return;

    const trimmed = inputValue.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await fetchOpenAddressSuggestions(trimmed, controller.signal);
        setSuggestions(results);
        setHighlightedIndex(-1);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [inputValue, isOpen, disabled]);

  const handleSelect = useCallback(
    (suggestion: PlaceSuggestion) => {
      const finalVal = uppercase ? suggestion.description.toUpperCase() : suggestion.description;
      setInputValue(finalVal);
      onChange(finalVal);
      setIsOpen(false);
      setSuggestions([]);
      inputRef.current?.focus();
    },
    [onChange, uppercase]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const finalVal = uppercase ? raw.toUpperCase() : raw;
    setInputValue(finalVal);
    onChange(finalVal);
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center w-full">
        <span className="absolute left-3 text-ink-muted pointer-events-none flex items-center">
          <MapPin size={14} className="text-accent/80" />
        </span>

        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          required={required}
          disabled={disabled}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (inputValue.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className={`input pl-8 pr-14 w-full ${uppercase ? "uppercase font-mono" : ""} ${className}`}
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {isLoading && (
            <Loader2 size={13} className="text-accent animate-spin" />
          )}

          {inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-ink-muted hover:text-ink p-1 rounded-md transition-colors"
              title="Clear location"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Suggestions Dropdown (100% Free Open API) */}
      {isOpen && suggestions.length > 0 && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-hairline bg-surface shadow-lg py-1.5 animate-fadeIn backdrop-blur-md">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted border-b border-hairline/60 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Navigation size={10} className="text-accent" />
              <span>Location Suggestions</span>
            </span>
            <span className="text-ink-faint font-normal lowercase text-[9px]">OpenStreetMap</span>
          </div>

          <ul className="divide-y divide-hairline/40">
            {suggestions.map((suggestion, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <li
                  key={`${suggestion.description}-${idx}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(suggestion);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-2 cursor-pointer flex items-start gap-2.5 transition-colors text-xs ${
                    isHighlighted
                      ? "bg-accent-soft text-accent"
                      : "hover:bg-surface-raised text-ink"
                  }`}
                >
                  <MapPin
                    size={14}
                    className={`mt-0.5 shrink-0 ${
                      isHighlighted ? "text-accent" : "text-ink-muted"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-ink">
                      {suggestion.primary || suggestion.description}
                    </p>
                    {suggestion.secondary && (
                      <p className="text-[11px] text-ink-muted truncate">
                        {suggestion.secondary}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
