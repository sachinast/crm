"use client";

export type MasterFieldKey =
  | "booking_platform" | "airline" | "cabin_class" | "hotel_name" | "room_type"
  | "car_provider" | "vehicle_type" | "transmission";

export interface MasterOption {
  id: string;
  field_key: string;
  value: string;
  display_order: number;
  created_at: string;
}

async function json<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${resp.status})`);
  }
  return resp.json() as Promise<T>;
}

export async function fetchMasterOptions(fieldKey?: MasterFieldKey): Promise<MasterOption[]> {
  const query = fieldKey ? `?field_key=${fieldKey}` : "";
  return json(await fetch(`/api/master-options${query}`));
}

export async function createMasterOption(fieldKey: MasterFieldKey, value: string): Promise<MasterOption> {
  return json(
    await fetch("/api/admin/master-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_key: fieldKey, value }),
    }),
  );
}

export async function deleteMasterOption(id: string): Promise<void> {
  const resp = await fetch(`/api/admin/master-options/${id}`, { method: "DELETE" });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Could not delete option");
  }
}
