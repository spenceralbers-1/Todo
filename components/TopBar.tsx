"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const themeOrder = ["system", "light", "dark"] as const;

type TopBarProps = {
  onToday?: () => void;
  onSettings?: () => void;
};

export function TopBar({ onToday, onSettings }: TopBarProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          className="rounded-full border border-border px-3 py-1 text-sm"
          onClick={onSettings}
        >
          Settings
        </button>
      </div>
    </header>
  );
}
