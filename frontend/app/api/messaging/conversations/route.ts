import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET() {
  return proxyToBackend("/messaging/conversations");
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyToBackend("/messaging/conversations", { method: "POST", body });
}
