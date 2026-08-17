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
      <h1 className="mb-1 text-lg font-semibold">Integrations</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Connect Zapier, Make, or any other form or API to capture leads directly into the CRM.
      </p>

      {agents.length === 0 ? (
        <p className="mb-6 rounded border border-dashed p-4 text-sm text-neutral-500">
          Create at least one Agent user before setting up an integration — captured leads need an owner.
        </p>
      ) : (
        <div className="mb-8">
          <CreateApiKeyForm agents={agents} />
        </div>
      )}

      <table className="mb-8 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-neutral-500">
            <th className="py-2 font-medium">Name</th>
            <th className="font-medium">Key</th>
            <th className="font-medium">Assigned to</th>
            <th className="font-medium">Last used</th>
            <th className="font-medium">Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {keys.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-neutral-400">
                No API keys yet.
              </td>
            </tr>
          )}
          {keys.map((k) => (
            <tr key={k.id} className="border-b">
              <td className="py-2">{k.name}</td>
              <td className="font-mono text-xs text-neutral-500">{k.key_prefix}…</td>
              <td>{agentById.get(k.assigned_agent_id)?.name ?? k.assigned_agent_id.slice(0, 8)}</td>
              <td className="text-xs text-neutral-500">
                {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}
              </td>
              <td>
                <span className={k.is_active ? "text-green-700" : "text-neutral-400"}>
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

      <section className="rounded-lg border p-4 text-sm">
        <h2 className="mb-2 font-medium">Setting up Zapier / Make</h2>
        <p className="mb-2 text-neutral-500">
          Point a &ldquo;Webhooks&rdquo; action (Zapier &ldquo;Webhooks by Zapier&rdquo; → POST, or Make&apos;s
          HTTP module) at:
        </p>
        <pre className="mb-2 overflow-x-auto rounded border bg-neutral-50 p-2 text-xs">
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
        <p className="text-neutral-500">
          Map your form/API&apos;s own fields onto <code>name</code>, <code>phone</code>, <code>email</code> in
          Zapier&apos;s or Make&apos;s field-mapping step — this endpoint&apos;s contract stays fixed regardless of
          the source.
        </p>
      </section>
    </div>
  );
}
