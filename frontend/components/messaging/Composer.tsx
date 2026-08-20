"use client";

import { AlertTriangle, FileText, Paperclip, Send, Smile, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { fetchQuickReplies, searchUsers, sendMessage, uploadAttachment, type ParticipantRead, type UserSearchResult } from "@/lib/messaging-api";
import { mentionMarkup } from "@/lib/mentions";

import EmojiPicker from "./EmojiPicker";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

interface PendingAttachment {
  localId: string;
  file: File;
  previewUrl: string | null; // objectURL for images only
  progress: number;
  status: "uploading" | "ready" | "failed";
  attachmentId: string | null;
  error?: string;
}

interface MentionCandidate {
  id: string;
  name: string;
}

function applyMentionMarkup(body: string, candidates: MentionCandidate[]): { body: string; mentionedIds: string[] } {
  let result = body;
  const matchedIds: string[] = [];
  for (const m of candidates) {
    const token = `@${m.name}`;
    const idx = result.indexOf(token);
    if (idx !== -1) {
      result = result.slice(0, idx) + mentionMarkup(m.name, m.id) + result.slice(idx + token.length) + " ";
      matchedIds.push(m.id);
    }
  }
  return { body: result, mentionedIds: matchedIds };
}

export default function Composer({
  conversationId,
  participants,
  onSent,
}: {
  conversationId: string;
  participants: ParticipantRead[];
  onSent: (message: import("@/lib/messaging-api").MessageRead) => void;
}) {
  const [body, setBody] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<UserSearchResult[]>([]);
  const [pickedMentions, setPickedMentions] = useState<MentionCandidate[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [quickResponse, setQuickResponse] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Admin-editable (GET /messaging/quick-replies -> app_settings) — this
  // default only covers the gap before that fetch resolves, so the chips
  // don't flash empty on first render.
  const [quickReplies, setQuickReplies] = useState<string[]>(["👍 Got it", "✅ On it", "🙏 Thanks!", "⏳ One sec"]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchQuickReplies().then((replies) => {
      if (!cancelled) setQuickReplies(replies);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mentionQuery === null) {
      setMentionResults([]);
      return;
    }
    let cancelled = false;
    searchUsers(mentionQuery).then((all) => {
      if (cancelled) return;
      const participantIds = new Set(participants.map((p) => p.id));
      setMentionResults(all.filter((u) => participantIds.has(u.id)));
    });
    return () => {
      cancelled = true;
    };
  }, [mentionQuery, participants]);

  function handleBodyChange(value: string) {
    setBody(value);
    const caret = textareaRef.current?.selectionStart ?? value.length;
    const upToCaret = value.slice(0, caret);
    const match = upToCaret.match(/(?:^|\s)@(\w*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function pickMention(user: UserSearchResult) {
    const caret = textareaRef.current?.selectionStart ?? body.length;
    const upToCaret = body.slice(0, caret);
    const match = upToCaret.match(/(?:^|\s)@(\w*)$/);
    if (!match) return;
    const start = upToCaret.length - match[0].length + (match[0].startsWith(" ") ? 1 : 0);
    const newBody = `${body.slice(0, start)}@${user.name} ${body.slice(caret)}`;
    setBody(newBody);
    setPickedMentions((prev) => (prev.some((m) => m.id === user.id) ? prev : [...prev, { id: user.id, name: user.name }]));
    setMentionQuery(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function insertEmoji(emoji: string) {
    setBody((prev) => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const localId = crypto.randomUUID();
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setAttachments((prev) => [
          ...prev,
          { localId, file, previewUrl: null, progress: 0, status: "failed", attachmentId: null, error: "Unsupported file type" },
        ]);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setAttachments((prev) => [
          ...prev,
          { localId, file, previewUrl: null, progress: 0, status: "failed", attachmentId: null, error: "File exceeds 8MB limit" },
        ]);
        continue;
      }

      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      setAttachments((prev) => [...prev, { localId, file, previewUrl, progress: 0, status: "uploading", attachmentId: null }]);

      try {
        const uploaded = await uploadAttachment(file, (pct) => {
          setAttachments((prev) => prev.map((a) => (a.localId === localId ? { ...a, progress: pct } : a)));
        });
        setAttachments((prev) =>
          prev.map((a) => (a.localId === localId ? { ...a, status: "ready", attachmentId: uploaded.id } : a)),
        );
      } catch (err) {
        setAttachments((prev) =>
          prev.map((a) =>
            a.localId === localId ? { ...a, status: "failed", error: err instanceof Error ? err.message : "Upload failed" } : a,
          ),
        );
      }
    }
  }

  function removeAttachment(localId: string) {
    setAttachments((prev) => prev.filter((a) => a.localId !== localId));
  }

  async function doSend(overrideBody?: string) {
    const rawBody = overrideBody ?? body;
    const readyAttachmentIds = attachments.filter((a) => a.status === "ready" && a.attachmentId).map((a) => a.attachmentId as string);
    const stillUploading = attachments.some((a) => a.status === "uploading");

    if (stillUploading) return;
    if (!rawBody.trim() && readyAttachmentIds.length === 0) return;

    const { body: finalBody, mentionedIds } = applyMentionMarkup(rawBody.trim(), pickedMentions);

    setSending(true);
    setError(null);
    try {
      const message = await sendMessage(conversationId, {
        body: finalBody || null,
        mentioned_user_ids: mentionedIds,
        attachment_ids: readyAttachmentIds,
        is_quick_response: quickResponse,
      });
      onSent(message);
      setBody("");
      setPickedMentions([]);
      setAttachments([]);
      setQuickResponse(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && mentionQuery === null) {
      e.preventDefault();
      doSend();
    }
  }

  const canSend = (body.trim().length > 0 || attachments.some((a) => a.status === "ready")) && !attachments.some((a) => a.status === "uploading");

  return (
    <div className="border-t border-hairline px-4 py-3 bg-surface">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {quickReplies.map((reply) => (
          <button
            key={reply}
            onClick={() => doSend(reply)}
            disabled={sending}
            className="btn-secondary btn-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reply}
          </button>
        ))}
      </div>

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <div key={a.localId} className="card-flat relative flex items-center gap-2 py-1.5 pl-2 pr-6 text-xs bg-surface-raised">
              {a.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.previewUrl} alt={a.file.name} className="h-8 w-8 rounded object-cover" />
              ) : (
                <FileText size={16} className="text-accent" />
              )}
              <span className="max-w-32 truncate text-ink font-medium">{a.file.name}</span>
              {a.status === "uploading" && <span className="text-ink-faint">{a.progress}%</span>}
              {a.status === "failed" && (
                <span className="flex items-center gap-0.5 text-danger font-semibold">
                  <AlertTriangle size={11} /> {a.error}
                </span>
              )}
              <button onClick={() => removeAttachment(a.localId)} className="absolute right-1 top-1.5 text-ink-faint hover:text-ink">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {mentionQuery !== null && mentionResults.length > 0 && (
        <div className="card-flat mb-2 max-h-40 overflow-y-auto p-1 bg-surface-raised border border-hairline">
          {mentionResults.map((u) => (
            <button
              key={u.id}
              onClick={() => pickMention(u)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent-soft text-ink"
              onMouseDown={(e) => e.preventDefault()}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold bg-surface text-accent border border-hairline"
              >
                {u.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="font-semibold">{u.name}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-2 alert-danger">
          {error}
        </p>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button onClick={() => fileInputRef.current?.click()} className="btn-ghost btn-sm px-2 text-ink-muted hover:text-ink" title="Attach file">
          <Paperclip size={18} />
        </button>

        <button
          onClick={() => setQuickResponse((v) => !v)}
          className={`btn-ghost btn-sm px-2 ${quickResponse ? "bg-amber-950/40 text-amber-400 border border-amber-500/30" : "text-ink-muted hover:text-ink"}`}
          title="Mark as quick response"
        >
          <Zap size={18} />
        </button>

        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => handleBodyChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… use @ to mention someone"
          rows={1}
          className="input flex-1 resize-none max-h-28 text-sm"
        />

        <div className="relative">
          <button onClick={() => setShowEmoji((v) => !v)} className="btn-ghost btn-sm px-2 text-ink-muted hover:text-ink" title="Emoji">
            <Smile size={18} />
          </button>
          {showEmoji && <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />}
        </div>

        <button onClick={() => doSend()} disabled={!canSend || sending} className="btn-primary btn-sm px-3">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
