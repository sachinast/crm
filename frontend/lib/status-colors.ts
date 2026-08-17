// PRD §6.1 "UI Colour" column, mapped from the status_lookup seed data's color
// names (backend/alembic/versions/0001_baseline_schema.py) to real CSS colors.
// Presentation-only — not business logic, so it's fine for this to live
// frontend-side rather than round-tripping through the API.
const COLOR_MAP: Record<string, string> = {
  grey: "#9ca3af",
  blue: "#3b82f6",
  purple: "#a855f7",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
  orange: "#f97316",
  cyan: "#06b6d4",
  dark_green: "#166534",
  black: "#171717",
};

export function statusColor(uiColor: string): string {
  return COLOR_MAP[uiColor] ?? "#9ca3af";
}
