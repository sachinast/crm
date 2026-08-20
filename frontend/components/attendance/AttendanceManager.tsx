"use client";

import { LogIn, LogOut, Users, User, Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import DataTableCard from "@/components/shared/DataTableCard";
import {
  checkIn,
  checkOut,
  fetchAllAttendance,
  fetchMyAttendance,
  fetchToday,
  type AttendanceRecord,
  type CheckInResult,
} from "@/lib/attendance-api";

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function hoursBetween(inAt: string, outAt: string | null): string {
  if (!outAt) return "—";
  const hrs = (new Date(outAt).getTime() - new Date(inAt).getTime()) / 3_600_000;
  return `${hrs.toFixed(1)}h`;
}

function RecordsTable({
  records,
  showUser,
  headerFilter,
}: {
  records: AttendanceRecord[];
  showUser?: boolean;
  headerFilter?: React.ReactNode;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const startItem = records.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, records.length);
  const pagedRecords = useMemo(
    () => records.slice((page - 1) * pageSize, page * pageSize),
    [records, page, pageSize],
  );

  return (
    <DataTableCard
      headerContent={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div>{headerFilter}</div>
          <span className="text-xs text-slate-400 font-medium">
            {records.length} records
          </span>
        </div>
      }
      footerContent={
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              Showing <span className="font-semibold text-slate-200">{startItem}</span> to{" "}
              <span className="font-semibold text-slate-200">{endItem}</span> of{" "}
              <span className="font-semibold text-slate-200">{records.length}</span> entries
            </div>

            <div className="flex items-center gap-1.5 border-l border-[#232e47] pl-3">
              <span className="text-[11px] text-slate-400">Per page:</span>
              <div className="flex items-center gap-1">
                {[10, 25, 50, 100].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setPageSize(size);
                      setPage(1);
                    }}
                    className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                      pageSize === size
                        ? "bg-[#d3ab5e] text-slate-950 font-bold shadow-xs"
                        : "bg-[#182136] text-slate-400 hover:bg-[#232e47] hover:text-white"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                page > 1
                  ? "border border-[#2a3652] bg-[#182136] text-slate-300 hover:border-[#d3ab5e] hover:text-white"
                  : "border border-transparent text-slate-600 cursor-not-allowed"
              }`}
            >
              <ChevronLeft size={13} />
              <span>Prev</span>
            </button>

            <span className="inline-flex h-7 px-2.5 items-center justify-center rounded-lg bg-[#d3ab5e] text-xs font-bold text-slate-950 shadow-sm">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                page < totalPages
                  ? "border border-[#2a3652] bg-[#182136] text-slate-300 hover:border-[#d3ab5e] hover:text-white"
                  : "border border-transparent text-slate-600 cursor-not-allowed"
              }`}
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      }
    >
      <table className="table-modern w-full">
        <thead>
          <tr className="bg-[#182136]/30">
            {showUser && (
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Staff / Agent
              </th>
            )}
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Work Date
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Check-In Time
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Check-Out Time
            </th>
            <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Working Duration
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#232e47]">
          {pagedRecords.length === 0 ? (
            <tr>
              <td colSpan={showUser ? 5 : 4} className="py-12 text-center text-xs text-slate-400">
                No attendance logs found for this filter criteria.
              </td>
            </tr>
          ) : (
            pagedRecords.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-[#182136]/60">
                {showUser && (
                  <td className="px-4 py-3 font-semibold text-white">
                    {r.user_name ?? "—"}
                  </td>
                )}
                <td className="px-4 py-3 font-mono text-xs text-slate-300">
                  {fmtDate(r.work_date)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[#3ecf9a]">
                  {fmtTime(r.check_in_at)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">
                  {fmtTime(r.check_out_at)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs font-bold text-[#d3ab5e]">
                  {hoursBetween(r.check_in_at, r.check_out_at)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </DataTableCard>
  );
}

export default function AttendanceManager({ canViewAll }: { canViewAll: boolean }) {
  const [today, setToday] = useState<CheckInResult | null>(null);
  const [mine, setMine] = useState<AttendanceRecord[]>([]);
  const [tab, setTab] = useState<"mine" | "team">("mine");
  const [team, setTeam] = useState<AttendanceRecord[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMine() {
    const [t, m] = await Promise.all([fetchToday(), fetchMyAttendance()]);
    setToday(t);
    setMine(m);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        await loadMine();
      } catch {
        if (!cancelled) setError("Could not load attendance");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tab !== "team") return;
    fetchAllAttendance({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then(setTeam)
      .catch(() => setError("Could not load team attendance"));
  }, [tab, dateFrom, dateTo]);

  async function handleCheckIn() {
    setBusy(true);
    setError(null);
    try {
      await checkIn();
      await loadMine();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check in");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut() {
    setBusy(true);
    setError(null);
    try {
      await checkOut();
      await loadMine();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check out");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Today's Check-in / Punch Status Card */}
      <div className="rounded-2xl border border-[#232e47] bg-[#131a2b] p-5 shadow-sm sm:flex sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5 mb-4 sm:mb-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#2a3652] bg-[#182136] text-[#d3ab5e] shadow-xs shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Daily Punch In / Out Console</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {today?.checked_in
                ? today.record?.check_out_at
                  ? `Checked in at ${fmtTime(today.record.check_in_at)} • Checked out at ${fmtTime(today.record.check_out_at)}`
                  : `Checked in at ${fmtTime(today.record?.check_in_at ?? null)} (Active Session)`
                : "You haven't checked in for today's shift."}
            </p>
          </div>
        </div>

        <div>
          {!today?.checked_in ? (
            <button
              onClick={handleCheckIn}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d3ab5e] to-[#e0bc78] px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogIn size={14} strokeWidth={2.5} />
              <span>Punch In Now</span>
            </button>
          ) : !today.record?.check_out_at ? (
            <button
              onClick={handleCheckOut}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#ef7b93]/40 bg-[#34131c] px-4 py-2 text-xs font-bold text-[#ef7b93] shadow-md transition-all hover:border-[#ef7b93] hover:bg-[#461825]"
            >
              <LogOut size={14} strokeWidth={2.5} />
              <span>Punch Out & End Shift</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#3ecf9a]/30 bg-[#113028] px-3.5 py-2 text-xs font-bold text-[#3ecf9a]">
              <span>Shift Completed</span>
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-[#ef7b93]/30 bg-[#34131c] px-3 py-2 text-xs font-medium text-[#ef7b93]">
          {error}
        </p>
      )}

      {/* Main Aligned Attendance DataTableCard */}
      {tab === "mine" || !canViewAll ? (
        <RecordsTable
          records={mine}
          headerFilter={
            canViewAll ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTab("mine")}
                  className="rounded-lg bg-[#d3ab5e] px-3 py-1 text-xs font-bold text-slate-950 shadow-sm"
                >
                  My Attendance History
                </button>
                <button
                  onClick={() => setTab("team")}
                  className="rounded-lg border border-[#232e47] bg-[#0d1220] px-3 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-[#d3ab5e] hover:text-white"
                >
                  <Users size={12} className="mr-1.5 inline" />
                  Team Attendance
                </button>
              </div>
            ) : (
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                My Attendance History
              </span>
            )
          }
        />
      ) : (
        <RecordsTable
          records={team}
          showUser
          headerFilter={
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTab("mine")}
                  className="rounded-lg border border-[#232e47] bg-[#0d1220] px-3 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-[#d3ab5e] hover:text-white"
                >
                  My Attendance
                </button>
                <button
                  onClick={() => setTab("team")}
                  className="rounded-lg bg-[#d3ab5e] px-3 py-1 text-xs font-bold text-slate-950 shadow-sm"
                >
                  <Users size={12} className="mr-1.5 inline" />
                  Team Attendance
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input text-xs py-1"
                />
                <span className="text-xs text-slate-500">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input text-xs py-1"
                />
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}
