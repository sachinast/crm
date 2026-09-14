import test, { describe, it } from "node:test";
import assert from "node:assert";

import { hasPermission } from "../lib/permissions.ts";
import type { CurrentUser } from "../lib/auth.ts";

describe("RBAC Permissions Engine & Role-Based Access Control", () => {
  describe("hasPermission utility", () => {
    it("returns true if user holds the exact permission code", () => {
      const user = { permissions: ["leads.view_all", "admin.manage_users"] };
      assert.strictEqual(hasPermission(user, "leads.view_all"), true);
      assert.strictEqual(hasPermission(user, "admin.manage_users"), true);
    });

    it("returns true if user holds ANY of the requested codes (OR semantics)", () => {
      const user = { permissions: ["leads.view_own"] };
      assert.strictEqual(hasPermission(user, "leads.view_all", "leads.view_own"), true);
      assert.strictEqual(hasPermission(user, "admin.manage_settings", "leads.view_own"), true);
    });

    it("returns false if user has none of the requested codes", () => {
      const user = { permissions: ["leads.view_own", "leads.create"] };
      assert.strictEqual(hasPermission(user, "billing.charge_card"), false);
      assert.strictEqual(hasPermission(user, "admin.manage_users"), false);
    });

    it("defensively handles null, undefined, or missing permissions array", () => {
      assert.strictEqual(hasPermission(null, "leads.view_all"), false);
      assert.strictEqual(hasPermission(undefined as unknown as CurrentUser, "leads.view_all"), false);
      assert.strictEqual(hasPermission({} as unknown as CurrentUser, "leads.view_all"), false);
      assert.strictEqual(
        hasPermission({ permissions: null as unknown as string[] }, "leads.view_all"),
        false
      );
    });
  });

  describe("Role-Based Feature Matrix", () => {
    // Canonical role definitions mirroring backend permissions catalog
    const ROLE_PERMISSIONS: Record<string, string[]> = {
      super_admin: [
        "leads.view_all",
        "leads.view_own",
        "leads.create",
        "billing.charge_card",
        "dashboard.qc_stats",
        "dashboard.billing_stats",
        "dashboard.revenue_stats",
        "dashboard.system_stats",
        "modifications.manage",
        "cancellations.manage",
        "future_credits.create",
        "future_credits.view",
        "audit.view",
        "integrations.manage",
        "admin.manage_users",
        "admin.view_settings",
        "admin.manage_settings",
        "admin.manage_roles",
        "admin.manage_custom_fields",
        "admin.view_activity_log",
      ],
      admin: [
        "leads.view_all",
        "leads.create",
        "dashboard.qc_stats",
        "dashboard.billing_stats",
        "dashboard.revenue_stats",
        "dashboard.system_stats",
        "modifications.manage",
        "cancellations.manage",
        "future_credits.create",
        "future_credits.view",
        "audit.view",
        "integrations.manage",
        "admin.manage_users",
        "admin.view_settings",
        "admin.manage_custom_fields",
        "admin.view_activity_log",
      ],
      billing: ["billing.charge_card", "dashboard.billing_stats", "future_credits.view"],
      agent: ["leads.view_own", "leads.create"],
      tl: [
        "leads.view_all",
        "dashboard.qc_stats",
        "dashboard.billing_stats",
        "dashboard.revenue_stats",
        "future_credits.create",
      ],
      auditor: ["audit.view", "dashboard.qc_stats"],
      cs: ["leads.view_all", "modifications.manage"],
      change_dep: ["leads.view_all", "modifications.manage"],
      cr_booking: ["leads.view_all", "leads.create"],
    };

    function canViewUnmaskedCard(role: string): boolean {
      const normalized = role.toLowerCase().replace(/[\s_-]+/g, "");
      return ["billing", "admin", "superadmin"].includes(normalized);
    }

    function canSendFinalConfirmationEmail(role: string, leadStatus: string, hasChargedPayment: boolean): boolean {
      const allowedRoles = ["agent", "cr_booking", "cs", "change_dep", "admin", "super_admin", "superadmin"];
      const isRoleAllowed = allowedRoles.includes(role.toLowerCase());
      if (!isRoleAllowed) return false;

      // Status requirement: must be card_charged or downstream status, or has payment outcome 'charged'
      const chargedStatuses = [
        "card_charged",
        "tag_cr_booking",
        "tag_change_dep",
        "tag_auditor",
        "qc_done",
        "booked_shared_client",
      ];
      return chargedStatuses.includes(leadStatus) || hasChargedPayment;
    }

    function canRemoveUsers(role: string): boolean {
      const normalized = role.toLowerCase().replace(/[\s_-]+/g, "");
      return normalized === "superadmin";
    }

    it("strictly restricts unmasked credit card viewing to billing and admins", () => {
      // Allowed
      assert.strictEqual(canViewUnmaskedCard("billing"), true);
      assert.strictEqual(canViewUnmaskedCard("admin"), true);
      assert.strictEqual(canViewUnmaskedCard("super_admin"), true);
      assert.strictEqual(canViewUnmaskedCard("superadmin"), true);

      // Masked for all operational staff
      assert.strictEqual(canViewUnmaskedCard("agent"), false);
      assert.strictEqual(canViewUnmaskedCard("cr_booking"), false);
      assert.strictEqual(canViewUnmaskedCard("cs"), false);
      assert.strictEqual(canViewUnmaskedCard("change_dep"), false);
      assert.strictEqual(canViewUnmaskedCard("auditor"), false);
      assert.strictEqual(canViewUnmaskedCard("tl"), false);
    });

    it("verifies Final Confirmation Email access rule based on role AND payment status", () => {
      // Agent with card_charged -> Allowed
      assert.strictEqual(canSendFinalConfirmationEmail("agent", "card_charged", true), true);
      assert.strictEqual(canSendFinalConfirmationEmail("cr_booking", "tag_cr_booking", true), true);
      assert.strictEqual(canSendFinalConfirmationEmail("cs", "tag_auditor", false), true);
      assert.strictEqual(canSendFinalConfirmationEmail("change_dep", "qc_done", false), true);
      assert.strictEqual(canSendFinalConfirmationEmail("admin", "card_charged", false), true);

      // When card is NOT charged (e.g. quote, authorization_pending, card_declined) -> Blocked
      assert.strictEqual(canSendFinalConfirmationEmail("agent", "quote", false), false);
      assert.strictEqual(canSendFinalConfirmationEmail("agent", "authorization_pending", false), false);
      assert.strictEqual(canSendFinalConfirmationEmail("agent", "card_declined", false), false);

      // Unauthorized roles (e.g. auditor or billing alone without operational role) -> Blocked
      assert.strictEqual(canSendFinalConfirmationEmail("auditor", "card_charged", true), false);
    });

    it("strictly restricts user account removal to Super Admin only", () => {
      assert.strictEqual(canRemoveUsers("super_admin"), true);
      assert.strictEqual(canRemoveUsers("superadmin"), true);
      assert.strictEqual(canRemoveUsers("Super Admin"), true);

      // Standard Admin and other staff CANNOT remove users
      assert.strictEqual(canRemoveUsers("admin"), false);
      assert.strictEqual(canRemoveUsers("agent"), false);
      assert.strictEqual(canRemoveUsers("billing"), false);
      assert.strictEqual(canRemoveUsers("cs"), false);
      assert.strictEqual(canRemoveUsers("auditor"), false);
    });

    it("validates permission sets for newly provisioned department roles", () => {
      // cr_booking can view leads and create bookings
      const crUser = { permissions: ROLE_PERMISSIONS.cr_booking };
      assert.strictEqual(hasPermission(crUser, "leads.view_all"), true);
      assert.strictEqual(hasPermission(crUser, "leads.create"), true);
      assert.strictEqual(hasPermission(crUser, "billing.charge_card"), false);

      // auditor can view audit logs and qc stats
      const auditUser = { permissions: ROLE_PERMISSIONS.auditor };
      assert.strictEqual(hasPermission(auditUser, "audit.view"), true);
      assert.strictEqual(hasPermission(auditUser, "dashboard.qc_stats"), true);
      assert.strictEqual(hasPermission(auditUser, "admin.manage_users"), false);

      // cs and change_dep can view all leads and manage modifications
      const csUser = { permissions: ROLE_PERMISSIONS.cs };
      assert.strictEqual(hasPermission(csUser, "leads.view_all"), true);
      assert.strictEqual(hasPermission(csUser, "modifications.manage"), true);
      assert.strictEqual(hasPermission(csUser, "admin.manage_settings"), false);
    });
  });
});
