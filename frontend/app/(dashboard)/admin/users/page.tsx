import { UserCog } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import type { RoleDef } from "@/lib/roles-api";
import PageHeader from "@/components/shared/PageHeader";
import CreateUserForm from "./CreateUserForm";
import UsersTableClient, { type UserRow } from "@/components/admin/UsersTableClient";

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
    return [];
  }
}

export default async function AdminUsersPage() {
  const [users, roles] = await Promise.all([fetchUsers(), fetchRoles()]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Symmetric Page Header */}
      <PageHeader
        title="User Provisioning"
        subtitle="Manage agent accounts, RBAC permissions, and team credentials."
        badge={`${users.length} ${users.length === 1 ? "user" : "users"}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/admin/users" },
          { label: "Users" },
        ]}
        icon={<UserCog size={18} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Create User Card */}
        <div className="lg:col-span-5">
          <div className="card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-ink">Create New Account</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Admin-provisioned credentials with role binding.
              </p>
            </div>
            <CreateUserForm roles={roles} />
          </div>
        </div>

        {/* Right Column: Symmetrical Users Data Table */}
        <div className="lg:col-span-7">
          <UsersTableClient users={users} />
        </div>
      </div>
    </div>
  );
}
