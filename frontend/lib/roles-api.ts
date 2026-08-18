"use client";

export interface PermissionDef {
  id: string;
  code: string;
  description: string;
  category: string;
}

export interface RoleDef {
  id: string;
  name: string;
  is_system_role: boolean;
  created_at: string;
  permissions: PermissionDef[];
}

async function json<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${resp.status})`);
  }
  return resp.json() as Promise<T>;
}

export async function fetchPermissions(): Promise<PermissionDef[]> {
  return json(await fetch("/api/admin/permissions"));
}

export async function fetchRoles(): Promise<RoleDef[]> {
  return json(await fetch("/api/admin/roles"));
}

export async function createRole(name: string, permissionCodes: string[]): Promise<RoleDef> {
  return json(
    await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, permission_codes: permissionCodes }),
    }),
  );
}

export async function updateRolePermissions(roleId: string, permissionCodes: string[]): Promise<RoleDef> {
  return json(
    await fetch(`/api/admin/roles/${roleId}/permissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permission_codes: permissionCodes }),
    }),
  );
}

export async function deleteRole(roleId: string): Promise<void> {
  const resp = await fetch(`/api/admin/roles/${roleId}`, { method: "DELETE" });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Could not delete role");
  }
}
