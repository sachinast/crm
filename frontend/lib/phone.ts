// Country-aware phone handling — libphonenumber-js gives us real per-country
// validation (each country has its own valid digit-length range, not one
// generic "7+ digits" rule) and the dial-code table; country *names* come
// from the browser's own Intl.DisplayNames (no separate data file to
// maintain), and flags are derived from the ISO code itself (each letter of
// "US" maps to a Unicode regional-indicator symbol — 🇺🇸 — no emoji lookup
// table needed either).
import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber as libIsValidPhoneNumber,
  type CountryCode,
} from "libphonenumber-js";

export interface CountryOption {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
}

export function countryCodeToFlag(iso2: string): string {
  return String.fromCodePoint(...[...iso2.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

let cachedCountryList: CountryOption[] | null = null;

export function getCountryList(): CountryOption[] {
  if (cachedCountryList) return cachedCountryList;
  const displayNames = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
  cachedCountryList = getCountries()
    .map((code) => ({
      code,
      name: displayNames?.of(code) ?? code,
      dialCode: getCountryCallingCode(code),
      flag: countryCodeToFlag(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return cachedCountryList;
}

/** Validates a *national* number (no dial code) against the given country's
 * real numbering rules — e.g. a US number needs exactly 10 digits, a UK
 * mobile number has its own distinct length. Empty/too-short input is
 * "not yet valid", not an error — the caller decides when to start showing
 * that as a validation message. */
export function isValidNationalNumber(nationalNumber: string, country: CountryCode): boolean {
  if (!nationalNumber.trim()) return false;
  return libIsValidPhoneNumber(nationalNumber, country);
}

export function toE164(nationalNumber: string, country: CountryCode): string {
  return `+${getCountryCallingCode(country)}${nationalNumber.replace(/\D/g, "")}`;
}

/** Best-effort default country: Vercel's edge-injected geo header (production)
 * falls back to the browser's own locale region, then a hard "US" default —
 * no permission prompt, no external API call. */
export async function detectDefaultCountry(): Promise<CountryCode> {
  try {
    const resp = await fetch("/api/geo");
    if (resp.ok) {
      const body = await resp.json();
      if (body.country) return body.country as CountryCode;
    }
  } catch {
    // fall through to the locale-based guess below
  }

  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
  const region = locale.split("-")[1];
  if (region && getCountries().includes(region as CountryCode)) {
    return region as CountryCode;
  }
  return "US";
}
