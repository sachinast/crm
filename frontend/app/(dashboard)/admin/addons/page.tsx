import { Sparkles } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import MasterOptionsManager, { ADDON_FIELDS } from "@/components/admin/MasterOptionsManager";
import type { MasterOption } from "@/lib/master-options-api";

async function fetchAddonOption(token: string): Promise<MasterOption[]> {
  try {
    return await apiFetch<MasterOption[]>("/master-options?option_type=addon", { token });
  } catch {
    return [];
  }
}

export default async function AdminAddonsPage() {
  const token = await getAccessToken();
  const options = token ? await fetchAddonOption(token) : [];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Add-on Services & Ancillaries"
        subtitle="Manage auxiliary options and optional services including extra baggage, seat selection, HK/GK codes, currencies, and MCO charges."
        badge={`${options.length} add-on options`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/admin/users" },
          { label: "Add-on Services" },
        ]}
        icon={<Sparkles size={18} />}
      />

      <MasterOptionsManager
        initialOptions={options}
        optionType="addon"
        fields={ADDON_FIELDS}
      />
    </div>
  );
}
