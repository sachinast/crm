import { proxyToBackend } from "@/lib/backend-proxy";

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const body = await request.text();
  return proxyToBackend(`/admin/settings/${encodeURIComponent(key)}`, { method: "PATCH", body });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return proxyToBackend(`/admin/settings/${encodeURIComponent(key)}`, { method: "DELETE" });
}
