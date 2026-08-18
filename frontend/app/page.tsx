import Link from "next/link";

import { apiFetch, ApiError } from "@/lib/api-client";

async function getBackendHealth(): Promise<{ status: string } | { error: string }> {
  try {
    return await apiFetch<{ status: string }>("/health");
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Backend unreachable" };
  }
}

export default async function Home() {
  const health = await getBackendHealth();
  const isHealthy = "status" in health && health.status === "ok";

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, rgba(179,135,47,0.10), transparent 45%), radial-gradient(circle at 80% 80%, rgba(18,23,43,0.06), transparent 50%), var(--background)",
      }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold"
        style={{ background: "var(--navy)", color: "var(--accent)" }}
      >
        P
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CRM PRO</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
          Secure, role-based, audit-ready Car · Hotel · Flight booking management.
        </p>
      </div>

      <div className="badge" style={{ background: isHealthy ? "var(--success-soft)" : "var(--danger-soft)", color: isHealthy ? "var(--success)" : "var(--danger)" }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
        {isHealthy ? "Backend is reachable" : `Backend unreachable — ${"error" in health ? health.error : "unknown error"}`}
      </div>

      <Link href="/login" className="btn-primary">
        Sign in
      </Link>

      <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
        See <code>docs/TECHNICAL_SPEC.md</code> in the repo root for the full build plan.
      </p>
    </main>
  );
}
