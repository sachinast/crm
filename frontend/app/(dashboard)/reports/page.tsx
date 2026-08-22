import { FileSpreadsheet } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import ReportsClient, { ReportLeadItem } from "@/components/reports/ReportsClient";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

async function fetchAllLeads(token: string): Promise<ReportLeadItem[]> {
  try {
    return await apiFetch<ReportLeadItem[]>("/leads", { token });
  } catch {
    return [];
  }
}

export default async function ReportsPage() {
  const token = await getAccessToken();
  const leads = token ? await fetchAllLeads(token) : [];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Operations & Dispatch Reports"
        subtitle="Live daily summaries for scheduled pickups, newly booked travel itineraries, and processed cancellations."
        badge="Analytics & Reports"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Operations" },
          { label: "Daily Reports" },
        ]}
        icon={<FileSpreadsheet size={18} />}
      />

      <ReportsClient leads={leads} />
    </div>
  );
}
