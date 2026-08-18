import { Gift } from "lucide-react";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

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

export default async function FutureCreditsPage() {
  const [{ credits, forbidden }, currentUser] = await Promise.all([fetchFutureCredits(), getCurrentUser()]);
  const canCreate = hasPermission(currentUser, "future_credits.create");

  if (forbidden) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Future Credits</h1>
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Your role doesn&apos;t have access to future credits (PRD §7.3: Billing, CS, Change Dep, Chargeback Dep,
          Auditor, TL, Admin, Super Admin).
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
          <Gift size={18} style={{ color: "var(--accent)" }} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Future Credits</h1>
      </div>

      {canCreate && (
        <div className="mb-6">
          <CreateFutureCreditForm />
        </div>
      )}

      <div className="card-flat overflow-x-auto p-0">
        <table className="table-modern">
          <thead>
            <tr>
              <th>Source lead</th>
              <th>Amount</th>
              <th>Count</th>
              <th>Valid until</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {credits.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center" style={{ color: "var(--ink-faint)" }}>
                  No future credits yet.
                </td>
              </tr>
            )}
            {credits.map((c) => (
              <tr key={c.id}>
                <td className="font-mono text-xs" style={{ color: "var(--ink-muted)" }}>{c.source_lead_id}</td>
                <td className="font-medium">${c.voucher_amount.toFixed(2)}</td>
                <td style={{ color: "var(--ink-muted)" }}>{c.number_of_vouchers}</td>
                <td style={{ color: "var(--ink-muted)" }}>{c.validity_date}</td>
                <td style={{ color: "var(--ink-muted)" }}>{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
