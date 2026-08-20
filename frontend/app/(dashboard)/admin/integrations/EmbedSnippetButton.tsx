"use client";

import { Check, ChevronDown, ChevronUp, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export default function EmbedSnippetButton({ widgetKey }: { widgetKey: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const snippet = `<script src="${API_BASE_URL}/embed/widget.js" data-key="${widgetKey}" async></script>`;
  const previewUrl = `${API_BASE_URL}/embed/${widgetKey}/preview`;

  async function handleCopy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="text-xs font-semibold text-accent hover:opacity-80">
        {open ? <ChevronUp size={12} className="mr-1 inline" /> : <ChevronDown size={12} className="mr-1 inline" />}
        Embed code
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-hairline bg-surface-sunken p-3">
          <p className="mb-2 text-xs text-ink-muted">
            Paste this one tag anywhere in the landing page&apos;s HTML — Flights, Hotels, and Cabs all come with it,
            styled after MakeMyTrip&apos;s search widget.
          </p>
          <pre className="mb-2 overflow-x-auto rounded-lg border border-hairline-strong bg-surface p-2.5 font-mono text-xs text-ink">
            {snippet}
          </pre>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="btn-secondary btn-sm">
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
              <ExternalLink size={13} />
              Preview
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
