import { Workflow } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

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

// Master Admin — Status Workflow Permissions. Wires roles into the booking
// status machine (who can set/gets notified by/keeps seeing each status) at
// runtime — same no-privileged-access-of-its-own posture as every other
// admin page here; GET/PATCH /admin/status-permissions enforce it server-side.
export default async function AdminStatusPermissionsPage() {
  const token = await getAccessToken();
  const [statuses, roles] = token
    ? await Promise.all([fetchStatusPermissions(token), fetchRoles(token)])
    : [[], []];

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
          <Workflow size={18} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Status Workflow Permissions</h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Wire any role — including a brand-new custom one — into the booking status workflow at runtime.
          </p>
        </div>
      </div>

      <StatusPermissionsManager initialStatuses={statuses} roles={roles} />
    </div>
  );
}
