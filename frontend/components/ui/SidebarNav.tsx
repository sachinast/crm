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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  dashboard: Gauge,
  leads: Users,
  billing: CreditCard,
  audit: ShieldCheck,
  credits: Gift,
  users: UserCog,
  log: ScrollText,
  integrations: Plug,
} as const;

interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

export default function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={isActive ? "nav-link-active" : "nav-link"}>
            <Icon size={16} strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
