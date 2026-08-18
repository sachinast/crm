import { Sliders } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

import SettingsManager from "@/components/admin/SettingsManager";
import type { AppSettingDef } from "@/lib/settings-api";

async function fetchSettings(token: string): Promise<AppSettingDef[]> {
  try {
    return await apiFetch<AppSettingDef[]>("/admin/settings", { token });
  } catch {
    return [];
  }
}

// Master Admin — Settings. Generic key-value config store replacing the old
// single-boolean system_settings table — same no-privileged-access-of-its-own
// posture as every other admin page; GET/POST/PATCH/DELETE /admin/settings
// enforce admin.view_settings/admin.manage_settings server-side.
export default async function AdminSettingsPage() {
  const token = await getAccessToken();
  const settings = token ? await fetchSettings(token) : [];

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
          <Sliders size={18} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Runtime configuration — no deploy required to change a value.
          </p>
        </div>
      </div>

      <SettingsManager initialSettings={settings} />
    </div>
  );
}
