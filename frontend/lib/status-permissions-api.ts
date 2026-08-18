"use client";

export interface StatusPermissionDef {
  status: string;
  label: string;
  set_by: string[];
  notifies: string[];
  relevant: string[];
}

async function json<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${resp.status})`);
  }
  return resp.json() as Promise<T>;
}

export async function fetchStatusPermissions(): Promise<StatusPermissionDef[]> {
  return json(await fetch("/api/admin/status-permissions"));
}

export async function updateStatusPermissions(
  status: string,
  update: Pick<StatusPermissionDef, "set_by" | "notifies" | "relevant">,
): Promise<StatusPermissionDef> {
  return json(
    await fetch(`/api/admin/status-permissions/${status}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }),
  );
}
