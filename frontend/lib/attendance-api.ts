"use client";

export interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string | null;
  work_date: string;
  check_in_at: string;
  check_out_at: string | null;
  notes: string | null;
}

export interface CheckInResult {
  checked_in: boolean;
  record: AttendanceRecord | null;
}

async function json<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${resp.status})`);
  }
  return resp.json() as Promise<T>;
}

export async function fetchToday(): Promise<CheckInResult> {
  return json(await fetch("/api/attendance/today"));
}

export async function checkIn(): Promise<AttendanceRecord> {
  return json(await fetch("/api/attendance/check-in", { method: "POST" }));
}

export async function checkOut(): Promise<AttendanceRecord> {
  return json(await fetch("/api/attendance/check-out", { method: "POST" }));
}

export async function fetchMyAttendance(): Promise<AttendanceRecord[]> {
  return json(await fetch("/api/attendance/me"));
}

export async function fetchAllAttendance(opts: {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (opts.userId) params.set("user_id", opts.userId);
  if (opts.dateFrom) params.set("date_from", opts.dateFrom);
  if (opts.dateTo) params.set("date_to", opts.dateTo);
  const query = params.toString() ? `?${params.toString()}` : "";
  return json(await fetch(`/api/attendance${query}`));
}
