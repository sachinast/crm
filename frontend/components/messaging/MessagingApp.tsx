"use client";

import { MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { createConversation, fetchConversations, type ConversationRead } from "@/lib/messaging-api";
import { useChatSocket, type ChatEvent } from "@/lib/messaging-client";

import ChatWindow from "./ChatWindow";
import ConversationList from "./ConversationList";
import NewConversationModal from "./NewConversationModal";

export default function MessagingApp({
  currentUserId,
  variant = "page",
}: {
  currentUserId: string;
  /** "compact" is used inside the floating chat widget's small fixed-size
   * panel — single pane (list OR open chat, with a back button) instead of
   * the full page's side-by-side layout, and no outer .card chrome since
   * the widget panel already provides that. */
  variant?: "page" | "compact";
}) {
  const isCompact = variant === "compact";
  const [conversations, setConversations] = useState<ConversationRead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<{ seq: number; event: ChatEvent } | null>(null);
  const seqRef = useRef(0);

  const refreshConversations = useCallback(async () => {
    const convos = await fetchConversations();
    setConversations(convos);
  }, []);

  useEffect(() => {
    async function load() {
      await refreshConversations();
      setLoading(false);
    }
    load();
  }, [refreshConversations]);

  const handleSocketEvent = useCallback(
    (incoming: ChatEvent) => {
      seqRef.current += 1;
      setEvent({ seq: seqRef.current, event: incoming });
      if (incoming.type === "chat_message" || incoming.type === "chat_read") {
        refreshConversations();
      }
    },
    [refreshConversations],
  );

  useChatSocket(handleSocketEvent);

  async function handleStartConversation(userIds: string[], name?: string) {
    const conversation = await createConversation(userIds, name);
    setShowNewModal(false);
    await refreshConversations();
    setSelectedId(conversation.id);
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const emptyState = (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <MessageCircle size={28} />
      </div>
      <div>
        <p className="text-base font-semibold text-ink">Select a conversation</p>
        <p className="mt-1 text-sm text-ink-muted">
          or start a new one to message any colleague directly.
        </p>
      </div>
    </div>
  );

  return (
    <div className={isCompact ? "flex h-full overflow-hidden" : "card flex h-[calc(100vh-11rem)] overflow-hidden p-0"}>
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-ink-faint">
          Loading conversations…
        </div>
      ) : isCompact ? (
        selected ? (
          <ChatWindow
            key={selected.id}
            conversation={selected}
            currentUserId={currentUserId}
            onActivity={refreshConversations}
            incomingEvent={event}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <ConversationList
            conversations={conversations}
            currentUserId={currentUserId}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNewConversation={() => setShowNewModal(true)}
            compact
          />
        )
      ) : (
        <>
          <ConversationList
            conversations={conversations}
            currentUserId={currentUserId}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNewConversation={() => setShowNewModal(true)}
          />
          {selected ? (
            <ChatWindow
              key={selected.id}
              conversation={selected}
              currentUserId={currentUserId}
              onActivity={refreshConversations}
              incomingEvent={event}
            />
          ) : (
            emptyState
          )}
        </>
      )}

      {showNewModal && <NewConversationModal onClose={() => setShowNewModal(false)} onStart={handleStartConversation} />}
    </div>
  );
}
