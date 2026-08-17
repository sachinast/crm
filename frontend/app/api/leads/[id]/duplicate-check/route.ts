import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/leads/${id}/duplicate-check`);
}
