import { apiFetch, ApiError } from "@/lib/api-client";
import LandingView from "@/components/landing/LandingView";

async function getBackendHealth(): Promise<{ status: string } | { error: string }> {
  try {
    return await apiFetch<{ status: string }>("/health");
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Backend unreachable" };
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ login?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const isLoginRequested = params.login === "true" || params.login === "1";

  const health = await getBackendHealth();
  const isHealthy = "status" in health && health.status === "ok";
  const healthError = "error" in health ? health.error : undefined;

  return (
    <LandingView
      isBackendHealthy={isHealthy}
      healthError={healthError}
      defaultLoginOpen={isLoginRequested}
    />
  );
}
