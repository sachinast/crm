"use client";

import { useEffect, useRef } from "react";

import { EMOJI_GROUPS } from "@/lib/emoji-data";

export default function EmojiPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="card absolute bottom-full right-0 z-30 mb-2 w-64 p-3 shadow-2xl bg-surface-raised border border-hairline"
    >
      {EMOJI_GROUPS.map((group) => (
        <div key={group.label} className="mb-2 last:mb-0">
          <p className="section-label mb-1">{group.label}</p>
          <div className="grid grid-cols-8 gap-1">
            {group.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onPick(emoji)}
                className="rounded-lg p-1 text-lg leading-none transition-colors hover:bg-accent-soft"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
