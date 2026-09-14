"use client";

import React, { useState } from "react";
import {
  Mail,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Building,
  Plane,
  Car,
} from "lucide-react";

interface FinalConfirmationEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  customerEmail?: string;
  customerName?: string;
  crmId?: string;
  serviceType?: string;
  totalAmount?: number | string;
  onSuccess?: () => void;
}

export default function FinalConfirmationEmailModal({
  isOpen,
  onClose,
  leadId,
  customerEmail = "",
  customerName = "Valued Customer",
  crmId = "BOOKING",
  serviceType = "car",
  totalAmount,
  onSuccess,
}: FinalConfirmationEmailModalProps) {
  const [toEmail, setToEmail] = useState(customerEmail);
  const [subject, setSubject] = useState(
    `Booking & Payment Confirmation - ${crmId} - E-Booking Desk`
  );
  const [customMessage, setCustomMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    toEmail: string;
    subject: string;
    dispatchedAt: string;
  } | null>(null);

  if (!isOpen) return null;

  async function handleSend() {
    if (!toEmail.trim()) {
      setError("Please provide a valid recipient email address.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch(`/api/leads/${leadId}/send-confirmation-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: toEmail.trim(),
          subject: subject.trim(),
          custom_message: customMessage.trim() || null,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const errorMsg =
          typeof data?.detail === "string"
            ? data.detail
            : typeof data?.message === "string"
            ? data.message
            : "Failed to dispatch confirmation email.";
        setError(errorMsg);
        return;
      }

      setSuccessInfo({
        toEmail: toEmail.trim(),
        subject: subject.trim(),
        dispatchedAt: data?.dispatched_at || new Date().toISOString(),
      });
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setError(`Network error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetAndClose() {
    setSuccessInfo(null);
    setError(null);
    setCustomMessage("");
    onClose();
  }

  const ServiceIcon =
    serviceType === "hotel" ? Building : serviceType === "flight" ? Plane : Car;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl border border-hairline bg-surface p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                Send Final Confirmation Email
              </h2>
              <p className="text-xs text-ink-muted">
                Official booking & payment receipt sent to customer once card is charged.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-raised hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success View */}
        {successInfo ? (
          <div className="space-y-4 py-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Mail size={24} />
              </div>
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Final Confirmation Dispatched Successfully!
              </h3>
              <p className="text-xs text-ink-muted">
                Sent to <span className="font-semibold text-ink">{successInfo.toEmail}</span>
              </p>
            </div>

            <div className="rounded-xl border border-hairline bg-surface-raised p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-muted">Subject</span>
                <span className="font-medium text-ink truncate max-w-[280px]">
                  {successInfo.subject}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Dispatched At</span>
                <span className="font-mono text-ink">
                  {new Date(successInfo.dispatchedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Status</span>
                <span className="badge font-bold text-[10px] uppercase bg-emerald-500/20 text-emerald-500">
                  Delivered via Resend
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleResetAndClose}
                className="btn-primary btn-sm px-4 font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Reservation Highlights Strip */}
            <div className="rounded-xl border border-hairline bg-surface-raised p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <ServiceIcon size={16} className="text-accent" />
                <span className="font-bold text-ink">{customerName}</span>
                <span className="text-ink-faint">•</span>
                <span className="font-mono font-semibold text-accent">{crmId}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-bold text-[10px] text-emerald-600 dark:text-emerald-400 uppercase">
                  <CreditCard size={10} />
                  Card Charged
                </span>
                {totalAmount !== undefined && (
                  <span className="font-mono font-bold text-ink">
                    ${typeof totalAmount === "number" ? totalAmount.toFixed(2) : totalAmount}
                  </span>
                )}
              </div>
            </div>

            {/* Recipient Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink flex items-center justify-between">
                <span>Recipient Email Address</span>
                <span className="text-[10px] text-ink-muted font-normal">Customer contact</span>
              </label>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="customer@example.com"
                className="input text-xs"
              />
            </div>

            {/* Email Subject */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Email Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Booking & Payment Confirmation"
                className="input text-xs font-medium"
              />
            </div>

            {/* Custom Specialist Message */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink flex items-center justify-between">
                <span>Specialist Note / Custom Message (Optional)</span>
                <span className="text-[10px] text-ink-muted font-normal">
                  Shown in callout box in email
                </span>
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                placeholder="Add any specific instructions, pickup notes, or assistance details for the traveler..."
                className="input text-xs resize-none"
              />
            </div>

            {/* Notice */}
            <div className="flex items-center gap-2 rounded-lg bg-surface-sunken p-2.5 text-[11px] text-ink-muted border border-hairline">
              <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
              <span>
                This dispatches the official confirmation email with payment details and full reservation itinerary via Resend API.
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-hairline">
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={submitting}
                className="btn-secondary btn-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={submitting}
                className="btn-primary btn-sm inline-flex items-center gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-sm"
              >
                <Send size={13} />
                <span>{submitting ? "Sending…" : "Send Confirmation Email"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
