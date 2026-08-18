"use client";

import { MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { createConversation, fetchConversations, type ConversationRead } from "@/lib/messaging-api";
import { useChatSocket, type ChatEvent } from "@/lib/messaging-client";

import ChatWindow from "./ChatWindow";
import ConversationList from "./ConversationList";
import NewConversationModal from "./NewConversationModal";

export default function MessagingApp({ currentUserId }: { currentUserId: string }) {
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

  return (
    <div className="card flex h-[calc(100vh-11rem)] overflow-hidden p-0">
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm" style={{ color: "var(--ink-faint)" }}>
          Loading conversations…
        </div>
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
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--accent-soft)" }}>
                <MessageCircle size={24} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <p className="text-sm font-medium">Select a conversation</p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--ink-faint)" }}>
                  or start a new one to message any colleague directly.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {showNewModal && <NewConversationModal onClose={() => setShowNewModal(false)} onStart={handleStartConversation} />}
    </div>
  );
}
