import { Workflow } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import StatusPermissionsManager from "@/components/admin/StatusPermissionsManager";
import type { RoleDef } from "@/lib/roles-api";
import type { StatusPermissionDef } from "@/lib/status-permissions-api";

async function fetchStatusPermissions(token: string): Promise<StatusPermissionDef[]> {
  try {
    return await apiFetch<StatusPermissionDef[]>("/admin/status-permissions", { token });
  } catch {
    return [];
  }
}

async function fetchRoles(token: string): Promise<RoleDef[]> {
  try {
    return await apiFetch<RoleDef[]>("/admin/roles", { token });
  } catch {
    return [];
  }
}

export default async function AdminStatusPermissionsPage() {
  const token = await getAccessToken();
  const [statuses, roles] = token
    ? await Promise.all([fetchStatusPermissions(token), fetchRoles(token)])
    : [[], []];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Status Workflow Permissions"
        subtitle="Configure state machine transitions, notification triggers, and RBAC visibility per status."
        badge={`${statuses.length} workflow states`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/admin/users" },
          { label: "Status Workflow" },
        ]}
        icon={<Workflow size={18} />}
      />

      <StatusPermissionsManager initialStatuses={statuses} roles={roles} />
    </div>
  );
}
