/**
 * Format date string deterministically across SSR and browser to prevent hydration mismatch.
 */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

/**
 * Format date and time string deterministically across SSR and browser.
 */
export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

/**
 * Format currency amount with commas and 2 decimals.
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
