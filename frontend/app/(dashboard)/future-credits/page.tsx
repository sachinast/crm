import { Gift, Plus } from "lucide-react";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PageHeader from "@/components/shared/PageHeader";
import DataTableCard from "@/components/shared/DataTableCard";
import Pagination from "@/components/shared/Pagination";

import CreateFutureCreditForm from "./CreateFutureCreditForm";

interface FutureCreditEntry {
  id: string;
  source_lead_id: string;
  voucher_amount: number;
  number_of_vouchers: number;
  validity_date: string;
  created_by: string;
  created_at: string;
}

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

export default async function FutureCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; page_size?: string }>;
}) {
  const { page: pageParam, page_size: pageSizeParam } = await searchParams;
  const page = Math.max(Number(pageParam) || 1, 1);
  const pageSize = Number(pageSizeParam) && [10, 25, 50, 100].includes(Number(pageSizeParam))
    ? Number(pageSizeParam)
    : 10;

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

  const total = credits.length;
  const pagedCredits = credits.slice((page - 1) * pageSize, page * pageSize);

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
          <DataTableCard
            headerContent={
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold uppercase tracking-wider text-ink">
                  Issued Vouchers
                </span>
                <span className="rounded-full bg-surface-raised border border-hairline px-2.5 py-0.5 text-xs font-mono font-bold text-ink-muted">
                  {credits.length} records
                </span>
              </div>
            }
            footerContent={
              <Pagination
                currentPage={page}
                totalItems={total}
                pageSize={pageSize}
                basePath="/future-credits"
                extraParams={{ page_size: pageSize }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            }
          >
            <table className="table-modern w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Source Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Voucher Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Vouchers</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Validity Date</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-faint">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {pagedCredits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-ink-muted">
                      No future credits issued yet.
                    </td>
                  </tr>
                ) : (
                  pagedCredits.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-surface-raised">
                      <td className="px-4 py-3 font-mono text-xs text-accent font-semibold">
                        {c.source_lead_id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 font-bold text-sm text-ink">
                        ${c.voucher_amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-ink">
                        <span className="inline-flex items-center rounded-lg border border-hairline bg-surface-raised px-2.5 py-0.5 font-mono text-xs font-semibold text-ink">
                          {c.number_of_vouchers}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                        {c.validity_date}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-ink-muted">
                        {new Date(c.created_at).toLocaleDateString()}
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
  );
}
