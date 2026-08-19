import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET() {
  return proxyToBackend("/notes");
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyToBackend("/notes", { method: "POST", body });
}
