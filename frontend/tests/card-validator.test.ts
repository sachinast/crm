import test, { describe, it } from "node:test";
import assert from "node:assert";

import {
  isMaskedCard,
  isMaskedExpiry,
  isMaskedCVV,
  validateLuhn,
  validateCardDetails,
} from "../lib/card-validator.ts";

describe("Card Validator & Masking Detection", () => {
  it("detects masked card numbers on file accurately", () => {
    assert.strictEqual(isMaskedCard("**** **** **** 4242"), true);
    assert.strictEqual(isMaskedCard("•••• •••• •••• 1234"), true);
    assert.strictEqual(isMaskedCard("************4242"), true);
    assert.strictEqual(isMaskedCard("4111111111111234"), false);
    assert.strictEqual(isMaskedCard(""), false);
    assert.strictEqual(isMaskedCard(null), false);
  });

  it("detects masked card expiry on file accurately", () => {
    assert.strictEqual(isMaskedExpiry("**/**"), true);
    assert.strictEqual(isMaskedExpiry("••/••"), true);
    assert.strictEqual(isMaskedExpiry("** / **"), true);
    assert.strictEqual(isMaskedExpiry("12/28"), false);
    assert.strictEqual(isMaskedExpiry(""), false);
  });

  it("detects masked CVV on file accurately", () => {
    assert.strictEqual(isMaskedCVV("***"), true);
    assert.strictEqual(isMaskedCVV("••••"), true);
    assert.strictEqual(isMaskedCVV("..."), true);
    assert.strictEqual(isMaskedCVV("...."), true);
    assert.strictEqual(isMaskedCVV("123"), false);
    assert.strictEqual(isMaskedCVV(""), false);
  });

  it("validates Luhn MOD 10 checksum algorithm", () => {
    // Valid Visa test numbers (Luhn compliant)
    assert.strictEqual(validateLuhn("4111111111111111"), true);
    assert.strictEqual(validateLuhn("4242424242424242"), true);

    // Invalid numbers
    assert.strictEqual(validateLuhn("4111111111111112"), false);
    assert.strictEqual(validateLuhn("12345"), false);
  });

  it("treats masked cards on file as valid during agent edit workflows", () => {
    // When editing an existing booking, card details on file are masked
    const result = validateCardDetails(
      "**** **** **** 4242",
      "**/**",
      "***",
      "Visa"
    );

    // Masked on file must be marked as valid to prevent blocking agent updates
    assert.strictEqual(result.isValidNumber, true);
    assert.strictEqual(result.isExpiryValid, true);
    assert.strictEqual(result.isCvvValid, true);
    assert.strictEqual(result.isMaskedNumber, true);
    assert.strictEqual(result.isMaskedExpiry, true);
    assert.strictEqual(result.isMaskedCvv, true);
  });

  it("validates real raw card inputs and flags invalid numbers", () => {
    const invalidResult = validateCardDetails(
      "1234", // too short
      "01/20", // expired
      "1" // too short
    );

    assert.strictEqual(invalidResult.isValidNumber, false);
    assert.strictEqual(invalidResult.isExpiryValid, false);
    assert.strictEqual(invalidResult.isCvvValid, false);
  });
});
