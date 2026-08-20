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
        <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-6 text-sm text-slate-400">
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
            <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-5 shadow-sm">
              <h2 className="mb-1 text-sm font-bold text-white">Create Future Credit</h2>
              <p className="mb-4 text-xs text-slate-400">
                Issue compensation vouchers linked to a source lead.
              </p>
              <CreateFutureCreditForm />
            </div>
          </div>
        )}

        {/* Credits Data Table Card */}
        <div className={canCreate ? "lg:col-span-7" : "lg:col-span-12"}>
          <DataTableCard
            headerContent={
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Issued Vouchers
                </span>
                <span className="text-[11px] text-slate-400">{credits.length} records</span>
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
                <tr className="bg-[#182136]/30">
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Source Lead</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Voucher Amount</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Vouchers</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Validity Date</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232e47]">
                {pagedCredits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                      No future credits issued yet.
                    </td>
                  </tr>
                ) : (
                  pagedCredits.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-[#182136]/60">
                      <td className="px-4 py-3 font-mono text-xs text-[#d3ab5e]">
                        {c.source_lead_id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 font-bold text-white">
                        ${c.voucher_amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <span className="inline-flex items-center rounded-md border border-[#2a3652] bg-[#182136] px-2 py-0.5 font-mono text-xs font-semibold text-slate-200">
                          {c.number_of_vouchers}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        {c.validity_date}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400">
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
