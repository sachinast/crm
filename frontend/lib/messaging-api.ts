"use client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ParticipantRead {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AttachmentRead {
  id: string;
  file_name: string;
  content_type: string;
  kind: "image" | "pdf";
  size_bytes: number;
}

export interface MentionRead {
  user_id: string;
  name: string;
}

export type MessageStatus = "sent" | "delivered" | "read";

export interface MessageRead {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  body: string | null;
  is_quick_response: boolean;
  mentions: MentionRead[];
  attachments: AttachmentRead[];
  created_at: string;
  status: MessageStatus;
}

export interface ConversationRead {
  id: string;
  is_group: boolean;
  name: string | null;
  participants: ParticipantRead[];
  created_at: string;
  last_message: MessageRead | null;
  unread_count: number;
}

async function json<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${resp.status})`);
  }
  return resp.json() as Promise<T>;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const resp = await fetch(`/api/messaging/users?query=${encodeURIComponent(query)}`);
  return json(resp);
}

export async function fetchQuickReplies(): Promise<string[]> {
  const resp = await fetch("/api/messaging/quick-replies");
  return json(resp);
}

export async function fetchConversations(): Promise<ConversationRead[]> {
  const resp = await fetch("/api/messaging/conversations");
  return json(resp);
}

export async function createConversation(participantUserIds: string[], name?: string): Promise<ConversationRead> {
  const resp = await fetch("/api/messaging/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participant_user_ids: participantUserIds, name: name ?? null }),
  });
  return json(resp);
}

export async function fetchMessages(conversationId: string, before?: string): Promise<MessageRead[]> {
  const suffix = before ? `?before=${encodeURIComponent(before)}` : "";
  const resp = await fetch(`/api/messaging/conversations/${conversationId}/messages${suffix}`);
  return json(resp);
}

export async function sendMessage(
  conversationId: string,
  payload: { body?: string | null; mentioned_user_ids?: string[]; attachment_ids?: string[]; is_quick_response?: boolean },
): Promise<MessageRead> {
  const resp = await fetch(`/api/messaging/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return json(resp);
}

export async function markRead(conversationId: string): Promise<void> {
  await fetch(`/api/messaging/conversations/${conversationId}/read`, { method: "POST" });
}

export async function fetchUnreadCount(): Promise<number> {
  const resp = await fetch("/api/messaging/unread-count");
  const body = await json<{ unread_count: number }>(resp);
  return body.unread_count;
}

/**
 * Attachments upload/download talk to the FastAPI backend directly, bypassing
 * the Next.js server entirely — the same deliberate exception the WS
 * connection already uses (see app/api/notifications/ws-token/route.ts),
 * reused here rather than duplicated, for two reasons: browser <img>/<a>
 * tags can't carry an Authorization header for downloads, and routing a
 * multipart upload through a Vercel serverless function would put it under
 * that platform's request-body ceiling instead of just this app's own
 * (configurable) size limit.
 */
async function getClientToken(): Promise<string> {
  const resp = await fetch("/api/notifications/ws-token");
  if (!resp.ok) throw new Error("Not authenticated");
  const { token } = await resp.json();
  return token;
}

export async function uploadAttachment(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<AttachmentRead> {
  const token = await getClientToken();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/messaging/attachments`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new Error(typeof body.detail === "string" ? body.detail : "Upload failed"));
        } catch {
          reject(new Error("Upload failed"));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

// Cached per attachment id for the lifetime of the tab — <img>/<embed> tags
// re-request the same src on rerender, and this avoids re-minting a token
// fetch (and a flash of broken image) each time.
const tokenPromise: { current: Promise<string> | null } = { current: null };

export async function attachmentUrl(attachmentId: string): Promise<string> {
  if (!tokenPromise.current) tokenPromise.current = getClientToken();
  const token = await tokenPromise.current;
  return `${API_BASE_URL}/messaging/attachments/${attachmentId}?token=${encodeURIComponent(token)}`;
}
