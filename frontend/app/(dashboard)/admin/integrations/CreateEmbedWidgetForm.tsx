"use client";

import { Code2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface AgentOption {
  id: string;
  name: string;
  email: string;
}

export default function CreateEmbedWidgetForm({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [assignedAgentId, setAssignedAgentId] = useState(agents[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const resp = await fetch("/api/admin/embed-widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, assigned_agent_id: assignedAgentId }),
    });
    setSubmitting(false);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not create widget");
      return;
    }

    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card grid grid-cols-2 gap-3 text-sm">
      <label className="col-span-2 font-medium">
        Widget name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Homepage booking widget"
          className="input mt-1.5"
        />
      </label>
      <label className="col-span-2 font-medium">
        Leads captured through it go to
        <select required value={assignedAgentId} onChange={(e) => setAssignedAgentId(e.target.value)} className="input mt-1.5">
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.email})
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="col-span-2 rounded-lg px-3 py-2" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting || !assignedAgentId} className="btn-primary col-span-2">
        <Code2 size={15} />
        {submitting ? "Creating…" : "Create widget"}
      </button>
    </form>
  );
}
