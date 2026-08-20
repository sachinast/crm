"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "crm_theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  } else {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const active = getStoredTheme();
    setTheme(active);
    applyTheme(active);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  };

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Theme toggle"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink-muted)] opacity-70"
      >
        <Moon size={16} />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="group relative flex h-8 w-8 items-center justify-center rounded-xl border border-header-hairline bg-sidebar-surface text-header-ink shadow-xs transition-all duration-200 hover:border-accent hover:bg-sidebar-surface-raised hover:text-accent active:scale-95"
    >
      <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:rotate-12">
        {isDark ? (
          <Sun size={16} className="text-amber-400 transition-colors" />
        ) : (
          <Moon size={16} className="text-blue-400 transition-colors" />
        )}
      </div>
      
      {/* Subtle indicator dot */}
      <span
        className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-sidebar-bg ${isDark ? "bg-accent" : "bg-blue-400"}`}
      />
    </button>
  );
}
