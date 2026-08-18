import { ListPlus } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

import CustomFieldsManager from "@/components/admin/CustomFieldsManager";
import type { CustomFieldDef } from "@/lib/custom-fields-api";

async function fetchCustomFields(token: string): Promise<CustomFieldDef[]> {
  try {
    return await apiFetch<CustomFieldDef[]>("/custom-fields", { token });
  } catch {
    return [];
  }
}

// Master Admin — Custom Form Fields. Define extra fields on Leads and all
// three booking types at runtime — same no-privileged-access-of-its-own
// posture as every other admin page; POST/PATCH/DELETE /admin/custom-fields
// enforce admin.manage_custom_fields server-side.
export default async function AdminCustomFieldsPage() {
  const token = await getAccessToken();
  const fields = token ? await fetchCustomFields(token) : [];

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
          <ListPlus size={18} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Custom Form Fields</h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Add extra fields to Leads or any booking type — no deploy required.
          </p>
        </div>
      </div>

      <CustomFieldsManager initialFields={fields} />
    </div>
  );
}
