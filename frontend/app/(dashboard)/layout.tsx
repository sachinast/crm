import { redirect } from "next/navigation";

import FloatingChatWidget from "@/components/messaging/FloatingChatWidget";
import LogoutButton from "@/components/ui/LogoutButton";
import NotificationBell from "@/components/ui/NotificationBell";
import SidebarNav from "@/components/ui/SidebarNav";
import { getCurrentUser, isAdminRole } from "@/lib/auth";

const BASE_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" as const },
  { href: "/messages", label: "Messages", icon: "messages" as const },
  { href: "/leads", label: "Leads", icon: "leads" as const },
  { href: "/billing", label: "Billing", icon: "billing" as const },
  { href: "/audit", label: "Audit / QC", icon: "audit" as const },
  { href: "/future-credits", label: "Future Credits", icon: "credits" as const },
];

const ADMIN_NAV = [
  { href: "/admin/users", label: "Users", icon: "users" as const },
  { href: "/admin/audit", label: "Audit Log", icon: "log" as const },
  { href: "/admin/integrations", label: "Integrations", icon: "integrations" as const },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

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

  const showAdminNav = isAdminRole(user.role);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      <aside
        className="flex w-60 shrink-0 flex-col justify-between px-4 py-6"
        style={{ background: "var(--navy)" }}
      >
        <div>
          <div className="mb-8 flex items-center gap-2 px-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
              style={{ background: "var(--accent)", color: "var(--navy)" }}
            >
              T
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide" style={{ color: "#f3f0e6" }}>
                Travel CRM
              </p>
              <p className="text-[11px]" style={{ color: "#7d84a0" }}>
                Booking Management
              </p>
            </div>
          </div>

          <SidebarNav items={BASE_NAV} />

          {showAdminNav && (
            <>
              <p className="section-label mb-1 mt-6 px-3" style={{ color: "#6c7288" }}>
                Admin
              </p>
              <SidebarNav items={ADMIN_NAV} />
            </>
          )}
        </div>

        <div className="border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="mb-3 flex items-center gap-2.5 px-1">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
            >
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" style={{ color: "#f3f0e6" }}>
                {user.name}
              </p>
              <p className="truncate text-[11px] capitalize" style={{ color: "#7d84a0" }}>
                {user.role.replace(/_/g, " ")}
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header
          className="flex items-center justify-end border-b px-6 py-3"
          style={{ borderColor: "var(--hairline)", background: "var(--surface)" }}
        >
          <NotificationBell />
        </header>
        <main className="flex-1 px-6 py-6 md:px-10 md:py-8">{children}</main>
      </div>

      <FloatingChatWidget currentUserId={user.id} />
    </div>
  );
}
