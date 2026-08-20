import { CreditCard } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import BillingQueueClient, { type BillingLeadRow } from "@/components/billing/BillingQueueClient";

async function fetchBillingLeads(): Promise<BillingLeadRow[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<BillingLeadRow[]>("/leads", { token });
  } catch {
    return [];
  }
}

export default async function BillingPage() {
  const leads = await fetchBillingLeads();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      <PageHeader
        title="Billing & Accounts Queue"
        subtitle="Manage payment collections, card authorizations, invoices, and payment statuses."
        badge={`${leads.length} ${leads.length === 1 ? "account" : "accounts"}`}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Billing & Accounts" }]}
        icon={<CreditCard size={18} />}
      />

      <BillingQueueClient leads={leads} />
    </div>
  );
}
