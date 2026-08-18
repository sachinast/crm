import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/messaging/conversations/${id}/read`, { method: "POST", body: "{}" });
}
