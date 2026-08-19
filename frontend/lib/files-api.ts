"use client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface FileRecord {
  id: string;
  uploaded_by: string;
  uploader_name: string | null;
  file_name: string;
  content_type: string;
  kind: "image" | "pdf" | "ppt" | "video" | "audio";
  size_bytes: number;
  created_at: string;
}

export interface ShareLink {
  id: string;
  file_id: string;
  token: string;
  is_active: boolean;
  created_at: string;
  view_count: number;
  click_count: number;
}

async function json<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${resp.status})`);
  }
  return resp.json() as Promise<T>;
}

export async function fetchFiles(opts: { all?: boolean; userId?: string } = {}): Promise<FileRecord[]> {
  const params = new URLSearchParams();
  if (opts.all) params.set("all", "true");
  if (opts.userId) params.set("user_id", opts.userId);
  const query = params.toString() ? `?${params.toString()}` : "";
  return json(await fetch(`/api/files${query}`));
}

export async function deleteFile(id: string): Promise<void> {
  const resp = await fetch(`/api/files/${id}`, { method: "DELETE" });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Could not delete file");
  }
}

export async function fetchShareLinks(fileId: string): Promise<ShareLink[]> {
  return json(await fetch(`/api/files/${fileId}/shares`));
}

export async function createShareLink(fileId: string): Promise<ShareLink> {
  return json(await fetch(`/api/files/${fileId}/share`, { method: "POST" }));
}

export async function revokeShareLink(shareId: string): Promise<void> {
  const resp = await fetch(`/api/shares/${shareId}`, { method: "DELETE" });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Could not revoke link");
  }
}

export function sharePageUrl(token: string): string {
  if (typeof window === "undefined") return `/s/${token}`;
  return `${window.location.origin}/s/${token}`;
}

/**
 * Upload/download bypass the Next.js server and talk to FastAPI directly —
 * same reasoning as messaging attachments (lib/messaging-api.ts): a plain
 * <a href> download link can't carry an Authorization header, and a
 * multipart upload shouldn't be squeezed through a Vercel serverless
 * function's body-size ceiling. Reuses the same short-lived-token endpoint
 * messaging already established rather than minting a second one.
 */
async function getClientToken(): Promise<string> {
  const resp = await fetch("/api/notifications/ws-token");
  if (!resp.ok) throw new Error("Not authenticated");
  const { token } = await resp.json();
  return token;
}

export async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<FileRecord> {
  const token = await getClientToken();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/files`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new Error(typeof body.detail === "string" ? body.detail : "Upload failed"));
        } catch {
          reject(new Error("Upload failed"));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

const tokenPromise: { current: Promise<string> | null } = { current: null };

export async function fileDownloadUrl(fileId: string): Promise<string> {
  if (!tokenPromise.current) tokenPromise.current = getClientToken();
  const token = await tokenPromise.current;
  return `${API_BASE_URL}/files/${fileId}/download?token=${encodeURIComponent(token)}`;
}
