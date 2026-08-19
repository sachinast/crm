import { proxyToBackend } from "@/lib/backend-proxy";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/files/${id}`, { method: "DELETE" });
}
