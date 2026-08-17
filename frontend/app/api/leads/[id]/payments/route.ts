import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/leads/${id}/payments`);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  // Backend's POST /payments takes lead_id in the body, not the URL.
  return proxyToBackend("/payments", { method: "POST", body: JSON.stringify({ ...body, lead_id: id }) });
}
