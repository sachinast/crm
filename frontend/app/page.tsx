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
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 font-sans">
      <h1 className="text-2xl font-semibold">Travel CRM — Phase 0 Scaffold</h1>
      <p className="text-sm text-neutral-500">
        Next.js frontend talking to the FastAPI backend at{" "}
        <code>{process.env.NEXT_PUBLIC_API_BASE_URL}</code>
      </p>
      <div
        className={`rounded-md px-4 py-2 text-sm ${
          isHealthy ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}
      >
        {isHealthy ? "✓ Backend is reachable" : `✗ ${"error" in health ? health.error : "unknown error"}`}
      </div>
      <p className="text-xs text-neutral-400">
        See <code>docs/TECHNICAL_SPEC.md</code> in the repo root for the full build plan.
      </p>
    </main>
  );
}
