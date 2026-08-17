import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

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

// User provisioning (Phase 1). The dashboard layout already redirects non-admins
// away before this renders, but GET/POST /api/admin/users also 403 server-side
// via the backend's require_role — this page has no privileged access of its own.
export default async function AdminUsersPage() {
  const users = await fetchUsers();

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-lg font-semibold">User provisioning</h1>
      <p className="mb-6 text-sm text-neutral-500">
        No self-registration — every account here is created by an Admin or Super Admin (PRD §3).
      </p>

      <CreateUserForm />

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-neutral-500">
            <th className="py-2 font-medium">Name</th>
            <th className="font-medium">Email</th>
            <th className="font-medium">Role</th>
            <th className="font-medium">Active</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-neutral-400">
                No users yet.
              </td>
            </tr>
          )}
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-2">{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.is_active ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
