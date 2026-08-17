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
        <h1 className="mb-4 text-lg font-semibold">Audit</h1>
        <p className="text-sm text-neutral-500">Admin/Super Admin only.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-lg font-semibold">Audit</h1>
      <p className="mb-4 text-sm text-neutral-500">
        PRD §9.2/§9.3 — the master process log, PII reveal trail, and record-access log.
      </p>

      <form className="mb-6 flex gap-2" method="GET">
        <input
          name="lead_id"
          defaultValue={lead_id}
          placeholder="Filter by lead ID"
          className="rounded border px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded border px-3 py-2 text-sm hover:bg-neutral-100">
          Filter
        </button>
      </form>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium">Booking process log</h2>
        <ul className="flex flex-col gap-1 text-xs text-neutral-500">
          {processLog.rows.length === 0 && <li className="text-neutral-400">No entries.</li>}
          {processLog.rows.map((r) => (
            <li key={r.id} className="rounded border p-2">
              <span className="font-medium text-neutral-700">{r.action}</span>
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

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium">PII reveal log</h2>
        <ul className="flex flex-col gap-1 text-xs text-neutral-500">
          {piiReveals.rows.length === 0 && <li className="text-neutral-400">No entries.</li>}
          {piiReveals.rows.map((r) => (
            <li key={r.id} className="rounded border p-2">
              <span className="font-medium text-neutral-700">{r.field_revealed}</span> revealed · &ldquo;{r.reason}
              &rdquo; · {r.ip_address} · lead <span className="font-mono">{r.lead_id.slice(0, 8)}</span> ·{" "}
              {new Date(r.revealed_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium">Access log</h2>
        <ul className="flex flex-col gap-1 text-xs text-neutral-500">
          {accessLog.rows.length === 0 && <li className="text-neutral-400">No entries.</li>}
          {accessLog.rows.map((r) => (
            <li key={r.id} className="rounded border p-2">
              Opened lead <span className="font-mono">{r.lead_id.slice(0, 8)}</span> ·{" "}
              {new Date(r.opened_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
