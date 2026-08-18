"use client";

import { Bell } from "lucide-react";
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
        className="btn-ghost btn-sm relative"
        title={connected ? "Live" : "Connecting…"}
      >
        <Bell size={16} strokeWidth={2} />
        <span
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full"
          style={{ background: connected ? "var(--success)" : "var(--ink-faint)" }}
        />
        {unread > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
            style={{ background: "var(--danger)" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="card absolute right-0 z-20 mt-2 w-80 p-0 text-xs">
          <div className="border-b px-3 py-2 font-medium" style={{ borderColor: "var(--hairline)" }}>
            Notifications
          </div>
          {messages.length === 0 && <p className="p-4" style={{ color: "var(--ink-faint)" }}>Nothing yet.</p>}
          <ul className="flex max-h-72 flex-col overflow-y-auto">
            {messages.map((m, i) => (
              <li
                key={i}
                className="border-b px-3 py-2.5 last:border-b-0"
                style={{ borderColor: "var(--hairline)" }}
              >
                {m.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
