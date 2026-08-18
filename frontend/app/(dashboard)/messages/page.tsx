import { redirect } from "next/navigation";

import MessagingApp from "@/components/messaging/MessagingApp";
import { getCurrentUser } from "@/lib/auth";

// Open to every registered user regardless of role — unlike the rest of this
// app, in-app messaging isn't gated by the lead-visibility RBAC model at all
// (see backend/app/api/v1/messaging.py's module docstring).
export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <MessagingApp currentUserId={user.id} />;
}
