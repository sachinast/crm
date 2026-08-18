"use client";

import { MessageCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useUnreadMessageCount } from "@/lib/messaging-client";

import MessagingApp from "./MessagingApp";

/**
 * A persistent floating chat bubble available from anywhere in the app
 * (Leads, Dashboard, Billing, ...) so a user doesn't have to leave what
 * they're doing to reply to a colleague. Hidden on /messages itself — that
 * page already is the full messaging experience, no need to float a second
 * one on top of it.
 */
export default function FloatingChatWidget({ currentUserId }: { currentUserId: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const unread = useUnreadMessageCount();

  if (pathname?.startsWith("/messages")) return null;

  return (
    <>
      {open && (
        <div
          className="card fixed bottom-24 right-6 z-40 flex h-[32rem] w-[380px] flex-col overflow-hidden p-0"
          style={{ boxShadow: "var(--shadow-card-hover)" }}
        >
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--hairline)" }}>
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <MessageCircle size={15} style={{ color: "var(--accent)" }} />
              Messages
            </span>
            <button onClick={() => setOpen(false)} className="btn-ghost btn-sm px-1.5" title="Close">
              <X size={15} />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <MessagingApp currentUserId={currentUserId} variant="compact" />
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105"
        style={{ background: "var(--accent)", color: "#fff", boxShadow: "var(--shadow-card-hover)" }}
        title={open ? "Close chat" : "Open chat"}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && unread > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white"
            style={{ background: "var(--danger)", border: "2px solid var(--background)" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </>
  );
}
