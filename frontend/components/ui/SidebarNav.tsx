"use client";

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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useUnreadMessageCount } from "@/lib/messaging-client";

const ICONS = {
  dashboard: Gauge,
  leads: Users,
  billing: CreditCard,
  audit: ShieldCheck,
  credits: Gift,
  users: UserCog,
  log: ScrollText,
  integrations: Plug,
  messages: MessageCircle,
} as const;

interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

export default function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const unreadMessages = useUnreadMessageCount();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        const badge = item.icon === "messages" && unreadMessages > 0 ? unreadMessages : null;
        return (
          <Link key={item.href} href={item.href} className={`relative ${isActive ? "nav-link-active" : "nav-link"}`}>
            <Icon size={16} strokeWidth={2} />
            {item.label}
            {badge !== null && (
              <span
                className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
                style={{ background: "var(--danger)" }}
              >
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
