import test, { describe, it } from "node:test";
import assert from "node:assert";

// User row definition matching frontend/components/admin/UsersTableClient.tsx
interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  ip_whitelist_enabled: boolean;
}

// Helper functions mirroring frontend logic
function resolveIsSuperAdmin(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().replace(/[\s_-]+/g, "");
  return normalized === "superadmin";
}

function canDeleteUser(targetUserId: string, currentUserId?: string, isSuperAdmin: boolean = false): boolean {
  if (!isSuperAdmin) return false;
  if (targetUserId === currentUserId) return false;
  return true;
}

function handleUserDeletionState(
  users: UserRow[],
  targetUserId: string,
  apiResponse: { deleted: boolean; deactivated?: boolean }
): UserRow[] {
  if (apiResponse.deleted) {
    return users.filter((u) => u.id !== targetUserId);
  }
  if (apiResponse.deactivated) {
    return users.map((u) => (u.id === targetUserId ? { ...u, is_active: false } : u));
  }
  return users;
}

function filterUsers(
  users: UserRow[],
  filters: { role?: string; status?: string; searchQuery?: string }
): UserRow[] {
  return users.filter((user) => {
    if (filters.role && filters.role !== "all" && user.role.toLowerCase() !== filters.role.toLowerCase()) {
      return false;
    }
    if (filters.status === "active" && !user.is_active) {
      return false;
    }
    if (filters.status === "inactive" && user.is_active) {
      return false;
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.role.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

describe("Super Admin User Removal Logic", () => {
  it("correctly identifies super_admin roles with various formatting", () => {
    assert.strictEqual(resolveIsSuperAdmin("super_admin"), true);
    assert.strictEqual(resolveIsSuperAdmin("superadmin"), true);
    assert.strictEqual(resolveIsSuperAdmin("Super Admin"), true);
    assert.strictEqual(resolveIsSuperAdmin("SUPER_ADMIN"), true);

    // Non-superadmin roles
    assert.strictEqual(resolveIsSuperAdmin("admin"), false);
    assert.strictEqual(resolveIsSuperAdmin("agent"), false);
    assert.strictEqual(resolveIsSuperAdmin("billing"), false);
    assert.strictEqual(resolveIsSuperAdmin("cr_booking"), false);
    assert.strictEqual(resolveIsSuperAdmin(null), false);
    assert.strictEqual(resolveIsSuperAdmin(undefined), false);
  });

  it("prevents self-deletion for active super admin account", () => {
    const superAdminId = "usr-super-123";
    const otherUserId = "usr-agent-456";

    // Super admin cannot delete self
    assert.strictEqual(canDeleteUser(superAdminId, superAdminId, true), false);

    // Super admin can delete other users
    assert.strictEqual(canDeleteUser(otherUserId, superAdminId, true), true);

    // Regular admin or agent cannot delete anyone
    assert.strictEqual(canDeleteUser(otherUserId, "usr-admin-789", false), false);
  });

  it("updates state correctly when user is permanently deleted", () => {
    const initialUsers: UserRow[] = [
      { id: "1", name: "Super", email: "s@crm.com", role: "super_admin", is_active: true, ip_whitelist_enabled: false },
      { id: "2", name: "Bob", email: "bob@crm.com", role: "agent", is_active: true, ip_whitelist_enabled: false },
      { id: "3", name: "Charlie", email: "c@crm.com", role: "billing", is_active: true, ip_whitelist_enabled: false },
    ];

    const updated = handleUserDeletionState(initialUsers, "2", { deleted: true });
    assert.strictEqual(updated.length, 2);
    assert.strictEqual(updated.some((u) => u.id === "2"), false);
  });

  it("updates state correctly when user is deactivated due to compliance records", () => {
    const initialUsers: UserRow[] = [
      { id: "1", name: "Super", email: "s@crm.com", role: "super_admin", is_active: true, ip_whitelist_enabled: false },
      { id: "2", name: "Agent With Bookings", email: "busy@crm.com", role: "agent", is_active: true, ip_whitelist_enabled: false },
    ];

    const updated = handleUserDeletionState(initialUsers, "2", { deleted: false, deactivated: true });
    assert.strictEqual(updated.length, 2);
    const deactivatedUser = updated.find((u) => u.id === "2");
    assert.strictEqual(deactivatedUser?.is_active, false);
  });

  it("filters users by role and status correctly", () => {
    const users: UserRow[] = [
      { id: "1", name: "Super Admin", email: "s@crm.com", role: "super_admin", is_active: true, ip_whitelist_enabled: false },
      { id: "2", name: "Alice Agent", email: "alice@crm.com", role: "agent", is_active: true, ip_whitelist_enabled: false },
      { id: "3", name: "Inactive Agent", email: "old@crm.com", role: "agent", is_active: false, ip_whitelist_enabled: false },
      { id: "4", name: "Bob Billing", email: "bob@crm.com", role: "billing", is_active: true, ip_whitelist_enabled: false },
    ];

    // Filter by role "agent"
    const agents = filterUsers(users, { role: "agent" });
    assert.strictEqual(agents.length, 2);

    // Filter by status "active"
    const activeOnly = filterUsers(users, { status: "active" });
    assert.strictEqual(activeOnly.length, 3);

    // Filter by status "inactive"
    const inactiveOnly = filterUsers(users, { status: "inactive" });
    assert.strictEqual(inactiveOnly.length, 1);
    assert.strictEqual(inactiveOnly[0].name, "Inactive Agent");

    // Search query
    const searched = filterUsers(users, { searchQuery: "alice" });
    assert.strictEqual(searched.length, 1);
    assert.strictEqual(searched[0].id, "2");
  });
});
