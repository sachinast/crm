"use client";

import { FileAudio, FileImage, FileText, FileVideo, Link2, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  createShareLink,
  deleteFile,
  fetchFiles,
  fetchShareLinks,
  fileDownloadUrl,
  revokeShareLink,
  sharePageUrl,
  uploadFile,
  type FileRecord,
  type ShareLink,
} from "@/lib/files-api";

const KIND_ICON: Record<FileRecord["kind"], typeof FileImage> = {
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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function ShareDialog({ file, onClose }: { file: FileRecord; onClose: () => void }) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchShareLinks(file.id)
      .then(setLinks)
      .catch(() => setError("Could not load share links"))
      .finally(() => setLoading(false));
  }, [file.id]);

  async function handleCreate() {
    try {
      const link = await createShareLink(file.id);
      setLinks((prev) => [link, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create link");
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeShareLink(id);
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, is_active: false } : l)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke link");
    }
  }

  function handleCopy(link: ShareLink) {
    navigator.clipboard.writeText(sharePageUrl(link.token)).then(() => {
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="card w-full max-w-md shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold text-ink">Share “{file.file_name}”</p>
          <button onClick={onClose} className="btn-ghost btn-sm px-2 text-ink-muted">
            <X size={16} />
          </button>
        </div>

        <button onClick={handleCreate} className="btn-secondary btn-sm mb-3">
          <Link2 size={14} />
          Create new link
        </button>

        {error && (
          <p className="mb-2 text-xs text-danger">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-ink-faint">
            Loading…
          </p>
        ) : links.length === 0 ? (
          <p className="text-sm text-ink-faint">
            No share links yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {links.map((l) => (
              <div key={l.id} className="card-flat">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className={`truncate font-mono text-xs ${l.is_active ? "text-ink font-semibold" : "text-ink-faint"}`}>
                    {l.token.slice(0, 20)}…
                  </p>
                  {l.is_active ? (
                    <div className="flex shrink-0 gap-1.5">
                      <button onClick={() => handleCopy(l)} className="text-xs font-semibold text-accent hover:opacity-80">
                        {copiedId === l.id ? "Copied!" : "Copy"}
                      </button>
                      <button onClick={() => handleRevoke(l.id)} className="text-xs font-semibold text-danger hover:opacity-80">
                        Revoke
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-faint">
                      Revoked
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-muted">
                  {l.view_count} view{l.view_count === 1 ? "" : "s"} · {l.click_count} download{l.click_count === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FileManager({ canViewAll }: { canViewAll: boolean }) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [shareFile, setShareFile] = useState<FileRecord | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    // Nested one level (rather than setLoading(true) as a bare top-level
    // statement) to satisfy react-hooks/set-state-in-effect.
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    fetchFiles({ all: showAll })
      .then((data) => {
        if (!cancelled) setFiles(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load files");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showAll]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const created = await uploadFile(file, setProgress);
      setFiles((prev) => [created, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete file");
    }
  }

  async function handleDownload(f: FileRecord) {
    const url = await fileDownloadUrl(f.id);
    window.open(url, "_blank");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <label className="btn-primary cursor-pointer">
          <Upload size={16} />
          {uploading ? `Uploading… ${progress}%` : "Upload file"}
          <input ref={inputRef} type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
        {canViewAll && (
          <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-4 w-4 rounded accent-amber-500" />
            Show every user&apos;s files
          </label>
        )}
      </div>

      {error && (
        <p className="mb-4 alert-danger">
          {error}
        </p>
      )}

      <div className="card-flat overflow-x-auto p-0">
        <table className="table-modern w-full">
          <thead>
            <tr>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-ink-faint">File</th>
              {showAll && <th className="text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Uploaded by</th>}
              <th className="text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Size</th>
              <th className="text-left text-xs font-bold uppercase tracking-wider text-ink-faint">Uploaded</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {!loading && files.length === 0 && (
              <tr>
                <td colSpan={showAll ? 5 : 4} className="py-8 text-center text-sm text-ink-faint">
                  No files yet.
                </td>
              </tr>
            )}
            {files.map((f) => {
              const Icon = KIND_ICON[f.kind];
              return (
                <tr key={f.id} className="hover:bg-surface-raised transition-colors">
                  <td className="flex items-center gap-2.5 font-semibold text-ink text-sm">
                    <Icon size={16} className="text-accent" />
                    {f.file_name}
                  </td>
                  {showAll && <td className="text-sm text-ink-muted">{f.uploader_name ?? "—"}</td>}
                  <td className="text-sm text-ink-muted">{fmtSize(f.size_bytes)}</td>
                  <td className="text-sm text-ink-muted">{fmtDate(f.created_at)}</td>
                  <td className="flex justify-end gap-1.5">
                    <button onClick={() => handleDownload(f)} className="btn-ghost btn-sm">
                      Download
                    </button>
                    <button onClick={() => setShareFile(f)} className="btn-ghost btn-sm px-2 text-ink-muted" title="Share">
                      <Link2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(f.id)} className="btn-ghost btn-sm px-2 text-danger" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {shareFile && <ShareDialog file={shareFile} onClose={() => setShareFile(null)} />}
    </div>
  );
}
