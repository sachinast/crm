"use client";

export interface Note {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

async function json<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${resp.status})`);
  }
  return resp.json() as Promise<T>;
}

export async function fetchNotes(): Promise<Note[]> {
  return json(await fetch("/api/notes"));
}

export async function createNote(title: string, body: string): Promise<Note> {
  return json(
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    }),
  );
}

export async function updateNote(id: string, patch: { title?: string; body?: string }): Promise<Note> {
  return json(
    await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteNote(id: string): Promise<void> {
  const resp = await fetch(`/api/notes/${id}`, { method: "DELETE" });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Could not delete note");
  }
}
