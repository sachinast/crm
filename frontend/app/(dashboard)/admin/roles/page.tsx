import { KeyRound } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import RolesManager from "@/components/admin/RolesManager";
import type { PermissionDef, RoleDef } from "@/lib/roles-api";

async function fetchRoles(token: string): Promise<RoleDef[]> {
  try {
    return await apiFetch<RoleDef[]>("/admin/roles", { token });
  } catch {
    return [];
  }
}

async function fetchPermissions(token: string): Promise<PermissionDef[]> {
  try {
    return await apiFetch<PermissionDef[]>("/admin/permissions", { token });
  } catch {
    return [];
  }
}

export default async function AdminRolesPage() {
  const token = await getAccessToken();
  const [roles, permissions] = token
    ? await Promise.all([fetchRoles(token), fetchPermissions(token)])
    : [[], []];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage dynamic role bindings, permission matrices, and security policies."
        badge={`${roles.length} roles`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/admin/users" },
          { label: "Roles" },
        ]}
        icon={<KeyRound size={18} />}
      />

      <RolesManager initialRoles={roles} permissions={permissions} />
    </div>
  );
}
