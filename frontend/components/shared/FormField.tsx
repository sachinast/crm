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
    <label className={`block text-xs font-semibold text-slate-200 dark:text-slate-100 ${className}`}>
      <span className="block mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300 dark:text-slate-200">
        {label}
      </span>
      {children}
    </label>
  );
}
