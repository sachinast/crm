"use client";

import { LogIn, LogOut, Users } from "lucide-react";
import { useEffect, useState } from "react";

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

function RecordsTable({ records, showUser }: { records: AttendanceRecord[]; showUser?: boolean }) {
  return (
    <div className="card-flat overflow-x-auto p-0">
      <table className="table-modern">
        <thead>
          <tr>
            {showUser && <th>User</th>}
            <th>Date</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 && (
            <tr>
              <td colSpan={showUser ? 5 : 4} className="py-8 text-center" style={{ color: "var(--ink-faint)" }}>
                No attendance records yet.
              </td>
            </tr>
          )}
          {records.map((r) => (
            <tr key={r.id}>
              {showUser && <td className="font-medium">{r.user_name ?? "—"}</td>}
              <td>{fmtDate(r.work_date)}</td>
              <td>{fmtTime(r.check_in_at)}</td>
              <td>{fmtTime(r.check_out_at)}</td>
              <td>{hoursBetween(r.check_in_at, r.check_out_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <div>
      <div className="card mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Today</p>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            {today?.checked_in
              ? today.record?.check_out_at
                ? `Checked in ${fmtTime(today.record.check_in_at)}, checked out ${fmtTime(today.record.check_out_at)}`
                : `Checked in at ${fmtTime(today.record?.check_in_at ?? null)}`
              : "You haven't checked in today"}
          </p>
        </div>
        {!today?.checked_in ? (
          <button onClick={handleCheckIn} disabled={busy} className="btn-primary">
            <LogIn size={14} />
            Check in
          </button>
        ) : !today.record?.check_out_at ? (
          <button onClick={handleCheckOut} disabled={busy} className="btn-secondary">
            <LogOut size={14} />
            Check out
          </button>
        ) : (
          <span className="badge" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            Done for today
          </span>
        )}
      </div>

      {error && (
        <p className="mb-4 text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {canViewAll && (
        <div className="mb-4 flex gap-1.5">
          <button
            onClick={() => setTab("mine")}
            className="badge"
            style={tab === "mine" ? { background: "var(--accent-soft)", color: "var(--accent)" } : { background: "var(--hairline)", color: "var(--ink-muted)" }}
          >
            My history
          </button>
          <button
            onClick={() => setTab("team")}
            className="badge"
            style={tab === "team" ? { background: "var(--accent-soft)", color: "var(--accent)" } : { background: "var(--hairline)", color: "var(--ink-muted)" }}
          >
            <Users size={12} className="mr-1 inline" />
            Team
          </button>
        </div>
      )}

      {tab === "mine" || !canViewAll ? (
        <RecordsTable records={mine} />
      ) : (
        <>
          <div className="mb-3 flex gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input" />
          </div>
          <RecordsTable records={team} showUser />
        </>
      )}
    </div>
  );
}
