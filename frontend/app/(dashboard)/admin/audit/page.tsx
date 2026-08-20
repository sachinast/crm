import { ScrollText } from "lucide-react";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import AuditTrailClient, {
  type ProcessLogEntry,
  type PiiRevealEntry,
  type AccessLogEntry,
} from "@/components/admin/AuditTrailClient";

async function fetchAudit<T>(path: string): Promise<{ rows: T[]; forbidden: boolean }> {
  const token = await getAccessToken();
  if (!token) return { rows: [], forbidden: true };
  try {
    return { rows: await apiFetch<T[]>(path, { token }), forbidden: false };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return { rows: [], forbidden: true };
    return { rows: [], forbidden: true };
  }
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ lead_id?: string; tab?: string }>;
}) {
  const { lead_id, tab = "process" } = await searchParams;
  const suffix = lead_id ? `?lead_id=${encodeURIComponent(lead_id)}` : "";

  const [processLog, piiReveals, accessLog] = await Promise.all([
    fetchAudit<ProcessLogEntry>(`/audit/process-log${suffix}`),
    fetchAudit<PiiRevealEntry>(`/audit/pii-reveals${suffix}`),
    fetchAudit<AccessLogEntry>(`/audit/access-log${suffix}`),
  ]);

  if (processLog.forbidden) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Audit & Quality Control"
          subtitle="Admin & Super Admin oversight portal."
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Admin" }, { label: "Audit" }]}
          icon={<ScrollText size={18} />}
        />
        <div className="card p-6 text-sm text-ink-muted">
          Your account role does not have permission to view audit reports.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Symmetric Page Header */}
      <PageHeader
        title="Audit & Quality Control"
        subtitle="Master booking process log, PII unmasking trail, and record access inspection."
        badge={`${processLog.rows.length + piiReveals.rows.length + accessLog.rows.length} total events`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/admin/users" },
          { label: "Audit & QC" },
        ]}
        icon={<ScrollText size={18} />}
      />

      <AuditTrailClient
        processLogs={processLog.rows}
        piiReveals={piiReveals.rows}
        accessLogs={accessLog.rows}
        initialTab={tab}
      />
    </div>
  );
}
