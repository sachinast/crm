import { StickyNote } from "lucide-react";

import NotesManager from "@/components/notes/NotesManager";
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
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accent-soft)" }}>
          <StickyNote size={18} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Private notes, visible only to you.
          </p>
        </div>
      </div>

      <NotesManager initialNotes={notes} />
    </div>
  );
}
