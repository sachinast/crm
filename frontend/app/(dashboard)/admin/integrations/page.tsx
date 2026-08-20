import { Code2, Plug, Key } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import DataTableCard from "@/components/shared/DataTableCard";

import CreateApiKeyForm from "./CreateApiKeyForm";
import CreateEmbedWidgetForm from "./CreateEmbedWidgetForm";
import EmbedSnippetButton from "./EmbedSnippetButton";
import RevokeButton from "./RevokeButton";
import ToggleWidgetButton from "./ToggleWidgetButton";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  assigned_agent_id: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface EmbedWidgetRow {
  id: string;
  name: string;
  widget_key: string;
  assigned_agent_id: string;
  is_active: boolean;
  submission_count: number;
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

async function fetchEmbedWidgets(): Promise<EmbedWidgetRow[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<EmbedWidgetRow[]>("/admin/embed-widgets", { token });
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

export default async function IntegrationsPage() {
  const [keys, widgets, agents] = await Promise.all([fetchApiKeys(), fetchEmbedWidgets(), fetchAgents()]);
  const agentById = new Map(agents.map((a) => [a.id, a]));

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Symmetric Page Header */}
      <PageHeader
        title="Integrations & Webhooks"
        subtitle="Connect Zapier, Make, custom webhooks, or embeddable booking widgets to stream leads into CRM."
        badge={`${keys.length} API keys`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/admin/users" },
          { label: "Integrations" },
        ]}
        icon={<Plug size={18} />}
      />

      {/* Section 1: Inbound Webhooks & API Keys */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-ink">Generate Integration API Key</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Authenticate external Zapier, Make, or custom HTTP webhooks.
              </p>
            </div>
            {agents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-hairline p-4 text-xs text-ink-muted">
                Create at least one Agent user first to assign incoming leads.
              </p>
            ) : (
              <CreateApiKeyForm agents={agents} />
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          <DataTableCard
            headerContent={
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold uppercase tracking-wider text-ink">
                  Active Inbound API Keys
                </span>
                <span className="rounded-full bg-surface-raised border border-hairline px-2.5 py-0.5 text-xs font-mono font-bold text-ink-muted">
                  {keys.length} keys
                </span>
              </div>
            }
          >
            <table className="table-modern w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Key Prefix</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Lead Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-faint">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {keys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-ink-muted">No integration keys generated yet.</td>
                  </tr>
                ) : (
                  keys.map((k) => (
                    <tr key={k.id} className="transition-colors hover:bg-surface-raised">
                      <td className="px-4 py-3 font-semibold text-sm text-ink">{k.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-accent font-semibold">{k.key_prefix}...</td>
                      <td className="px-4 py-3 text-sm text-ink">
                        {agentById.get(k.assigned_agent_id)?.name ?? k.assigned_agent_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${
                            k.is_active
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-surface-raised text-ink-muted border-hairline"
                          }`}
                        >
                          {k.is_active ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RevokeButton keyId={k.id} isActive={k.is_active} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DataTableCard>
        </div>
      </div>

      {/* Section 2: Embed Booking Widgets */}
      <div className="space-y-4 pt-4 border-t border-hairline">
        <div>
          <div className="flex items-center gap-2">
            <Code2 size={18} className="text-accent" />
            <h2 className="text-lg font-bold text-ink">Embeddable Booking Widgets</h2>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            One-tag copy-paste interactive booking widget for any website landing page.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="card p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-ink">Create New Web Widget</h3>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Deploy dynamic Flight, Hotel, and Cab booking intake forms.
                </p>
              </div>
              {agents.length === 0 ? (
                <p className="rounded-xl border border-dashed border-hairline p-4 text-xs text-ink-muted">
                  Create at least one Agent user first to assign submissions.
                </p>
              ) : (
                <CreateEmbedWidgetForm agents={agents} />
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            <DataTableCard
              headerContent={
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink">
                    Active Web Widgets
                  </span>
                  <span className="rounded-full bg-surface-raised border border-hairline px-2.5 py-0.5 text-xs font-mono font-bold text-ink-muted">
                    {widgets.length} widgets
                  </span>
                </div>
              }
            >
              <table className="table-modern w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Widget Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Assigned Agent</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Leads Captured</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-faint">Code / Embed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {widgets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-ink-muted">No web widgets created yet.</td>
                    </tr>
                  ) : (
                    widgets.map((w) => (
                      <tr key={w.id} className="transition-colors hover:bg-surface-raised">
                        <td className="px-4 py-3 font-semibold text-sm text-ink">{w.name}</td>
                        <td className="px-4 py-3 text-sm text-ink">
                          {agentById.get(w.assigned_agent_id)?.name ?? w.assigned_agent_id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-accent">
                          {w.submission_count}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${
                              w.is_active
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-surface-raised text-ink-muted border-hairline"
                            }`}
                          >
                            {w.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <EmbedSnippetButton widgetKey={w.widget_key} />
                            <ToggleWidgetButton widgetId={w.id} isActive={w.is_active} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </DataTableCard>
          </div>
        </div>
      </div>
    </div>
  );
}
