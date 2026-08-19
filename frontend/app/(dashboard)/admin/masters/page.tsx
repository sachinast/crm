import { Database } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

import MasterOptionsManager from "@/components/admin/MasterOptionsManager";
import type { MasterOption } from "@/lib/master-options-api";

async function fetchOptions(token: string): Promise<MasterOption[]> {
  try {
    return await apiFetch<MasterOption[]>("/master-options", { token });
  } catch {
    return [];
  }
}

// Master Admin — Master Data. Dynamic dropdown values for booking fields
// (Booking Platform, Airline, Cabin Class, Hotel Name, Room Type, Car
// Provider, Vehicle Type, Transmission) — same no-privileged-access-of-its-
// own posture as every other admin page; POST/DELETE /admin/master-options
// enforce admin.manage_custom_fields server-side.
export default async function AdminMastersPage() {
  const token = await getAccessToken();
  const options = token ? await fetchOptions(token) : [];

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
          <Database size={18} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Master Data</h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Dropdown values for booking forms — no deploy required to add one.
          </p>
        </div>
      </div>

      <MasterOptionsManager initialOptions={options} />
    </div>
  );
}
