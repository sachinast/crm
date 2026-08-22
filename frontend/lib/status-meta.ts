// Status Reference Table — shared between the dashboard, lead list,
// and lead detail pages so the status->color mapping is consistent.
export const STATUS_COLOR_HINTS: Record<string, string> = {
  authorization_pending: "amber",
  client_approved: "blue",
  transferred_to_billing: "purple",
  card_charged: "emerald",
  card_declined: "rose",
  tag_change_dep: "indigo",
  tag_cr_booking: "orange",
  tag_auditor: "teal",
  qc_done: "cyan",
  tag_refund: "fuchsia",
  tag_rdr: "slate",
  tag_chargeback: "dark_red",
  dropped: "faint_slate",
  booked_shared_client: "sky",
  // Common operational fallbacks
  new: "blue",
  pending: "amber",
  confirmed: "emerald",
  cancelled: "rose",
  completed: "emerald",
};

export function formatStatus(status: string): string {
  return status
    .replace(/^tag_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
