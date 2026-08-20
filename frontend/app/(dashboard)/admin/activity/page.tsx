import { History } from "lucide-react";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import ActivityHistoryClient, {
  type ActivityEntry,
  type CombinedPiiEvent,
} from "@/components/admin/ActivityHistoryClient";

interface ActivityPage {
  items: ActivityEntry[];
  total: number;
  page: number;
  page_size: number;
}

interface PiiRevealEntry {
  id: string;
  lead_id: string;
  agent_id: string;
  field_revealed: string;
  reason: string;
  ip_address: string;
  revealed_at: string;
}

async function fetchJson<T>(path: string): Promise<{ data: T | null; forbidden: boolean }> {
  const token = await getAccessToken();
  if (!token) return { data: null, forbidden: true };
  try {
    return { data: await apiFetch<T>(path, { token }), forbidden: false };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return { data: null, forbidden: true };
    return { data: null, forbidden: true };
  }
}

export default async function AdminActivityPage() {
  const [{ data: activity, forbidden: activityForbidden }, { data: piiReveals, forbidden: piiForbidden }] =
    await Promise.all([
      fetchJson<ActivityPage>("/admin/activity?page=1&page_size=100"),
      fetchJson<PiiRevealEntry[]>("/audit/pii-reveals"),
    ]);

  const deniedReveals = (activity?.items ?? []).filter((e) => e.action === "reveal_denied");
  const combinedPii: CombinedPiiEvent[] = [
    ...(piiReveals ?? []).map((r) => ({
      kind: "revealed" as const,
      at: r.revealed_at,
      actor: r.agent_id,
      detail: `Revealed ${r.field_revealed} — "${r.reason}"`,
      ip: r.ip_address,
    })),
    ...deniedReveals.map((e) => ({
      kind: "denied" as const,
      at: e.created_at,
      actor: e.actor_name ?? e.actor_id ?? "unknown",
      detail: "Tried to reveal unmasked lead field",
      ip: e.ip_address,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Symmetric Page Header */}
      <PageHeader
        title="Activity Log"
        subtitle="System authentication, role policy changes, and security access milestones."
        badge={activity ? `${activity.items.length} events` : undefined}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/admin/users" },
          { label: "Activity Log" },
        ]}
        icon={<History size={18} />}
      />

      {activityForbidden ? (
        <div className="card p-6 text-sm text-ink-muted">
          Your role does not have permission to view the system activity log.
        </div>
      ) : (
        <ActivityHistoryClient
          activities={activity?.items ?? []}
          combinedPii={combinedPii}
          piiForbidden={piiForbidden}
        />
      )}
    </div>
  );
}
