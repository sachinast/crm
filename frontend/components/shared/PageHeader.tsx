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
          <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={b.label}>
                {i > 0 && <ChevronRight size={12} className="text-[var(--ink-faint)]" />}
                {b.href ? (
                  <Link
                    href={b.href}
                    className="font-medium text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
                  >
                    {b.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-[var(--ink)]">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--hairline)] bg-[var(--surface-raised)] text-[var(--accent)] shadow-xs">
              {icon}
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">{title}</h1>
            {badge !== undefined && (
              <span className="inline-flex items-center rounded-full border border-[var(--hairline)] bg-[var(--surface-raised)] px-2.5 py-0.5 text-xs font-semibold text-[var(--ink-muted)]">
                {badge}
              </span>
            )}
          </div>
        </div>

        {subtitle && <p className="mt-1 text-sm text-[var(--ink-muted)]">{subtitle}</p>}
      </div>

      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
