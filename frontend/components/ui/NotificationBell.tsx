"use client";

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
        className="flex items-center gap-1.5 rounded border px-2 py-1 text-xs"
        title={connected ? "Live" : "Connecting…"}
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${connected ? "bg-green-500" : "bg-neutral-300"}`} />
        Notifications
        {unread > 0 && (
          <span className="rounded-full bg-red-500 px-1.5 text-white">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-72 rounded border bg-white p-2 text-xs shadow-lg dark:bg-neutral-900">
          {messages.length === 0 && <p className="p-2 text-neutral-400">No notifications yet.</p>}
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {messages.map((m, i) => (
              <li key={i} className="rounded border-b p-2 last:border-b-0">
                {m.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
