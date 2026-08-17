import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken, getCurrentUser } from "@/lib/auth";

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

// PRD §7.3: creation restricted to TL/CS; read access for Billing/CS/Change
// Dep/Chargeback Dep/Auditor (+ TL/Admin/Super Admin) — see
// backend/app/api/v1/future_credits.py for the authoritative role lists.
const CREATE_ROLES = new Set(["tl", "cs", "admin", "super_admin"]);

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
  const canCreate = currentUser !== null && CREATE_ROLES.has(currentUser.role);

  if (forbidden) {
    return (
      <div>
        <h1 className="mb-4 text-lg font-semibold">Future Credits</h1>
        <p className="text-sm text-neutral-500">
          Your role doesn&apos;t have access to future credits (PRD §7.3: Billing, CS, Change Dep, Chargeback Dep,
          Auditor, TL, Admin, Super Admin).
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Future Credits</h1>

      {canCreate && (
        <div className="mb-6">
          <CreateFutureCreditForm />
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-neutral-500">
            <th className="py-2 font-medium">Source lead</th>
            <th className="font-medium">Amount</th>
            <th className="font-medium">Count</th>
            <th className="font-medium">Valid until</th>
            <th className="font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {credits.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-neutral-400">
                No future credits yet.
              </td>
            </tr>
          )}
          {credits.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="py-2 font-mono text-xs">{c.source_lead_id}</td>
              <td>${c.voucher_amount.toFixed(2)}</td>
              <td>{c.number_of_vouchers}</td>
              <td>{c.validity_date}</td>
              <td>{new Date(c.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
