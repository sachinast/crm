import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(request: Request) {
  const body = await request.text();
  return proxyToBackend("/admin/custom-fields", { method: "POST", body });
}
