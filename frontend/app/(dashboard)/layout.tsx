import { redirect } from "next/navigation";

import LogoutButton from "@/components/ui/LogoutButton";
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
          <a href="/leads" className="hover:underline">
            Leads
          </a>
          <a href="/billing" className="hover:underline">
            Billing
          </a>
          <a href="/audit" className="hover:underline">
            Audit / QC
          </a>
          <a href="/future-credits" className="hover:underline">
            Future Credits
          </a>
          {showAdminLink && (
            <a href="/admin/users" className="hover:underline">
              Admin · Users
            </a>
          )}
        </nav>
        <LogoutButton />
      </aside>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
