import { StickyNote } from "lucide-react";

import NotesManager from "@/components/notes/NotesManager";
import PageHeader from "@/components/shared/PageHeader";
import { apiFetch } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";
import type { Note } from "@/lib/notes-api";

async function fetchNotes(token: string): Promise<Note[]> {
  try {
    return await apiFetch<Note[]>("/notes", { token });
  } catch {
    return [];
  }
}

export default async function NotesPage() {
  const token = await getAccessToken();
  const notes = token ? await fetchNotes(token) : [];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Personal Notes"
        subtitle="Encrypted private agent notes and internal checklists."
        badge={`${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Notes" }]}
        icon={<StickyNote size={18} />}
      />

      <NotesManager initialNotes={notes} />
    </div>
  );
}
