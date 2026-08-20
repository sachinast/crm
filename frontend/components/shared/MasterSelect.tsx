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
  value = "",
  onChange,
  required = true,
}: {
  fieldKey: MasterFieldKey;
  value?: string | null;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [options, setOptions] = useState<string[] | null>(null);
  const safeValue = value ?? "";

  useEffect(() => {
    let cancelled = false;
    fetchMasterOptions(fieldKey).then((opts) => {
      if (!cancelled) setOptions(opts.map((o) => o.value));
    });
    return () => {
      cancelled = true;
    };
  }, [fieldKey]);

  if (options === null) {
    return (
      <select disabled value="" className="input opacity-60 cursor-wait">
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
        className="input"
        placeholder="No masters defined yet — Admin > Masters"
      />
    );
  }

  return (
    <select required={required} value={safeValue} onChange={(e) => onChange(e.target.value)} className="input">
      <option value="" disabled>
        Select…
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
