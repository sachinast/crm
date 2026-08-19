// Shared field-format validation. Phone format/sanitization moved to
// lib/phone.ts (country-aware, via libphonenumber-js) once the intake form
// grew a country-code selector — a generic "7+ digits" check doesn't apply
// once each country has its own real numbering rules.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}
