"use client";

export type SettingValueType = "string" | "number" | "boolean" | "json";

export interface AppSettingDef {
  key: string;
  value: unknown;
  value_type: SettingValueType;
  category: string;
  label: string;
  description: string | null;
  updated_at: string;
}

async function json<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${resp.status})`);
  }
  return resp.json() as Promise<T>;
}

export async function fetchSettings(): Promise<AppSettingDef[]> {
  return json(await fetch("/api/admin/settings"));
}

export async function createSetting(input: {
  key: string;
  value: unknown;
  value_type: SettingValueType;
  category: string;
  label: string;
  description?: string;
}): Promise<AppSettingDef> {
  return json(
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateSettingValue(key: string, value: unknown): Promise<AppSettingDef> {
  return json(
    await fetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    }),
  );
}

export async function deleteSetting(key: string): Promise<void> {
  const resp = await fetch(`/api/admin/settings/${encodeURIComponent(key)}`, { method: "DELETE" });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Could not delete setting");
  }
}
