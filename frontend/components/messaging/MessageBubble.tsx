"use client";

import { Check, CheckCheck, Clock, FileText, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { attachmentUrl, type AttachmentRead, type MessageRead } from "@/lib/messaging-api";
import { parseMentionMarkup } from "@/lib/mentions";

function StatusTicks({ status }: { status: MessageRead["status"] }) {
  if (status === "read") return <CheckCheck size={13} style={{ color: "#bfe3ff" }} />;
  if (status === "delivered") return <CheckCheck size={13} style={{ color: "rgba(255,255,255,0.7)" }} />;
  return <Check size={13} style={{ color: "rgba(255,255,255,0.7)" }} />;
}

function AttachmentImage({ attachment }: { attachment: AttachmentRead }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    attachmentUrl(attachment.id).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [attachment.id]);

  if (!src) {
    return (
      <div
        className="flex h-40 w-56 items-center justify-center rounded-lg"
        style={{ background: "rgba(255,255,255,0.15)" }}
      >
        <Clock size={16} className="animate-pulse" />
      </div>
    );
  }

  return (
    <a href={src} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element -- token-authenticated backend URL, not a static asset Next's optimizer can process */}
      <img
        src={src}
        alt={attachment.file_name}
        // Explicit width/height (not just max-*) so a low-resolution source
        // still fills a sensible thumbnail box instead of rendering at its
        // tiny natural size — object-cover then crops to fit.
        className="h-40 w-56 rounded-lg object-cover"
      />
    </a>
  );
}

function AttachmentPdf({ attachment, isOwn }: { attachment: AttachmentRead; isOwn: boolean }) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    attachmentUrl(attachment.id).then((url) => {
      if (!cancelled) setHref(url);
    });
    return () => {
      cancelled = true;
    };
  }, [attachment.id]);

  const kb = attachment.size_bytes < 1024 ? "<1" : (attachment.size_bytes / 1024).toFixed(0);

  return (
    <a
      href={href ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
      style={{ background: isOwn ? "rgba(255,255,255,0.15)" : "var(--accent-soft)" }}
    >
      <FileText size={20} style={{ color: isOwn ? "#fff" : "var(--accent)" }} />
      <span className="min-w-0">
        <span className="block max-w-40 truncate text-xs font-medium">{attachment.file_name}</span>
        <span className="block text-[11px] opacity-75">{kb} KB · PDF</span>
      </span>
    </a>
  );
}

export default function MessageBubble({ message, isOwn }: { message: MessageRead; isOwn: boolean }) {
  const segments = message.body ? parseMentionMarkup(message.body) : [];
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      {!isOwn && (
        <span className="mb-1 px-1 text-[11px] font-medium" style={{ color: "var(--ink-faint)" }}>
          {message.sender_name}
        </span>
      )}

      <div className={isOwn ? "chat-bubble-own" : "chat-bubble-other"}>
        {message.is_quick_response && (
          <div
            className="mb-1.5 flex items-center gap-1 text-[11px] font-medium"
            style={{ color: isOwn ? "#ffe9b8" : "var(--warning)" }}
          >
            <Zap size={11} />
            Quick response requested
          </div>
        )}

        {message.attachments.length > 0 && (
          <div className="mb-1.5 flex flex-col gap-1.5">
            {message.attachments.map((a) =>
              a.kind === "image" ? (
                <AttachmentImage key={a.id} attachment={a} />
              ) : (
                <AttachmentPdf key={a.id} attachment={a} isOwn={isOwn} />
              ),
            )}
          </div>
        )}

        {segments.length > 0 && (
          <p className="whitespace-pre-wrap break-words">
            {segments.map((seg, i) =>
              seg.type === "mention" ? (
                <span
                  key={i}
                  className="chat-mention"
                  style={{
                    background: isOwn ? "rgba(255,255,255,0.25)" : "var(--accent-soft)",
                    color: isOwn ? "#fff" : "var(--accent-ink)",
                  }}
                >
                  @{seg.text}
                </span>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </p>
        )}
      </div>

      <div className="mt-1 flex items-center gap-1 px-1 text-[11px]" style={{ color: "var(--ink-faint)" }}>
        {time}
        {isOwn && <StatusTicks status={message.status} />}
      </div>
    </div>
  );
}
