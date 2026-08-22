"use client";

import { useEffect, useState } from "react";

import { fetchMasterOptions, type MasterFieldKey } from "@/lib/master-options-api";

/** A <select> populated from Super Admin master data (GET /master-options)
 * instead of a hardcoded option list or free text — booking_platform,
 * airline, cabin_class, hotel_name, room_type, car_provider, vehicle_type,
 * transmission all render this way now. Falls back to a plain text input
 * if no options have been defined yet for this field, so a freshly-deployed
 * instance isn't blocked before an admin populates any masters. */
export default function MasterSelect({
  fieldKey,
  optionType,
  value = "",
  onChange,
  required = true,
  placeholder,
  allowOther = false,
  className = "input",
}: {
  fieldKey: MasterFieldKey;
  optionType?: "master" | "addon";
  value?: string | null;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  allowOther?: boolean;
  className?: string;
}) {
  const [options, setOptions] = useState<string[] | null>(null);
  const [isOther, setIsOther] = useState(false);
  const safeValue = value ?? "";

  useEffect(() => {
    let cancelled = false;
    fetchMasterOptions(fieldKey, optionType).then((opts) => {
      if (!cancelled) {
        const vals = opts.map((o) => o.value);
        setOptions(vals);
        if (allowOther && safeValue && !vals.includes(safeValue)) {
          setIsOther(true);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fieldKey, optionType, allowOther]);

  if (options === null) {
    return (
      <select disabled value="" className={`${className} opacity-60 cursor-wait`}>
        <option value="" disabled>
          Loading options…
        </option>
      </select>
    );
  }

  if (options.length === 0) {
    return (
      <input
        required={required}
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder={placeholder ?? "No masters defined — Admin > Masters"}
      />
    );
  }

  if (allowOther && isOther) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        <input
          required={required}
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          className={`${className} flex-1`}
          placeholder={`Enter custom ${placeholder || "value"}…`}
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setIsOther(false);
            onChange(options[0] ?? "");
          }}
          className="text-xs text-accent font-semibold px-2 py-1.5 rounded-lg border border-hairline bg-surface hover:bg-surface-raised transition-colors shrink-0"
          title="Back to list"
        >
          Select from list
        </button>
      </div>
    );
  }

  return (
    <select
      required={required}
      value={options.includes(safeValue) ? safeValue : allowOther && safeValue ? "__other__" : safeValue}
      onChange={(e) => {
        if (allowOther && e.target.value === "__other__") {
          setIsOther(true);
          onChange("");
        } else {
          setIsOther(false);
          onChange(e.target.value);
        }
      }}
      className={className}
    >
      <option value="" disabled={required}>
        {placeholder ?? "Select…"}
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
      {allowOther && <option value="__other__">+ Other (Type custom value)</option>}
    </select>
  );
}
