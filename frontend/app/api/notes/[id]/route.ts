import { proxyToBackend } from "@/lib/backend-proxy";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(`/notes/${id}`, { method: "PATCH", body });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/notes/${id}`, { method: "DELETE" });
}
