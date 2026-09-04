"use client";

import React, { useState, useEffect } from "react";
import {
  Gauge,
  Users,
  CreditCard,
  ShieldCheck,
  Gift,
  UserCog,
  ScrollText,
  Plug,
  MessageCircle,
  KeyRound,
  Workflow,
  History,
  Sliders,
  ListPlus,
  Database,
  Clock,
  FolderOpen,
  StickyNote,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Layers,
  Sparkles,
  Compass,
  ShieldAlert,
  Flame,
  FileSpreadsheet,
  Headphones,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useUnreadMessageCount } from "@/lib/messaging-client";

export const CATEGORY_ICONS = {
  overview: Compass,
  pipeline: Layers,
  operations: Briefcase,
  admin: ShieldAlert,
} as const;

export const ICONS = {
  dashboard: Gauge,
  newLead: Flame,
  leads: Users,
  billing: CreditCard,
  audit: ShieldCheck,
  credits: Gift,
  users: UserCog,
  log: ScrollText,
  integrations: Plug,
  messages: MessageCircle,
  roles: KeyRound,
  statusPermissions: Workflow,
  activity: History,
  settings: Sliders,
  customFields: ListPlus,
  masters: Database,
  addons: Sparkles,
  reports: FileSpreadsheet,
  attendance: Clock,
  files: FolderOpen,
  notes: StickyNote,
  cs: Headphones,
  qc: ShieldCheck,
  chargeback: AlertTriangle,
  changes: RefreshCw,
} as const;

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: string;
  badgeVariant?: "hot" | "danger" | "accent";
}

export interface NavCategory {
  id: string;
  title: string;
  icon?: keyof typeof CATEGORY_ICONS;
  defaultOpen?: boolean;
  items: NavItem[];
}

export default function SidebarNav({
  categories,
  topItems = [],
}: {
  categories: NavCategory[];
  topItems?: NavItem[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const unreadMessages = useUnreadMessageCount();

  const queryString = searchParams?.toString() ?? "";
  const currentFullPath = queryString ? `${pathname}?${queryString}` : pathname;

  // Find category ID containing active path
  const activeCategoryId = categories.find((cat) =>
    cat.items.some((item) =>
      item.href.includes("?")
        ? currentFullPath === item.href
        : item.href === "/dashboard"
          ? pathname === item.href
          : pathname.startsWith(item.href) && !queryString,
    ),
  )?.id;

  // Track open state for categories (Administration default collapsed unless actively navigating inside it)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    categories.forEach((cat) => {
      const isDefaultOpen =
        cat.defaultOpen !== undefined ? cat.defaultOpen : cat.id !== "admin";
      initialState[cat.id] = isDefaultOpen;
    });
    return initialState;
  });

  // Ensure active category is expanded when route changes
  useEffect(() => {
    if (activeCategoryId) {
      setOpenCategories((prev) => ({ ...prev, [activeCategoryId]: true }));
    }
  }, [activeCategoryId]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  return (
    <div className="space-y-3">
      {/* Standalone Direct Top Items (e.g. Direct Dashboard Link) */}
      {topItems.length > 0 && (
        <nav className="flex flex-col gap-1 pb-2 border-b border-sidebar-hairline">
          {topItems.map((item) => {
            const Icon = ICONS[item.icon];
            const isActive = item.href.includes("?")
              ? currentFullPath === item.href
              : item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href) && !queryString;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-accent text-white font-bold shadow-md"
                    : "text-sidebar-ink-muted hover:bg-sidebar-surface hover:text-sidebar-ink"
                }`}
              >
                <Icon
                  size={17}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className={isActive ? "text-white" : "text-sidebar-ink-faint group-hover:text-sidebar-ink"}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Collapsible Categories */}
      {categories.map((category) => {
        if (category.items.length === 0) return null;

        const isOpen = openCategories[category.id] ?? true;
        const hasActiveChild = category.items.some((item) =>
          item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href),
        );
        const CategoryIcon = category.icon ? CATEGORY_ICONS[category.icon] : null;

        return (
          <div
            key={category.id}
            className="space-y-1"
          >
            {/* Collapsible Category Header Button */}
            <button
              type="button"
              onClick={() => toggleCategory(category.id)}
              className="flex w-full items-center justify-between px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-sidebar-ink-faint transition-colors hover:text-sidebar-ink"
            >
              <div className="flex items-center gap-2">
                {CategoryIcon && (
                  <CategoryIcon
                    size={14}
                    className={hasActiveChild ? "text-accent" : "text-sidebar-ink-faint"}
                  />
                )}
                <span className={hasActiveChild ? "text-sidebar-ink font-extrabold" : "text-sidebar-ink-muted"}>
                  {category.title}
                </span>
                {hasActiveChild && (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                )}
              </div>

              <div className="flex items-center gap-1 text-sidebar-ink-faint">
                <span className="font-mono text-[10px] font-semibold text-sidebar-ink-muted">
                  {category.items.length}
                </span>
                {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </div>
            </button>

            {/* Collapsible Children Item List */}
            {isOpen && (
              <nav className="flex flex-col gap-0.5 animate-fadeIn">
                {category.items.map((item) => {
                  const Icon = ICONS[item.icon];
                  const isActive = item.href.includes("?")
                    ? currentFullPath === item.href
                    : item.href === "/dashboard"
                      ? pathname === item.href
                      : pathname.startsWith(item.href) && !queryString;
                  const unreadBadge =
                    item.icon === "messages" && unreadMessages > 0 ? unreadMessages : null;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-accent-soft text-accent font-bold border-l-2 border-accent shadow-xs"
                          : "text-sidebar-ink-muted hover:bg-sidebar-surface hover:text-sidebar-ink"
                      }`}
                    >
                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2.3 : 1.8}
                        className={
                          item.icon === "newLead"
                            ? "text-amber-400 fill-amber-400/30 group-hover:scale-110 transition-transform"
                            : isActive
                              ? "text-accent"
                              : "text-sidebar-ink-faint group-hover:text-sidebar-ink"
                        }
                      />
                      <span className="truncate">{item.label}</span>

                      {item.badgeVariant === "hot" && (
                        <span className="ml-auto flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-400 shadow-xs">
                          <Flame size={11} className="fill-amber-400 animate-pulse" />
                          <span>{item.badge ?? "HOT"}</span>
                        </span>
                      )}

                      {unreadBadge !== null && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white shadow-xs">
                          {unreadBadge > 9 ? "9+" : unreadBadge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
        );
      })}
    </div>
  );
}
