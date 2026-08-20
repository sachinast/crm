"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plane,
  Hotel,
  Car,
  CreditCard,
  Repeat,
  PencilLine,
  Ban,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Calendar,
  User,
  Clock,
  Globe,
  FileText,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Info,
  Check,
} from "lucide-react";

import RevealField from "@/components/pii/RevealField";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatStatus, STATUS_COLOR_HINTS } from "@/lib/status-meta";

import StatusActions from "./StatusActions";
import PaymentActions from "./PaymentActions";
import LeadCustomFieldsPanel from "./LeadCustomFieldsPanel";
import ModificationsPanel from "./ModificationsPanel";
import CancellationPanel from "./CancellationPanel";

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

const BOOKING_SUMMARY_FIELDS: Record<string, { key: string; label: string }[]> = {
  car: [
    { key: "car_provider", label: "Provider" },
    { key: "vehicle_type", label: "Vehicle Category" },
    { key: "pickup_location", label: "Pick-up Location" },
    { key: "return_location", label: "Return Location" },
  ],
  hotel: [
    { key: "hotel_name", label: "Hotel Property" },
    { key: "room_type", label: "Room Category" },
    { key: "check_in_date", label: "Check-in Date" },
    { key: "check_out_date", label: "Check-out Date" },
  ],
  flight: [
    { key: "airline", label: "Airline Carrier" },
    { key: "pnr", label: "PNR Code" },
    { key: "origin", label: "Origin Airport" },
    { key: "destination", label: "Destination Airport" },
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
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "modifications" | "cancellation" | "history">("overview");
  const [copiedAuthLink, setCopiedAuthLink] = useState(false);

  const ServiceIcon = lead.service_type ? SERVICE_ICON[lead.service_type] : null;
  const authUrl = typeof window !== "undefined" ? `${window.location.origin}/authorize/${lead.id}` : `/authorize/${lead.id}`;

  const copyAuthLink = () => {
    navigator.clipboard.writeText(authUrl);
    setCopiedAuthLink(true);
    setTimeout(() => setCopiedAuthLink(false), 2000);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Breadcrumb & Executive Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--hairline)] pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--ink-faint)]">
            <Link href="/leads" className="font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors">
              Leads
            </Link>
            <span>/</span>
            <span className="font-mono">{lead.id.slice(0, 8)}...</span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">{lead.name}</h1>
            <StatusBadge status={lead.status} />
          </div>

          {/* Masked PII Header Chips */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--ink-muted)]">
            <div className="flex items-center gap-1 rounded-md bg-[var(--surface)] px-2 py-0.5 border border-[var(--hairline)]">
              <RevealField leadId={lead.id} field="phone" maskedValue={lead.phone} />
            </div>
            <span>•</span>
            <div className="flex items-center gap-1 rounded-md bg-[var(--surface)] px-2 py-0.5 border border-[var(--hairline)]">
              <RevealField leadId={lead.id} field="email" maskedValue={lead.email} />
            </div>
            <span>•</span>
            <span className="text-[11px] text-[var(--ink-faint)]">
              Created {new Date(lead.created_at).toLocaleDateString()} {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2">
          {lead.status === "authorization_pending" && (
            <button
              onClick={copyAuthLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-ink)] transition-all hover:brightness-95"
            >
              {copiedAuthLink ? <Check size={13} className="text-[var(--accent)]" /> : <Copy size={13} />}
              <span>{copiedAuthLink ? "Link Copied!" : "Copy Customer Auth Link"}</span>
            </button>
          )}

          {lead.service_type && booking && (
            <Link
              href={`/leads/${lead.id}/booking/${lead.service_type}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] transition-all hover:bg-[var(--accent-soft)] hover:border-[var(--accent)]"
            >
              <PencilLine size={13} className="text-[var(--accent)]" />
              <span>Edit Booking</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main 2-Column Responsive Layout (No Scroll viewport optimization) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT COLUMN: Main Booking Highlights & Operational Tabs (lg:col-span-7) */}
        <div className="space-y-4 lg:col-span-7">
          {/* Booking Summary Hero Card */}
          {lead.service_type && booking ? (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                    {ServiceIcon && <ServiceIcon size={16} />}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold capitalize text-[var(--ink)]">
                      {lead.service_type} Booking
                    </h2>
                    <span className="font-mono text-xs text-[var(--ink-faint)]">Ref: {booking.booking_reference}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-[var(--ink-faint)]">Total Amount</div>
                  <div className="font-mono text-base font-bold text-[var(--accent)]">
                    ${typeof booking.total_amount === "number" ? booking.total_amount.toFixed(2) : booking.total_amount}
                  </div>
                </div>
              </div>

              {/* Booking Key Metrics Grid */}
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                {BOOKING_SUMMARY_FIELDS[lead.service_type]?.map((f) => (
                  <div key={f.key} className="rounded-lg bg-[var(--surface-raised)] p-2 border border-[var(--hairline)]">
                    <span className="block text-[10px] font-medium text-[var(--ink-faint)] uppercase tracking-wider">{f.label}</span>
                    <span className="mt-0.5 block font-semibold text-[var(--ink)] truncate">
                      {String(booking[f.key] ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : lead.service_type ? (
            <div className="rounded-2xl border border-dashed border-[var(--accent)] bg-[var(--accent-soft)]/40 p-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--accent-ink)]">
                    Service type selected: <span className="capitalize">{lead.service_type}</span>
                  </p>
                  <p className="text-[11px] text-[var(--ink-muted)]">Booking details have not been finalized yet.</p>
                </div>
                <Link href={`/leads/${lead.id}/booking/${lead.service_type}`} className="btn-primary btn-sm">
                  Complete {lead.service_type} Form
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4 text-xs">
              <p className="text-[var(--ink-muted)]">
                No service type chosen yet.{" "}
                <Link href="/leads/new" className="font-semibold text-[var(--accent)] underline">
                  Continue intake flow
                </Link>
              </p>
            </div>
          )}

          {/* Interactive Workspace Tab Bar */}
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-1 border-b border-[var(--hairline)] pb-2.5">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "overview"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--ink-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]"
                }`}
              >
                <FileText size={13} />
                <span>Lead & Details</span>
              </button>

              <button
                onClick={() => setActiveTab("payments")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "payments"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--ink-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]"
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
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "text-[var(--ink-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]"
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
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "text-[var(--ink-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]"
                  }`}
                >
                  <Ban size={13} />
                  <span>Cancellation</span>
                  {cancellation && (
                    <span className="rounded-full bg-red-500/20 px-1.5 py-0.2 text-[10px] font-mono text-red-500">
                      Cancelled
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === "history"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--ink-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]"
                }`}
              >
                <Repeat size={13} />
                <span>Audit & History</span>
                {history.length > 0 && (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
                    {history.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab 1: Lead & Custom Details */}
            {activeTab === "overview" && (
              <div className="mt-4 space-y-4 text-xs">
                {/* Lead Attributes */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-[var(--surface-raised)] p-2.5 border border-[var(--hairline)]">
                    <span className="text-[10px] uppercase font-semibold text-[var(--ink-faint)]">Duplicate Match</span>
                    <span className="mt-1 block font-medium">
                      {lead.is_duplicate ? `Yes (${lead.duplicate_override_reason ?? "Flagged"})` : "No (Unique)"}
                    </span>
                  </div>

                  <div className="rounded-lg bg-[var(--surface-raised)] p-2.5 border border-[var(--hairline)]">
                    <span className="text-[10px] uppercase font-semibold text-[var(--ink-faint)]">Channel / Source</span>
                    <span className="mt-1 block font-medium">{lead.source || "Direct Intake"}</span>
                  </div>

                  <div className="rounded-lg bg-[var(--surface-raised)] p-2.5 border border-[var(--hairline)]">
                    <span className="text-[10px] uppercase font-semibold text-[var(--ink-faint)]">Assigned Agent</span>
                    <span className="mt-1 block font-mono">{lead.agent_id.slice(0, 8)}...</span>
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
                  <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface-raised)] p-3 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                      Website Widget Enquiry Details
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-[var(--ink-faint)]">Landing URL</span>
                        <a href={lead.landing_page_url || "#"} target="_blank" rel="noreferrer" className="block truncate text-[var(--accent)] underline">
                          {lead.landing_page_url || "—"}
                        </a>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--ink-faint)]">Visitor IP</span>
                        <span className="block font-mono">{lead.visitor_public_ip || "—"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Payments */}
            {activeTab === "payments" && (
              <div className="mt-4 space-y-3 text-xs">
                {canProcessPayment && (
                  <div className="mb-3">
                    <PaymentActions leadId={lead.id} />
                  </div>
                )}

                {payments.length === 0 ? (
                  <p className="py-4 text-center text-[var(--ink-muted)]">No payments recorded for this lead yet.</p>
                ) : (
                  <ul className="divide-y divide-[var(--hairline)]">
                    {payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`badge text-[10px] font-bold uppercase ${
                              p.outcome === "charged"
                                ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 [data-theme=light]:bg-emerald-50 [data-theme=light]:text-emerald-700 [data-theme=light]:border-emerald-200"
                                : "bg-rose-950/40 text-rose-400 border border-rose-800/40 [data-theme=light]:bg-rose-50 [data-theme=light]:text-rose-700 [data-theme=light]:border-rose-200"
                            }`}
                          >
                            {p.outcome}
                          </span>
                          <span className="font-mono font-bold">${p.total_amount.toFixed(2)}</span>
                          <span className="text-[var(--ink-faint)] font-mono">({p.card_display})</span>
                        </div>
                        <span className="text-[11px] text-[var(--ink-faint)]">
                          {new Date(p.processed_at ?? p.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
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

            {/* Tab 5: Status History */}
            {activeTab === "history" && (
              <div className="mt-4 text-xs">
                {history.length === 0 ? (
                  <p className="py-4 text-center text-[var(--ink-muted)]">No status changes recorded yet.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {history.map((h) => (
                      <li key={h.id} className="flex items-center justify-between rounded-lg bg-[var(--surface-raised)] p-2.5 border border-[var(--hairline)]">
                        <div className="flex items-center gap-2">
                          <Repeat size={13} className="text-[var(--accent)] shrink-0" />
                          <span>
                            {h.from_status ? (
                              <span className="text-[var(--ink-faint)]">{formatStatus(h.from_status)} ➔ </span>
                            ) : null}
                            <span className="font-semibold text-[var(--ink)]">{formatStatus(h.to_status)}</span>
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--ink-faint)]">
                          {new Date(h.changed_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Action Center & Customer Authorization (lg:col-span-5) */}
        <div className="space-y-4 lg:col-span-5">
          {/* Status Workflow Action Card */}
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-faint)] mb-2.5 flex items-center justify-between">
              <span>Status Workflow Actions</span>
              <span className="font-mono text-[10px] text-[var(--accent)]">{transitions.length} available</span>
            </h2>
            <StatusActions leadId={lead.id} transitions={transitions} />
          </div>

          {/* Customer Authorization Link Card (if status is authorization pending) */}
          {lead.status === "authorization_pending" && (
            <div className="rounded-2xl border border-[var(--accent)]/40 bg-gradient-to-br from-[var(--surface)] to-[var(--accent-soft)]/20 p-4 shadow-sm">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                  <ShieldCheck size={16} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-[var(--ink)]">Customer Authorization Required</h3>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                    Share this secure consent link with the customer to collect formal approval.
                  </p>

                  <div className="mt-2.5 flex items-center gap-1.5">
                    <input
                      readOnly
                      value={authUrl}
                      className="input flex-1 py-1 px-2.5 font-mono text-[11px] text-[var(--ink-muted)] select-all truncate bg-[var(--surface)]"
                    />
                    <button
                      onClick={copyAuthLink}
                      className="btn-primary btn-sm shrink-0"
                    >
                      {copiedAuthLink ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedAuthLink ? "Copied" : "Copy"}</span>
                    </button>
                    <a
                      href={authUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary btn-sm p-1.5 shrink-0"
                      title="Open in new tab"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Lead Contact & Verification Card */}
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4 shadow-sm text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-faint)] mb-3">
              Lead Security & Audit
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1 border-b border-[var(--hairline)]">
                <span className="text-[var(--ink-faint)]">PII Protection</span>
                <span className="font-semibold text-emerald-500 flex items-center gap-1">
                  <ShieldCheck size={12} /> Masked & Audited
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--hairline)]">
                <span className="text-[var(--ink-faint)]">Status Lifecycle</span>
                <span className="font-semibold text-[var(--ink)]">{formatStatus(lead.status)}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--hairline)]">
                <span className="text-[var(--ink-faint)]">Last Modified</span>
                <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                  {new Date(lead.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
