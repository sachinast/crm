import React from "react";

interface DataTableCardProps {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  className?: string;
}

export default function DataTableCard({
  children,
  headerContent,
  footerContent,
  className = "",
}: DataTableCardProps) {
  return (
    <div
      className={`card p-0 overflow-hidden ${className}`}
    >
      {headerContent && (
        <div className="border-b border-[var(--hairline)] bg-[var(--surface-raised)] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
          {headerContent}
        </div>
      )}

      <div className="overflow-x-auto">
        {children}
      </div>

      {footerContent && (
        <div className="border-t border-[var(--hairline)] bg-[var(--surface-raised)] px-4 py-3 text-sm text-[var(--ink-muted)]">
          {footerContent}
        </div>
      )}
    </div>
  );
}
