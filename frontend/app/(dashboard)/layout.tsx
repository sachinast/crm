import { redirect } from "next/navigation";
import Link from "next/link";
import { Code2, ExternalLink, Flame } from "lucide-react";

import FloatingChatWidget from "@/components/messaging/FloatingChatWidget";
import HeaderClocks from "@/components/layout/HeaderClocks";
import LogoutButton from "@/components/ui/LogoutButton";
import NotificationBell from "@/components/ui/NotificationBell";
import ThemeToggle from "@/components/ui/ThemeToggle";
import SidebarNav, { type NavCategory, type NavItem } from "@/components/ui/SidebarNav";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // 1. Overview Category
  const overviewCategory: NavCategory = {
    id: "overview",
    title: "Overview",
    icon: "overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/messages", label: "Messages", icon: "messages" },
    ],
  };

  // 2. Booking & Pipeline Category
  const pipelineCategory: NavCategory = {
    id: "pipeline",
    title: "Bookings & Pipeline",
    icon: "pipeline",
    items: [
      { href: "/leads", label: "Leads Queue", icon: "leads" },
      { href: "/billing", label: "Billing & Accounts", icon: "billing" },
      { href: "/audit", label: "Audit / QC", icon: "audit" },
      { href: "/future-credits", label: "Future Credits", icon: "credits" },
    ],
  };

  // 3. Workspace & Operations Category
  const operationsCategory: NavCategory = {
    id: "operations",
    title: "Workspace & Staff",
    icon: "operations",
    items: [
      { href: "/attendance", label: "Attendance", icon: "attendance" },
      { href: "/files", label: "Files Manager", icon: "files" },
      { href: "/notes", label: "Personal Notes", icon: "notes" },
    ],
  };

  // 4. Administration & RBAC Category (Filtered by permissions)
  const adminItems: (NavItem | false)[] = [
    hasPermission(user, "admin.manage_users") && {
      href: "/admin/users",
      label: "User Accounts",
      icon: "users",
    },
    hasPermission(user, "admin.manage_roles", "admin.manage_users") && {
      href: "/admin/roles",
      label: "Roles & Permissions",
      icon: "roles",
    },
    hasPermission(user, "admin.manage_roles") && {
      href: "/admin/status-permissions",
      label: "Status Workflow",
      icon: "statusPermissions",
    },
    hasPermission(user, "audit.view") && {
      href: "/admin/audit",
      label: "Security Audit Log",
      icon: "log",
    },
    hasPermission(user, "admin.view_activity_log") && {
      href: "/admin/activity",
      label: "Activity History",
      icon: "activity",
    },
    hasPermission(user, "integrations.manage") && {
      href: "/admin/integrations",
      label: "Integrations & API",
      icon: "integrations",
    },
    hasPermission(user, "admin.view_settings") && {
      href: "/admin/settings",
      label: "System Settings",
      icon: "settings",
    },
    hasPermission(user, "admin.manage_custom_fields") && {
      href: "/admin/custom-fields",
      label: "Custom Fields",
      icon: "customFields",
    },
    hasPermission(user, "admin.manage_custom_fields") && {
      href: "/admin/masters",
      label: "Master Data",
      icon: "masters",
    },
  ];

  const filteredAdminItems = adminItems.filter((item): item is NavItem => Boolean(item));

  const adminCategory: NavCategory | null =
    filteredAdminItems.length > 0
      ? {
          id: "admin",
          title: "Administration",
          icon: "admin",
          defaultOpen: false,
          items: filteredAdminItems,
        }
      : null;

  const categories: NavCategory[] = [
    overviewCategory,
    pipelineCategory,
    operationsCategory,
    ...(adminCategory ? [adminCategory] : []),
  ];

  const apiDocsUrl = process.env.NEXT_PUBLIC_API_BASE_URL
    ? process.env.NEXT_PUBLIC_API_BASE_URL.replace("/api/v1", "/docs")
    : "http://localhost:8000/docs";

  return (
    <div className="flex min-h-screen bg-background text-ink">
      {/* Fixed Sticky Dark/Grey Slate Sidebar with Non-Hiding Bottom Section */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col justify-between border-r border-sidebar-hairline bg-sidebar-bg text-sidebar-ink z-30 select-none">
        {/* Fixed Header Section */}
        <div className="flex items-center gap-2.5 border-b border-sidebar-hairline p-4 shrink-0 bg-sidebar-bg">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white text-base font-bold shadow-md">
            P
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-wide text-sidebar-ink">CRM PRO</span>
              <span className="rounded-md border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">
                v1.0
              </span>
            </div>
            <p className="text-xs text-sidebar-ink-muted">Enterprise Workspace</p>
          </div>
        </div>

        {/* Scrollable Navigation Categories Section */}
        <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-2.5 custom-scrollbar">
          <SidebarNav categories={categories} />
        </div>

        {/* Fixed Bottom Section (NEVER Hidden on Screen) */}
        <div className="shrink-0 border-t border-sidebar-hairline bg-sidebar-sunken p-3 space-y-2.5 z-20">
          {/* Direct link to Interactive Swagger Docs */}
          <a
            href={apiDocsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-sidebar-hairline bg-sidebar-surface px-3 py-2 text-xs font-semibold text-accent transition-all hover:bg-sidebar-surface-raised"
          >
            <div className="flex items-center gap-2">
              <Code2 size={14} />
              <span>Swagger API Docs</span>
            </div>
            <ExternalLink size={12} />
          </a>

          {/* User Profile & Sign Out Bar */}
          <div className="flex items-center justify-between rounded-xl border border-sidebar-hairline bg-sidebar-surface p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-soft font-mono text-xs font-bold text-accent">
                {initials(user.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-sidebar-ink">{user.name}</p>
                <p className="truncate text-[11px] capitalize text-sidebar-ink-muted">
                  {user.role.replace(/_/g, " ")}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-header-hairline bg-header-bg/95 backdrop-blur-md px-6 py-2.5">
          <div className="flex items-center gap-3">
            <Link
              href="/leads/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-accent-hover active:scale-95 transition-all"
            >
              <Flame size={14} className="text-amber-300 fill-amber-400/30 animate-pulse" />
              <span>+ New Lead</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <HeaderClocks />
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-6 py-6 md:px-10 md:py-8 min-w-0">{children}</main>
      </div>

      <FloatingChatWidget currentUserId={user.id} />
    </div>
  );
}
