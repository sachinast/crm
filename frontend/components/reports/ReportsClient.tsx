"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  Car,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Plane,
  Hotel,
  TrendingUp,
  Download,
  Filter,
} from "lucide-react";
import DataTableCard from "@/components/shared/DataTableCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/formatters";

export interface ReportLeadItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  service_type: "car" | "hotel" | "flight" | string | null;
  status: string;
  created_at: string;
  pickup_datetime?: string | null;
  booking_reference?: string | null;
  provider_name?: string | null;
  location?: string | null;
}

export default function ReportsClient({ leads }: { leads: ReportLeadItem[] }) {
  const [activeTab, setActiveTab] = useState<"pickups" | "bookings" | "cancellations">("pickups");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [serviceFilter, setServiceFilter] = useState("all");

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const pickupsList = useMemo(() => {
    return leads.filter((l) => {
      const matchService = serviceFilter === "all" || l.service_type === serviceFilter;
      // Filter by pickup date or created date matching selectedDate
      const dateMatch = l.created_at.startsWith(selectedDate);
      return matchService && dateMatch;
    });
  }, [leads, selectedDate, serviceFilter]);

  const newBookingsList = useMemo(() => {
    return leads.filter((l) => {
      const matchService = serviceFilter === "all" || l.service_type === serviceFilter;
      return matchService && l.created_at.startsWith(selectedDate);
    });
  }, [leads, selectedDate, serviceFilter]);

  const cancellationsList = useMemo(() => {
    return leads.filter((l) => {
      const isCancelled =
        l.status.toLowerCase().includes("cancel") ||
        l.status.toLowerCase().includes("drop") ||
        l.status.toLowerCase().includes("refund");
      const matchService = serviceFilter === "all" || l.service_type === serviceFilter;
      return isCancelled && matchService;
    });
  }, [leads, serviceFilter]);

  const stats = useMemo(() => {
    const totalToday = leads.filter((l) => l.created_at.startsWith(todayStr)).length;
    const cancelledTotal = leads.filter((l) =>
      l.status.toLowerCase().includes("cancel") ||
      l.status.toLowerCase().includes("drop") ||
      l.status.toLowerCase().includes("refund"),
    ).length;
    const pickupsToday = leads.filter((l) => l.created_at.startsWith(todayStr) && l.service_type === "car").length;
    return { totalToday, cancelledTotal, pickupsToday };
  }, [leads, todayStr]);

  const currentDataset = activeTab === "pickups" ? pickupsList : activeTab === "bookings" ? newBookingsList : cancellationsList;

  function exportCSV() {
    const headers = ["ID", "Customer Name", "Phone", "Email", "Service Type", "Status", "Created At"];
    const rows = currentDataset.map((item) => [
      item.id,
      item.name || "N/A",
      item.phone || "N/A",
      item.email || "N/A",
      item.service_type || "N/A",
      item.status || "N/A",
      item.created_at,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTab}_report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-4 bg-surface p-4 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Car size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Daily Pickups Today</p>
            <p className="font-mono text-2xl font-black text-ink">{stats.pickupsToday}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 bg-surface p-4 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">New Bookings Today</p>
            <p className="font-mono text-2xl font-black text-ink">{stats.totalToday}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 bg-surface p-4 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-danger">
            <XCircle size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Cancellations & Refunds</p>
            <p className="font-mono text-2xl font-black text-ink">{stats.cancelledTotal}</p>
          </div>
        </div>
      </div>

      {/* Main Report Table */}
      <DataTableCard
        headerContent={
          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Tab Navigation */}
              <div className="flex items-center gap-1.5 p-0.5 rounded-xl border border-hairline bg-surface-raised">
                <button
                  type="button"
                  onClick={() => setActiveTab("pickups")}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                    activeTab === "pickups"
                      ? "bg-accent text-white shadow-xs"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Daily Pickups
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("bookings")}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                    activeTab === "bookings"
                      ? "bg-accent text-white shadow-xs"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  New Bookings
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("cancellations")}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                    activeTab === "cancellations"
                      ? "bg-accent text-white shadow-xs"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Cancellations
                </button>
              </div>

              {/* Filters Toolbar */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input py-1 px-2.5 text-xs font-mono"
                />

                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="select py-1 px-2.5 text-xs font-medium"
                >
                  <option value="all">All Services</option>
                  <option value="car">Car Rental</option>
                  <option value="hotel">Hotel</option>
                  <option value="flight">Flight</option>
                </select>

                <button
                  type="button"
                  onClick={exportCSV}
                  className="btn-secondary btn-sm inline-flex items-center gap-1.5 text-xs"
                  title="Export report to CSV"
                >
                  <Download size={13} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        }
      >
        <table className="table-modern w-full">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                Customer Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                Service Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                Date & Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {currentDataset.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-ink-muted">
                  No records found for the selected date and filters.
                </td>
              </tr>
            ) : (
              currentDataset.map((lead) => (
                <tr key={lead.id} className="transition-colors hover:bg-surface-raised">
                  <td className="px-4 py-3.5 font-semibold text-sm text-ink">
                    {lead.name || "Customer"}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-surface px-2 py-0.5 text-xs capitalize font-medium text-ink">
                      {lead.service_type || "General"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">
                    {lead.phone || lead.email || "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-ink-muted">
                    {formatDate(lead.created_at)}
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
