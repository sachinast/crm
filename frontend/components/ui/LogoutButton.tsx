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
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a3652] bg-[#182136] text-slate-400 transition-colors hover:border-[#ef7b93]/50 hover:bg-[#34131c] hover:text-[#ef7b93]"
    >
      <LogOut size={14} strokeWidth={2} />
    </button>
  );
}
