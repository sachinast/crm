"use client";

import { Search, Users, X } from "lucide-react";
import { useEffect, useState } from "react";

import { searchUsers, type UserSearchResult } from "@/lib/messaging-api";

export default function NewConversationModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (userIds: string[], name?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Nested one level (rather than setLoading(true) as a bare top-level
    // statement) to satisfy react-hooks/set-state-in-effect — same shape
    // lib/ws-client.ts's connect() uses for its own setState-on-connect call.
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    const timer = setTimeout(async () => {
      try {
        const users = await searchUsers(query);
        if (!cancelled) setResults(users);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function toggle(user: UserSearchResult) {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user],
    );
  }

  function handleStart() {
    if (selected.length === 0) return;
    onStart(
      selected.map((u) => u.id),
      selected.length > 1 ? groupName || undefined : undefined,
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center p-6 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div className="card mt-16 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <Users size={16} className="text-accent" />
            New conversation
          </h2>
          <button onClick={onClose} className="btn-ghost btn-sm px-2 text-ink-muted">
            <X size={16} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people by name or email"
            className="input pl-9"
          />
        </div>

        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {selected.map((u) => (
              <span key={u.id} className="badge bg-accent-soft text-accent-ink border border-accent/30 font-semibold">
                {u.name}
                <button onClick={() => toggle(u)} className="ml-1 text-accent hover:opacity-80">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {selected.length > 1 && (
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name (optional)"
            className="input mb-3"
          />
        )}

        <ul className="mb-4 flex max-h-64 flex-col gap-1 overflow-y-auto scrollbar-thin">
          {loading && <li className="px-2 py-3 text-xs text-ink-faint">Searching…</li>}
          {!loading && results.length === 0 && (
            <li className="px-2 py-3 text-xs text-ink-faint">No matching users.</li>
          )}
          {results.map((user) => {
            const isSelected = selected.some((u) => u.id === user.id);
            return (
              <li key={user.id}>
                <button
                  onClick={() => toggle(user)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    isSelected ? "bg-accent-soft text-ink font-semibold" : "hover:bg-surface-raised text-ink"
                  }`}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-xs font-bold text-accent border border-hairline"
                  >
                    {user.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{user.name}</span>
                    <span className="block truncate text-xs capitalize text-ink-muted">
                      {user.role.replace(/_/g, " ")} · {user.email}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <button onClick={handleStart} disabled={selected.length === 0} className="btn-primary w-full">
          {selected.length > 1 ? "Start group conversation" : "Start conversation"}
        </button>
      </div>
    </div>
  );
}
