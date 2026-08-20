"use client";

import { Plus, Trash2, ArrowUpDown, Clock, Calendar } from "lucide-react";
import { useState } from "react";

import { createNote, deleteNote, updateNote, type Note } from "@/lib/notes-api";
import { TableSearchBar, useTableSortAndFilter } from "@/components/shared/SortableTable";
import { formatDateTime } from "@/lib/formatters";

function fmt(iso: string): string {
  return formatDateTime(iso);
}

export default function NotesManager({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: "", body: "" });

  const {
    items: filteredNotes,
    searchQuery,
    setSearchQuery,
    sortKey,
    sortDirection,
    toggleSort,
    resetFilters,
    isFiltered,
    totalCount,
    filteredCount,
  } = useTableSortAndFilter<Note>({
    data: notes,
    searchFields: ["title", "body"],
    initialSortKey: "updated_at",
    initialSortDirection: "desc",
  });

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createNote(title.trim(), body);
      setNotes((prev) => [created, ...prev]);
      setTitle("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create note");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(n: Note) {
    setEditingId(n.id);
    setEditDraft({ title: n.title, body: n.body });
  }

  async function saveEdit(id: string) {
    try {
      const updated = await updateNote(id, editDraft);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete note");
    }
  }

  return (
    <div className="space-y-6">
      {/* Create Note Card */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-ink mb-3">Create Quick Note</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="input mb-2.5 w-full text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write confidential note details or checklists…"
          rows={3}
          className="input mb-3 w-full text-sm"
        />
        <button onClick={handleCreate} disabled={saving || !title.trim()} className="btn-primary flex items-center gap-1.5">
          <Plus size={14} />
          <span>Save Note</span>
        </button>
      </div>

      {error && <p className="alert-danger">{error}</p>}

      {/* Search & Sort Bar */}
      <div className="card p-4">
        <TableSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Search note titles and details..."
          totalCount={totalCount}
          filteredCount={filteredCount}
          isFiltered={isFiltered}
          onResetFilters={resetFilters}
        >
          {/* Sorting Buttons */}
          <div className="flex items-center gap-1.5 border-l border-hairline pl-2.5">
            <span className="text-xs text-ink-muted">Sort:</span>
            <button
              type="button"
              onClick={() => toggleSort("title")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors ${
                sortKey === "title"
                  ? "bg-accent text-white border-accent"
                  : "bg-surface-raised border-hairline text-ink-muted hover:text-ink"
              }`}
            >
              Title {sortKey === "title" && (sortDirection === "asc" ? "↑" : "↓")}
            </button>
            <button
              type="button"
              onClick={() => toggleSort("updated_at")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors ${
                sortKey === "updated_at"
                  ? "bg-accent text-white border-accent"
                  : "bg-surface-raised border-hairline text-ink-muted hover:text-ink"
              }`}
            >
              Date {sortKey === "updated_at" && (sortDirection === "asc" ? "↑" : "↓")}
            </button>
          </div>
        </TableSearchBar>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredNotes.length === 0 && (
          <div className="col-span-full card p-8 text-center text-sm text-ink-muted">
            {isFiltered ? "No matching notes found for your search." : "No personal notes yet. Create your first note above."}
          </div>
        )}
        {filteredNotes.map((n) => (
          <div key={n.id} className="card-flat p-4 flex flex-col justify-between transition-shadow hover:shadow-md">
            {editingId === n.id ? (
              <div>
                <input
                  value={editDraft.title}
                  onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                  className="input mb-2 w-full text-sm font-semibold"
                />
                <textarea
                  value={editDraft.body}
                  onChange={(e) => setEditDraft({ ...editDraft, body: e.target.value })}
                  rows={3}
                  className="input mb-2.5 w-full text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(n.id)} className="btn-primary btn-sm text-xs">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="btn-ghost btn-sm text-xs">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink text-sm">{n.title}</p>
                  <button onClick={() => handleDelete(n.id)} className="btn-ghost btn-sm shrink-0 px-1.5 text-danger hover:bg-rose-500/10" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="mb-3 whitespace-pre-wrap text-sm text-ink-muted">
                  {n.body}
                </p>
                <div className="flex items-center justify-between border-t border-hairline pt-2.5 mt-auto">
                  <p className="text-xs text-ink-faint">
                    {fmt(n.updated_at)}
                  </p>
                  <button onClick={() => startEdit(n)} className="text-xs font-semibold text-accent hover:underline">
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
