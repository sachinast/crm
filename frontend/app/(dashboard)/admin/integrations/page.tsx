import { Plug } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

import CreateApiKeyForm from "./CreateApiKeyForm";
import RevokeButton from "./RevokeButton";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  assigned_agent_id: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface AgentOption {
  id: string;
  name: string;
  email: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

async function fetchApiKeys(): Promise<ApiKeyRow[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<ApiKeyRow[]>("/integrations/api-keys", { token });
  } catch {
    return [];
  }
}

async function fetchAgents(): Promise<AgentOption[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<AgentOption[]>("/users?role=agent", { token });
  } catch {
    return [];
  }
}

// External integrations (Zapier, Make, or any other API/form that can send a
// webhook) — TECHNICAL_SPEC.md §10.3. Admin/Super Admin manage API keys
// here; the actual capture endpoint (POST /leads/capture) is authenticated
// separately, with the key itself, not a staff session.
export default async function IntegrationsPage() {
  const [keys, agents] = await Promise.all([fetchApiKeys(), fetchAgents()]);
  const agentById = new Map(agents.map((a) => [a.id, a]));

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
          <Plug size={18} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Connect Zapier, Make, or any other form or API to capture leads directly into the CRM.
          </p>
        </div>
      </div>

      {agents.length === 0 ? (
        <p className="card mb-6 text-sm" style={{ borderStyle: "dashed", color: "var(--ink-muted)" }}>
          Create at least one Agent user before setting up an integration — captured leads need an owner.
        </p>
      ) : (
        <div className="mb-6">
          <CreateApiKeyForm agents={agents} />
        </div>
      )}

      <div className="card-flat mb-6 overflow-x-auto p-0">
        <table className="table-modern">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Assigned to</th>
              <th>Last used</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center" style={{ color: "var(--ink-faint)" }}>
                  No API keys yet.
                </td>
              </tr>
            )}
            {keys.map((k) => (
              <tr key={k.id}>
                <td className="font-medium">{k.name}</td>
                <td className="font-mono text-xs" style={{ color: "var(--ink-muted)" }}>{k.key_prefix}…</td>
                <td style={{ color: "var(--ink-muted)" }}>{agentById.get(k.assigned_agent_id)?.name ?? k.assigned_agent_id.slice(0, 8)}</td>
                <td className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}
                </td>
                <td>
                  <span
                    className="badge"
                    style={k.is_active ? { background: "var(--success-soft)", color: "var(--success)" } : { background: "var(--hairline)", color: "var(--ink-faint)" }}
                  >
                    {k.is_active ? "Active" : "Revoked"}
                  </span>
                </td>
                <td>
                  <RevokeButton keyId={k.id} isActive={k.is_active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card text-sm">
        <h2 className="section-label mb-3">Setting up Zapier / Make</h2>
        <p className="mb-2" style={{ color: "var(--ink-muted)" }}>
          Point a &ldquo;Webhooks&rdquo; action (Zapier &ldquo;Webhooks by Zapier&rdquo; → POST, or Make&apos;s
          HTTP module) at:
        </p>
        <pre
          className="mb-2 overflow-x-auto rounded-lg border p-3 text-xs"
          style={{ background: "var(--background)", borderColor: "var(--hairline)" }}
        >
          {`POST ${API_BASE_URL}/leads/capture
Header: X-API-Key: <your key>
Body (JSON):
{
  "name": "{{ contact.name }}",
  "phone": "{{ contact.phone }}",
  "email": "{{ contact.email }}",
  "source": "Website Contact Form",
  "notes": "optional freeform context"
}`}
        </pre>
        <p style={{ color: "var(--ink-muted)" }}>
          Map your form/API&apos;s own fields onto <code>name</code>, <code>phone</code>, <code>email</code> in
          Zapier&apos;s or Make&apos;s field-mapping step — this endpoint&apos;s contract stays fixed regardless of
          the source.
        </p>
      </section>
    </div>
  );
}
