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
      className={`rounded-2xl border border-[#232e47] bg-[#131a2b] shadow-sm overflow-hidden ${className}`}
    >
      {headerContent && (
        <div className="border-b border-[#232e47] bg-[#182136]/50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
          {headerContent}
        </div>
      )}

      <div className="overflow-x-auto">
        {children}
      </div>

      {footerContent && (
        <div className="border-t border-[#232e47] bg-[#182136]/30 px-4 py-3 text-xs text-slate-400">
          {footerContent}
        </div>
      )}
    </div>
  );
}
