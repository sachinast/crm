"use client";

import { useState } from "react";
import { CreditCard, Minus, Plus, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import Field from "@/components/shared/FormField";

export interface RemarkHistoryItem {
  s_no: number;
  remark: string;
  entered_by: string;
  entered_on: string;
}

export interface PaymentSummaryData {
  card_holder_name?: string | null;
  card_number?: string | null;
  card_type?: string | null;
  billing_address?: string | null;
  cvv?: string | null;
  card_expiry?: string | null;
  charge_name?: string | null;
  charge_amount?: number | null;
  company_amount?: number | null;
  platform_amount?: number | null;
  remarks_history?: RemarkHistoryItem[] | null;
}

export default function PaymentSummarySection({
  data,
  onChange,
  onSave,
  onSaveAndEmail,
  onBack,
  agentName = "Current Agent",
  submitting = false,
}: {
  data: PaymentSummaryData;
  onChange: (updated: Partial<PaymentSummaryData>) => void;
  onSave?: () => void;
  onSaveAndEmail?: () => void;
  onBack?: () => void;
  agentName?: string;
  submitting?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [newRemark, setNewRemark] = useState("");

  const remarksList = data.remarks_history ?? [];

  const companyAmt = Number(data.company_amount) || 0;
  const platformAmt = Number(data.platform_amount) || 0;
  const totalCalculatedAmount = companyAmt + platformAmt;

  function handleAddRemark() {
    if (!newRemark.trim()) return;
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    const newItem: RemarkHistoryItem = {
      s_no: remarksList.length + 1,
      remark: newRemark.trim(),
      entered_by: agentName,
      entered_on: formattedDate,
    };

    onChange({
      remarks_history: [...remarksList, newItem],
    });
    setNewRemark("");
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface shadow-card overflow-hidden">
      {/* Themed Header Banner */}
      <div className="flex items-center justify-between bg-surface-raised px-4 sm:px-5 py-3 border-b border-hairline">
        <div className="flex items-center gap-2.5 font-bold text-sm tracking-wide text-ink">
          <span className="p-1 rounded-lg bg-accent-soft text-accent">
            <CreditCard size={17} />
          </span>
          <span>Payment Summary</span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-ink-muted hover:text-ink hover:bg-surface-sunken p-1.5 rounded-lg transition-colors border border-hairline/50"
          title={collapsed ? "Expand section" : "Collapse section"}
        >
          {collapsed ? <Plus size={15} /> : <Minus size={15} />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Card & Billing Information Grid (Matching Screenshot) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Billing Address" required>
              <input
                required
                value={data.billing_address ?? ""}
                onChange={(e) => onChange({ billing_address: e.target.value })}
                className="input"
                placeholder="Billing Street, City, State, ZIP"
              />
            </Field>

            <Field label="Credit Card No." required>
              <input
                required
                value={data.card_number ?? ""}
                onChange={(e) => onChange({ card_number: e.target.value })}
                className="input font-mono font-medium"
                placeholder="•••• •••• •••• ••••"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Exp.Date." required>
              <input
                required
                value={data.card_expiry ?? ""}
                onChange={(e) => onChange({ card_expiry: e.target.value })}
                className="input font-mono"
                placeholder="MM/YY"
              />
            </Field>

            <Field label="CVV" required>
              <input
                required
                type="password"
                maxLength={4}
                value={data.cvv ?? ""}
                onChange={(e) => onChange({ cvv: e.target.value })}
                className="input font-mono"
                placeholder="•••"
              />
            </Field>

            <Field label="Card Holder Name" required>
              <input
                required
                value={data.card_holder_name ?? ""}
                onChange={(e) => onChange({ card_holder_name: e.target.value })}
                className="input"
                placeholder="Name on Card"
              />
            </Field>
          </div>

          {/* Charges and Remarks Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 pt-4 border-t border-hairline">
            {/* Left Charge Breakdown (5 cols) */}
            <div className="lg:col-span-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Charge Name" required>
                  <input
                    value={data.charge_name ?? ""}
                    onChange={(e) => onChange({ charge_name: e.target.value })}
                    className="input text-xs"
                    placeholder="e.g. Booking Charges"
                  />
                </Field>

                <Field label="Amount" required>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={data.charge_amount ?? companyAmt}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      onChange({ charge_amount: v, company_amount: v });
                    }}
                    className="input font-mono font-bold bg-amber-500/10 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Company Amount" required>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={data.company_amount ?? 0}
                    onChange={(e) => onChange({ company_amount: Number(e.target.value) })}
                    className="input font-mono font-medium"
                  />
                </Field>

                <Field label="Platform Amount" required>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={data.platform_amount ?? 0}
                    onChange={(e) => onChange({ platform_amount: Number(e.target.value) })}
                    className="input font-mono font-bold bg-amber-500/10 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-start-2">
                  <Field label="Total Amount">
                    <input
                      readOnly
                      type="number"
                      step="0.01"
                      value={totalCalculatedAmount.toFixed(2)}
                      className="input font-mono font-extrabold bg-amber-500/20 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200 border-amber-500/40 cursor-not-allowed text-base"
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Right Remarks Table & Input (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">Remarks</label>
                <div className="flex gap-2">
                  <input
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRemark())}
                    placeholder="Enter remark…"
                    className="input text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddRemark}
                    className="btn-primary text-xs py-1.5 px-4 rounded-xl font-semibold shrink-0 shadow-xs"
                  >
                    Add Remarks
                  </button>
                </div>
              </div>

              {/* Remarks History Table */}
              <div className="rounded-xl border border-hairline overflow-hidden bg-surface shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-raised border-b border-hairline text-ink-muted font-bold">
                    <tr>
                      <th className="px-3 py-2 w-12">S.No</th>
                      <th className="px-3 py-2">Remarks</th>
                      <th className="px-3 py-2 w-28">Entered By</th>
                      <th className="px-3 py-2 w-32">Entered On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {remarksList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-ink-faint">
                          No remarks entered yet. Use input above to log remarks.
                        </td>
                      </tr>
                    ) : (
                      remarksList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface-raised/50 transition-colors">
                          <td className="px-3 py-2 font-mono text-ink-muted">{item.s_no ?? idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-ink">{item.remark}</td>
                          <td className="px-3 py-2 text-ink-muted">{item.entered_by}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-ink-faint">{item.entered_on}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-hairline">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="btn-secondary py-2 px-4 rounded-xl font-bold inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={15} />
                <span>Back</span>
              </button>
            )}

            <button
              type="submit"
              disabled={submitting}
              onClick={onSave}
              className="btn-primary py-2 px-4 rounded-xl font-bold inline-flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 size={15} />
              <span>{submitting ? "Saving…" : "Save Details"}</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={onSaveAndEmail ?? onSave}
              className="btn-secondary py-2 px-4 rounded-xl font-bold inline-flex items-center gap-1.5 border-accent/40 text-accent hover:bg-accent-soft shadow-xs"
            >
              <Mail size={15} />
              <span>Save Details and Send Email</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
