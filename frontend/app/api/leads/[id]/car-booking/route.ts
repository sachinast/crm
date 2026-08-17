import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(`/leads/${id}/car-booking`, { method: "POST", body });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(`/leads/${id}/car-booking`, { method: "PATCH", body });
}
