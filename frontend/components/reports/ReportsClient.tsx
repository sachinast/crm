"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  Car,
  TrendingUp,
  XCircle,
  Download,
  Calendar,
  Filter,
  Hash,
} from "lucide-react";
import DataTableCard from "@/components/shared/DataTableCard";
import StatusBadge from "@/components/shared/StatusBadge";
import ModernDateRangePicker from "@/components/shared/ModernDateRangePicker";
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
  custom_fields?: Record<string, unknown> | null;
}

export default function ReportsClient({ leads }: { leads: ReportLeadItem[] }) {
  const [activeTab, setActiveTab] = useState<"pickups" | "bookings" | "cancellations">("pickups");
  
  // Date Range Defaults: Past 7 days to today
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [serviceFilter, setServiceFilter] = useState("all");

  const isWithinDateRange = useCallback((dateStr: string) => {
    if (!dateStr) return false;
    const itemDate = dateStr.slice(0, 10);
    return itemDate >= startDate && itemDate <= endDate;
  }, [startDate, endDate]);

  const pickupsList = useMemo(() => {
    return leads.filter((l) => {
      const matchService = serviceFilter === "all" || l.service_type === serviceFilter;
      const dateMatch = isWithinDateRange(l.pickup_datetime || l.created_at);
      return matchService && dateMatch;
    });
  }, [leads, serviceFilter, isWithinDateRange]);

  const newBookingsList = useMemo(() => {
    return leads.filter((l) => {
      const matchService = serviceFilter === "all" || l.service_type === serviceFilter;
      return matchService && isWithinDateRange(l.created_at);
    });
  }, [leads, serviceFilter, isWithinDateRange]);

  const cancellationsList = useMemo(() => {
    return leads.filter((l) => {
      const isCancelled =
        l.status.toLowerCase().includes("cancel") ||
        l.status.toLowerCase().includes("drop") ||
        l.status.toLowerCase().includes("refund") ||
        l.status.toLowerCase().includes("chargeback") ||
        l.status.toLowerCase().includes("rdr");
      const matchService = serviceFilter === "all" || l.service_type === serviceFilter;
      return isCancelled && matchService && isWithinDateRange(l.created_at);
    });
  }, [leads, serviceFilter, isWithinDateRange]);

  const currentDataset = activeTab === "pickups" ? pickupsList : activeTab === "bookings" ? newBookingsList : cancellationsList;

  function getBookingRef(lead: ReportLeadItem): string {
    if (lead.booking_reference) return lead.booking_reference;
    if (lead.custom_fields && typeof lead.custom_fields.booking_reference === "string") {
      return lead.custom_fields.booking_reference;
    }
    return `CRM-${lead.id.replace(/-/g, "").slice(0, 7).toUpperCase()}`;
  }

  function exportCSV() {
    const headers = ["#", "Booking Ref #", "Customer Name", "Phone", "Email", "Service Type", "Status", "Date & Time"];
    const rows = currentDataset.map((item, idx) => [
      idx + 1,
      `"${getBookingRef(item)}"`,
      `"${(item.name || "Customer").replace(/"/g, '""')}"`,
      `"${item.phone || ""}"`,
      `"${item.email || ""}"`,
      item.service_type || "General",
      item.status || "N/A",
      item.created_at,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTab}_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-4">
      {/* Main Report Table & Redesigned Symmetrical Filter Bar */}
      <DataTableCard
        headerContent={
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 w-full py-1">
            {/* Left: Tab Navigation */}
            <div className="flex items-center gap-1 p-1 rounded-xl border border-hairline bg-surface-raised shrink-0">
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

            {/* Right: Unified Single-Row Filter Controls & Export */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Modern Interactive Date Range Picker */}
              <ModernDateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(newStart, newEnd) => {
                  setStartDate(newStart);
                  setEndDate(newEnd);
                }}
              />

              {/* Service Type Dropdown Filter */}
              <div className="w-36">
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="select py-1.5 px-3 text-xs font-semibold"
                >
                  <option value="all">All Services</option>
                  <option value="car">Car Rental</option>
                  <option value="hotel">Hotel</option>
                  <option value="flight">Flight</option>
                </select>
              </div>

              {/* Action: Export CSV */}
              <button
                type="button"
                onClick={exportCSV}
                className="btn-primary btn-sm inline-flex items-center gap-1.5 text-xs px-3.5 py-2 shadow-xs shrink-0"
                title="Export filtered records to CSV"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        }
      >
        <table className="table-modern w-full">
          <thead>
            <tr>
              <th className="w-12 px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-ink-faint">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                Booking Ref #
              </th>
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
                <td colSpan={7} className="py-12 text-center text-sm text-ink-muted">
                  No records found for the selected date range and filters.
                </td>
              </tr>
            ) : (
              currentDataset.map((lead, index) => {
                const bookingRef = getBookingRef(lead);
                return (
                  <tr key={lead.id} className="transition-colors hover:bg-surface-raised">
                    <td className="w-12 px-3 py-3.5 text-center font-mono text-xs font-bold text-ink-faint">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent bg-accent-soft px-2 py-0.5 rounded-md border border-accent/20">
                        {bookingRef}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-sm text-ink">
                      {lead.name || "Customer"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-surface px-2 py-0.5 text-xs capitalize font-medium text-ink">
                        {lead.service_type === "car"
                          ? "Car Rental"
                          : lead.service_type === "hotel"
                            ? "Hotel"
                            : lead.service_type === "flight"
                              ? "Flight"
                              : "General"}
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
                );
              })
            )}
          </tbody>
        </table>
      </DataTableCard>
    </div>
  );
}
