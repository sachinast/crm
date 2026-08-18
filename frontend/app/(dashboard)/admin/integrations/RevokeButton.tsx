"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RevokeButton({ keyId, isActive }: { keyId: string; isActive: boolean }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    await fetch(`/api/admin/integrations/${keyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !isActive }),
    });
    setSubmitting(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={submitting}
      className="text-xs underline disabled:cursor-not-allowed disabled:opacity-50"
      style={{ color: isActive ? "var(--danger)" : "var(--success)" }}
    >
      {submitting ? "…" : isActive ? "Revoke" : "Reactivate"}
    </button>
  );
}
