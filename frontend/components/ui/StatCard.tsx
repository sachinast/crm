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
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            accent ? "bg-accent-soft text-accent" : "bg-surface-sunken text-ink-muted"
          }`}
        >
          <Icon size={16} strokeWidth={2} />
        </div>
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight text-ink">
        {value}
      </p>
      {hint && (
        <p className="text-xs text-ink-faint">
          {hint}
        </p>
      )}
    </div>
  );
}
