import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET() {
  return proxyToBackend("/admin/roles");
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyToBackend("/admin/roles", { method: "POST", body });
}
