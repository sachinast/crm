"use client";

export type EntityType = "lead" | "car_booking" | "hotel_booking" | "flight_booking";
export type FieldType = "text" | "number" | "date" | "select" | "checkbox";

export interface CustomFieldDef {
  id: string;
  entity_type: EntityType;
  key: string;
  label: string;
  field_type: FieldType;
  options: string[] | null;
  is_required: boolean;
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

export async function fetchCustomFields(entityType?: EntityType): Promise<CustomFieldDef[]> {
  const query = entityType ? `?entity_type=${entityType}` : "";
  return json(await fetch(`/api/custom-fields${query}`));
}

export async function createCustomField(input: {
  entity_type: EntityType;
  key: string;
  label: string;
  field_type: FieldType;
  options?: string[] | null;
  is_required?: boolean;
  display_order?: number;
}): Promise<CustomFieldDef> {
  return json(
    await fetch("/api/admin/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateCustomField(
  id: string,
  input: Partial<Pick<CustomFieldDef, "label" | "options" | "is_required" | "display_order">>,
): Promise<CustomFieldDef> {
  return json(
    await fetch(`/api/admin/custom-fields/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteCustomField(id: string): Promise<void> {
  const resp = await fetch(`/api/admin/custom-fields/${id}`, { method: "DELETE" });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Could not delete custom field");
  }
}
