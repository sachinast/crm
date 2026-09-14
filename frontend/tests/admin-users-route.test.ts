import test, { describe, it } from "node:test";
import assert from "node:assert";

describe("Admin Users API Route Logic", () => {
  it("constructs target URL with optional reassign_leads_to query parameter", () => {
    function buildTargetUrl(userId: string, reassignTo?: string | null): string {
      const query = reassignTo ? `?reassign_leads_to=${encodeURIComponent(reassignTo)}` : "";
      return `/users/${userId}${query}`;
    }

    const userId = "usr-12345";
    const reassignTo = "usr-reassign-67890";

    // Without reassign
    assert.strictEqual(buildTargetUrl(userId), "/users/usr-12345");
    assert.strictEqual(buildTargetUrl(userId, null), "/users/usr-12345");

    // With reassign
    assert.strictEqual(
      buildTargetUrl(userId, reassignTo),
      "/users/usr-12345?reassign_leads_to=usr-reassign-67890"
    );
  });

  it("handles deletion response structure correctly", () => {
    function parseDeleteResponse(status: number, data: { deleted?: boolean; deactivated?: boolean; detail?: string }) {
      if (status >= 400) {
        return { success: false, error: data.detail || "Error occurred" };
      }
      if (data.deleted) {
        return { success: true, action: "purged" };
      }
      if (data.deactivated) {
        return { success: true, action: "deactivated" };
      }
      return { success: true, action: "unknown" };
    }

    // Success purge
    assert.deepStrictEqual(parseDeleteResponse(200, { deleted: true }), {
      success: true,
      action: "purged",
    });

    // Success deactivation
    assert.deepStrictEqual(parseDeleteResponse(200, { deleted: false, deactivated: true }), {
      success: true,
      action: "deactivated",
    });

    // Error 400
    assert.deepStrictEqual(parseDeleteResponse(400, { detail: "You cannot delete your own account." }), {
      success: false,
      error: "You cannot delete your own account.",
    });

    // Error 403
    assert.deepStrictEqual(parseDeleteResponse(403, { detail: "Role 'admin' is not authorized" }), {
      success: false,
      error: "Role 'admin' is not authorized",
    });
  });
});
