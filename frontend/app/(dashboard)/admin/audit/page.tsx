import { ScrollText } from "lucide-react";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

interface ProcessLogEntry {
  id: string;
  lead_id: string;
  actor_id: string;
  action: string;
  field_changed: string | null;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
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

interface AccessLogEntry {
  id: string;
  lead_id: string;
  opened_by: string;
  opened_at: string;
}

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

// TECHNICAL_SPEC.md §5/§9 — Admin/Super Admin-only oversight tools: the
// master "Log Report of Booking Process" (§9.3), the PII reveal audit trail
// (§9.2), and the record-open access log (§5). One page, three sections,
// each independently role-gated server-side (this page just relays 403s).
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ lead_id?: string }>;
}) {
  const { lead_id } = await searchParams;
  const suffix = lead_id ? `?lead_id=${encodeURIComponent(lead_id)}` : "";

  const [processLog, piiReveals, accessLog] = await Promise.all([
    fetchAudit<ProcessLogEntry>(`/audit/process-log${suffix}`),
    fetchAudit<PiiRevealEntry>(`/audit/pii-reveals${suffix}`),
    fetchAudit<AccessLogEntry>(`/audit/access-log${suffix}`),
  ]);

  if (processLog.forbidden) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Audit</h1>
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Admin/Super Admin only.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
          <ScrollText size={18} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit</h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            PRD §9.2/§9.3 — the master process log, PII reveal trail, and record-access log.
          </p>
        </div>
      </div>

      <form className="mb-6 flex gap-2" method="GET">
        <input name="lead_id" defaultValue={lead_id} placeholder="Filter by lead ID" className="input w-64" />
        <button type="submit" className="btn-secondary">
          Filter
        </button>
      </form>

      <section className="card mb-4">
        <h2 className="section-label mb-3">Booking process log</h2>
        <ul className="flex flex-col gap-2 text-xs" style={{ color: "var(--ink-muted)" }}>
          {processLog.rows.length === 0 && <li style={{ color: "var(--ink-faint)" }}>No entries.</li>}
          {processLog.rows.map((r) => (
            <li key={r.id} className="card-flat py-2.5">
              <span className="font-medium" style={{ color: "var(--ink)" }}>{r.action}</span>
              {r.field_changed && (
                <>
                  {" "}
                  · {r.field_changed}: {JSON.stringify(r.old_value)} → {JSON.stringify(r.new_value)}
                </>
              )}
              {" · lead "}
              <span className="font-mono">{r.lead_id.slice(0, 8)}</span>
              {" · "}
              {new Date(r.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>

      <section className="card mb-4">
        <h2 className="section-label mb-3">PII reveal log</h2>
        <ul className="flex flex-col gap-2 text-xs" style={{ color: "var(--ink-muted)" }}>
          {piiReveals.rows.length === 0 && <li style={{ color: "var(--ink-faint)" }}>No entries.</li>}
          {piiReveals.rows.map((r) => (
            <li key={r.id} className="card-flat py-2.5">
              <span className="font-medium" style={{ color: "var(--ink)" }}>{r.field_revealed}</span> revealed · &ldquo;{r.reason}
              &rdquo; · {r.ip_address} · lead <span className="font-mono">{r.lead_id.slice(0, 8)}</span> ·{" "}
              {new Date(r.revealed_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="section-label mb-3">Access log</h2>
        <ul className="flex flex-col gap-2 text-xs" style={{ color: "var(--ink-muted)" }}>
          {accessLog.rows.length === 0 && <li style={{ color: "var(--ink-faint)" }}>No entries.</li>}
          {accessLog.rows.map((r) => (
            <li key={r.id} className="card-flat py-2.5">
              Opened lead <span className="font-mono">{r.lead_id.slice(0, 8)}</span> ·{" "}
              {new Date(r.opened_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
