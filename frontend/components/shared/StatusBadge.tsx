"use client";

import { statusBadgeStyle } from "@/lib/status-colors";
import { formatStatus, STATUS_COLOR_HINTS } from "@/lib/status-meta";

export default function StatusBadge({ status }: { status: string }) {
  const colorHint = STATUS_COLOR_HINTS[status] ?? "grey";
  const formatted = formatStatus(status);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide capitalize transition-colors"
      style={statusBadgeStyle(colorHint)}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {formatted}
    </span>
  );
}
