"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useNotifications } from "@/lib/ws-client";

export default function NotificationBell() {
  const { messages, connected, unread, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) markAllRead();
        }}
        className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-header-hairline bg-sidebar-surface text-header-ink-muted transition-colors hover:text-header-ink hover:bg-sidebar-surface-raised"
        title={connected ? "Live" : "Connecting…"}
      >
        <Bell size={15} strokeWidth={2} />
        <span
          className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${connected ? "bg-success" : "bg-sidebar-ink-faint"}`}
        />
        {unread > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white bg-danger"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="card absolute right-0 z-20 mt-2 w-80 p-0 text-sm shadow-xl">
          <div className="border-b border-hairline px-3.5 py-2.5 font-semibold text-ink">
            Notifications
          </div>
          {messages.length === 0 && <p className="p-4 text-sm text-ink-faint">Nothing yet.</p>}
          <ul className="flex max-h-72 flex-col overflow-y-auto">
            {messages.map((m, i) => {
              const isChat = m.type === "message" || m.type === "mention";
              const content = (
                <>
                  {isChat && (
                    <span className="mr-1 font-semibold text-accent">
                      {m.type === "mention" ? "@mention" : "Message"}
                    </span>
                  )}
                  {m.message}
                </>
              );
              return (
                <li key={i} className="border-b border-hairline last:border-b-0 text-ink">
                  {isChat ? (
                    <Link href="/messages" className="block px-3.5 py-2.5 transition-colors hover:bg-surface-raised" onClick={() => setOpen(false)}>
                      {content}
                    </Link>
                  ) : (
                    <div className="px-3.5 py-2.5">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
