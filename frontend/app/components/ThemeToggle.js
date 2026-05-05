"use client";

import { BsMoonStarsFill, BsSunFill } from "react-icons/bs";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="theme-toggle inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
    >
      <span className="theme-toggle__thumb" aria-hidden="true">
        {isDark ? <BsSunFill size={14} /> : <BsMoonStarsFill size={14} />}
      </span>
    </button>
  );
}
