import { UserCog } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import type { RoleDef } from "@/lib/roles-api";

import CreateUserForm from "./CreateUserForm";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  ip_whitelist_enabled: boolean;
}

async function fetchUsers(): Promise<UserRow[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<UserRow[]>("/users", { token });
  } catch {
    return [];
  }
}

async function fetchRoles(): Promise<RoleDef[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<RoleDef[]>("/admin/roles", { token });
  } catch {
    // Plain admins (not super_admin) can still read the role list — see
    // admin_roles.py's READ_PERMISSIONS — but fall back gracefully if this
    // account somehow can't, rather than breaking user creation entirely.
    return [];
  }
}

// User provisioning (Phase 1). The dashboard layout already redirects non-admins
// away before this renders, but GET/POST /api/admin/users also 403 server-side
// via the backend's require_role — this page has no privileged access of its own.
export default async function AdminUsersPage() {
  const [users, roles] = await Promise.all([fetchUsers(), fetchRoles()]);

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
          <UserCog size={18} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User provisioning</h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            No self-registration — every account here is created by an Admin or Super Admin (PRD §3).
          </p>
        </div>
      </div>

      <CreateUserForm roles={roles} />

      <div className="card-flat mt-6 overflow-x-auto p-0">
        <table className="table-modern">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center" style={{ color: "var(--ink-faint)" }}>
                  No users yet.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.name}</td>
                <td style={{ color: "var(--ink-muted)" }}>{u.email}</td>
                <td className="capitalize" style={{ color: "var(--ink-muted)" }}>{u.role.replace(/_/g, " ")}</td>
                <td>
                  <span
                    className="badge"
                    style={u.is_active ? { background: "var(--success-soft)", color: "var(--success)" } : { background: "var(--hairline)", color: "var(--ink-faint)" }}
                  >
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
