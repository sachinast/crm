import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const templateType = url.searchParams.get("template_type") || "new_booking";
  return proxyToBackend(`/leads/${id}/send-auth-email?template_type=${templateType}`, { method: "POST" });
}
