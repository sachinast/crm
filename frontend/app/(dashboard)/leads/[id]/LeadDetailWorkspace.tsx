"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Car,
  Hotel,
  Plane,
  FileText,
  CreditCard,
  PencilLine,
  Ban,
  Repeat,
  ShieldCheck,
  Phone,
  Mail,
  Copy,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  UserCheck,
  Tag,
  Calendar,
  Layers,
  Eye,
  X,
  Send,
} from "lucide-react";

import StatusBadge from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/formatters";
import { formatStatus } from "@/lib/status-meta";
import LeadCustomFieldsPanel from "./LeadCustomFieldsPanel";
import ModificationsPanel from "./ModificationsPanel";
import CancellationPanel from "./CancellationPanel";
import StatusActions from "./StatusActions";
import PaymentActions from "./PaymentActions";

interface LeadDetail {
  id: string;
  name: string;
  phone: string;
  email: string;
  service_type: string | null;
  status: string;
  agent_id: string;
  is_duplicate: boolean;
  duplicate_of_id: string | null;
  duplicate_override_reason: string | null;
  source: string | null;
  custom_fields: Record<string, unknown>;
  embed_widget_id: string | null;
  landing_page_url: string | null;
  visitor_public_ip: string | null;
  visitor_local_ip: string | null;
  embed_submission: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface BookingSummary {
  booking_reference: string;
  total_amount: number;
  [key: string]: unknown;
}

interface Transition {
  status: string;
  label: string;
  ui_color: string;
}

interface StatusHistoryEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  changed_at: string;
}

interface PaymentEntry {
  id: string;
  outcome: string;
  card_display: string;
  total_amount: number;
  processed_at: string | null;
  created_at: string;
}

interface ModificationEntry {
  id: string;
  field_name: string;
  original_value: unknown;
  revised_value: unknown;
  modification_amount: number;
  created_at: string;
}

interface CancellationEntry {
  original_prepaid_amount: number;
  cancellation_penalty_fee: number;
  refund_amount: number;
  final_retained_amount: number;
  created_at: string;
}

