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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useUnreadMessageCount } from "@/lib/messaging-client";

export const CATEGORY_ICONS = {
  overview: Compass,
  pipeline: Layers,
  operations: Briefcase,
  admin: ShieldAlert,
} as const;

export const ICONS = {
  dashboard: Gauge,
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
  attendance: Clock,
  files: FolderOpen,
  notes: StickyNote,
} as const;

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

export interface NavCategory {
  id: string;
  title: string;
  icon?: keyof typeof CATEGORY_ICONS;
  items: NavItem[];
}

export default function SidebarNav({ categories }: { categories: NavCategory[] }) {
  const pathname = usePathname();
  const unreadMessages = useUnreadMessageCount();

  // Find category ID containing active path
  const activeCategoryId = categories.find((cat) =>
    cat.items.some((item) =>
      item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href),
    ),
  )?.id;

  // Track open state for all categories (default all open)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    categories.forEach((cat) => {
      initialState[cat.id] = true;
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
    <div className="space-y-2.5">
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
            className="rounded-xl border border-[#232e47]/60 bg-[#131a2b]/50 overflow-hidden transition-all"
          >
            {/* Collapsible Category Header Button */}
            <button
              type="button"
              onClick={() => toggleCategory(category.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:bg-[#182136] hover:text-slate-200"
            >
              <div className="flex items-center gap-2">
                {CategoryIcon && (
                  <CategoryIcon
                    size={13}
                    className={hasActiveChild ? "text-[#d3ab5e]" : "text-slate-400"}
                  />
                )}
                <span className={hasActiveChild ? "text-white" : "text-slate-300"}>
                  {category.title}
                </span>
                {hasActiveChild && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#d3ab5e]" />
                )}
              </div>

              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="font-mono text-[10px] font-semibold text-slate-400">
                  {category.items.length}
                </span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </button>

            {/* Collapsible Children Item List */}
            {isOpen && (
              <nav className="flex flex-col gap-0.5 px-1.5 pb-1.5 pt-0.5 animate-fadeIn">
                {category.items.map((item) => {
                  const Icon = ICONS[item.icon];
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                  const badge =
                    item.icon === "messages" && unreadMessages > 0 ? unreadMessages : null;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-[#d3ab5e]/20 to-[#d3ab5e]/5 text-white border-l-2 border-[#d3ab5e] font-semibold shadow-xs"
                          : "text-slate-300 hover:bg-[#182136] hover:text-white"
                      }`}
                    >
                      <Icon
                        size={15}
                        strokeWidth={isActive ? 2.3 : 1.8}
                        className={
                          isActive
                            ? "text-[#d3ab5e]"
                            : "text-slate-400 group-hover:text-slate-200"
                        }
                      />
                      <span className="truncate">{item.label}</span>

                      {badge !== null && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef7b93] px-1 text-[10px] font-bold text-white shadow-xs">
                          {badge > 9 ? "9+" : badge}
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
