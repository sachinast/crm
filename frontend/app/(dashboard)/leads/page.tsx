import { Flame } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api-client";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import PageHeader from "@/components/shared/PageHeader";
import LeadsTableClient, { type LeadRow } from "@/components/leads/LeadsTableClient";

interface SearchParams {
  email?: string;
  mobile?: string;
  page?: string;
  page_size?: string;
  status?: string;
}

async function fetchLeads(params: SearchParams): Promise<LeadRow[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const query = new URLSearchParams();
  if (params.email) query.set("email", params.email);
  if (params.mobile) query.set("mobile", params.mobile);
  if (params.status) query.set("status_", params.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";

  try {
    return await apiFetch<LeadRow[]>(`/leads${suffix}`, { token });
  } catch {
    return [];
  }
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const role = (user.role || "").toLowerCase();
  const isAdmin = role === "admin" || role === "super_admin" || role === "superadmin";
  const isAgent = role === "agent";
  const isBilling = role === "billing";
  const isCS = role === "cr_booking" || role === "cs" || role === "customer_service";
  const isChanges = role === "change_dep" || role === "changes";
  const isQC = role === "auditor" || role === "qc" || role === "quality";

  // Billing users belong in /billing
  if (isBilling && !isAdmin) {
    redirect("/billing");
  }

  const params = await searchParams;

  // Enforce department queue filtering
  let targetStatus = params.status;
  if (isCS && !isAdmin) {
    targetStatus = "tag_cr_booking";
  } else if (isChanges && !isAdmin) {
    targetStatus = "tag_change_dep";
  } else if (isQC && !isAdmin) {
    targetStatus = "tag_auditor";
  }

  const queryParams: SearchParams = {
    ...params,
    ...(targetStatus ? { status: targetStatus } : {}),
  };

  const rawLeads = await fetchLeads(queryParams);

  // Strict role filter
  let leads = rawLeads;
  if (isCS && !isAdmin) {
    leads = rawLeads.filter((l) => l.status === "tag_cr_booking");
  } else if (isChanges && !isAdmin) {
    leads = rawLeads.filter((l) => l.status === "tag_change_dep");
  } else if (isQC && !isAdmin) {
    leads = rawLeads.filter((l) => l.status === "tag_auditor");
  }

  const page = Math.max(Number(params.page) || 1, 1);
  const pageSize = Number(params.page_size) && [10, 25, 50, 100].includes(Number(params.page_size))
    ? Number(params.page_size)
    : 10;

  const canCreate = isAdmin || isAgent;

  const pageTitle =
    isCS && !isAdmin
      ? "CS (Customer Service) Queue"
      : isChanges && !isAdmin
      ? "Changes Department Queue"
      : isQC && !isAdmin
      ? "QR (Quality Control) Queue"
      : "Leads";

  const pageSubtitle =
    isCS && !isAdmin
      ? "Manage and review customer service requests, inquiries, and customer care workflows."
      : isChanges && !isAdmin
      ? "Manage and review schedule changes, modifications, and voucher dispatches."
      : isQC && !isAdmin
      ? "Inspect verified bookings, audit records, and ensure quality compliance."
      : "Manage inbound customer pipelines, duplicate checks, and booking workflows.";

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* Symmetric Page Header */}
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        badge={`${leads.length} ${leads.length === 1 ? "record" : "records"}`}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: pageTitle }]}
        actions={
          canCreate ? (
            <Link
              href="/leads/new"
              className="btn-primary flex items-center gap-1.5"
            >
              <Flame size={16} className="text-amber-300 fill-amber-400/30 animate-pulse" />
              <span>New Lead</span>
            </Link>
          ) : undefined
        }
      />

      {/* Sortable & Filterable Data Table Client */}
      <LeadsTableClient
        initialLeads={leads}
        initialPage={page}
        initialPageSize={pageSize}
        initialStatus={targetStatus}
      />
    </div>
  );
}
