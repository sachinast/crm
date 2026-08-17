"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface AgentOption {
  id: string;
  name: string;
  email: string;
}

// The raw key is shown exactly once, right after creation — same convention
// as GitHub/Stripe API tokens. Nothing in this app can retrieve it again
// after this form unmounts; only the hash is stored server-side.
export default function CreateApiKeyForm({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [assignedAgentId, setAssignedAgentId] = useState(agents[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const resp = await fetch("/api/admin/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, assigned_agent_id: assignedAgentId }),
    });
    setSubmitting(false);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "Could not create API key");
      return;
    }

    const body = await resp.json();
    setCreatedKey(body.api_key);
    setName("");
  }

  async function handleCopy() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
  }

  function handleDone() {
    setCreatedKey(null);
    setCopied(false);
    router.refresh();
  }

  if (createdKey) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
        <p className="mb-2 font-medium text-amber-900">
          Copy this key now — it won&apos;t be shown again.
        </p>
        <div className="mb-3 flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded border bg-white px-2 py-1.5 text-xs">{createdKey}</code>
          <button
            onClick={handleCopy}
            className="rounded border px-3 py-1.5 text-xs hover:bg-white"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <button onClick={handleDone} className="rounded bg-neutral-900 px-3 py-1.5 text-xs text-white">
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm">
      <label className="col-span-2">
        Name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Zapier — Website Contact Form"
          className="input mt-1"
        />
      </label>
      <label className="col-span-2">
        Assign leads to
        <select
          required
          value={assignedAgentId}
          onChange={(e) => setAssignedAgentId(e.target.value)}
          className="input mt-1"
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.email})
            </option>
          ))}
        </select>
      </label>
      {error && <p className="col-span-2 text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !assignedAgentId}
        className="col-span-2 rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create API key"}
      </button>
    </form>
  );
}
