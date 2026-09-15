import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.search;
  return proxyToBackend(`/dashboard/agent-performance${search}`, { method: "GET" });
}
