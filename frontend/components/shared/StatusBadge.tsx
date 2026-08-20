"use client";

import { Flame } from "lucide-react";
import { statusBadgeClass } from "@/lib/status-colors";
import { formatStatus, STATUS_COLOR_HINTS } from "@/lib/status-meta";

export default function StatusBadge({ status }: { status: string }) {
  const colorHint = STATUS_COLOR_HINTS[status] ?? "grey";
  const formatted = formatStatus(status);
  const colorClasses = statusBadgeClass(colorHint);
  const normalized = (status || "").toLowerCase();
  const isHot = normalized === "new" || normalized === "authorization_pending" || normalized === "pending";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide capitalize transition-colors ${colorClasses}`}
    >
      {isHot ? (
        <Flame size={12} className="text-amber-500 fill-amber-500/40 animate-pulse shrink-0" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      )}
      {formatted}
    </span>
  );
}
