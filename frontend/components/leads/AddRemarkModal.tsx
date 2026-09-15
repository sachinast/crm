"use client";

import React, { useState } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";

export interface AddRemarkModalProps {
  leadId: string;
  isOpen: boolean;
  onClose: () => void;
  onRemarkAdded?: (remark: { s_no: number; remark: string; entered_by: string; entered_on: string }) => void;
}

export default function AddRemarkModal({
  leadId,
  isOpen,
  onClose,
  onRemarkAdded,
}: AddRemarkModalProps) {
  const [remarkText, setRemarkText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!remarkText.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch(`/api/leads/${leadId}/remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark: remarkText.trim() }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(typeof body.detail === "string" ? body.detail : "Failed to add remark");
      }

      const data = await resp.json();
      setRemarkText("");
      if (onRemarkAdded && data.remark) {
        onRemarkAdded(data.remark);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving remark");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="card w-full max-w-lg p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/20">
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">Add Booking Remark</h3>
              <p className="text-xs text-ink-muted">
                Logged in the booking history and pushed to the assigned agent &amp; admins.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink text-sm font-bold p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
              Remark / Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={remarkText}
              onChange={(e) => {
                setRemarkText(e.target.value);
                setError(null);
              }}
              placeholder="Type your notes, customer service updates, special instructions, or audit remarks..."
              required
              autoFocus
              className="textarea w-full text-sm font-normal"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500 font-medium">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !remarkText.trim()}
              className="btn-primary flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Post Remark</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
