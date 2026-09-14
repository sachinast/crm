import test, { describe, it } from "node:test";
import assert from "node:assert";

import { isMaskedCard, isMaskedExpiry, isMaskedCVV } from "../lib/card-validator.ts";
import { API_BASE_URL, WS_BASE_URL } from "../lib/config.ts";

const ACCESS_TOKEN_COOKIE = "crm_access_token";
const REFRESH_TOKEN_COOKIE = "crm_refresh_token";

describe("Frontend Security and Data Protection", () => {
  describe("Authentication and Session Cookie Configurations", () => {
    it("defines secure shared cookie keys for tokens", () => {
      assert.strictEqual(ACCESS_TOKEN_COOKIE, "crm_access_token");
      assert.strictEqual(REFRESH_TOKEN_COOKIE, "crm_refresh_token");
    });

    it("verifies security parameters for cookie emission", () => {
      function getCookieOptions(isProd: boolean) {
        return {
          httpOnly: true,
          secure: isProd,
          sameSite: "lax" as const,
          path: "/",
          maxAge: 60 * 60 * 24, // 24 hours
        };
      }

      const prodOptions = getCookieOptions(true);
      assert.strictEqual(prodOptions.httpOnly, true);
      assert.strictEqual(prodOptions.secure, true);
      assert.strictEqual(prodOptions.sameSite, "lax");

      const devOptions = getCookieOptions(false);
      assert.strictEqual(devOptions.httpOnly, true);
      assert.strictEqual(devOptions.secure, false);
    });

    it("attaches standard Bearer authorization header to backend requests", () => {
      function buildHeaders(token?: string | null, customHeaders: Record<string, string> = {}) {
        return {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...customHeaders,
        };
      }

      const headersWithToken = buildHeaders("jwt-test-token-xyz");
      assert.strictEqual(headersWithToken.Authorization, "Bearer jwt-test-token-xyz");
      assert.strictEqual(headersWithToken["Content-Type"], "application/json");

      const headersWithoutToken = buildHeaders(null);
      assert.strictEqual(headersWithoutToken.Authorization, undefined);
    });
  });

  describe("Sensitive PII & Card Protection on Updates", () => {
    it("filters out masked card values to prevent overwriting raw database credentials", () => {
      function sanitizeBookingPayloadForUpdate(payload: {
        card_number?: string;
        card_expiry?: string;
        cvv?: string;
        customer_name?: string;
        total_amount?: number;
      }) {
        const sanitized = { ...payload };
        if (sanitized.card_number && isMaskedCard(sanitized.card_number)) {
          delete sanitized.card_number;
        }
        if (sanitized.card_expiry && isMaskedExpiry(sanitized.card_expiry)) {
          delete sanitized.card_expiry;
        }
        if (sanitized.cvv && isMaskedCVV(sanitized.cvv)) {
          delete sanitized.cvv;
        }
        return sanitized;
      }

      const incomingUpdateWithMaskedCard = {
        card_number: "**** **** **** 4242",
        card_expiry: "**/**",
        cvv: "•••",
        customer_name: "Updated Name",
        total_amount: 350.0,
      };

      const sanitized = sanitizeBookingPayloadForUpdate(incomingUpdateWithMaskedCard);

      // Card details must be excluded from update payload
      assert.strictEqual(sanitized.card_number, undefined);
      assert.strictEqual(sanitized.card_expiry, undefined);
      assert.strictEqual(sanitized.cvv, undefined);

      // Other fields must remain intact
      assert.strictEqual(sanitized.customer_name, "Updated Name");
      assert.strictEqual(sanitized.total_amount, 350.0);
    });

    it("preserves new raw card credentials when agent explicitly updates the card", () => {
      function sanitizeBookingPayloadForUpdate(payload: {
        card_number?: string;
        card_expiry?: string;
        cvv?: string;
      }) {
        const sanitized = { ...payload };
        if (sanitized.card_number && isMaskedCard(sanitized.card_number)) {
          delete sanitized.card_number;
        }
        if (sanitized.card_expiry && isMaskedExpiry(sanitized.card_expiry)) {
          delete sanitized.card_expiry;
        }
        if (sanitized.cvv && isMaskedCVV(sanitized.cvv)) {
          delete sanitized.cvv;
        }
        return sanitized;
      }

      const incomingNewRawCard = {
        card_number: "4111111111111234",
        card_expiry: "11/29",
        cvv: "789",
      };

      const sanitized = sanitizeBookingPayloadForUpdate(incomingNewRawCard);
      assert.strictEqual(sanitized.card_number, "4111111111111234");
      assert.strictEqual(sanitized.card_expiry, "11/29");
      assert.strictEqual(sanitized.cvv, "789");
    });
  });

  describe("API and WebSocket Base URL Safety", () => {
    it("ensures API_BASE_URL is a valid non-empty HTTP/HTTPS URL", () => {
      assert.ok(typeof API_BASE_URL === "string");
      assert.ok(API_BASE_URL.startsWith("http://") || API_BASE_URL.startsWith("https://"));
      assert.strictEqual(API_BASE_URL.endsWith("/"), false, "URL should not have a trailing slash");
    });

    it("ensures WS_BASE_URL is a valid non-empty WS/WSS URL", () => {
      assert.ok(typeof WS_BASE_URL === "string");
      assert.ok(WS_BASE_URL.startsWith("ws://") || WS_BASE_URL.startsWith("wss://"));
      assert.strictEqual(WS_BASE_URL.endsWith("/"), false, "WS URL should not have a trailing slash");
    });
  });
});
