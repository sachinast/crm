"use client";

import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { ConversationRead } from "@/lib/messaging-api";
import { parseMentionMarkup } from "@/lib/mentions";

function plainPreview(body: string): string {
  return parseMentionMarkup(body)
    .map((seg) => (seg.type === "mention" ? `@${seg.text}` : seg.text))
    .join("");
}

function conversationTitle(conversation: ConversationRead, currentUserId: string): string {
  if (conversation.is_group) return conversation.name || conversation.participants.map((p) => p.name).join(", ");
  const other = conversation.participants.find((p) => p.id !== currentUserId);
  return other?.name ?? "Unknown";
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export default function ConversationList({
  conversations,
  currentUserId,
  selectedId,
  onSelect,
  onNewConversation,
}: {
  conversations: ConversationRead[];
  currentUserId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter((c) => conversationTitle(c, currentUserId).toLowerCase().includes(q));
  }, [conversations, query, currentUserId]);

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r" style={{ borderColor: "var(--hairline)" }}>
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Messages</h1>
        <button onClick={onNewConversation} className="btn-primary btn-sm px-2.5" title="New conversation">
          <Plus size={15} strokeWidth={2.5} />
        </button>
      </div>

      <div className="relative px-3 pb-3">
        <Search size={13} className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-faint)" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations"
          className="input pl-8 text-sm"
        />
      </div>

      <ul className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-3">
        {filtered.length === 0 && (
          <li className="px-3 py-8 text-center text-xs" style={{ color: "var(--ink-faint)" }}>
            {conversations.length === 0 ? "No conversations yet — start one." : "No matches."}
          </li>
        )}
        {filtered.map((c) => {
          const title = conversationTitle(c, currentUserId);
          const isActive = c.id === selectedId;
          const preview = c.last_message
            ? c.last_message.body
              ? plainPreview(c.last_message.body)
              : c.last_message.attachments.length > 0
                ? "📎 Attachment"
                : ""
            : "No messages yet";
          return (
            <li key={c.id}>
              <button
                onClick={() => onSelect(c.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors"
                style={{ background: isActive ? "var(--accent-soft)" : "transparent" }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  style={{ background: "var(--navy-soft)", color: "var(--accent)" }}
                >
                  {initials(title)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-1">
                    <span className="truncate text-sm font-medium">{title}</span>
                    {c.last_message && (
                      <span className="shrink-0 text-[11px]" style={{ color: "var(--ink-faint)" }}>
                        {relativeTime(c.last_message.created_at)}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs" style={{ color: "var(--ink-muted)" }}>
                      {preview}
                    </span>
                    {c.unread_count > 0 && (
                      <span
                        className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
                        style={{ background: "var(--accent)" }}
                      >
                        {c.unread_count > 9 ? "9+" : c.unread_count}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
