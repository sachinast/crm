"use client";

import React, { useState, useRef } from "react";
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
  Paperclip,
  FileText,
  FileCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";

interface CustomAttachment {
  filename: string;
  content: string; // Base64 string
  size: number;
}

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
  const svcTitle = serviceType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const defaultSubject =
    serviceType === "car"
      ? `Car Rental Payment Authorization Confirmed – ${crmId} – E-Booking Desk`
      : `${svcTitle} Payment Authorization Confirmed – ${crmId} – E-Booking Desk`;
  const [subject, setSubject] = useState(defaultSubject);
  const [customMessage, setCustomMessage] = useState("");
  const [attachDocx, setAttachDocx] = useState(true);
  const [customFiles, setCustomFiles] = useState<CustomAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    toEmail: string;
    subject: string;
    dispatchedAt: string;
    attachments: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // 10MB limit per file
      if (file.size > 10 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 10MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = reader.result as string;
        // Strip data:*/*;base64, prefix
        const base64Data = resultStr.includes(",") ? resultStr.split(",")[1] : resultStr;
        setCustomFiles((prev) => [
          ...prev,
          {
            filename: file.name,
            content: base64Data,
            size: file.size,
          },
        ]);
      };
      reader.onerror = () => {
        setError(`Failed to read file "${file.name}".`);
      };
      reader.readAsDataURL(file);
    });

    // Reset file input so re-selecting the same file triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleRemoveFile(index: number) {
    setCustomFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSend() {
    if (!toEmail.trim()) {
      setError("Please provide a valid recipient email address.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const attachmentsPayload = customFiles.map((f) => ({
      filename: f.filename,
      content: f.content,
    }));

    try {
      const resp = await fetch(`/api/leads/${leadId}/send-confirmation-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: toEmail.trim(),
          subject: subject.trim(),
          custom_message: customMessage.trim() || null,
          attach_confirmation_doc: attachDocx,
          custom_attachments: attachmentsPayload.length > 0 ? attachmentsPayload : null,
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

      const dispatchedAttachments: string[] = [];
      if (attachDocx) {
        dispatchedAttachments.push(`Car_Rental_Payment_Authorization_Confirmation_${crmId}.docx`);
      }
      customFiles.forEach((f) => dispatchedAttachments.push(f.filename));

      setSuccessInfo({
        toEmail: toEmail.trim(),
        subject: subject.trim(),
        dispatchedAt: data?.dispatched_at || new Date().toISOString(),
        attachments: dispatchedAttachments,
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
    setCustomFiles([]);
    onClose();
  }

  const ServiceIcon =
    serviceType === "hotel" ? Building : serviceType === "flight" ? Plane : Car;

  const headerTitle =
    serviceType === "car"
      ? "CAR RENTAL PAYMENT AUTHORIZATION CONFIRMATION"
      : `${svcTitle.toUpperCase()} PAYMENT AUTHORIZATION CONFIRMATION`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-hairline bg-surface shadow-2xl overflow-hidden">
        {/* Authorization-style Navy Header Bar */}
        <div className="bg-[#0f4c81] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#0b3860]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white border border-white/20">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold tracking-wide text-white uppercase">
                {headerTitle}
              </h2>
              <p className="text-[11px] text-white/80">
                Official Booking & Payment Authorization Record Dispatch
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 select-text">
          {/* Success View */}
          {successInfo ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={26} />
                </div>
                <h3 className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  Payment Authorization Confirmed & Dispatched!
                </h3>
                <p className="text-xs text-ink-muted">
                  Official confirmation email sent to <span className="font-semibold text-ink">{successInfo.toEmail}</span>
                </p>
              </div>

              <div className="rounded-xl border border-hairline bg-surface-raised p-4 text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Subject</span>
                  <span className="font-medium text-ink truncate max-w-[320px]">
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
                  <span className="text-ink-muted">Delivery Status</span>
                  <span className="badge font-bold text-[10px] uppercase bg-emerald-500/20 text-emerald-500">
                    Delivered via Resend
                  </span>
                </div>
                {successInfo.attachments.length > 0 && (
                  <div className="pt-2 border-t border-hairline">
                    <span className="text-ink-muted block mb-1.5 font-semibold">Attached Files ({successInfo.attachments.length}):</span>
                    <div className="space-y-1">
                      {successInfo.attachments.map((name, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-ink bg-surface p-1.5 rounded border border-hairline">
                          <FileCheck size={13} className="text-emerald-500 shrink-0" />
                          <span className="font-mono truncate">{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleResetAndClose}
                  className="btn-primary btn-sm px-5 font-semibold"
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
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Authorization-style Status Banner */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <span className="font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 text-[11px]">
                      ✓ AUTHORIZATION STATUS: CONFIRMED
                    </span>
                    <p className="text-[10px] text-ink-muted">
                      Card payment charged & ready for official customer dispatch
                    </p>
                  </div>
                </div>
                <span className="badge font-mono font-bold text-[11px] bg-surface text-ink border border-hairline px-2 py-0.5">
                  Ref: {crmId}
                </span>
              </div>

              {/* Reservation & Payment Highlights Strip */}
              <div className="rounded-xl border border-hairline bg-surface-raised p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <ServiceIcon size={16} className="text-accent" />
                  <span className="font-bold text-ink">{customerName}</span>
                  <span className="text-ink-faint">•</span>
                  <span className="capitalize text-ink-muted">{serviceType} Reservation</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-bold text-[10px] text-emerald-600 dark:text-emerald-400 uppercase">
                    <CreditCard size={10} />
                    Card Charged
                  </span>
                  {totalAmount !== undefined && (
                    <span className="font-mono font-bold text-ink text-sm">
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
                  placeholder="Payment Authorization Confirmed"
                  className="input text-xs font-medium"
                />
              </div>

              {/* Attachments Section */}
              <div className="rounded-xl border border-hairline bg-surface-raised p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Paperclip size={14} className="text-accent" />
                    <span className="text-xs font-bold text-ink uppercase tracking-wide">
                      Email Attachments
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline hover:text-accent/80 transition-colors"
                  >
                    <UploadCloud size={13} />
                    <span>Upload Custom File</span>
                  </button>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.xlsx,.txt"
                />

                {/* Official Template DOCX Attachment Option */}
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-hairline bg-surface cursor-pointer hover:bg-surface-raised transition-colors">
                  <input
                    type="checkbox"
                    checked={attachDocx}
                    onChange={(e) => setAttachDocx(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-hairline text-accent focus:ring-accent"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <FileText size={14} className="text-blue-500 shrink-0" />
                      <span className="text-xs font-semibold text-ink truncate">
                        Car_Rental_Payment_Authorization_Confirmation.docx
                      </span>
                      <span className="rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.2 text-[9px] font-bold uppercase">
                        Official Template
                      </span>
                    </div>
                    <p className="text-[10px] text-ink-muted mt-0.5">
                      Dynamically filled with booking reference, driver details, rates, and timestamp record.
                    </p>
                  </div>
                </label>

                {/* Custom Files List */}
                {customFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-ink-muted uppercase font-bold tracking-wider">
                      Additional Uploaded Files ({customFiles.length})
                    </span>
                    <div className="space-y-1">
                      {customFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg border border-hairline bg-surface text-xs"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <Paperclip size={12} className="text-ink-muted shrink-0" />
                            <span className="font-mono text-[11px] text-ink truncate">
                              {file.filename}
                            </span>
                            <span className="text-[10px] text-ink-muted">
                              ({formatBytes(file.size)})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="text-ink-muted hover:text-rose-500 p-1 rounded transition-colors"
                            title="Remove attachment"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Specialist Message */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-ink flex items-center justify-between">
                  <span>Specialist Note / Custom Message (Optional)</span>
                  <span className="text-[10px] text-ink-muted font-normal">
                    Shown in callout box in confirmation email
                  </span>
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={2}
                  placeholder="Add specific instructions, pickup guidelines, or assistance details for the traveler..."
                  className="input text-xs resize-none"
                />
              </div>

              {/* Notice */}
              <div className="flex items-center gap-2 rounded-lg bg-surface-sunken p-2.5 text-[11px] text-ink-muted border border-hairline">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                <span>
                  Dispatches authorization confirmation email matching the official template via Resend API.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!successInfo && (
          <div className="flex items-center justify-end gap-2.5 p-4 border-t border-hairline bg-surface-raised/50">
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
              <span>{submitting ? "Dispatching…" : "Send Confirmation Email"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
