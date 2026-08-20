import { Gift } from "lucide-react";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageHeader from "@/components/shared/PageHeader";
import CreateFutureCreditForm from "./CreateFutureCreditForm";
import FutureCreditsTableClient, { type FutureCreditEntry } from "@/components/future-credits/FutureCreditsTableClient";

async function fetchFutureCredits(): Promise<{ credits: FutureCreditEntry[]; forbidden: boolean }> {
  const token = await getAccessToken();
  if (!token) return { credits: [], forbidden: true };
  try {
    return { credits: await apiFetch<FutureCreditEntry[]>("/future-credits", { token }), forbidden: false };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return { credits: [], forbidden: true };
    return { credits: [], forbidden: true };
  }
}

export default async function FutureCreditsPage() {
  const [{ credits, forbidden }, currentUser] = await Promise.all([fetchFutureCredits(), getCurrentUser()]);
  const canCreate = hasPermission(currentUser, "future_credits.create");

  if (forbidden) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Future Credits"
          subtitle="Voucher allocation and redemption management."
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Future Credits" }]}
          icon={<Gift size={18} />}
        />
        <div className="card p-6 text-sm text-ink-muted">
          Your role does not have access to future credits.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Symmetric Page Header */}
      <PageHeader
        title="Future Credits"
        subtitle="Manage customer vouchers, validity dates, and compensation allocations."
        badge={`${credits.length} ${credits.length === 1 ? "credit" : "credits"}`}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Future Credits" }]}
        icon={<Gift size={18} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Create Future Credit Card */}
        {canCreate && (
          <div className="lg:col-span-5">
            <div className="card p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-ink">Create Future Credit</h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Issue compensation vouchers linked to a source lead.
                </p>
              </div>
              <CreateFutureCreditForm />
            </div>
          </div>
        )}

        {/* Credits Data Table Card */}
        <div className={canCreate ? "lg:col-span-7" : "lg:col-span-12"}>
          <FutureCreditsTableClient credits={credits} />
        </div>
      </div>
    </div>
  );
}
