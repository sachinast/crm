"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface ClockDef {
  timezone: string;
  label: string;
  enabled: boolean;
}

const STORAGE_KEY = "crm_header_clocks_visible";

function readVisiblePref(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

/**
 * Super Admin configures up to 3 world clocks via the generic Settings page
 * (app_settings key "header_clocks" — no dedicated admin UI needed, the
 * existing JSON editor at /admin/settings covers it). Each user independently
 * chooses whether to see them, remembered in localStorage — that choice is
 * per-browser, not synced server-side, since it's pure display preference.
 * Renders immediately to the left of the notification bell, which stays the
 * rightmost header element either way.
 */
export default function HeaderClocks() {
  const [clocks, setClocks] = useState<ClockDef[]>([]);
  const [visible, setVisible] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    // Nested one level (rather than a bare top-level setState statement) to
    // satisfy react-hooks/set-state-in-effect — same shape
    // NewConversationModal.tsx uses for its own setState-on-mount call.
    queueMicrotask(() => {
      if (!cancelled) setVisible(readVisiblePref());
    });
    fetch("/api/header-clocks")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ClockDef[]) => {
        if (!cancelled) setClocks(data.filter((c) => c.enabled));
      })
      .catch(() => {
        if (!cancelled) setClocks([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  function toggle() {
    const next = !visible;
    setVisible(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
  }

  if (clocks.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {visible && (
        <div className="flex items-center gap-3">
          {clocks.map((c) => (
            <div key={c.timezone} className="text-right">
              <p className="text-xs font-semibold leading-tight text-header-ink">
                {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: c.timezone })}
              </p>
              <p className="text-[10px] leading-tight text-header-ink-muted">
                {c.label}
              </p>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={toggle}
        className={`flex h-8 w-8 items-center justify-center rounded-xl border border-header-hairline bg-sidebar-surface transition-colors ${
          visible ? "text-accent border-accent/40" : "text-header-ink-muted hover:text-header-ink hover:bg-sidebar-surface-raised"
        }`}
        title={visible ? "Hide world clocks" : "Show world clocks"}
      >
        <Clock size={15} />
      </button>
    </div>
  );
}
