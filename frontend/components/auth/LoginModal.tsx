"use client";

import React, { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X, Lock, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset error when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      setSubmitting(false);

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setError(body.error ?? "Invalid email or password");
        return;
      }

      onClose();
      router.push("/dashboard");
      router.refresh();
    } catch {
      setSubmitting(false);
      setError("Unable to connect to authentication service.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md rounded-2xl border border-[#232e47] bg-[#131a2b] p-6 sm:p-8 shadow-2xl z-10 space-y-5">
        {/* Close (✕) Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl border border-[#2a3652] bg-[#182136] text-slate-400 transition-colors hover:border-[#d3ab5e] hover:text-white"
        >
          <X size={16} />
        </button>

        {/* Modal Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2a3652] bg-[#182136] text-xl font-extrabold text-[#d3ab5e] shadow-md">
            P
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Sign In to CRM PRO</h2>
            <p className="text-xs text-slate-400">
              Access your role-based booking and operations console.
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Email Address
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#232e47] bg-[#0d1220] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#d3ab5e] focus:outline-none"
              placeholder="name@example.com"
              autoFocus
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#232e47] bg-[#0d1220] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#d3ab5e] focus:outline-none"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-[#ef7b93]/30 bg-[#34131c] px-3.5 py-2.5 text-xs font-semibold text-[#ef7b93] animate-fadeIn">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d3ab5e] to-[#e0bc78] py-2.5 text-sm font-bold text-slate-950 shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            <span>{submitting ? "Signing in…" : "Sign In to Workspace"}</span>
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400 pt-1">
          <ShieldCheck size={13} className="text-[#3ecf9a]" />
          <span>Role-Based Authentication & AES PII Protection</span>
        </div>
      </div>
    </div>
  );
}
