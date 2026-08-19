import { proxyToBackend } from "@/lib/backend-proxy";

// Upload bypasses this route entirely (see lib/files-api.ts uploadFile) — only
// listing goes through the Next server, same split as messaging attachments.
export async function GET(request: Request) {
  const { search } = new URL(request.url);
  return proxyToBackend(`/files${search}`);
}
