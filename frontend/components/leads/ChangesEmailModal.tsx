"use client";

import React, { useState, useRef } from "react";
import {
  Mail,
  X,
  Send,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Bell,
  Trash2,
  ShieldCheck,
  Copy,
  Check,
  UserCheck,
  RefreshCw,
} from "lucide-react";

interface NotificationResult {
  recipient: string;
  role?: string;
  channel: string;
  status: string;
}

interface DispatchedInfo {
  toEmail: string;
  subject: string;
  message: string;
  dispatchedAt: string;
  dispatchedBy: string;
  pdfFilename?: string | null;
  adminNotified: boolean;
  changesNotified: boolean;
  notifications: NotificationResult[];
  internalNotes?: string;
}

interface ChangesEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  customerEmail?: string;
  customerName?: string;
  crmId?: string;
  onSuccess?: (info: { toEmail: string; subject: string; dispatchedAt: string }) => void;
}

export default function ChangesEmailModal({
  isOpen,
  onClose,
  leadId,
  customerEmail = "",
  customerName = "Valued Customer",
  crmId = "BOOKING",
  onSuccess,
}: ChangesEmailModalProps) {
  const [toEmail, setToEmail] = useState(customerEmail);
  const [subject, setSubject] = useState(`Change Voucher Confirmation - ${crmId}`);
  const [body, setBody] = useState(
    `Dear ${customerName},\n\nPlease find attached your revised change voucher for booking reference ${crmId}.\n\nAll requested modifications have been applied. Please review the attached document and retain it for your travel records.\n\nWarm regards,\nChanges & Customer Support Department`
  );
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [notifyAdmin, setNotifyAdmin] = useState(true);
  const [notifyChangesUser, setNotifyChangesUser] = useState(true);
  const [internalNotes, setInternalNotes] = useState("");

  const [isDragging, setIsDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sentInfo, setSentInfo] = useState<DispatchedInfo | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setError("Only PDF (.pdf) documents are accepted as voucher attachments.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("File size exceeds 15MB limit.");
      return;
    }

    setPdfFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPdfBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!toEmail.trim()) {
      setError("Please specify a recipient email address.");
      return;
    }
    if (!subject.trim()) {
      setError("Please specify an email subject.");
      return;
    }
    if (!body.trim()) {
      setError("Email body content cannot be empty.");
      return;
    }

    setSending(true);
    try {
      const resp = await fetch(`/api/leads/${leadId}/send-change-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: toEmail.trim(),
          subject: subject.trim(),
          body: body.trim(),
          pdf_filename: pdfFile ? pdfFile.name : null,
          pdf_base64: pdfBase64,
          notify_admin: notifyAdmin,
          notify_changes_user: notifyChangesUser,
          internal_notes: internalNotes.trim() || undefined,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.detail || data.message || "Failed to dispatch change voucher email.");
      }

      const defaultNotifications: NotificationResult[] = [];
      if (data.admin_notified ?? notifyAdmin) {
        defaultNotifications.push({
          recipient: "Admin Team",
          role: "admin",
          channel: "In-App Notification & Audit Log",
          status: "Delivered",
        });
      }
      if (data.changes_notified ?? notifyChangesUser) {
        defaultNotifications.push({
          recipient: "Changes Department",
          role: "change_dep",
          channel: "Queue Alert & Team Feed",
          status: "Delivered",
        });
      }

      const info: DispatchedInfo = {
        toEmail: data.to_email || toEmail,
        subject: data.subject || subject,
        message: data.message || `Change voucher email successfully sent to ${toEmail}`,
        dispatchedAt: data.dispatched_at || new Date().toISOString(),
        dispatchedBy: data.dispatched_by || "Changes Officer",
        pdfFilename: data.pdf_filename || (pdfFile ? pdfFile.name : null),
        adminNotified: data.admin_notified ?? notifyAdmin,
        changesNotified: data.changes_notified ?? notifyChangesUser,
        notifications: Array.isArray(data.notifications) && data.notifications.length > 0
          ? data.notifications
          : defaultNotifications,
        internalNotes: internalNotes.trim() || undefined,
      };

      setSentInfo(info);
      if (onSuccess) {
        onSuccess({
          toEmail: info.toEmail,
          subject: info.subject,
          dispatchedAt: info.dispatchedAt,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to dispatch change voucher.");
    } finally {
      setSending(false);
    }
  };

  const handleCopySummary = () => {
    if (!sentInfo) return;
    const summaryText = [
      `[CHANGE VOUCHER DISPATCH INFO]`,
      `Booking Reference: ${crmId}`,
      `Lead ID: ${leadId}`,
      `Recipient: ${sentInfo.toEmail}`,
      `Subject: ${sentInfo.subject}`,
      `Dispatched By: ${sentInfo.dispatchedBy}`,
      `Dispatched At: ${new Date(sentInfo.dispatchedAt).toLocaleString()}`,
      sentInfo.pdfFilename ? `Attachment: ${sentInfo.pdfFilename}` : null,
      `Notifications Broadcasted:`,
      ` - Admin Notified: ${sentInfo.adminNotified ? "Yes (In-App & Audit)" : "No"}`,
      ` - Changes User Notified: ${sentInfo.changesNotified ? "Yes (Queue Alert)" : "No"}`,
      sentInfo.internalNotes ? `Handover Notes: ${sentInfo.internalNotes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetForAnother = () => {
    setSentInfo(null);
    setPdfFile(null);
    setPdfBase64(null);
    setInternalNotes("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="card w-full max-w-2xl bg-surface border border-hairline shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-surface-raised shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/20">
              <Mail size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Dispatch Change Voucher</h2>
              <p className="text-xs text-ink-muted">
                Compose & dispatch official voucher to customer with automated Admin/Changes user notifications.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
          {sentInfo ? (
            <div className="space-y-4 py-2">
              {/* Top Success Banner */}
              <div className="rounded-2xl border border-success/30 bg-success/10 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-white shrink-0 shadow-sm">
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ink">Change Voucher Successfully Dispatched</h3>
                      <p className="text-xs text-ink-muted">{sentInfo.message}</p>
                    </div>
                  </div>
                  <span className="rounded-lg bg-success/20 px-2.5 py-1 text-[11px] font-bold text-success font-mono uppercase tracking-wider">
                    Dispatched
                  </span>
                </div>
              </div>

              {/* Sending Info Details Card */}
              <div className="rounded-2xl border border-hairline bg-surface-raised p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-hairline pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink">
                    Dispatch Summary & Delivery Details
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted hover:text-accent hover:border-accent/40 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check size={13} className="text-success" />
                        <span className="text-success">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy Summary</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Core Parameters Table */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-hairline bg-surface p-3 space-y-1">
                    <span className="text-[11px] text-ink-muted block uppercase tracking-wider font-semibold">
                      Recipient (Customer)
                    </span>
                    <span className="font-mono font-bold text-ink break-all">{sentInfo.toEmail}</span>
                  </div>

                  <div className="rounded-xl border border-hairline bg-surface p-3 space-y-1">
                    <span className="text-[11px] text-ink-muted block uppercase tracking-wider font-semibold">
                      Dispatched By
                    </span>
                    <span className="font-semibold text-ink flex items-center gap-1.5">
                      <UserCheck size={13} className="text-accent" />
                      {sentInfo.dispatchedBy}
                    </span>
                  </div>

                  <div className="rounded-xl border border-hairline bg-surface p-3 space-y-1 sm:col-span-2">
                    <span className="text-[11px] text-ink-muted block uppercase tracking-wider font-semibold">
                      Subject
                    </span>
                    <span className="font-semibold text-ink">{sentInfo.subject}</span>
                  </div>

                  {sentInfo.pdfFilename && (
                    <div className="rounded-xl border border-hairline bg-surface p-3 space-y-1 sm:col-span-2">
                      <span className="text-[11px] text-ink-muted block uppercase tracking-wider font-semibold">
                        Attached Voucher PDF
                      </span>
                      <span className="font-mono font-semibold text-accent flex items-center gap-1.5">
                        <FileText size={14} />
                        {sentInfo.pdfFilename}
                      </span>
                    </div>
                  )}

                  <div className="rounded-xl border border-hairline bg-surface p-3 space-y-1 sm:col-span-2">
                    <span className="text-[11px] text-ink-muted block uppercase tracking-wider font-semibold">
                      Dispatch Timestamp
                    </span>
                    <span className="font-mono text-ink text-xs">
                      {new Date(sentInfo.dispatchedAt).toLocaleString(undefined, {
                        dateStyle: "full",
                        timeStyle: "medium",
                      })}
                    </span>
                  </div>
                </div>

                {/* Notifications Broadcasted to Admin and Changes User */}
                <div className="rounded-xl border border-hairline bg-surface p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-ink">
                    <Bell size={14} className="text-accent" />
                    <span>Sending Info: Internal Team Notifications Broadcasted</span>
                  </div>

                  <div className="space-y-2">
                    {sentInfo.notifications.map((notif, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg bg-surface-sunken p-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={13} className="text-success shrink-0" />
                          <span className="font-semibold text-ink">{notif.recipient}</span>
                          <span className="text-[11px] text-ink-muted font-normal">({notif.channel})</span>
                        </div>
                        <span className="rounded bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success font-mono uppercase">
                          {notif.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-ink-muted pt-1 border-t border-hairline">
                    <ShieldCheck size={13} className="text-accent shrink-0" />
                    <span>
                      Audit entry permanently logged in lead process history with timestamp and dispatch parameters.
                    </span>
                  </div>
                </div>

                {sentInfo.internalNotes && (
                  <div className="rounded-xl border border-hairline bg-surface p-3 text-xs space-y-1">
                    <span className="text-[11px] text-ink-muted block uppercase tracking-wider font-semibold">
                      Internal Handover Notes
                    </span>
                    <p className="text-ink font-sans italic">{sentInfo.internalNotes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResetForAnother}
                  className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
                >
                  <RefreshCw size={13} />
                  <span>Send Another Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-primary px-6 py-2 rounded-xl text-xs font-bold"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* To Email Field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-ink flex items-center justify-between">
                  <span>To Customer Email</span>
                  <span className="text-[11px] font-normal text-ink-muted font-mono">Customer Recipient</span>
                </label>
                <input
                  type="email"
                  required
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="input text-xs font-mono"
                />
              </div>

              {/* Subject Field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Subject Line</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Change Voucher Confirmation"
                  className="input text-xs"
                />
              </div>

              {/* Body Field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Voucher Message / Notes for Customer</label>
                <textarea
                  required
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="input text-xs font-sans leading-relaxed resize-none"
                  placeholder="Enter voucher notes or instructions for the customer…"
                />
              </div>

              {/* PDF Attachment Upload Dropzone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center justify-between">
                  <span>PDF Voucher Attachment</span>
                  <span className="text-[11px] font-normal text-ink-muted">Accepts .pdf (Max 15MB)</span>
                </label>

                {pdfFile ? (
                  <div className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent-soft/30 p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink truncate font-mono">{pdfFile.name}</p>
                        <p className="text-[11px] text-ink-muted">
                          {(pdfFile.size / 1024).toFixed(1)} KB &bull; PDF document attached
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPdfFile(null);
                        setPdfBase64(null);
                      }}
                      className="text-ink-muted hover:text-rose-500 p-1.5 rounded-lg transition-colors"
                      title="Remove PDF"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-accent bg-accent-soft/40 scale-[1.01]"
                        : "border-hairline hover:border-accent hover:bg-surface-raised"
                    }`}
                  >
                    <UploadCloud size={22} className="text-accent mb-1" />
                    <p className="text-xs font-semibold text-ink">
                      Drag & drop voucher PDF here, or <span className="text-accent underline">browse</span>
                    </p>
                    <p className="text-[11px] text-ink-muted mt-0.5">Supports PDF documents up to 15MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.value && e.target.files?.[0]) {
                          handleFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Internal Notifications Sending Controls */}
              <div className="rounded-xl border border-hairline bg-surface-sunken p-3.5 space-y-2.5">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Bell size={13} className="text-accent" />
                  Internal Team Notifications & Handover Info
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer rounded-lg bg-surface p-2 border border-hairline">
                    <input
                      type="checkbox"
                      checked={notifyAdmin}
                      onChange={(e) => setNotifyAdmin(e.target.checked)}
                      className="rounded text-accent focus:ring-accent"
                    />
                    <div>
                      <p className="font-semibold text-ink">Notify Admin</p>
                      <p className="text-[10px] text-ink-muted">In-app alert & operational audit</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer rounded-lg bg-surface p-2 border border-hairline">
                    <input
                      type="checkbox"
                      checked={notifyChangesUser}
                      onChange={(e) => setNotifyChangesUser(e.target.checked)}
                      className="rounded text-accent focus:ring-accent"
                    />
                    <div>
                      <p className="font-semibold text-ink">Notify Changes User</p>
                      <p className="text-[10px] text-ink-muted">Changes queue & team feed alert</p>
                    </div>
                  </label>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-semibold text-ink-muted">
                    Internal Handover Notes (Optional - logged with notification):
                  </label>
                  <input
                    type="text"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="e.g. Flight rebooked per customer request via phone; difference fee collected."
                    className="input text-xs"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sending}
                  className="btn-secondary px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="btn-primary flex items-center gap-2 px-5 py-2 text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{sending ? "Dispatching…" : "Send Voucher Email"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
