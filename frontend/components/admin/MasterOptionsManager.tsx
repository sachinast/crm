"use client";

import { Plus, Trash2, Database, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";

import {
  createMasterOption,
  deleteMasterOption,
  type MasterFieldKey,
  type MasterOption,
} from "@/lib/master-options-api";
import DataTableCard from "@/components/shared/DataTableCard";

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
    <div className="space-y-4">
      {/* Aligned DataTableCard Grid */}
      <DataTableCard
        headerContent={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 py-0.5">
              {FIELDS.map((f) => {
                const isActive = active === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => setActive(f.value)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-[#d3ab5e] text-slate-950 font-bold shadow-sm"
                        : "bg-[#0d1220] text-slate-300 border border-[#232e47] hover:border-[#d3ab5e] hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-slate-400 font-medium">
              {visible.length} {visible.length === 1 ? "option" : "options"}
            </div>
          </div>
        }
      >
        {/* Quick Add Toolbar */}
        <div className="p-3.5 bg-[#182136]/20 border-b border-[#232e47]">
          <div className="flex items-center gap-2 max-w-md">
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder={`Add new ${FIELDS.find((f) => f.value === active)?.label} value...`}
              className="input text-xs"
            />
            <button
              onClick={handleAdd}
              disabled={saving || !newValue.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d3ab5e] to-[#e0bc78] px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Add</span>
            </button>
          </div>

          {error && (
            <p className="mt-2 text-xs text-[#ef7b93] flex items-center gap-1">
              <AlertTriangle size={12} />
              <span>{error}</span>
            </p>
          )}
        </div>

        <table className="table-modern w-full">
          <thead>
            <tr className="bg-[#182136]/30">
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Option Display Value
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Category Master
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#232e47]">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center text-xs text-slate-400">
                  No dropdown values defined for this category yet.
                </td>
              </tr>
            ) : (
              visible.map((opt) => (
                <tr key={opt.id} className="transition-colors hover:bg-[#182136]/60">
                  <td className="px-4 py-3 font-semibold text-white">
                    {opt.value}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#d3ab5e]">
                    {opt.field_key}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(opt.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-[#34131c] hover:text-[#ef7b93] transition-colors"
                      title="Delete option"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableCard>
    </div>
  );
}
