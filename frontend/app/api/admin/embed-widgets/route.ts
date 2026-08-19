import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET() {
  return proxyToBackend("/admin/embed-widgets");
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyToBackend("/admin/embed-widgets", { method: "POST", body });
}
