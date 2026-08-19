import { FolderOpen } from "lucide-react";

import FileManager from "@/components/files/FileManager";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default async function FilesPage() {
  const user = await getCurrentUser();
  const canViewAll = hasPermission(user, "files.view_all");

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
          <FolderOpen size={18} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Upload, share, and track image, PDF, PPT, video, and audio files.
          </p>
        </div>
      </div>

      <FileManager canViewAll={canViewAll} />
    </div>
  );
}
