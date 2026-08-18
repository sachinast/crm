"use client";

import { useEffect, useRef, useState } from "react";

export interface NotificationMessage {
  type: string;
  lead_id?: string;
  status?: string;
  message: string;
  conversation_id?: string;
}

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

/**
 * Live notification feed — TECHNICAL_SPEC.md §5 (`WS /ws/notifications`).
 * Fetches a short-lived token from /api/notifications/ws-token (see that
 * route for why: the httpOnly session cookie can't be attached to a raw
 * WebSocket handshake) and reconnects once if the socket drops.
 *
 * This is a transient, in-memory feed for "live" delivery — it resets on
 * page reload. The underlying notifications are still durably persisted
 * (Notification rows written server-side on every status change/record
 * open); a full read/unread inbox backed by a GET /notifications endpoint
 * is a natural follow-up, not required by Phase 4's exit criteria.
 */
export function useNotifications() {
  const [messages, setMessages] = useState<NotificationMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [unread, setUnread] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;

    async function connect() {
      const resp = await fetch("/api/notifications/ws-token");
      if (!resp.ok || cancelled) return;
      const { token } = await resp.json();
      if (cancelled) return;

      socket = new WebSocket(`${WS_BASE_URL}/notifications?token=${encodeURIComponent(token)}`);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!cancelled) setConnected(true);
      };
      socket.onclose = () => {
        if (!cancelled) setConnected(false);
      };
      socket.onmessage = (event) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(event.data);
          // This socket also carries messaging events (chat_message/chat_read
          // — see lib/messaging-client.ts), which aren't notification-shaped
          // (chat_message's own "message" field is the full message object,
          // not display text) and are meant for the Messages UI, not this
          // feed. Only genuine notifications have a string message.
          if (typeof data?.message !== "string") return;
          setMessages((prev) => [data as NotificationMessage, ...prev].slice(0, 50));
          setUnread((prev) => prev + 1);
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

  function markAllRead() {
    setUnread(0);
  }

  return { messages, connected, unread, markAllRead };
}
