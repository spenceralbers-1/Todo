"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const themeOrder = ["system", "light", "dark"] as const;

type TopBarProps = {
  onToday?: () => void;
  onSettings?: () => void;
};

export function TopBar({ onToday, onSettings }: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeToggle = () => {
    const current = theme ?? "system";
    const currentIndex = themeOrder.indexOf(current as (typeof themeOrder)[number]);
    const next = themeOrder[(currentIndex + 1) % themeOrder.length];
    setTheme(next);
  };

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <div className="text-lg font-semibold tracking-tight">To-Do</div>
      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1 text-sm"
          onClick={onToday}
        >
          Today
        </button>
        <button
          type="button"
          onClick={handleThemeToggle}
          className="rounded-full border border-border px-3 py-1 text-sm"
        >
          {mounted ? `Theme: ${theme ?? "system"}` : "Theme"}
        </button>
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1 text-sm"
          onClick={onSettings}
        >
          Settings
        </button>
      </div>
    </header>
  );
}
