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

      if (!resp.ok) {
        setSubmitting(false);
        const body = await resp.json().catch(() => ({}));
        setError(body.error ?? "Invalid email or password");
        return;
      }

      const data = await resp.json().catch(() => ({}));
      if (data.access_token && typeof window !== "undefined") {
        localStorage.setItem("crm_access_token", data.access_token);
      }

      // Smooth direct navigation to dashboard without flashing landing page
      setSubmitting(true);
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
      <div className="relative w-full max-w-md card p-6 sm:p-8 shadow-2xl z-10 space-y-5">
        {/* Close (✕) Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl border border-hairline bg-surface text-ink-muted transition-colors hover:border-accent hover:text-ink"
        >
          <X size={16} />
        </button>

        {/* Modal Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white text-xl font-extrabold shadow-md">
            P
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink">Sign In to CRM PRO</h2>
            <p className="text-xs text-ink-muted">
              Access your role-based booking and operations console.
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Email Address
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1.5"
              placeholder="name@example.com"
              autoFocus
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1.5"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div
              className={`p-3 rounded-xl text-xs space-y-1 animate-fadeIn border ${
                error.toLowerCase().includes("ip")
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <Lock size={13} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{error.toLowerCase().includes("ip") ? "IP Security Policy Restriction" : "Authentication Failed"}</span>
              </div>
              <p className="leading-relaxed font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-2.5"
          >
            <span>{submitting ? "Signing in…" : "Sign In to Workspace"}</span>
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-ink-muted pt-1">
          <ShieldCheck size={14} className="text-success" />
          <span>Role-Based Authentication & AES PII Protection</span>
        </div>
      </div>
    </div>
  );
}
