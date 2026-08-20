import { ListPlus } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import CustomFieldsManager from "@/components/admin/CustomFieldsManager";
import type { CustomFieldDef } from "@/lib/custom-fields-api";

async function fetchCustomFields(token: string): Promise<CustomFieldDef[]> {
  try {
    return await apiFetch<CustomFieldDef[]>("/custom-fields", { token });
  } catch {
    return [];
  }
}

export default async function AdminCustomFieldsPage() {
  const token = await getAccessToken();
  const fields = token ? await fetchCustomFields(token) : [];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Custom Form Fields"
        subtitle="Add custom fields to Leads, Car, Hotel, or Flight booking forms dynamically."
        badge={`${fields.length} ${fields.length === 1 ? "field" : "fields"}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/admin/users" },
          { label: "Custom Fields" },
        ]}
        icon={<ListPlus size={18} />}
      />

      <CustomFieldsManager initialFields={fields} />
    </div>
  );
}
