import { History } from "lucide-react";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

interface ActivityEntry {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  category: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

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

const CATEGORIES = ["auth", "admin", "messaging", "pii"];
const PAGE_SIZE = 25;

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

function summarize(entry: ActivityEntry): string {
  const m = entry.metadata ?? {};
  switch (entry.action) {
    case "login_success":
      return "Logged in";
    case "login_failed":
      return `Failed login attempt (${m.email ?? "unknown email"})`;
    case "role_created":
      return `Created role "${m.name}"`;
    case "role_permissions_changed":
      return `Changed permissions for role "${m.name}"`;
    case "role_deleted":
      return `Deleted role "${m.name}"`;
    case "user_created":
      return `Created user ${m.email} (${m.role_name})`;
    case "user_role_changed":
      return `Changed ${m.email}'s role: ${m.old_role} → ${m.new_role}`;
    case "conversation_started":
      return `Started a ${m.is_group ? "group " : ""}conversation (${m.participant_count} participants)`;
    case "reveal_denied":
      return `Tried to reveal ${m.field} on a lead they can't access`;
    default:
      return entry.action.replace(/_/g, " ");
  }
}

// Master Admin — Activity Log. General account/admin activity (migration
// 0008) plus a combined "PII Reveal Activity" view merging successful
// reveals (existing pii_reveal_audit_log, GET /audit/pii-reveals) with
// denied attempts (activity_log, category=pii) — the gap the user asked to
// close: seeing not just who revealed masked info, but who *tried* to and
// couldn't. Same no-privileged-access-of-its-own posture as every other
// admin page; GET /admin/activity and GET /audit/pii-reveals enforce their
// own permissions server-side.
export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category, page: pageParam } = await searchParams;
  const page = Math.max(Number(pageParam) || 1, 1);
  const suffix = `?page=${page}&page_size=${PAGE_SIZE}${category ? `&category=${encodeURIComponent(category)}` : ""}`;

  const [{ data: activity, forbidden: activityForbidden }, { data: piiReveals, forbidden: piiForbidden }] =
    await Promise.all([
      fetchJson<ActivityPage>(`/admin/activity${suffix}`),
      fetchJson<PiiRevealEntry[]>("/audit/pii-reveals"),
    ]);

  const deniedReveals = (activity?.items ?? []).filter((e) => e.action === "reveal_denied");
  const combinedPii = [
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
      detail: summarize(e),
      ip: e.ip_address,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
          <History size={18} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity Log</h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Logins, admin config changes, and denied access attempts — milestone-level, not full content.
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-1.5">
        <a href="/admin/activity" className="badge" style={!category ? { background: "var(--accent-soft)", color: "var(--accent)" } : { background: "var(--hairline)", color: "var(--ink-muted)" }}>
          All
        </a>
        {CATEGORIES.map((c) => (
          <a
            key={c}
            href={`/admin/activity?category=${c}`}
            className="badge capitalize"
            style={category === c ? { background: "var(--accent-soft)", color: "var(--accent)" } : { background: "var(--hairline)", color: "var(--ink-muted)" }}
          >
            {c}
          </a>
        ))}
      </div>

      {activityForbidden ? (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Your role doesn&apos;t have access to the activity log.
        </p>
      ) : (
        <div className="card-flat mb-8 overflow-x-auto p-0">
          <table className="table-modern">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Event</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {(activity?.items.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center" style={{ color: "var(--ink-faint)" }}>
                    No activity yet.
                  </td>
                </tr>
              )}
              {activity?.items.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ color: "var(--ink-muted)" }}>{new Date(entry.created_at).toLocaleString()}</td>
                  <td>{entry.actor_name ?? <span style={{ color: "var(--ink-faint)" }}>system</span>}</td>
                  <td>{summarize(entry)}</td>
                  <td className="font-mono text-xs" style={{ color: "var(--ink-faint)" }}>{entry.ip_address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {activity && activity.total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 text-sm" style={{ color: "var(--ink-muted)" }}>
              <span>
                Page {activity.page} of {Math.ceil(activity.total / PAGE_SIZE)} ({activity.total} total)
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <a className="btn-ghost btn-sm" href={`/admin/activity?page=${page - 1}${category ? `&category=${category}` : ""}`}>
                    Previous
                  </a>
                )}
                {page * PAGE_SIZE < activity.total && (
                  <a className="btn-ghost btn-sm" href={`/admin/activity?page=${page + 1}${category ? `&category=${category}` : ""}`}>
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <h2 className="section-label mb-3">PII Reveal Activity</h2>
      <p className="mb-3 text-sm" style={{ color: "var(--ink-muted)" }}>
        Successful reveals and denied attempts, together — who saw masked information, and who tried to and couldn&apos;t.
      </p>
      {piiForbidden && activityForbidden ? (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Your role doesn&apos;t have access to PII reveal activity.
        </p>
      ) : (
        <div className="card-flat overflow-x-auto p-0">
          <table className="table-modern">
            <thead>
              <tr>
                <th>When</th>
                <th>Agent</th>
                <th>Result</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {combinedPii.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center" style={{ color: "var(--ink-faint)" }}>
                    No PII reveal activity yet.
                  </td>
                </tr>
              )}
              {combinedPii.map((row, i) => (
                <tr key={i}>
                  <td style={{ color: "var(--ink-muted)" }}>{new Date(row.at).toLocaleString()}</td>
                  <td className="font-mono text-xs">{row.actor}</td>
                  <td>
                    <span
                      className="badge mr-2"
                      style={
                        row.kind === "revealed"
                          ? { background: "var(--success-soft)", color: "var(--success)" }
                          : { background: "var(--danger-soft)", color: "var(--danger)" }
                      }
                    >
                      {row.kind === "revealed" ? "Revealed" : "Denied"}
                    </span>
                    {row.detail}
                  </td>
                  <td className="font-mono text-xs" style={{ color: "var(--ink-faint)" }}>{row.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
