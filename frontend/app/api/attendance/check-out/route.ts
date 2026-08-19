import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST() {
  return proxyToBackend("/attendance/check-out", { method: "POST" });
}
