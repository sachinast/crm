// Shared field-format validation — used by the lead intake form (and
// anywhere else that collects email/phone) so "only emails allowed in the
// email field, only phone characters in the phone field" is enforced the
// same way everywhere, not re-implemented per form.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

// Digits, spaces, and the punctuation real phone numbers use
// (+, -, (, ), .) — deliberately no letters. Used to strip disallowed
// characters as the user types, not just to validate on submit.
const PHONE_ALLOWED_CHARS = /[^0-9+\-().\s]/g;

export function sanitizePhoneInput(value: string): string {
  return value.replace(PHONE_ALLOWED_CHARS, "");
}

export function isValidPhone(value: string): boolean {
  const digitCount = value.replace(/\D/g, "").length;
  return digitCount >= 7 && !PHONE_ALLOWED_CHARS.test(value);
}
