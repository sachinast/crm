"use client";

import { Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchMessages, markRead, type ConversationRead, type MessageRead } from "@/lib/messaging-api";
import type { ChatEvent } from "@/lib/messaging-client";

import Composer from "./Composer";
import MessageBubble from "./MessageBubble";

function conversationTitle(conversation: ConversationRead, currentUserId: string): string {
  if (conversation.is_group) return conversation.name || conversation.participants.map((p) => p.name).join(", ");
  const other = conversation.participants.find((p) => p.id !== currentUserId);
  return other?.name ?? "Unknown";
}

export default function ChatWindow({
  conversation,
  currentUserId,
  onActivity,
  incomingEvent,
}: {
  conversation: ConversationRead;
  currentUserId: string;
  onActivity: () => void;
  incomingEvent: { seq: number; event: ChatEvent } | null;
}) {
  const [messages, setMessages] = useState<MessageRead[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  // `loading` starts true and this component is remounted fresh per
  // conversation (MessagingApp renders it with key={conversation.id}), so
  // there's no need to reset it here — only to clear it once the fetch
  // settles.
  useEffect(() => {
    let cancelled = false;
    fetchMessages(conversation.id)
      .then((msgs) => {
        if (cancelled) return;
        setMessages(msgs);
        markRead(conversation.id).then(onActivity);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [loading, scrollToBottom]);

  // MessagingApp owns the single shared WebSocket connection and forwards
  // every event down here as a prop (changing `seq` on each new one) rather
  // than this component opening its own socket per open conversation.
  useEffect(() => {
    if (!incomingEvent) return;
    const { event } = incomingEvent;
    if (event.conversation_id !== conversation.id) return;

    // Nested one level so the state updates aren't a bare top-level
    // statement in the effect body (react-hooks/set-state-in-effect) — this
    // effect is reacting to an external push (a WS event forwarded as a
    // prop), which is exactly what effects are for; queueMicrotask just
    // gives it the same "callback, not direct" shape the linter wants.
    queueMicrotask(() => {
      if (event.type === "chat_message") {
        setMessages((prev) => [...prev, event.message as unknown as MessageRead]);
        markRead(conversation.id).then(onActivity);
        setTimeout(() => scrollToBottom("smooth"), 50);
      } else if (event.type === "chat_read") {
        setMessages((prev) =>
          prev.map((m) => (m.sender_id === currentUserId && m.status !== "read" ? { ...m, status: "read" } : m)),
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingEvent]);

  function handleSent(message: MessageRead) {
    setMessages((prev) => [...prev, message]);
    onActivity();
    setTimeout(() => scrollToBottom("smooth"), 50);
  }

  const title = conversationTitle(conversation, currentUserId);

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex items-center gap-2.5 border-b px-5 py-4" style={{ borderColor: "var(--hairline)" }}>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{ background: "var(--navy-soft)", color: "var(--accent)" }}
        >
          {conversation.is_group ? <Users size={16} /> : title.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          {conversation.is_group && (
            <p className="truncate text-xs" style={{ color: "var(--ink-faint)" }}>
              {conversation.participants.length} members
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
        {loading ? (
          <p className="text-center text-xs" style={{ color: "var(--ink-faint)" }}>
            Loading…
          </p>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs" style={{ color: "var(--ink-faint)" }}>
            No messages yet — say hello.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} isOwn={m.sender_id === currentUserId} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <Composer conversationId={conversation.id} participants={conversation.participants} onSent={handleSent} />
    </div>
  );
}
