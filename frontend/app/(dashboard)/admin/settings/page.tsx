import { Sliders } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import SettingsManager from "@/components/admin/SettingsManager";
import type { AppSettingDef } from "@/lib/settings-api";

async function fetchSettings(token: string): Promise<AppSettingDef[]> {
  try {
    return await apiFetch<AppSettingDef[]>("/admin/settings", { token });
  } catch {
    return [];
  }
}

export default async function AdminSettingsPage() {
  const token = await getAccessToken();
  const settings = token ? await fetchSettings(token) : [];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="System Settings"
        subtitle="Runtime platform configuration, security defaults, and system flags."
        badge={`${settings.length} parameters`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/admin/users" },
          { label: "Settings" },
        ]}
        icon={<Sliders size={18} />}
      />

      <SettingsManager initialSettings={settings} />
    </div>
  );
}
