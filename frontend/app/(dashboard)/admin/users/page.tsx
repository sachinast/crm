import { UserCog, ShieldCheck } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import type { RoleDef } from "@/lib/roles-api";
import PageHeader from "@/components/shared/PageHeader";
import DataTableCard from "@/components/shared/DataTableCard";
import Pagination from "@/components/shared/Pagination";

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
    return [];
  }
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; page_size?: string }>;
}) {
  const { page: pageParam, page_size: pageSizeParam } = await searchParams;
  const page = Math.max(Number(pageParam) || 1, 1);
  const pageSize = Number(pageSizeParam) && [10, 25, 50, 100].includes(Number(pageSizeParam))
    ? Number(pageSizeParam)
    : 10;

  const [users, roles] = await Promise.all([fetchUsers(), fetchRoles()]);

  const total = users.length;
  const pagedUsers = users.slice((page - 1) * pageSize, page * pageSize);

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
          <DataTableCard
            headerContent={
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold uppercase tracking-wider text-ink">
                  Active User Directory
                </span>
                <span className="rounded-full bg-surface-raised border border-hairline px-2.5 py-0.5 text-xs font-mono font-bold text-ink-muted">
                  {users.length} {users.length === 1 ? "account" : "accounts"}
                </span>
              </div>
            }
            footerContent={
              <Pagination
                currentPage={page}
                totalItems={total}
                pageSize={pageSize}
                basePath="/admin/users"
                extraParams={{ page_size: pageSize }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            }
          >
            <table className="table-modern w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                    User Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                    Email Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                    Assigned Role
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-faint">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {pagedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-ink-muted">
                      No user accounts found.
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-surface-raised">
                      <td className="px-4 py-3 font-semibold text-sm text-ink">{u.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{u.email}</td>
                      <td className="px-4 py-3 capitalize text-sm text-ink">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-raised px-2.5 py-0.5 text-xs font-medium">
                          <ShieldCheck size={13} className="text-accent" />
                          <span>{u.role.replace(/_/g, " ")}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${
                            u.is_active
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-surface-raised text-ink-muted border-hairline"
                          }`}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DataTableCard>
        </div>
      </div>
    </div>
  );
}
