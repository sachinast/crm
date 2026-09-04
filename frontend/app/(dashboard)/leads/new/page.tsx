import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NewLeadClient from "@/components/leads/NewLeadClient";

export default async function NewLeadPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const role = (user.role || "").toLowerCase();
  const isAdmin = role === "admin" || role === "super_admin" || role === "superadmin";
  const isAgent = role === "agent";

  // Only Agent (lead user) or Admin may create new leads
  if (!isAdmin && !isAgent) {
    redirect("/dashboard");
  }

  return <NewLeadClient />;
}
