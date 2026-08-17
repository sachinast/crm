import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(`/leads/${id}/reveal`, { method: "POST", body });
}
