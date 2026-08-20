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
          <span className="rounded-full bg-surface-raised border border-hairline px-2.5 py-0.5 text-xs font-mono font-bold text-ink-muted">
            {records.length} records
          </span>
        </div>
      }
      footerContent={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-ink-muted">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              Showing <span className="font-semibold text-ink">{startItem}</span> to{" "}
              <span className="font-semibold text-ink">{endItem}</span> of{" "}
              <span className="font-semibold text-ink">{records.length}</span> entries
            </div>

            <div className="flex items-center gap-1.5 border-l border-hairline pl-3">
              <span className="text-xs text-ink-muted">Per page:</span>
              <div className="flex items-center gap-1">
                {[10, 25, 50, 100].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setPageSize(size);
                      setPage(1);
                    }}
                    className={`rounded-lg px-2 py-0.5 font-mono text-xs font-semibold transition-all ${
                      pageSize === size
                        ? "bg-accent text-white font-bold shadow-xs"
                        : "bg-surface text-ink-muted border border-hairline hover:bg-surface-raised hover:text-ink"
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
              className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold ${
                page > 1
                  ? "border border-hairline bg-surface text-ink hover:bg-surface-raised"
                  : "border border-transparent text-ink-faint cursor-not-allowed opacity-50"
              }`}
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>

            <span className="inline-flex h-7 px-2.5 items-center justify-center rounded-xl bg-accent text-xs font-bold text-white shadow-xs">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold ${
                page < totalPages
                  ? "border border-hairline bg-surface text-ink hover:bg-surface-raised"
                  : "border border-transparent text-ink-faint cursor-not-allowed opacity-50"
              }`}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      }
    >
      <table className="table-modern w-full">
        <thead>
          <tr>
            {showUser && (
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                Staff / Agent
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
              Work Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
              Check-In Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
              Check-Out Time
            </th>
            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-faint">
              Working Duration
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {pagedRecords.length === 0 ? (
            <tr>
              <td colSpan={showUser ? 5 : 4} className="py-12 text-center text-sm text-ink-muted">
                No attendance logs found for this filter criteria.
              </td>
            </tr>
          ) : (
            pagedRecords.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-surface-raised">
                {showUser && (
                  <td className="px-4 py-3 font-semibold text-sm text-ink">
                    {r.user_name ?? "—"}
                  </td>
                )}
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                  {fmtDate(r.work_date)}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-success">
                  {fmtTime(r.check_in_at)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                  {fmtTime(r.check_out_at)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs font-bold text-accent">
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
      <div className="card p-5 sm:flex sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5 mb-4 sm:mb-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/20 shadow-xs shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">Daily Punch In / Out Console</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
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
              className="btn-primary"
            >
              <LogIn size={15} strokeWidth={2.5} />
              <span>Punch In Now</span>
            </button>
          ) : !today.record?.check_out_at ? (
            <button
              onClick={handleCheckOut}
              disabled={busy}
              className="btn-danger"
            >
              <LogOut size={15} strokeWidth={2.5} />
              <span>Punch Out & End Shift</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>Shift Completed</span>
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="alert-danger">
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
                  className="rounded-xl bg-accent px-3.5 py-1.5 text-xs font-bold text-white shadow-xs"
                >
                  My Attendance History
                </button>
                <button
                  onClick={() => setTab("team")}
                  className="rounded-xl border border-hairline bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-raised hover:text-ink transition-all"
                >
                  <Users size={13} className="mr-1.5 inline" />
                  Team Attendance
                </button>
              </div>
            ) : (
              <span className="text-xs font-bold uppercase tracking-wider text-ink">
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
                  className="rounded-xl border border-hairline bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-raised hover:text-ink transition-all"
                >
                  My Attendance
                </button>
                <button
                  onClick={() => setTab("team")}
                  className="rounded-xl bg-accent px-3.5 py-1.5 text-xs font-bold text-white shadow-xs"
                >
                  <Users size={13} className="mr-1.5 inline" />
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
                <span className="text-xs text-ink-faint">to</span>
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
