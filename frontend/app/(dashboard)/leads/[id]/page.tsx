import { notFound } from "next/navigation";

import { ApiError, apiFetch } from "@/lib/api-client";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

import LeadDetailWorkspace from "./LeadDetailWorkspace";

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

async function fetchLead(id: string): Promise<LeadDetail | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    return await apiFetch<LeadDetail>(`/leads/${id}`, { token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

async function fetchBooking(id: string, serviceType: string): Promise<BookingSummary | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    return await apiFetch<BookingSummary>(`/leads/${id}/${serviceType}-booking`, { token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

async function fetchAvailableTransitions(id: string): Promise<Transition[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<Transition[]>(`/leads/${id}/available-transitions`, { token });
  } catch {
    return [];
  }
}

async function fetchStatusHistory(id: string): Promise<StatusHistoryEntry[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<StatusHistoryEntry[]>(`/leads/${id}/status-history`, { token });
  } catch {
    return [];
  }
}

async function fetchPayments(id: string): Promise<PaymentEntry[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<PaymentEntry[]>(`/leads/${id}/payments`, { token });
  } catch {
    return [];
  }
}

async function fetchModifications(id: string): Promise<ModificationEntry[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    return await apiFetch<ModificationEntry[]>(`/leads/${id}/modifications`, { token });
  } catch {
    return [];
  }
}

async function fetchCancellation(id: string): Promise<CancellationEntry | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    return await apiFetch<CancellationEntry>(`/leads/${id}/cancellation`, { token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    return null;
  }
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await fetchLead(id);
  if (!lead) notFound();

  const [booking, allTransitions, history, payments, modifications, cancellation, currentUser] = await Promise.all([
    lead.service_type ? fetchBooking(id, lead.service_type) : Promise.resolve(null),
    fetchAvailableTransitions(id),
    fetchStatusHistory(id),
    fetchPayments(id),
    fetchModifications(id),
    fetchCancellation(id),
    getCurrentUser(),
  ]);

  const canModify =
    currentUser !== null &&
    hasPermission(currentUser, "modifications.manage", "cancellations.manage") &&
    booking !== null;

  const canProcessPayment = allTransitions.some((t) => t.status === "card_charged" || t.status === "card_declined");
  const transitions = allTransitions.filter((t) => t.status !== "card_charged" && t.status !== "card_declined");
  const canEditCustomFields = hasPermission(currentUser, "leads.create");

  return (
    <LeadDetailWorkspace
      lead={lead}
      booking={booking}
      transitions={transitions}
      history={history}
      payments={payments}
      modifications={modifications}
      cancellation={cancellation}
      canModify={canModify}
      canProcessPayment={canProcessPayment}
      canEditCustomFields={canEditCustomFields}
    />
  );
}
