"use client";

import { MessageSquare, Send, CheckCircle2, X, AlertCircle } from "lucide-react";
import { useState } from "react";

export interface SMSTemplate {
  id: string;
  dlt_template_id: string;
  name: string;
  template_text: string;
}

export const DLT_TEMPLATES: SMSTemplate[] = [
  {
    id: "booking_confirmation",
    dlt_template_id: "DLT-110716182901",
    name: "Booking Confirmation",
    template_text: "Dear {#var#}, your booking ref {#var#} has been confirmed. Thank you for choosing our travel services.",
  },
  {
    id: "payment_auth_link",
    dlt_template_id: "DLT-110716182902",
    name: "Payment Authorization Link",
    template_text: "Dear {#var#}, please complete your booking payment authorization securely using link: {#var#}. Valid for 30 mins.",
  },
  {
    id: "trip_modification",
    dlt_template_id: "DLT-110716182903",
    name: "Trip Modification Alert",
    template_text: "Dear {#var#}, your reservation ref {#var#} has been updated. Please review details shared to your email.",
  },
  {
    id: "cancellation_ack",
    dlt_template_id: "DLT-110716182904",
    name: "Cancellation Acknowledgment",
    template_text: "Dear {#var#}, cancellation request for ref {#var#} is received. Refund amount of {#var#} will be processed per policy.",
  },
];

export default function SMSDispatchModal({
  customerName,
  customerPhone,
  bookingRef,
  isOpen,
  onClose,
}: {
  customerName: string;
  customerPhone: string;
  bookingRef?: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<SMSTemplate>(DLT_TEMPLATES[0]);
  const [customPhone, setCustomPhone] = useState(customerPhone);
  const [dispatching, setDispatching] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  function renderPreviewText() {
    return selectedTemplate.template_text
      .replace("{#var#}", customerName || "Customer")
      .replace("{#var#}", bookingRef || "CRMID")
      .replace("{#var#}", "$0.00");
  }

  async function handleSend() {
    setDispatching(true);
    // Simulate DLT SMS gateway API dispatch
    await new Promise((resolve) => setTimeout(resolve, 600));
    setDispatching(false);
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-hairline bg-surface p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2 text-ink font-bold">
            <MessageSquare size={18} className="text-accent" />
            <span>Dispatch DLT SMS Notification</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1 text-ink-muted hover:bg-surface-raised hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">Recipient Mobile</label>
            <input
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              className="input mt-1 font-mono text-sm"
              placeholder="+1 555-0199"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">Approved DLT Template</label>
            <select
              value={selectedTemplate.id}
              onChange={(e) => {
                const found = DLT_TEMPLATES.find((t) => t.id === e.target.value);
                if (found) setSelectedTemplate(found);
              }}
              className="select mt-1 w-full text-xs font-medium"
            >
              {DLT_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.dlt_template_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">Message Preview</label>
            <div className="mt-1 rounded-xl border border-hairline bg-surface-raised/70 p-3 text-xs font-mono text-ink leading-relaxed">
              {renderPreviewText()}
            </div>
            <p className="mt-1.5 text-[11px] text-ink-faint flex items-center gap-1">
              <AlertCircle size={12} />
              <span>Registered Header ID: <strong>CRMTRV</strong> | DLT PE-ID: <strong>100192847291</strong></span>
            </p>
          </div>
        </div>

        {sentSuccess ? (
          <div className="alert-success flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>SMS successfully dispatched via DLT SMS Gateway!</span>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={dispatching || !customPhone.trim()}
              className="btn-primary btn-sm inline-flex items-center gap-1.5"
            >
              <Send size={14} />
              <span>{dispatching ? "Sending…" : "Send DLT SMS"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
