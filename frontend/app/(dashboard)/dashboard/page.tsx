import { LayoutDashboard } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import DashboardClientView, { FullLeadItem } from "@/components/dashboard/DashboardClientView";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken, getCurrentUser } from "@/lib/auth";

interface LeadSummaryRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
}

interface LeaderboardEntry {
  agent_id: string;
  agent_name: string;
  revenue: number;
  bookings_count: number;
}

interface DashboardSummary {
  role: string;
  total_visible_leads: number;
  leads_by_status: Record<string, number>;
  recent_leads: LeadSummaryRow[];
  pending_qc_count: number | null;
  pending_payment_count: number | null;
  my_processed_revenue: number | null;
  total_revenue: number | null;
  total_users: number | null;
  active_integrations: number | null;
  future_credits_issued_count: number | null;
  future_credits_total_value: number | null;
  leaderboard: LeaderboardEntry[] | null;
}

async function fetchSummary(token: string): Promise<DashboardSummary | null> {
  try {
    return await apiFetch<DashboardSummary>("/dashboard/summary", { token });
  } catch {
    return null;
  }
}

async function fetchAllLeads(token: string): Promise<FullLeadItem[]> {
  try {
    return await apiFetch<FullLeadItem[]>("/leads", { token });
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const token = await getAccessToken();
  const user = await getCurrentUser();

  if (!token || !user) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Executive Dashboard"
          subtitle="Real-time operations, revenue metrics, and booking pipelines."
          breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Overview" }]}
          icon={<LayoutDashboard size={18} />}
        />
        <div className="rounded-2xl border border-hairline bg-surface p-6 text-sm text-ink-muted">
          Could not load dashboard data. Please verify your authentication session.
        </div>
      </div>
    );
  }

  const [summary, rawLeads] = await Promise.all([
    fetchSummary(token),
    fetchAllLeads(token),
  ]);

  // Fallback summary if /dashboard/summary fails, constructed 100% from real leads
  const finalSummary: DashboardSummary = summary ?? {
    role: user.role,
    total_visible_leads: rawLeads.length,
    leads_by_status: rawLeads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    recent_leads: rawLeads.slice(0, 5).map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email,
      status: l.status,
      created_at: l.created_at,
    })),
    pending_qc_count: rawLeads.filter((l) => l.status === "tag_auditor").length,
    pending_payment_count: rawLeads.filter((l) => l.status === "transferred_to_billing").length,
    my_processed_revenue: 0,
    total_revenue: 0,
    total_users: 1,
    active_integrations: 0,
    future_credits_issued_count: 0,
    future_credits_total_value: 0,
    leaderboard: [],
  };

  return <DashboardClientView summary={finalSummary} user={user} allLeads={rawLeads} />;
}
