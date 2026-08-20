import { Database } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import MasterOptionsManager from "@/components/admin/MasterOptionsManager";
import type { MasterOption } from "@/lib/master-options-api";

async function fetchOptions(token: string): Promise<MasterOption[]> {
  try {
    return await apiFetch<MasterOption[]>("/master-options", { token });
  } catch {
    return [];
  }
}

export default async function AdminMastersPage() {
  const token = await getAccessToken();
  const options = token ? await fetchOptions(token) : [];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Master Data"
        subtitle="Manage dynamic dropdown master records for platforms, airlines, hotel rooms, and vehicle fleets."
        badge={`${options.length} options`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/admin/users" },
          { label: "Master Data" },
        ]}
        icon={<Database size={18} />}
      />

      <MasterOptionsManager initialOptions={options} />
    </div>
  );
}
