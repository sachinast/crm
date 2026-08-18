import { proxyToBackend } from "@/lib/backend-proxy";

export async function PATCH(request: Request, { params }: { params: Promise<{ status: string }> }) {
  const { status: statusValue } = await params;
  const body = await request.text();
  return proxyToBackend(`/admin/status-permissions/${statusValue}`, { method: "PATCH", body });
}
