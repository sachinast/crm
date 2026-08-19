"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { createMasterOption, deleteMasterOption, type MasterFieldKey, type MasterOption } from "@/lib/master-options-api";

const FIELDS: { value: MasterFieldKey; label: string }[] = [
  { value: "booking_platform", label: "Booking Platform" },
  { value: "airline", label: "Airline" },
  { value: "cabin_class", label: "Cabin Class" },
  { value: "hotel_name", label: "Hotel Name" },
  { value: "room_type", label: "Room Type" },
  { value: "car_provider", label: "Car Provider" },
  { value: "vehicle_type", label: "Vehicle Type" },
  { value: "transmission", label: "Transmission" },
];

export default function MasterOptionsManager({ initialOptions }: { initialOptions: MasterOption[] }) {
  const [options, setOptions] = useState(initialOptions);
  const [active, setActive] = useState<MasterFieldKey>("booking_platform");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () => options.filter((o) => o.field_key === active).sort((a, b) => a.display_order - b.display_order),
    [options, active],
  );

  async function handleAdd() {
    if (!newValue.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createMasterOption(active, newValue.trim());
      setOptions((prev) => [...prev, created]);
      setNewValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add option");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMasterOption(id);
      setOptions((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete option");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FIELDS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActive(f.value)}
            className="badge"
            style={active === f.value ? { background: "var(--accent-soft)", color: "var(--accent)" } : { background: "var(--hairline)", color: "var(--ink-muted)" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={`New ${FIELDS.find((f) => f.value === active)?.label} value`}
          className="input flex-1"
        />
        <button onClick={handleAdd} disabled={saving || !newValue.trim()} className="btn-primary">
          <Plus size={14} />
          Add
        </button>
      </div>

      {error && (
        <p className="mb-3 text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <div className="card-flat overflow-x-auto p-0">
        <table className="table-modern">
          <thead>
            <tr>
              <th>Value</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={2} className="py-8 text-center" style={{ color: "var(--ink-faint)" }}>
                  No values defined for this field yet.
                </td>
              </tr>
            )}
            {visible.map((o) => (
              <tr key={o.id}>
                <td className="font-medium">{o.value}</td>
                <td>
                  <button onClick={() => handleDelete(o.id)} className="btn-ghost btn-sm px-1.5" title="Delete this value">
                    <Trash2 size={13} style={{ color: "var(--danger)" }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
