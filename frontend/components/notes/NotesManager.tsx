"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { createNote, deleteNote, updateNote, type Note } from "@/lib/notes-api";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function NotesManager({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: "", body: "" });

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
    <div>
      <div className="card mb-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="input mb-2 w-full"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a note…"
          rows={3}
          className="input mb-2 w-full"
        />
        <button onClick={handleCreate} disabled={saving || !title.trim()} className="btn-primary">
          <Plus size={14} />
          Add note
        </button>
      </div>

      {error && (
        <p className="mb-4 alert-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {notes.length === 0 && (
          <p className="text-sm text-ink-faint">
            No notes yet.
          </p>
        )}
        {notes.map((n) => (
          <div key={n.id} className="card-flat">
            {editingId === n.id ? (
              <div>
                <input
                  value={editDraft.title}
                  onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                  className="input mb-2 w-full"
                />
                <textarea
                  value={editDraft.body}
                  onChange={(e) => setEditDraft({ ...editDraft, body: e.target.value })}
                  rows={3}
                  className="input mb-2 w-full"
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(n.id)} className="btn-primary btn-sm">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="btn-ghost btn-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink text-sm">{n.title}</p>
                  <button onClick={() => handleDelete(n.id)} className="btn-ghost btn-sm shrink-0 px-1.5 text-danger" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="mb-2 whitespace-pre-wrap text-sm text-ink-muted">
                  {n.body}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-ink-faint">
                    {fmt(n.updated_at)}
                  </p>
                  <button onClick={() => startEdit(n)} className="text-xs font-semibold text-accent hover:opacity-80">
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
