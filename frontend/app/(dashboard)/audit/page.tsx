import { ShieldCheck } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import AuditQueueClient, { type AuditLeadRow } from "@/components/audit/AuditQueueClient";

async function fetchAuditLeads(): Promise<AuditLeadRow[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<AuditLeadRow[]>("/leads", { token });
  } catch {
    return [];
  }
}

export default async function AuditPage() {
  const leads = await fetchAuditLeads();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      <PageHeader
        title="Audit & Quality Control (QC) Queue"
        subtitle="Review lead booking completeness, verify rate calculations, and approve audit status transitions."
        badge={`${leads.length} ${leads.length === 1 ? "record" : "records"}`}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Audit / QC" }]}
        icon={<ShieldCheck size={18} />}
      />

      <AuditQueueClient leads={leads} />
    </div>
  );
}