function PIIRevealModal({
  isOpen,
  onClose,
  field,
  onConfirm,
  loading,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  field: "email" | "phone" | "card";
  onConfirm: (reason: string) => void;
  loading: boolean;
  error?: string | null;
}) {
  const [reason, setReason] = useState("Customer Verification");
  const PRESET_REASONS = [
    "Customer Verification",
    "Billing & Payment Processing",
    "Reservation / Itinerary Update",
    "Customer Service Support",
  ];

  if (!isOpen) return null;

  const fieldLabel = field === "email" ? "Email Address" : field === "phone" ? "Phone Number" : "Payment Card Details";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="card w-full max-w-md bg-surface p-5 shadow-2xl space-y-4 border border-hairline">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-ink">Access Masked {fieldLabel}</h3>
          </div>
          <button onClick={onClose} disabled={loading} className="text-ink-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-hairline bg-surface-raised p-3 text-xs text-ink-muted leading-relaxed">
          Unmasking sensitive customer PII is audited. Please select or state your reason for accessing this field.
        </div>

        <div>
          <label className="text-[11px] font-semibold text-ink-muted uppercase">Select or Enter Reason *</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5 mb-2">
            {PRESET_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors ${
                  reason === r
                    ? "border-accent bg-accent-soft text-accent-ink font-semibold"
                    : "border-hairline bg-surface hover:bg-surface-raised text-ink-muted hover:text-ink"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input text-xs"
            placeholder="State why you need to reveal this customer information..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
          <button type="button" onClick={onClose} disabled={loading} className="btn-ghost btn-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={!reason.trim() || loading}
            onClick={() => onConfirm(reason.trim())}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            <Eye size={13} />
            <span>{loading ? "Unmasking…" : "Confirm & Reveal"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingRedirectConfirmModal({
  isOpen,
  onClose,
  serviceType,
  customerName,
  crmId,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  serviceType: string;
  customerName: string;
  crmId: string;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="card w-full max-w-md bg-surface p-5 shadow-2xl space-y-4 border border-hairline">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <PencilLine size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-ink capitalize">Open {serviceType} Booking Form</h3>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div className="rounded-xl border border-hairline bg-surface-raised p-3.5 space-y-2 text-xs">
          <p className="text-ink leading-relaxed">
            Do you want to proceed to the <span className="font-bold text-accent capitalize">{serviceType}</span> reservation editor?
          </p>
          <div className="pt-1 text-ink-muted space-y-1">
            <div><span className="text-ink-faint">Customer:</span> <strong className="text-ink">{customerName}</strong></div>
            <div><span className="text-ink-faint">Reference:</span> <strong className="font-mono text-accent">{crmId}</strong></div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
          <button type="button" onClick={onClose} className="btn-ghost btn-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            <span>Proceed to Form</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EditLeadModal({
  lead,
  isOpen,
  onClose,
  onSaved,
}: {
  lead: LeadDetail;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedLead: Partial<LeadDetail>) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone);
  const [email, setEmail] = useState(lead.email);
  const [serviceType, setServiceType] = useState<string>(lead.service_type || "car");
  const [reason, setReason] = useState("Customer requested detail update");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PRESET_EDIT_REASONS = [
    "Customer requested detail update",
    "Typo / spelling correction",
    "Contact information update",
    "Service switch requested by customer",
  ];

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for this edit.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload: Record<string, string | undefined> = {
      name: name.trim(),
      service_type: serviceType,
      reason: reason.trim(),
    };

    if (phone && !phone.includes("*")) {
      payload.phone = phone.trim();
    }
    if (email && !email.includes("*")) {
      payload.email = email.trim();
    }

    try {
      const resp = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        onSaved({
          name: name.trim(),
          ...(payload.phone ? { phone: payload.phone } : {}),
          ...(payload.email ? { email: payload.email } : {}),
          service_type: serviceType,
        });
        onClose();
        router.refresh();
      } else {
        const detail = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
        setError(detail || "Failed to update lead details.");
      }
    } catch {
      setError("Network error while updating lead.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="card w-full max-w-lg bg-surface p-5 shadow-2xl space-y-4 border border-hairline max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <PencilLine size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-ink">Edit Customer & Lead Details</h3>
          </div>
          <button onClick={onClose} disabled={loading} className="text-ink-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-ink-muted uppercase">Customer Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input text-xs mt-1"
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-ink-muted uppercase">
                Phone / Mobile {phone.includes("*") ? "(Masked)" : "*"}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input text-xs mt-1 font-mono"
                placeholder="+1 (555) 000-0000"
              />
              {phone.includes("*") && (
                <span className="text-[10px] text-ink-faint mt-0.5 block">
                  Leave unchanged or type new full number
                </span>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-ink-muted uppercase">
                Email Address {email.includes("*") ? "(Masked)" : "*"}
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input text-xs mt-1 font-mono"
                placeholder="customer@example.com"
              />
              {email.includes("*") && (
                <span className="text-[10px] text-ink-faint mt-0.5 block">
                  Leave unchanged or type new full email
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-ink-muted uppercase">Service Type</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="select text-xs mt-1"
            >
              <option value="car">Car Rental</option>
              <option value="hotel">Hotel Reservation</option>
              <option value="flight">Flight Booking</option>
            </select>
          </div>

          <div className="border-t border-hairline pt-3">
            <label className="text-[11px] font-semibold text-accent uppercase">Reason for Editing * (Stored in DB Audit)</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5 mb-2">
              {PRESET_EDIT_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`rounded-lg px-2 py-0.5 text-[11px] font-medium border transition-colors ${
                    reason === r
                      ? "border-accent bg-accent-soft text-accent-ink font-semibold"
                      : "border-hairline bg-surface hover:bg-surface-raised text-ink-muted hover:text-ink"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input text-xs"
              placeholder="Provide reason for editing this lead..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
            <button type="button" onClick={onClose} disabled={loading} className="btn-ghost btn-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="btn-primary btn-sm flex items-center gap-1.5"
            >
              <PencilLine size={13} />
              <span>{loading ? "Saving Changes…" : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PIIField({
  leadId,
  field,
  maskedValue,
}: {
  leadId: string;
  field: "email" | "phone";
  maskedValue: string;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmReveal(reason: string) {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/leads/${leadId}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, reason }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        const val = data.value || data.revealed_value || data.raw_value;
        if (val) {
          setRevealed(val);
          setShowModal(false);
        } else {
          setError("No value returned from server");
        }
      } else {
        setError(data.detail || "Failed to reveal sensitive field");
      }
    } catch {
      setError("Network error while unmasking");
    } finally {
      setLoading(false);
    }
  }

  if (revealed) {
    return (
      <span className="font-mono text-ink font-semibold select-all bg-accent-soft/40 px-1.5 py-0.5 rounded border border-accent/20">
        {revealed}
      </span>
    );
  }

  return (
    <>
      <span className="inline-flex items-center gap-1.5 font-mono text-ink-muted">
        <span>{maskedValue}</span>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold text-accent hover:underline px-1.5 py-0.5 rounded bg-accent-soft/40 border border-accent/20 hover:bg-accent-soft transition-colors"
          title="Click to reveal full value (requires audit reason)"
        >
          <Eye size={10} />
          <span>Reveal</span>
        </button>
      </span>

      <PIIRevealModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        field={field}
        onConfirm={handleConfirmReveal}
        loading={loading}
        error={error}
      />
    </>
  );
}


function SMSDispatchModal({
  customerName,
  customerPhone,
  bookingRef,
  isOpen,
  onClose,
}: {
  customerName: string;
  customerPhone: string;
  bookingRef: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [message, setMessage] = useState(
    `Hello ${customerName}, your booking ref ${bookingRef} has been received. Please review your itinerary.`
  );
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="card w-full max-w-md bg-surface p-5 shadow-2xl space-y-4 border border-hairline">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-ink">Dispatch SMS Notification</h3>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-ink-muted">Recipient</label>
          <p className="font-mono text-xs font-bold text-ink">{customerPhone}</p>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-ink-muted">SMS Content</label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input text-xs"
          />
        </div>

        {sent && <p className="text-xs font-semibold text-success">SMS dispatched successfully!</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost btn-sm">
            Close
          </button>
          <button
            onClick={() => {
              setSent(true);
              setTimeout(() => {
                setSent(false);
                onClose();
              }, 1200);
            }}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            <Send size={13} />
            <span>Send SMS</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const BOOKING_SUMMARY_FIELDS: Record<string, { key: string; label: string }[]> = {
  car: [
    { key: "car_provider", label: "Car Provider" },
    { key: "car_model", label: "Car Model" },
    { key: "booking_confirmation", label: "Confirmation #" },
    { key: "pickup_datetime", label: "Pickup Date" },
    { key: "pickup_location", label: "Pickup Location" },
    { key: "return_location", label: "Return Location" },
  ],
  hotel: [
    { key: "hotel_name", label: "Hotel Name" },
    { key: "room_type", label: "Room Category" },
    { key: "call_type", label: "Call Type" },
    { key: "itinerary_number", label: "Itinerary #" },
    { key: "check_in_date", label: "Check-in" },
    { key: "check_out_date", label: "Check-out" },
  ],
  flight: [
    { key: "airline", label: "Airline Carrier" },
    { key: "pnr", label: "PNR Code" },
    { key: "trip_type", label: "Trip Type" },
    { key: "class_of_service", label: "Cabin Class" },
    { key: "origin", label: "Origin" },
    { key: "destination", label: "Destination" },
  ],
};

const SERVICE_ICON: Record<string, typeof Car> = { car: Car, hotel: Hotel, flight: Plane };

interface WorkspaceProps {
  lead: LeadDetail;
  booking: BookingSummary | null;
  transitions: Transition[];
  history: StatusHistoryEntry[];
  payments: PaymentEntry[];
  modifications: ModificationEntry[];
  cancellation: CancellationEntry | null;
  canModify: boolean;
  canProcessPayment: boolean;
  canEditCustomFields: boolean;
}

export default function LeadDetailWorkspace({
  lead,
  booking,
  transitions,
  history,
  payments,
  modifications,
  cancellation,
  canModify,
  canProcessPayment,
  canEditCustomFields,
}: WorkspaceProps) {
  const [leadState, setLeadState] = useState<LeadDetail>(lead);
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [confirmRedirectService, setConfirmRedirectService] = useState<string | null>(null);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "modifications" | "cancellation" | "history">("overview");
  const [copiedAuthLink, setCopiedAuthLink] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const ServiceIcon = leadState.service_type ? SERVICE_ICON[leadState.service_type] : null;
  const authUrl = typeof window !== "undefined" ? `${window.location.origin}/authorize/${leadState.id}` : `/authorize/${leadState.id}`;

  const crmId = booking?.booking_reference || (leadState.custom_fields?.booking_reference as string) || `CRM-${leadState.id.replace(/-/g, "").slice(0, 7).toUpperCase()}`;

  const copyAuthLink = () => {
    navigator.clipboard.writeText(authUrl);
    setCopiedAuthLink(true);
    setTimeout(() => setCopiedAuthLink(false), 2000);
  };

  const handleSendAuthEmail = async () => {
    if (!leadState.email) {
      alert("This lead does not have a customer email address configured.");
      return;
    }
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const resp = await fetch(`/api/leads/${leadState.id}/send-auth-email`, { method: "POST" });
      const data = await resp.json();
      if (resp.ok) {
        setEmailStatus(`Auth email sent to ${leadState.email}`);
        setTimeout(() => setEmailStatus(null), 4000);
      } else {
        alert(data.detail || "Failed to send authorization email.");
      }
    } catch {
      alert("Network error while sending authorization email.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Breadcrumb & Executive Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-3">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Link href="/leads" className="hover:text-ink transition-colors font-medium">
              Leads
            </Link>
            <span>/</span>
            <span className="font-mono text-accent font-semibold">{crmId}</span>
          </nav>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tight text-ink">{leadState.name}</h1>
            <StatusBadge status={leadState.status} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowEditLeadModal(true)}
            className="btn-secondary btn-sm flex items-center gap-1.5 font-semibold"
            title="Edit Customer Profile (Requires Reason)"
          >
            <PencilLine size={13} className="text-accent" />
            <span>Edit Lead</span>
          </button>

          {leadState.email && (
            <button
              onClick={handleSendAuthEmail}
              disabled={sendingEmail}
              className="btn-secondary btn-sm flex items-center gap-1.5 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 font-semibold"
            >
              <Mail size={13} />
              <span>{sendingEmail ? "Sending…" : emailStatus || "Send Auth Email"}</span>
            </button>
          )}

          {leadState.phone && (
            <button
              onClick={() => setShowSMSModal(true)}
              className="btn-secondary btn-sm flex items-center gap-1.5"
            >
              <MessageSquare size={13} className="text-accent" />
              <span>SMS Dispatch</span>
            </button>
          )}

          {leadState.status === "authorization_pending" && (
            <button
              onClick={copyAuthLink}
              className="btn-primary btn-sm flex items-center gap-1.5 shadow-xs"
            >
              <Copy size={13} />
              <span>{copiedAuthLink ? "Link Copied!" : "Copy Consent Link"}</span>
            </button>
          )}

          <a
            href={`/authorize/${leadState.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary btn-sm flex items-center gap-1.5"
          >
            <ExternalLink size={13} />
            <span>Customer View</span>
          </a>
        </div>
      </div>

      {/* Contact Summary Strip */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-hairline bg-surface p-3 text-xs shadow-xs">
        <div className="flex items-center gap-1.5">
          <Phone size={13} className="text-ink-faint" />
          <PIIField leadId={leadState.id} field="phone" maskedValue={leadState.phone} />
        </div>
        <span className="text-ink-faint">•</span>
        <div className="flex items-center gap-1.5">
          <Mail size={13} className="text-ink-faint" />
          <PIIField leadId={leadState.id} field="email" maskedValue={leadState.email} />
        </div>
        <span className="text-ink-faint">•</span>
        <div className="flex items-center gap-1.5 font-mono text-ink-muted">
          <Clock size={13} className="text-ink-faint" />
          <span>Created {formatDate(leadState.created_at)}</span>
        </div>
      </div>

      <EditLeadModal
        lead={leadState}
        isOpen={showEditLeadModal}
        onClose={() => setShowEditLeadModal(false)}
        onSaved={(updated) => setLeadState((prev) => ({ ...prev, ...updated }))}
      />

      <BookingRedirectConfirmModal
        isOpen={Boolean(confirmRedirectService)}
        onClose={() => setConfirmRedirectService(null)}
        serviceType={confirmRedirectService || ""}
        customerName={leadState.name}
        crmId={crmId}
        onConfirm={() => {
          const s = confirmRedirectService;
          setConfirmRedirectService(null);
          if (s) {
            router.push(`/leads/${leadState.id}/booking/${s}`);
          }
        }}
      />

      <SMSDispatchModal
        customerName={leadState.name}
        customerPhone={leadState.phone}
        bookingRef={crmId}
        isOpen={showSMSModal}
        onClose={() => setShowSMSModal(false)}
      />

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT COLUMN: Main Booking Highlights & Operational Tabs (lg:col-span-7) */}
        <div className="space-y-4 lg:col-span-7">
          {/* Booking Summary Hero Card */}
          {leadState.service_type && booking ? (
            <div className="relative overflow-hidden rounded-2xl border border-hairline bg-surface p-4 shadow-card">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    {ServiceIcon && <ServiceIcon size={16} />}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold capitalize text-ink">
                      {leadState.service_type} Booking Details
                    </h2>
                    <span className="font-mono text-xs text-accent font-semibold">Ref: {booking.booking_reference || crmId}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmRedirectService(leadState.service_type)}
                    className="btn-secondary btn-sm flex items-center gap-1 text-xs py-1 px-2.5 font-semibold"
                  >
                    <PencilLine size={12} />
                    <span>Edit Booking</span>
                  </button>
                  <div className="text-right">
                    <div className="text-[10px] text-ink-faint uppercase font-bold">Total Amount</div>
                    <div className="font-mono text-base font-bold text-accent">
                      ${typeof booking.total_amount === "number" ? booking.total_amount.toFixed(2) : booking.total_amount || "0.00"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Key Metrics Grid */}
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                {BOOKING_SUMMARY_FIELDS[leadState.service_type]?.map((f) => (
                  <div key={f.key} className="rounded-lg bg-surface-raised p-2 border border-hairline">
                    <span className="block text-[10px] font-medium text-ink-faint uppercase tracking-wider">{f.label}</span>
                    <span className="mt-0.5 block font-semibold text-ink truncate">
                      {String(booking[f.key] ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : leadState.service_type ? (
            <div className="rounded-2xl border border-accent/40 bg-surface p-4 text-xs shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    {ServiceIcon && <ServiceIcon size={16} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-ink capitalize">
                      {leadState.service_type} Service Selected
                    </p>
                    <p className="text-[11px] font-mono text-accent">CRMID: {crmId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmRedirectService(leadState.service_type)}
                  className="btn-primary btn-sm flex items-center gap-1.5"
                >
                  <PencilLine size={13} />
                  <span>Complete {leadState.service_type} Form</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-hairline bg-surface p-4 text-xs shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm text-ink">Choose Booking Modality</p>
                  <p className="text-ink-muted text-xs">Attach reservation specifics to this lead to generate and send custom authorization contracts.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmRedirectService("car")}
                    className="btn-secondary btn-sm flex items-center gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-semibold"
                  >
                    <Car size={13} />
                    <span>Car Rental</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRedirectService("hotel")}
                    className="btn-secondary btn-sm flex items-center gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-semibold"
                  >
                    <Hotel size={13} />
                    <span>Hotel Booking</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRedirectService("flight")}
                    className="btn-secondary btn-sm flex items-center gap-1.5 border-sky-500/40 text-sky-400 hover:bg-sky-500/10 font-semibold"
                  >
                    <Plane size={13} />
                    <span>Flight Ticket</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Workspace Tab Bar */}
          <div className="rounded-2xl border border-hairline bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-1 border-b border-hairline pb-2.5">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "overview"
                    ? "bg-accent text-white shadow-xs"
                    : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                }`}
              >
                <FileText size={13} />
                <span>Lead & Details</span>
              </button>

              <button
                onClick={() => setActiveTab("payments")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "payments"
                    ? "bg-accent text-white shadow-xs"
                    : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                }`}
              >
                <CreditCard size={13} />
                <span>Payments</span>
                {payments.length > 0 && (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
                    {payments.length}
                  </span>
                )}
              </button>

              {(canModify || modifications.length > 0) && (
                <button
                  onClick={() => setActiveTab("modifications")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeTab === "modifications"
                      ? "bg-accent text-white shadow-xs"
                      : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                  }`}
                >
                  <PencilLine size={13} />
                  <span>Modifications</span>
                  {modifications.length > 0 && (
                    <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
                      {modifications.length}
                    </span>
                  )}
                </button>
              )}

              {(canModify || cancellation) && (
                <button
                  onClick={() => setActiveTab("cancellation")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeTab === "cancellation"
                      ? "bg-accent text-white shadow-xs"
                      : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                  }`}
                >
                  <Ban size={13} />
                  <span>Cancellation</span>
                  {cancellation && (
                    <span className="rounded-full bg-red-500/20 px-1.5 py-0.2 text-[10px] font-mono text-danger">
                      Cancelled
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "history"
                    ? "bg-accent text-white shadow-xs"
                    : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                }`}
              >
                <Repeat size={13} />
                <span>Audit & History</span>
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
                  {history.length + 1}
                </span>
              </button>
            </div>

            {/* Tab 1: Lead & Custom Details */}
            {activeTab === "overview" && (
              <div className="mt-4 space-y-4 text-xs">
                {/* Lead Attributes */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-surface-raised p-2.5 border border-hairline">
                    <span className="text-[10px] uppercase font-semibold text-ink-faint">CRMID / Reference</span>
                    <span className="mt-1 block font-mono font-bold text-accent">{crmId}</span>
                  </div>

                  <div className="rounded-lg bg-surface-raised p-2.5 border border-hairline">
                    <span className="text-[10px] uppercase font-semibold text-ink-faint">Service Type</span>
                    <span className="mt-1 block font-semibold text-ink capitalize">{lead.service_type || "General"}</span>
                  </div>

                  <div className="rounded-lg bg-surface-raised p-2.5 border border-hairline">
                    <span className="text-[10px] uppercase font-semibold text-ink-faint">Duplicate Match</span>
                    <span className="mt-1 block font-medium">
                      {lead.is_duplicate ? `Yes (${lead.duplicate_override_reason ?? "Flagged"})` : "No (Unique)"}
                    </span>
                  </div>

                  <div className="rounded-lg bg-surface-raised p-2.5 border border-hairline">
                    <span className="text-[10px] uppercase font-semibold text-ink-faint">Channel / Source</span>
                    <span className="mt-1 block font-medium">{lead.source || "Direct Intake"}</span>
                  </div>
                </div>

                {/* Customer Contact Card */}
                <div className="rounded-xl border border-hairline bg-surface-raised p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink">
                      Customer Contact & Intake Profile
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowEditLeadModal(true)}
                      className="btn-secondary btn-sm text-[11px] py-1 px-2.5 flex items-center gap-1 font-semibold"
                    >
                      <PencilLine size={12} className="text-accent" />
                      <span>Edit Customer</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <span className="text-[10px] text-ink-faint">Customer Full Name</span>
                      <p className="font-semibold text-ink text-sm">{leadState.name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-faint">Phone Number</span>
                      <div className="mt-0.5">
                        <PIIField leadId={leadState.id} field="phone" maskedValue={leadState.phone} />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-faint">Email Address</span>
                      <div className="mt-0.5">
                        <PIIField leadId={leadState.id} field="email" maskedValue={leadState.email} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Custom Fields */}
                <LeadCustomFieldsPanel
                  leadId={lead.id}
                  initialCustomFields={lead.custom_fields}
                  canEdit={canEditCustomFields}
                />

                {/* External Embed Widget Details if applicable */}
                {lead.embed_widget_id && (
                  <div className="rounded-xl border border-hairline bg-surface-raised p-3 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                      Website Widget Enquiry Details
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-ink-faint">Landing URL</span>
                        <a href={lead.landing_page_url || "#"} target="_blank" rel="noreferrer" className="block truncate text-accent underline">
                          {lead.landing_page_url || "—"}
                        </a>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-faint">Visitor IP</span>
                        <span className="block font-mono">{lead.visitor_public_ip || "—"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Payments */}
            {activeTab === "payments" && (
              <div className="mt-4 space-y-4 text-xs">
                {canProcessPayment && (
                  <div className="mb-3">
                    <PaymentActions leadId={lead.id} />
                  </div>
                )}

                {/* Payment Overview Summary */}
                <div className="rounded-xl border border-hairline bg-surface-raised p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink">Payment Summary & Status</span>
                    <StatusBadge status={lead.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <span className="text-[10px] text-ink-faint uppercase font-semibold">Total Quoted</span>
                      <p className="font-mono text-base font-bold text-accent">
                        ${typeof booking?.total_amount === "number" ? booking.total_amount.toFixed(2) : booking?.total_amount || "0.00"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-faint uppercase font-semibold">Card Holder</span>
                      <p className="font-medium text-ink truncate">
                        {(booking?.card_holder_name as string) || lead.name || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-faint uppercase font-semibold">Card Display</span>
                      <p className="font-mono font-medium text-ink">
                        {(booking?.card_number as string) || "**** **** **** ****"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-faint uppercase font-semibold">Card Expiry</span>
                      <p className="font-mono text-ink">
                        {(booking?.card_expiry as string) || "MM/YY"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Transactions list */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Transaction Activity Log</span>
                  {payments.length === 0 ? (
                    <div className="rounded-xl border border-hairline p-4 text-center text-ink-muted bg-surface-sunken">
                      No online gateway payments processed yet. Use Status Workflow to authorize or charge card.
                    </div>
                  ) : (
                    <ul className="divide-y divide-hairline">
                      {payments.map((p) => (
                        <li key={p.id} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`badge text-[10px] font-bold uppercase ${
                                p.outcome === "charged"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {p.outcome}
                            </span>
                            <span className="font-mono font-bold">${p.total_amount.toFixed(2)}</span>
                            <span className="text-ink-faint font-mono">({p.card_display})</span>
                          </div>
                          <span className="text-[11px] text-ink-faint font-mono">
                            {formatDate(p.processed_at ?? p.created_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Modifications */}
            {activeTab === "modifications" && (
              <div className="mt-4 text-xs">
                <ModificationsPanel leadId={lead.id} canModify={canModify} history={modifications} />
              </div>
            )}

            {/* Tab 4: Cancellation */}
            {activeTab === "cancellation" && (
              <div className="mt-4 text-xs">
                <CancellationPanel leadId={lead.id} canCancel={canModify && !cancellation} cancellation={cancellation} />
              </div>
            )}

            {/* Tab 5: Audit & Status History (Always Complete Timeline) */}
            {activeTab === "history" && (
              <div className="mt-4 text-xs space-y-3">
                <ul className="space-y-2.5">
                  {/* Dynamic Status History Items */}
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between rounded-lg bg-surface-raised p-2.5 border border-hairline">
                      <div className="flex items-center gap-2.5">
                        <Repeat size={14} className="text-accent shrink-0" />
                        <span>
                          {h.from_status ? (
                            <span className="text-ink-muted">{formatStatus(h.from_status)} ➔ </span>
                          ) : null}
                          <span className="font-bold text-ink">{formatStatus(h.to_status)}</span>
                        </span>
                      </div>
                      <span className="text-[11px] text-ink-faint font-mono">
                        {formatDate(h.changed_at)}
                      </span>
                    </li>
                  ))}

                  {/* Initial Lead Ingestion Milestone */}
                  <li className="flex items-center justify-between rounded-lg bg-surface-raised/60 p-2.5 border border-hairline">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <div>
                        <span className="font-bold text-ink">Lead Intake Created</span>
                        <span className="text-ink-muted ml-1.5">
                          (Channel: {lead.source || "Direct Intake"}, Initial Status: {formatStatus(lead.status)})
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-ink-faint font-mono">
                      {formatDate(lead.created_at)}
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Action Center & Customer Authorization (lg:col-span-5) */}
        <div className="space-y-4 lg:col-span-5">
          {/* Status Workflow Action Card */}
          <div className="rounded-2xl border border-hairline bg-surface p-4 shadow-card">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-2.5 flex items-center justify-between">
              <span>Status Workflow Actions</span>
              <span className="font-mono text-[10px] text-accent font-bold">{transitions.length} available</span>
            </h2>
            <StatusActions leadId={lead.id} transitions={transitions} />
          </div>

          {/* Customer Authorization Link Card (if status is authorization pending) */}
          {lead.status === "authorization_pending" && (
            <div className="rounded-2xl border border-accent/40 bg-gradient-to-br from-surface to-accent-soft/20 p-4 shadow-card">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <ShieldCheck size={16} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-ink">Customer Authorization Required</h3>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    Share this secure consent link with the customer to collect formal approval.
                  </p>

                  <div className="mt-2.5 flex items-center gap-1.5">
                    <input
                      readOnly
                      value={authUrl}
                      className="input flex-1 py-1 px-2.5 font-mono text-[11px] text-ink-muted select-all truncate bg-surface"
                    />
                    <button
                      onClick={copyAuthLink}
                      className="btn-primary btn-sm px-2.5 py-1 text-xs shrink-0"
                    >
                      {copiedAuthLink ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lead Metadata Quick Card */}
          <div className="rounded-2xl border border-hairline bg-surface p-4 text-xs space-y-2 shadow-card">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
              System Audit Metadata
            </h2>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-ink-muted">Lead UUID</span>
                <span className="font-mono text-ink select-all">{leadState.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Assigned Agent</span>
                <span className="font-mono text-ink">{leadState.agent_id}</span>
              </div>
              {leadState.visitor_public_ip && (
                <div className="flex justify-between">
                  <span className="text-ink-muted">Client / Visitor IP</span>
                  <span className="font-mono text-accent font-semibold">{leadState.visitor_public_ip}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-ink-muted">Last Updated</span>
                <span className="font-mono text-ink">{formatDate(leadState.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
