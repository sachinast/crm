"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { RoleDef } from "@/lib/roles-api";

export default function CreateUserForm({ roles }: { roles: RoleDef[] }) {
  const router = useRouter();
  const emptyForm = { name: "", email: "", password: "", role_name: roles[0]?.name ?? "" };
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const resp = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSubmitting(false);

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      setError(body.detail ?? body.error ?? "Failed to create user");
      return;
    }

    setForm(emptyForm);
    router.refresh(); // re-runs the server component list below with the new row
  }

  return (
    <form onSubmit={handleSubmit} className="card grid grid-cols-2 gap-3">
      <input
        required
        placeholder="Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="input"
      />
      <input
        required
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="input"
      />
      <input
        required
        type="password"
        placeholder="Temporary password (min 8 chars)"
        minLength={8}
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        className="input"
      />
      <select
        value={form.role_name}
        onChange={(e) => setForm({ ...form, role_name: e.target.value })}
        className="input capitalize"
      >
        {roles.map((role) => (
          <option key={role.id} value={role.name} className="capitalize">
            {role.name.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      {error && (
        <p className="col-span-2 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting || roles.length === 0} className="btn-primary col-span-2">
        {submitting ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}
