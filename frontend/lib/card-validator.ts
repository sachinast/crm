/**
 * Credit Card Validation & Verification Utilities
 * Implements Luhn (MOD 10) algorithm, card network detection, expiry verification, and CVV checks.
 */

export type CardBrand = "Visa" | "Mastercard" | "Amex" | "Discover" | "JCB" | "Diners" | "Unknown";

export interface CardValidationResult {
  isValidNumber: boolean;
  brand: CardBrand;
  numberError?: string;
  isExpiryValid: boolean;
  isExpired: boolean;
  expiryError?: string;
  isCvvValid: boolean;
  cvvError?: string;
}

/**
 * Standard Luhn (MOD 10) Checksum Algorithm
 */
export function validateLuhn(rawNumber: string): boolean {
  const digits = rawNumber.replace(/\D/g, "").slice(0, 16);
  if (digits.length < 13 || digits.length > 16) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Detects card network by IIN / BIN prefix ranges
 */
export function detectCardBrand(rawNumber: string): CardBrand {
  const digits = rawNumber.replace(/\D/g, "").slice(0, 16);
  if (!digits) return "Unknown";

  // Visa: starts with 4
  if (/^4/.test(digits)) return "Visa";

  // American Express: starts with 34 or 37
  if (/^3[47]/.test(digits)) return "Amex";

  // Mastercard: 51-55 or 2221-2720
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(digits)) return "Mastercard";

  // Discover: 6011, 622126-622925, 644-649, 65
  if (/^(6011|65|64[4-9]|622)/.test(digits)) return "Discover";

  // JCB: 3528-3589
  if (/^35(2[89]|[3-8][0-9])/.test(digits)) return "JCB";

  // Diners Club: 300-305, 36, 38
  if (/^(30[0-5]|36|38)/.test(digits)) return "Diners";

  return "Unknown";
}

/**
 * Validates Expiry Date (MM/YY or MM/YYYY)
 */
export function validateExpiry(expiryStr: string): { isValid: boolean; isExpired: boolean; error?: string } {
  const clean = expiryStr.replace(/\D/g, "").slice(0, 4);
  if (!clean || clean.length < 4) {
    return { isValid: false, isExpired: false, error: clean.length > 0 ? "Incomplete date (MM/YY)" : undefined };
  }

  const month = parseInt(clean.slice(0, 2), 10);
  let year = parseInt(clean.slice(2, 4), 10);

  // Month check (01 to 12)
  if (month < 1 || month > 12) {
    return { isValid: false, isExpired: false, error: "Invalid month (must be 01 - 12)" };
  }

  // Convert 2-digit YY to 4-digit YYYY
  year += 2000;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  // Expiration check
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return { isValid: false, isExpired: true, error: "Card is expired" };
  }

  // Far future sanity check (> 25 years)
  if (year > currentYear + 25) {
    return { isValid: false, isExpired: false, error: "Invalid expiration year" };
  }

  return { isValid: true, isExpired: false };
}

/**
 * Validates CVV / CVC code
 */
export function validateCVV(cvv: string, brand: CardBrand = "Unknown"): { isValid: boolean; error?: string } {
  const clean = cvv.replace(/\D/g, "");
  if (!clean) return { isValid: false };

  const requiredLen = brand === "Amex" ? 4 : 3;
  if (clean.length !== requiredLen) {
    return { isValid: false, error: `${requiredLen}-digit CVV required` };
  }

  return { isValid: true };
}

/**
 * Comprehensive Card Validator (Enforcing Max 16 Digits)
 */
export function validateCardDetails(
  cardNumber: string,
  cardExpiry: string,
  cvv: string
): CardValidationResult {
  const cleanNum = cardNumber.replace(/\D/g, "").slice(0, 16);
  const brand = detectCardBrand(cleanNum);
  const expectedLen = brand === "Amex" ? 15 : 16;

  let isValidNumber = false;
  let numberError: string | undefined;

  if (cleanNum.length === expectedLen || (brand === "Unknown" && cleanNum.length >= 13 && cleanNum.length <= 16)) {
    isValidNumber = validateLuhn(cleanNum);
    if (!isValidNumber) {
      numberError = "Invalid card number (Luhn checksum failed)";
    }
  } else if (cleanNum.length > 0) {
    numberError = `Card number must be ${expectedLen} digits (${cleanNum.length}/${expectedLen})`;
  }

  const expiryRes = validateExpiry(cardExpiry);
  const cvvRes = validateCVV(cvv, brand);

  return {
    isValidNumber,
    brand,
    numberError,
    isExpiryValid: expiryRes.isValid,
    isExpired: expiryRes.isExpired,
    expiryError: expiryRes.error,
    isCvvValid: cvvRes.isValid,
    cvvError: cvvRes.error,
  };
}
