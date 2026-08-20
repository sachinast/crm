import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string | number | React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  badge,
  breadcrumbs,
  actions,
  icon,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={b.label}>
                {i > 0 && <ChevronRight size={12} className="text-slate-500" />}
                {b.href ? (
                  <Link
                    href={b.href}
                    className="font-medium text-slate-400 transition-colors hover:text-white"
                  >
                    {b.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-300">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2a3652] bg-[#182136] text-[#d3ab5e] shadow-sm">
              {icon}
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
            {badge !== undefined && (
              <span className="inline-flex items-center rounded-full border border-[#2e3b5b] bg-[#182136] px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                {badge}
              </span>
            )}
          </div>
        </div>

        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </div>

      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
