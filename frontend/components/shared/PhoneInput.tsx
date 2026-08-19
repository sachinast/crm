"use client";

import { useMemo } from "react";
import type { CountryCode } from "libphonenumber-js";

import { getCountryList } from "@/lib/phone";

/** Country-code + national-number pair, rendered as a flag/dial-code
 * dropdown next to a digits-only input — the caller owns the combined E.164
 * value (lib/phone.ts's toE164) and validation (isValidNationalNumber). */
export default function PhoneInput({
  country,
  nationalNumber,
  onCountryChange,
  onNationalNumberChange,
  disabled = false,
}: {
  country: CountryCode;
  nationalNumber: string;
  onCountryChange: (country: CountryCode) => void;
  onNationalNumberChange: (value: string) => void;
  disabled?: boolean;
}) {
  const countries = useMemo(() => getCountryList(), []);

  return (
    <div className="flex gap-2">
      <select
        value={country}
        disabled={disabled}
        onChange={(e) => onCountryChange(e.target.value as CountryCode)}
        className="input w-[6.5rem] shrink-0"
        aria-label="Country code"
      >
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} +{c.dialCode}
          </option>
        ))}
      </select>
      <input
        required
        disabled={disabled}
        inputMode="numeric"
        value={nationalNumber}
        onChange={(e) => onNationalNumberChange(e.target.value.replace(/\D/g, ""))}
        className="input flex-1 pr-9"
        placeholder="Phone number"
      />
    </div>
  );
}
