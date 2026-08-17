import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET() {
  return proxyToBackend("/integrations/api-keys");
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyToBackend("/integrations/api-keys", { method: "POST", body });
}
