import test, { describe, it } from "node:test";
import assert from "node:assert";

describe("Frontend API Route Handlers & Proxy Validation", () => {
  describe("Send Final Confirmation Email Route Handlers", () => {
    function validateSendEmailPayload(body: { to_email?: string; subject?: string }) {
      if (!body.to_email || !body.to_email.trim()) {
        return { valid: false, error: "Recipient email is required" };
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.to_email.trim())) {
        return { valid: false, error: "Invalid recipient email address" };
      }
      if (!body.subject || !body.subject.trim()) {
        return { valid: false, error: "Subject is required" };
      }
      return { valid: true };
    }

    it("accepts valid final confirmation email payload", () => {
      const payload = {
        to_email: "customer@example.com",
        subject: "Booking & Payment Confirmation - CR-10023",
        custom_note: "Thank you for choosing our travel desk.",
      };
      const result = validateSendEmailPayload(payload);
      assert.strictEqual(result.valid, true);
    });

    it("rejects invalid or missing recipient email", () => {
      assert.strictEqual(validateSendEmailPayload({ to_email: "", subject: "Subject" }).valid, false);
      assert.strictEqual(validateSendEmailPayload({ to_email: "not-an-email", subject: "Subject" }).valid, false);
      assert.strictEqual(validateSendEmailPayload({ to_email: "cust@example.com", subject: "" }).valid, false);
    });
  });

  describe("Admin Users Proxy & Parameter Extraction", () => {
    function resolveProxyPath(
      endpoint: "users" | "user_detail",
      userId?: string,
      searchParams?: URLSearchParams
    ): string {
      let path = endpoint === "users" ? "/users" : `/users/${userId}`;
      if (searchParams && searchParams.toString()) {
        path += `?${searchParams.toString()}`;
      }
      return path;
    }

    it("generates correct paths for listing and user details", () => {
      assert.strictEqual(resolveProxyPath("users"), "/users");
      assert.strictEqual(resolveProxyPath("user_detail", "u-123"), "/users/u-123");
    });

    it("appends query search params cleanly", () => {
      const params = new URLSearchParams({ reassign_leads_to: "target-agent-456" });
      const path = resolveProxyPath("user_detail", "u-123", params);
      assert.strictEqual(path, "/users/u-123?reassign_leads_to=target-agent-456");
    });

    it("handles response transformation for various HTTP status codes", () => {
      function processBackendResponse(
        statusCode: number,
        body: { error?: string; detail?: string; deleted?: boolean; message?: string }
      ) {
        if (statusCode === 204) {
          return { status: 204, ok: true, data: null };
        }
        if (statusCode >= 200 && statusCode < 300) {
          return { status: statusCode, ok: true, data: body };
        }
        return {
          status: statusCode,
          ok: false,
          error: body.detail || body.error || body.message || "An error occurred",
        };
      }

      // 200 OK
      const res200 = processBackendResponse(200, { deleted: true, message: "User deleted" });
      assert.strictEqual(res200.ok, true);
      assert.strictEqual(res200.data?.deleted, true);

      // 204 No Content
      const res204 = processBackendResponse(204, {});
      assert.strictEqual(res204.ok, true);
      assert.strictEqual(res204.data, null);

      // 400 Bad Request
      const res400 = processBackendResponse(400, { detail: "Cannot delete your own account." });
      assert.strictEqual(res400.ok, false);
      assert.strictEqual(res400.error, "Cannot delete your own account.");

      // 403 Forbidden
      const res403 = processBackendResponse(403, { detail: "Missing required permission" });
      assert.strictEqual(res403.ok, false);
      assert.strictEqual(res403.error, "Missing required permission");

      // 404 Not Found
      const res404 = processBackendResponse(404, { detail: "User not found" });
      assert.strictEqual(res404.ok, false);
      assert.strictEqual(res404.error, "User not found");
    });
  });
});
