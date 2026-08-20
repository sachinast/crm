import { FolderOpen } from "lucide-react";

import FileManager from "@/components/files/FileManager";
import PageHeader from "@/components/shared/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default async function FilesPage() {
  const user = await getCurrentUser();
  const canViewAll = hasPermission(user, "files.view_all");

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="File Vault"
        subtitle="Upload, preview, share, and track PDF tickets, vouchers, PPTs, image, and media attachments."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Files" }]}
        icon={<FolderOpen size={18} />}
      />

      <FileManager canViewAll={canViewAll} />
    </div>
  );
}
