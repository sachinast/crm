import { KeyRound } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

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

// Master Admin — Roles & Permissions. The dashboard layout already hides
// this nav item from anyone without admin.manage_users/admin.manage_roles,
// but GET/POST/PATCH/DELETE /admin/roles also enforce it server-side — this
// page has no privileged access of its own (same posture as every other
// admin page in this app).
export default async function AdminRolesPage() {
  const token = await getAccessToken();
  const [roles, permissions] = token
    ? await Promise.all([fetchRoles(token), fetchPermissions(token)])
    : [[], []];

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
          <KeyRound size={18} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles &amp; Permissions</h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Create new roles and grant them permissions at runtime — no deploy required.
          </p>
        </div>
      </div>

      <RolesManager initialRoles={roles} permissions={permissions} />
    </div>
  );
}
