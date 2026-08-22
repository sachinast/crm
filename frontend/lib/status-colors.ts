const CLASS_MAP: Record<string, string> = {
  amber: "bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60",
  blue: "bg-blue-50 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700/60",
  purple: "bg-purple-50 text-purple-800 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700/60",
  emerald: "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60",
  rose: "bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/60",
  indigo: "bg-indigo-50 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700/60",
  orange: "bg-orange-50 text-orange-800 border border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700/60",
  teal: "bg-teal-50 text-teal-800 border border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700/60",
  cyan: "bg-cyan-50 text-cyan-800 border border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-700/60",
  fuchsia: "bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-300 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-700/60",
  slate: "bg-slate-200 text-slate-800 border border-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600",
  dark_red: "bg-red-100 text-red-900 border border-red-400 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800",
  faint_slate: "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800",
  sky: "bg-sky-50 text-sky-800 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700/60",
  grey: "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60",
  green: "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60",
  red: "bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/60",
  yellow: "bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60",
};

export function statusBadgeClass(uiColor: string): string {
  return CLASS_MAP[uiColor] ?? CLASS_MAP.grey;
}
