"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const resp = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setSubmitting(false);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      setError(body.error ?? "Login failed");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center p-8"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, rgba(179,135,47,0.10), transparent 45%), radial-gradient(circle at 80% 80%, rgba(18,23,43,0.06), transparent 50%), var(--background)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-base font-bold"
            style={{ background: "var(--navy)", color: "var(--accent)" }}
          >
            P
          </div>
          <h1 className="text-xl font-semibold tracking-tight">CRM PRO</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Car · Hotel · Flight Booking Management
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card">
          <h2 className="mb-1 text-base font-semibold">Sign in</h2>
          <p className="mb-5 text-xs" style={{ color: "var(--ink-faint)" }}>
            No self-registration — accounts are provisioned by an Admin.
          </p>

          <label className="mb-3 block text-sm font-medium">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1.5"
            />
          </label>

          <label className="mb-5 block text-sm font-medium">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1.5"
            />
          </label>

          {error && (
            <p className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
