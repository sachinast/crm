"use client";

import { useEffect, useState } from "react";
import { fetchMasterOptions, type MasterFieldKey } from "@/lib/master-options-api";

/** A <select> populated from Super Admin master data (GET /master-options)
 * instead of a hardcoded option list or free text — booking_platform,
 * airline, cabin_class, hotel_name, room_type, car_provider, vehicle_type,
 * transmission all render this way.
 * 
 * If allowOther is true, "+ Other (Type custom value)" is available in the dropdown.
 * When selected by the user, it reveals a text input to type a custom value.
 */
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
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const safeValue = value ?? "";

  useEffect(() => {
    let cancelled = false;
    fetchMasterOptions(fieldKey, optionType).then((opts) => {
      if (!cancelled) {
        const vals = opts.map((o) => o.value);
        setOptions(vals);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fieldKey, optionType]);

  if (options === null) {
    return (
      <select disabled value="" className={`${className} opacity-60 cursor-wait`}>
        <option value="" disabled>
          Loading options…
        </option>
      </select>
    );
  }

  // Real master options only
  const allDropdownOptions = [...options];

  // If the user explicitly selected "Other", show the text input box with a button to switch back to dropdown
  if (allowOther && isOtherSelected) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        <input
          required={required}
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          className={`${className} flex-1`}
          placeholder={`Type custom ${placeholder ? placeholder.toLowerCase() : "value"}…`}
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setIsOtherSelected(false);
            if (options.length > 0) {
              onChange(options[0]);
            }
          }}
          className="text-xs text-accent font-semibold px-2.5 py-1.5 rounded-lg border border-hairline bg-surface hover:bg-surface-raised transition-colors shrink-0"
          title="Back to dropdown selection"
        >
          Choose from list
        </button>
      </div>
    );
  }

  return (
    <select
      required={required}
      value={safeValue}
      onChange={(e) => {
        if (allowOther && e.target.value === "__other__") {
          setIsOtherSelected(true);
          onChange("");
        } else {
          setIsOtherSelected(false);
          onChange(e.target.value);
        }
      }}
      className={className}
    >
      <option value="" disabled={required} hidden={Boolean(safeValue)}>
        {placeholder ?? "Select…"}
      </option>
      {safeValue && !allDropdownOptions.includes(safeValue) && (
        <option value={safeValue} hidden>
          {safeValue}
        </option>
      )}
      {allDropdownOptions.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
      {allowOther && <option value="__other__">+ Other (Type custom value)</option>}
    </select>
  );
}
