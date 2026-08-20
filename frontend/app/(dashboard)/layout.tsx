import { redirect } from "next/navigation";
import { Code2, ExternalLink } from "lucide-react";

import FloatingChatWidget from "@/components/messaging/FloatingChatWidget";
import HeaderClocks from "@/components/layout/HeaderClocks";
import LogoutButton from "@/components/ui/LogoutButton";
import NotificationBell from "@/components/ui/NotificationBell";
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
    <div className="flex min-h-screen bg-[#0a0e1a] text-slate-100">
      {/* Fixed Sticky Sidebar with Non-Hiding Bottom Section */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col justify-between border-r border-[#232e47] bg-[#101728] z-30 select-none">
        {/* Fixed Header Section */}
        <div className="flex items-center gap-2.5 border-b border-[#232e47]/70 p-4 shrink-0 bg-[#101728]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#d3ab5e] to-[#b88c3e] text-base font-bold text-slate-950 shadow-md">
            P
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-wide text-white">CRM PRO</span>
              <span className="rounded-md border border-[#d3ab5e]/30 bg-[#d3ab5e]/10 px-1.5 py-0.2 text-[9px] font-bold text-[#d3ab5e]">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Enterprise Workspace</p>
          </div>
        </div>

        {/* Scrollable Navigation Categories Section */}
        <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-2.5 custom-scrollbar">
          <SidebarNav categories={categories} />
        </div>

        {/* Fixed Bottom Section (NEVER Hidden on Screen) */}
        <div className="shrink-0 border-t border-[#232e47] bg-[#0c1220] p-3 space-y-2.5 z-20">
          {/* Direct link to Interactive Swagger Docs */}
          <a
            href={apiDocsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-[#2a3652] bg-[#182136] px-3 py-2 text-xs font-semibold text-[#d3ab5e] transition-all hover:border-[#d3ab5e] hover:bg-[#1f2b47]"
          >
            <div className="flex items-center gap-2">
              <Code2 size={14} />
              <span>Swagger API Docs</span>
            </div>
            <ExternalLink size={12} />
          </a>

          {/* User Profile & Sign Out Bar */}
          <div className="flex items-center justify-between rounded-xl border border-[#232e47] bg-[#131a2b] p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d3ab5e]/40 bg-[#182136] font-mono text-xs font-bold text-[#d3ab5e]">
                {initials(user.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-white">{user.name}</p>
                <p className="truncate text-[10px] capitalize text-slate-400">
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
        <header className="sticky top-0 z-20 flex items-center justify-end gap-3 border-b border-[#232e47] bg-[#0d1220]/90 backdrop-blur-md px-6 py-2.5">
          <HeaderClocks />
          <NotificationBell />
        </header>

        <main className="flex-1 px-6 py-6 md:px-10 md:py-8 min-w-0">{children}</main>
      </div>

      <FloatingChatWidget currentUserId={user.id} />
    </div>
  );
}
