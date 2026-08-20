import { Code2, Plug } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";

import CreateApiKeyForm from "./CreateApiKeyForm";
import CreateEmbedWidgetForm from "./CreateEmbedWidgetForm";
import {
  ApiKeysTableClient,
  EmbedWidgetsTableClient,
  type ApiKeyRow,
  type EmbedWidgetRow,
  type AgentOption,
} from "@/components/admin/IntegrationsTablesClient";

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
          <ApiKeysTableClient keys={keys} agents={agents} />
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
            <EmbedWidgetsTableClient widgets={widgets} agents={agents} />
          </div>
        </div>
      </div>
    </div>
  );
}
