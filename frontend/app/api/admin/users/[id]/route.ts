import { proxyToBackend } from "@/lib/backend-proxy";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(`/users/${id}`, { method: "PATCH", body });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const url = new URL(request.url);
  const reassignTo = url.searchParams.get("reassign_leads_to");
  const query = reassignTo ? `?reassign_leads_to=${encodeURIComponent(reassignTo)}` : "";
  return proxyToBackend(`/users/${id}${query}`, { method: "DELETE" });
}
