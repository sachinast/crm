import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "@/components/ui/LogoutButton";
import NotificationBell from "@/components/ui/NotificationBell";
import { getCurrentUser, isAdminRole } from "@/lib/auth";

/**
 * Role-aware dashboard shell. Session is validated against the backend
 * (getCurrentUser calls GET /users/me), not just inferred from cookie
 * presence — proxy.ts does the cheap cookie-presence redirect for UX, this
 * is the actual authority. See TECHNICAL_SPEC.md §7/§8.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const showAdminLink = isAdminRole(user.role);

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r p-4 text-sm">
        <div className="mb-6">
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-neutral-500">{user.role}</p>
        </div>
        <nav className="flex flex-col gap-2">
          <Link href="/leads" className="hover:underline">
            Leads
          </Link>
          <Link href="/billing" className="hover:underline">
            Billing
          </Link>
          <Link href="/audit" className="hover:underline">
            Audit / QC
          </Link>
          <Link href="/future-credits" className="hover:underline">
            Future Credits
          </Link>
          {showAdminLink && (
            <>
              <Link href="/admin/users" className="hover:underline">
                Admin · Users
              </Link>
              <Link href="/admin/audit" className="hover:underline">
                Admin · Audit Log
              </Link>
              <Link href="/admin/integrations" className="hover:underline">
                Admin · Integrations
              </Link>
            </>
          )}
        </nav>
        <LogoutButton />
      </aside>
      <div className="flex-1">
        <header className="flex justify-end border-b p-3">
          <NotificationBell />
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
