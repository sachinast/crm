"use client";

export default function Field({
  label,
  children,
  className = "",
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`block min-w-0 w-full text-sm font-medium text-[var(--ink)] ${className}`}>
      <span className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)] truncate">
        {label}
        {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
