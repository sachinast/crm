"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      title="Sign out of CRM PRO"
      className="flex h-8 w-8 items-center justify-center rounded-xl border border-sidebar-hairline bg-sidebar-surface text-sidebar-ink-muted transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
    >
      <LogOut size={14} strokeWidth={2} />
    </button>
  );
}
