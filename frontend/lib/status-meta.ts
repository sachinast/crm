// PRD §6.1 Status Reference Table — shared between the dashboard, lead list,
// and lead detail pages so the status->color mapping lives in exactly one
// place (previously duplicated inline on the lead detail page).
export const STATUS_COLOR_HINTS: Record<string, string> = {
  authorization_pending: "grey",
  client_approved: "blue",
  transferred_to_billing: "purple",
  card_charged: "green",
  card_declined: "red",
  tag_change_dep: "yellow",
  tag_cr_booking: "orange",
  tag_auditor: "cyan",
  qc_done: "dark_green",
  tag_refund: "red",
  tag_rdr: "black",
  tag_chargeback: "black",
};

export function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}
