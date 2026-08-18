"use client";

import { useEffect, useRef, useState } from "react";

import { fetchUnreadCount } from "@/lib/messaging-api";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

export interface ChatMessageEvent {
  type: "chat_message";
  conversation_id: string;
  message: Record<string, unknown>;
}

export interface ChatReadEvent {
  type: "chat_read";
  conversation_id: string;
  reader_id: string;
  read_at: string;
}

export interface MentionEvent {
  type: "mention";
  conversation_id: string;
  message_id: string;
  message: string;
}

export type ChatEvent = ChatMessageEvent | ChatReadEvent | MentionEvent;

type Listener = (event: ChatEvent) => void;

/**
 * One shared connection to the same `/ws/notifications` endpoint
 * NotificationBell uses (see lib/ws-client.ts), reused by every messaging
 * consumer (sidebar unread badge, the floating chat widget's badge, open
 * chat windows) instead of each opening its own socket. Module-level rather
 * than a React context — simpler, and nothing here needs to trigger a
 * re-render on connect/disconnect, only on actual chat events, which
 * subscribers already get via their own callback.
 */
let sharedSocket: WebSocket | null = null;
let connecting = false;
const listeners = new Set<Listener>();

function isChatEvent(data: unknown): data is ChatEvent {
  const type = (data as { type?: unknown })?.type;
  return type === "chat_message" || type === "chat_read" || type === "mention";
}

async function ensureConnected() {
  if (sharedSocket || connecting) return;
  connecting = true;
  try {
    const resp = await fetch("/api/notifications/ws-token");
    if (!resp.ok) return;
    const { token } = await resp.json();

    const socket = new WebSocket(`${WS_BASE_URL}/notifications?token=${encodeURIComponent(token)}`);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (isChatEvent(data)) listeners.forEach((listener) => listener(data));
      } catch {
        // ignore malformed frames
      }
    };
    socket.onclose = () => {
      if (sharedSocket === socket) sharedSocket = null;
    };
    sharedSocket = socket;
  } finally {
    connecting = false;
  }
}

export function useChatSocket(onEvent: (event: ChatEvent) => void) {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    const listener: Listener = (event) => onEventRef.current(event);
    listeners.add(listener);
    ensureConnected();
    return () => {
      listeners.delete(listener);
    };
  }, []);
}

/** Live unread-message badge count, shared by the sidebar nav item and the
 * floating chat widget's bubble. */
export function useUnreadMessageCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchUnreadCount()
      .then((n) => {
        if (!cancelled) setCount(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useChatSocket((event) => {
    if (event.type === "chat_message") {
      setCount((n) => n + 1);
    } else if (event.type === "chat_read") {
      fetchUnreadCount()
        .then(setCount)
        .catch(() => {});
    }
  });

  return count;
}
