/**
 * Role-aware dashboard shell. Session/role checks land in Phase 1 (see
 * docs/TECHNICAL_SPEC.md §7) — this is the structural placeholder.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r p-4 text-sm">
        <nav className="flex flex-col gap-2">
          <a href="/leads">Leads</a>
          <a href="/billing">Billing</a>
          <a href="/audit">Audit / QC</a>
          <a href="/future-credits">Future Credits</a>
          <a href="/admin/users">Admin · Users</a>
        </nav>
      </aside>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
