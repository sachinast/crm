import { Download, FileAudio, FileImage, FileText, FileVideo } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

interface SharedFile {
  id: string;
  file_name: string;
  content_type: string;
  kind: "image" | "pdf" | "ppt" | "video" | "audio";
  size_bytes: number;
  created_at: string;
}

const KIND_ICON: Record<SharedFile["kind"], typeof FileImage> = {
  image: FileImage,
  pdf: FileText,
  ppt: FileText,
  video: FileVideo,
  audio: FileAudio,
};

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fetchSharedFile(token: string): Promise<{ file: SharedFile | null; error: string | null }> {
  // Unauthenticated on purpose — GET /s/{token} is FastAPI's public share
  // endpoint (app/api/v1/files.py) and logs a "view" event on every hit,
  // same as clicking a shared messaging link.
  const resp = await fetch(`${API_BASE_URL}/s/${token}`, { cache: "no-store" });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    return { file: null, error: typeof body.detail === "string" ? body.detail : "This link is invalid or has expired." };
  }
  return { file: await resp.json(), error: null };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen justify-center p-6 sm:p-10 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold bg-navy text-accent">
            P
          </div>
          <span className="text-sm font-semibold tracking-tight text-ink">CRM PRO</span>
        </div>
        {children}
      </div>
    </main>
  );
}

export default async function SharedFilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { file, error } = await fetchSharedFile(token);

  if (!file) {
    return (
      <Shell>
        <div className="card text-center text-sm text-ink-muted">
          <p>{error}</p>
        </div>
      </Shell>
    );
  }

  const Icon = KIND_ICON[file.kind];

  return (
    <Shell>
      <div className="card text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Icon size={28} />
        </div>
        <p className="mb-1 break-words font-semibold text-ink text-base">{file.file_name}</p>
        <p className="mb-5 text-xs text-ink-faint">
          {fmtSize(file.size_bytes)}
        </p>
        <a href={`${API_BASE_URL}/s/${token}/download`} className="btn-primary inline-flex">
          <Download size={16} />
          Download
        </a>
      </div>
    </Shell>
  );
}
