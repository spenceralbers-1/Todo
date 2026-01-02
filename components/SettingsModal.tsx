"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { CalendarSource, Settings } from "@/lib/storage/types";
import { calendarRepo, settingsRepo } from "@/lib/storage/repos";
import { exportAll, importAll } from "@/lib/storage/backup";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCalendarsUpdated: (sources: CalendarSource[]) => void;
  onSettingsUpdated?: (settings: Settings) => void;
  lastCalendarSync?: string;
  onDataImported?: () => void;
};

export function SettingsModal({
  isOpen,
  onClose,
  onCalendarsUpdated,
  onSettingsUpdated,
  lastCalendarSync,
  onDataImported,
}: SettingsModalProps) {
  const [sources, setSources] = useState<CalendarSource[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    calendarRepo.list().then((items) => setSources(items));
    settingsRepo.get().then((current) => setSettings(current));
  }, [isOpen]);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !url.trim()) {
      return;
    }
    const source = await calendarRepo.add({
      name: name.trim(),
      icsUrl: url.trim(),
      enabled,
    });
    const next = [source, ...sources];
    setSources(next);
    onCalendarsUpdated(next);
    setName("");
    setUrl("");
    setEnabled(true);
  };

  const handleToggle = async (source: CalendarSource) => {
    const updated = await calendarRepo.update(source.id, {
      enabled: !source.enabled,
    });
    if (!updated) {
      return;
    }
    const next = sources.map((item) => (item.id === source.id ? updated : item));
    setSources(next);
    onCalendarsUpdated(next);
  };

  const handleDelete = async (source: CalendarSource) => {
    await calendarRepo.remove(source.id);
    const next = sources.filter((item) => item.id !== source.id);
    setSources(next);
    onCalendarsUpdated(next);
  };

  const handleSettingChange = async (
    key: keyof Settings,
    value: Settings[keyof Settings]
  ) => {
    if (!settings) {
      return;
    }
    const next = { ...settings, [key]: value };
    setSettings(next);
    await settingsRepo.set(next);
    onSettingsUpdated?.(next);
    if (key === "theme") {
      setTheme(value as string);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportAll();
      const dataStr = `data:application/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(blob)
      )}`;
      const link = document.createElement("a");
      link.href = dataStr;
      link.download = `todo-backup-${Date.now()}.json`;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importAll(parsed);
      onDataImported?.();
      calendarRepo.list().then((items) => setSources(items));
      settingsRepo.get().then((current) => setSettings(current));
    } catch (error) {
      // ignore
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-panel p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            type="button"
            className="rounded-full border border-border px-3 py-1 text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <section className="mt-6 space-y-3">
          <h3 className="text-xs uppercase tracking-[0.2em] text-muted">
            Calendar Sources
          </h3>
          <div className="text-xs text-muted">
            {lastCalendarSync ? `Last sync: ${lastCalendarSync}` : "No sync yet."}
          </div>
          <form onSubmit={handleAdd} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
              className="rounded-2xl border border-border bg-transparent px-3 py-2 text-sm"
            />
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="ICS URL"
              className="rounded-2xl border border-border bg-transparent px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-2xl border border-border px-3 py-2 text-sm"
            >
              Add
            </button>
          </form>

          <div className="space-y-2">
            {sources.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted">
                No calendars yet.
              </div>
            ) : (
              sources.map((source) => (
                <div
                  key={source.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{source.name}</div>
                    <div className="text-xs text-muted">{source.icsUrl}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-border px-3 py-1 text-xs"
                      onClick={() => handleToggle(source)}
                    >
                      {source.enabled ? "Enabled" : "Disabled"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-border px-3 py-1 text-xs"
                      onClick={() => handleDelete(source)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-xs uppercase tracking-[0.2em] text-muted">
            Preferences
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings?.showCompletedTodos ?? true}
                onChange={(event) =>
                  handleSettingChange("showCompletedTodos", event.target.checked)
                }
              />
              Show completed todos
            </label>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-xs uppercase tracking-[0.2em] text-muted">
            Theme
          </h3>
          <div className="flex flex-wrap gap-3 text-sm">
            {(["system", "light", "dark"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`rounded-full border border-border px-3 py-1 ${
                  settings?.theme === mode ? "bg-border/30" : ""
                }`}
                onClick={() => handleSettingChange("theme", mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-xs uppercase tracking-[0.2em] text-muted">
            Backup
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              className="rounded-full border border-border px-3 py-1"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? "Exporting..." : "Export JSON"}
            </button>
            <label className="rounded-full border border-border px-3 py-1 cursor-pointer">
              {isImporting ? "Importing..." : "Import JSON"}
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImport}
                disabled={isImporting}
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
