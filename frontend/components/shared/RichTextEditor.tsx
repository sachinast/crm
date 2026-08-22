"use client";

import { useState, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  RotateCcw,
  Eye,
  Edit3,
} from "lucide-react";

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter details, special instructions, or remarks…",
  rows = 4,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(prefix: string, suffix: string = prefix, defaultText: string = "text") {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = value || "";
    const selected = current.substring(start, end) || defaultText;
    const before = current.substring(0, start);
    const after = current.substring(end);

    const replacement = `${prefix}${selected}${suffix}`;
    const nextVal = `${before}${replacement}${after}`;
    onChange(nextVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 10);
  }

  function insertLinePrefix(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const current = value || "";
    const before = current.substring(0, start);
    const after = current.substring(start);
    const needsNewline = before.length > 0 && !before.endsWith("\n");
    const replacement = `${needsNewline ? "\n" : ""}${prefix} `;
    const nextVal = `${before}${replacement}${after}`;
    onChange(nextVal);

    setTimeout(() => {
      textarea.focus();
      const pos = start + replacement.length;
      textarea.setSelectionRange(pos, pos);
    }, 10);
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface overflow-hidden shadow-xs focus-within:border-accent transition-colors">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 bg-surface-raised px-2.5 py-1.5 border-b border-hairline">
        <div className="flex items-center gap-0.5 flex-wrap">
          <button
            type="button"
            onClick={() => wrapSelection("**", "**", "bold text")}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("*", "*", "italic text")}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
            title="Italic"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("<u>", "</u>", "underlined text")}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
            title="Underline"
          >
            <Underline size={14} />
          </button>

          <span className="h-4 w-px bg-hairline mx-1" />

          <button
            type="button"
            onClick={() => insertLinePrefix("#")}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
            title="Heading 1"
          >
            <Heading1 size={14} />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix("##")}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
            title="Heading 2"
          >
            <Heading2 size={14} />
          </button>

          <span className="h-4 w-px bg-hairline mx-1" />

          <button
            type="button"
            onClick={() => insertLinePrefix("•")}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
            title="Bullet List"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix("1.")}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
            title="Numbered List"
          >
            <ListOrdered size={14} />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix(">")}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
            title="Quote"
          >
            <Quote size={14} />
          </button>
          <button
            type="button"
            onClick={() => wrapSelection("`", "`", "code")}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
            title="Code"
          >
            <Code size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-1.5 rounded-lg text-ink-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Clear Editor"
            >
              <RotateCcw size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
              showPreview
                ? "bg-accent text-white"
                : "text-ink-muted hover:text-ink hover:bg-surface-sunken"
            }`}
            title="Toggle Live Preview"
          >
            {showPreview ? <Edit3 size={12} /> : <Eye size={12} />}
            <span>{showPreview ? "Edit" : "Preview"}</span>
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      {showPreview ? (
        <div className="p-3 min-h-[100px] text-xs text-ink whitespace-pre-wrap font-sans bg-surface-sunken/30">
          {value ? (
            value
          ) : (
            <span className="text-ink-faint italic">No content to preview.</span>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-3 bg-transparent text-xs text-ink placeholder:text-ink-faint outline-none resize-y border-none focus:ring-0"
        />
      )}
    </div>
  );
}
