import type { LucideIcon } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{
            background: accent ? "var(--accent-soft)" : "var(--background)",
            color: accent ? "var(--accent)" : "var(--ink-muted)",
          }}
        >
          <Icon size={16} strokeWidth={2} />
        </div>
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
        {value}
      </p>
      {hint && (
        <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
