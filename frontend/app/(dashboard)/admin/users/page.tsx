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
          <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-bold text-white">Create New Account</h2>
            <p className="mb-4 text-xs text-slate-400">
              Admin-provisioned credentials with role binding.
            </p>
            <CreateUserForm roles={roles} />
          </div>
        </div>

        {/* Right Column: Symmetrical Users Data Table */}
        <div className="lg:col-span-7">
          <DataTableCard
            headerContent={
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Active User Directory
                </span>
                <span className="text-[11px] text-slate-400">{users.length} accounts</span>
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
                <tr className="bg-[#182136]/30">
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    User Name
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Email Address
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Assigned Role
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232e47]">
                {pagedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-xs text-slate-400">
                      No user accounts found.
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-[#182136]/60">
                      <td className="px-4 py-3 font-semibold text-white">{u.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">{u.email}</td>
                      <td className="px-4 py-3 capitalize text-slate-300">
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#2a3652] bg-[#182136] px-2 py-0.5 text-xs font-medium">
                          <ShieldCheck size={11} className="text-[#d3ab5e]" />
                          <span>{u.role.replace(/_/g, " ")}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                            u.is_active
                              ? "bg-[#113028] text-[#3ecf9a] border border-[#3ecf9a]/30"
                              : "bg-[#232e47] text-slate-400 border border-[#313f61]"
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
