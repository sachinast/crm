"use client";

export type MasterFieldKey =
  | "booking_platform"
  | "booking_source"
  | "transaction_type"
  | "booking_status"
  | "call_type"
  | "main_category"
  | "room_type"
  | "lead_tag"
  | "leads_booking_source"
  | "priority"
  | "title"
  | "class_of_service"
  | "airline"
  | "cabin_class"
  | "hotel_name"
  | "car_provider"
  | "vehicle_type"
  | "transmission"
  | "fuel_policy"
  | "add_on_services"
  | "hk_gk"
  | "currency"
  | "mco_charges"
  | "insurance_coverage"
  | "flight_ancillaries"
  | string;

export interface MasterOption {
  id: string;
  field_key: string;
  value: string;
  option_type: "master" | "addon";
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

export async function fetchMasterOptions(
  fieldKey?: string,
  optionType?: "master" | "addon",
): Promise<MasterOption[]> {
  const params = new URLSearchParams();
  if (fieldKey) params.set("field_key", fieldKey);
  if (optionType) params.set("option_type", optionType);
  const query = params.toString() ? `?${params.toString()}` : "";
  return json(await fetch(`/api/master-options${query}`));
}

export async function createMasterOption(
  fieldKey: string,
  value: string,
  optionType: "master" | "addon" = "master",
): Promise<MasterOption> {
  return json(
    await fetch("/api/admin/master-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_key: fieldKey, value, option_type: optionType }),
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
