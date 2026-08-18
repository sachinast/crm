"use client";

import { useEffect, useRef } from "react";

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

/**
 * A second, dedicated connection to the same `/ws/notifications` endpoint
 * NotificationBell already uses (see lib/ws-client.ts) — opened only while a
 * component actually wants live chat events (the Messages page), rather than
 * threading a shared connection through a new context provider. Two small
 * always-idle sockets per active tab is a deliberate, documented tradeoff for
 * keeping this feature additive and not touching the already-tested Phase 4
 * notification bell.
 */
export function useChatSocket(onEvent: (event: ChatEvent) => void) {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;

    async function connect() {
      const resp = await fetch("/api/notifications/ws-token");
      if (!resp.ok || cancelled) return;
      const { token } = await resp.json();
      if (cancelled) return;

      socket = new WebSocket(`${WS_BASE_URL}/notifications?token=${encodeURIComponent(token)}`);

      socket.onmessage = (event) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "chat_message" || data.type === "chat_read" || data.type === "mention") {
            onEventRef.current(data as ChatEvent);
          }
        } catch {
          // ignore malformed frames
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      socket?.close();
    };
  }, []);
}
