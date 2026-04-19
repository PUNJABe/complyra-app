"use client";

import { useTheme } from "@/lib/theme-context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="rounded-full border border-ink/20 bg-white px-3 py-1.5 text-sm font-medium text-ink/75 transition hover:border-ink/45 hover:bg-white/80 dark:border-white/20 dark:bg-ink/20 dark:text-white/75 dark:hover:border-white/45"
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
