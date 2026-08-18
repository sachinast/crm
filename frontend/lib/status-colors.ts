// PRD §6.1 "UI Colour" column, mapped from the status_lookup seed data's color
// names (backend/alembic/versions/0001_baseline_schema.py) to real CSS colors.
// Presentation-only — not business logic, so it's fine for this to live
// frontend-side rather than round-tripping through the API.
//
// Each entry is a { fg, bg } pair for the soft-badge style used across the
// app (colored text on a tinted background, not solid-fill white-on-color —
// reads calmer against the ivory/navy palette in globals.css).
const COLOR_MAP: Record<string, { fg: string; bg: string }> = {
  grey: { fg: "#5b6274", bg: "#e9e7e0" },
  blue: { fg: "#2c5f9e", bg: "#e1eaf6" },
  purple: { fg: "#7a4fa3", bg: "#efe4f7" },
  green: { fg: "#0f7a5c", bg: "#dcf1e8" },
  red: { fg: "#b8425b", bg: "#fbe4ea" },
  yellow: { fg: "#a17a11", bg: "#faefce" },
  orange: { fg: "#b0621c", bg: "#f9e6d3" },
  cyan: { fg: "#1a7f8c", bg: "#daf1f4" },
  dark_green: { fg: "#0d5c42", bg: "#d3ede0" },
  black: { fg: "#12172b", bg: "#e3e2e6" },
};

export function statusColor(uiColor: string): string {
  return (COLOR_MAP[uiColor] ?? COLOR_MAP.grey).fg;
}

export function statusBadgeStyle(uiColor: string): { color: string; backgroundColor: string } {
  const c = COLOR_MAP[uiColor] ?? COLOR_MAP.grey;
  return { color: c.fg, backgroundColor: c.bg };
}
