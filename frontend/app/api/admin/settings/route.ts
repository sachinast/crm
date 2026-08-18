import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET() {
  return proxyToBackend("/admin/settings");
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyToBackend("/admin/settings", { method: "POST", body });
}
