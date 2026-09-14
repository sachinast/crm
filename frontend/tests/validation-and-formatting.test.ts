import test, { describe, it } from "node:test";
import assert from "node:assert";

import { isValidEmail } from "../lib/validation.ts";
import {
  countryCodeToFlag,
  isValidNationalNumber,
  toE164,
  getCountryList,
} from "../lib/phone.ts";
import { formatStatus, STATUS_COLOR_HINTS } from "../lib/status-meta.ts";
import { statusBadgeClass } from "../lib/status-colors.ts";
import { formatCurrency, formatDate, formatDateTime } from "../lib/formatters.ts";

describe("Validation and Data Formatting Suite", () => {
  describe("Email Validation (isValidEmail)", () => {
    it("validates well-formed email addresses", () => {
      assert.strictEqual(isValidEmail("customer@example.com"), true);
      assert.strictEqual(isValidEmail("jane.doe+travel@sub.domain.co.uk"), true);
      assert.strictEqual(isValidEmail("crbooking@crm.com"), true);
      assert.strictEqual(isValidEmail("agent@webflowby.online"), true);
    });

    it("rejects invalid, malformed, or blank email addresses", () => {
      assert.strictEqual(isValidEmail(""), false);
      assert.strictEqual(isValidEmail("   "), false);
      assert.strictEqual(isValidEmail("plainaddress"), false);
      assert.strictEqual(isValidEmail("@missingusername.com"), false);
      assert.strictEqual(isValidEmail("username@.com"), false);
      assert.strictEqual(isValidEmail("username@domain"), false);
      assert.strictEqual(isValidEmail("user name@domain.com"), false);
    });
  });

  describe("Country-Aware Phone Validation & E.164 Formatting", () => {
    it("validates US phone numbers (10 digits required)", () => {
      assert.strictEqual(isValidNationalNumber("3055550123", "US"), true);
      assert.strictEqual(isValidNationalNumber("(305) 555-0123", "US"), true);
      assert.strictEqual(isValidNationalNumber("305-555-0123", "US"), true);

      // Too short / invalid
      assert.strictEqual(isValidNationalNumber("5550123", "US"), false);
      assert.strictEqual(isValidNationalNumber("12345", "US"), false);
      assert.strictEqual(isValidNationalNumber("", "US"), false);
    });

    it("validates UK phone numbers according to UK national rules", () => {
      assert.strictEqual(isValidNationalNumber("07911123456", "GB"), true);
      assert.strictEqual(isValidNationalNumber("7911123456", "GB"), true);
      assert.strictEqual(isValidNationalNumber("123", "GB"), false);
    });

    it("formats national numbers into standard E.164 international notation", () => {
      assert.strictEqual(toE164("3055550123", "US"), "+13055550123");
      assert.strictEqual(toE164("(305) 555-0123", "US"), "+13055550123");
      assert.strictEqual(toE164("7911123456", "GB"), "+447911123456");
    });

    it("generates flag emojis from ISO-2 country codes", () => {
      assert.strictEqual(countryCodeToFlag("US"), "🇺🇸");
      assert.strictEqual(countryCodeToFlag("GB"), "🇬🇧");
      assert.strictEqual(countryCodeToFlag("CA"), "🇨🇦");
      assert.strictEqual(countryCodeToFlag("IN"), "🇮🇳");
    });

    it("retrieves a sorted country list with ISO, dialCode, name, and flag", () => {
      const countries = getCountryList();
      assert.ok(countries.length > 200);
      const us = countries.find((c) => c.code === "US");
      assert.ok(us);
      assert.strictEqual(us?.dialCode, "1");
      assert.strictEqual(us?.flag, "🇺🇸");
    });
  });

  describe("Status Formatting & Color Tokens", () => {
    it("formats internal status codes into human-readable capitalized labels", () => {
      assert.strictEqual(formatStatus("card_charged"), "Card Charged");
      assert.strictEqual(formatStatus("tag_cr_booking"), "Cr Booking");
      assert.strictEqual(formatStatus("tag_change_dep"), "Change Dep");
      assert.strictEqual(formatStatus("tag_auditor"), "Auditor");
      assert.strictEqual(formatStatus("qc_done"), "Qc Done");
      assert.strictEqual(formatStatus("authorization_pending"), "Authorization Pending");
      assert.strictEqual(formatStatus("booked_shared_client"), "Booked Shared Client");
    });

    it("resolves CSS classes for status color hints", () => {
      assert.ok(statusBadgeClass(STATUS_COLOR_HINTS.card_charged).includes("emerald"));
      assert.ok(statusBadgeClass(STATUS_COLOR_HINTS.card_declined).includes("rose"));
      assert.ok(statusBadgeClass(STATUS_COLOR_HINTS.authorization_pending).includes("amber"));
      assert.ok(statusBadgeClass(STATUS_COLOR_HINTS.transferred_to_billing).includes("purple"));

      // Fallback for unknown color
      const fallbackClass = statusBadgeClass("unknown_color_key");
      assert.ok(fallbackClass.includes("slate"));
    });
  });

  describe("Currency and Date/Time Formatters", () => {
    it("formats currency to 2 decimal places with USD dollar prefix", () => {
      assert.strictEqual(formatCurrency(0), "$0.00");
      assert.strictEqual(formatCurrency(49.5), "$49.50");
      assert.strictEqual(formatCurrency(1250.75), "$1,250.75");
      assert.strictEqual(formatCurrency(1000000), "$1,000,000.00");
    });

    it("formats dates gracefully without hydration errors", () => {
      assert.strictEqual(formatDate(null), "—");
      assert.strictEqual(formatDate(undefined), "—");
      assert.strictEqual(formatDate(""), "—");

      const formatted = formatDate("2026-10-15T12:00:00Z");
      assert.ok(formatted.includes("2026"));
      assert.ok(formatted.includes("Oct"));
    });

    it("formats date-times with hour and minute", () => {
      assert.strictEqual(formatDateTime(null), "—");
      assert.strictEqual(formatDateTime(undefined), "—");

      const formatted = formatDateTime("2026-10-15T14:30:00Z");
      assert.ok(formatted.includes("2026"));
      assert.ok(formatted.includes("Oct"));
    });
  });
});
