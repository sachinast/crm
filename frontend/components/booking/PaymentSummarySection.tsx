"use client";

import React, { useState, useMemo } from "react";
import { CreditCard, Minus, Plus, Mail, CheckCircle2, ArrowLeft, AlertCircle, Check, ShieldCheck } from "lucide-react";
import Field from "@/components/shared/FormField";
import { validateCardDetails, detectCardBrand, type CardBrand } from "@/lib/card-validator";

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

const BRAND_COLORS: Record<CardBrand, { bg: string; text: string; border: string }> = {
  Visa: { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  Mastercard: { bg: "bg-orange-500/10 dark:bg-orange-500/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/30" },
  Amex: { bg: "bg-cyan-500/10 dark:bg-cyan-500/20", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30" },
  Discover: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  JCB: { bg: "bg-green-500/10 dark:bg-green-500/20", text: "text-green-600 dark:text-green-400", border: "border-green-500/30" },
  Diners: { bg: "bg-indigo-500/10 dark:bg-indigo-500/20", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30" },
  Unknown: { bg: "bg-surface-raised", text: "text-ink-muted", border: "border-hairline" },
};

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

  const cardNumber = data.card_number ?? "";
  const cardExpiry = data.card_expiry ?? "";
  const cardCvv = data.cvv ?? "";

  // Real-time card validation
  const validation = useMemo(() => {
    return validateCardDetails(cardNumber, cardExpiry, cardCvv);
  }, [cardNumber, cardExpiry, cardCvv]);

  const rawCardDigits = cardNumber.replace(/\D/g, "");
  const brandStyle = BRAND_COLORS[validation.brand];

  function handleAddRemark() {
    if (!newRemark.trim()) return;
    const item: RemarkHistoryItem = {
      s_no: remarksList.length + 1,
      remark: newRemark.trim(),
      entered_by: agentName,
      entered_on: new Date().toISOString(),
    };
    onChange({ remarks_history: [...remarksList, item] });
    setNewRemark("");
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-hairline bg-surface-raised/40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <CreditCard size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Payment & Card Authorization Details</h3>
            <p className="text-xs text-ink-muted">Encrypted payment verification, billing address, and transaction fee breakdown.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-surface hover:bg-surface-raised text-ink-muted transition-colors"
          title={collapsed ? "Expand Payment Section" : "Collapse Payment Section"}
        >
          {collapsed ? <Plus size={15} /> : <Minus size={15} />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Card & Billing Information Grid */}
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

            <div>
              <Field label="Credit Card No." required>
                <div className="relative flex items-center">
                  <input
                    required
                    value={cardNumber}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 19);
                      const brand = detectCardBrand(raw);
                      
                      // Amex format (4-6-5), others (4-4-4-4)
                      let formatted = raw;
                      if (brand === "Amex") {
                        formatted = raw.replace(/^(\d{4})(\d{0,6})(\d{0,5})$/, (_, g1, g2, g3) =>
                          [g1, g2, g3].filter(Boolean).join(" ")
                        );
                      } else {
                        formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                      }

                      onChange({ card_number: formatted, card_type: brand !== "Unknown" ? brand : data.card_type });
                    }}
                    className={`input font-mono font-medium pr-28 ${
                      rawCardDigits.length >= 13
                        ? validation.isValidNumber
                          ? "border-emerald-500/50 focus:border-emerald-500"
                          : "border-rose-500/50 focus:border-rose-500 bg-rose-500/[0.03]"
                        : ""
                    }`}
                    placeholder="•••• •••• •••• ••••"
                    maxLength={23}
                  />

                  {/* Card Brand Badge & Valid Checkmark */}
                  <div className="absolute right-2 flex items-center gap-1.5 pointer-events-none">
                    {validation.brand !== "Unknown" && (
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${brandStyle.bg} ${brandStyle.text} ${brandStyle.border}`}>
                        {validation.brand}
                      </span>
                    )}
                    {rawCardDigits.length >= 13 && (
                      validation.isValidNumber ? (
                        <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertCircle size={16} className="text-rose-600 dark:text-rose-400" />
                      )
                    )}
                  </div>
                </div>
              </Field>
              {rawCardDigits.length >= 13 && !validation.isValidNumber && (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 animate-fadeIn">
                  <AlertCircle size={13} />
                  <span>Invalid card number (Checksum failed. Check for typos)</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Field label="Exp.Date." required>
                <div className="relative flex items-center">
                  <input
                    required
                    value={cardExpiry}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
                      let formatted = raw;
                      if (raw.length >= 2) {
                        formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
                      }
                      onChange({ card_expiry: formatted });
                    }}
                    className={`input font-mono ${
                      cardExpiry.length >= 4
                        ? validation.isExpiryValid
                          ? "border-emerald-500/50 focus:border-emerald-500"
                          : "border-rose-500/50 focus:border-rose-500 bg-rose-500/[0.03]"
                        : ""
                    }`}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                  {cardExpiry.length >= 4 && (
                    <div className="absolute right-2.5 pointer-events-none">
                      {validation.isExpiryValid ? (
                        <Check size={15} className="text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertCircle size={15} className="text-rose-600 dark:text-rose-400" />
                      )}
                    </div>
                  )}
                </div>
              </Field>
              {validation.expiryError && (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 animate-fadeIn">
                  <AlertCircle size={13} />
                  <span>{validation.expiryError}</span>
                </p>
              )}
            </div>

            <div>
              <Field label="CVV" required>
                <div className="relative flex items-center">
                  <input
                    required
                    type="password"
                    maxLength={validation.brand === "Amex" ? 4 : 3}
                    value={cardCvv}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "").slice(0, validation.brand === "Amex" ? 4 : 3);
                      onChange({ cvv: raw });
                    }}
                    className={`input font-mono ${
                      cardCvv.length >= (validation.brand === "Amex" ? 4 : 3)
                        ? "border-emerald-500/50 focus:border-emerald-500"
                        : ""
                    }`}
                    placeholder={validation.brand === "Amex" ? "••••" : "•••"}
                  />
                  {validation.isCvvValid && (
                    <div className="absolute right-2.5 pointer-events-none">
                      <Check size={15} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
                </div>
              </Field>
              {validation.cvvError && cardCvv.length > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 animate-fadeIn">
                  <AlertCircle size={13} />
                  <span>{validation.cvvError}</span>
                </p>
              )}
            </div>

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
                    className="input font-mono font-bold text-ink"
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
                    className="input font-mono font-bold text-ink"
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
                      className="input font-mono font-extrabold text-accent bg-surface-sunken border-hairline cursor-not-allowed text-base"
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
              <div className="rounded-xl border border-hairline overflow-hidden max-h-44 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-raised text-ink-muted font-bold border-b border-hairline sticky top-0">
                    <tr>
                      <th className="px-3 py-2 w-12 text-center">S.No.</th>
                      <th className="px-3 py-2">Remark</th>
                      <th className="px-3 py-2 w-28">Entered By</th>
                      <th className="px-3 py-2 w-24">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {remarksList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-ink-muted italic">
                          No remarks added yet.
                        </td>
                      </tr>
                    ) : (
                      remarksList.map((r, idx) => (
                        <tr key={idx} className="hover:bg-surface-raised/40">
                          <td className="px-3 py-2 text-center font-mono text-ink-muted">{r.s_no ?? idx + 1}</td>
                          <td className="px-3 py-2 text-ink font-medium">{r.remark}</td>
                          <td className="px-3 py-2 text-ink-muted">{r.entered_by}</td>
                          <td className="px-3 py-2 font-mono text-ink-muted">
                            {r.entered_on ? new Date(r.entered_on).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-hairline">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-4"
              >
                <ArrowLeft size={14} />
                <span>Back to Leads</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              {onSaveAndEmail && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onSaveAndEmail}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-4 border-accent/40 text-accent hover:bg-accent-soft"
                >
                  <Mail size={14} />
                  <span>{submitting ? "Processing…" : "Save & Send Auth Email"}</span>
                </button>
              )}

              {onSave && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onSave}
                  className="btn-primary flex items-center gap-1.5 text-xs py-2 px-5 shadow-sm"
                >
                  <CheckCircle2 size={14} className="text-white" />
                  <span>{submitting ? "Saving Booking…" : "Save & Update Booking"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
