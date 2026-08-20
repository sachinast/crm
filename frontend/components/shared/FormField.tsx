"use client";

export default function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium text-[var(--ink)] ${className}`}>
      <span className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}
