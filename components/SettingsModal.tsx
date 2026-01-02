"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { CalendarSource, Habit, HabitSchedule, Settings } from "@/lib/storage/types";
import { calendarRepo, habitRepo, settingsRepo } from "@/lib/storage/repos";
import { exportAll, importAll } from "@/lib/storage/backup";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCalendarsUpdated: (sources: CalendarSource[]) => void;
  onSettingsUpdated?: (settings: Settings) => void;
  lastCalendarSync?: string;
  onDataImported?: () => void;
  onHabitsUpdated?: () => void;
};

export function SettingsModal({
  isOpen,
  onClose,
  onCalendarsUpdated,
  onSettingsUpdated,
  lastCalendarSync,
  onDataImported,
  onHabitsUpdated,
}: SettingsModalProps) {
  const [sources, setSources] = useState<CalendarSource[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitTitle, setHabitTitle] = useState("");
  const [habitSchedule, setHabitSchedule] = useState<HabitSchedule["type"]>("daily");
  const [habitTarget, setHabitTarget] = useState(1);
  const [customDays, setCustomDays] = useState<Set<number>>(new Set());
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"calendars" | "habits" | "general">("calendars");
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    calendarRepo.list().then((items) => setSources(items));
    settingsRepo.get().then((current) => setSettings(current));
    habitRepo.list().then((items) => setHabits(items));
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

  const handleHabitAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!habitTitle.trim()) {
      return;
    }
    const schedule: HabitSchedule =
      habitSchedule === "custom"
        ? { type: "custom", daysOfWeek: Array.from(customDays) }
        : { type: habitSchedule };
    const habit = await habitRepo.add({
      title: habitTitle.trim(),
      schedule,
      targetPerDay: habitTarget,
      enabled: true,
    });
    const next = [habit, ...habits];
    setHabits(next);
    setHabitTitle("");
    setHabitSchedule("daily");
    setCustomDays(new Set());
    onHabitsUpdated?.();
  };

  const handleHabitToggle = async (habit: Habit) => {
    const updated = await habitRepo.update(habit.id, {
      enabled: habit.enabled === false ? true : false,
    });
    if (!updated) return;
    const next = habits.map((h) => (h.id === habit.id ? updated : h));
    setHabits(next);
    onHabitsUpdated?.();
  };

  const handleHabitRemove = async (habit: Habit) => {
    await habitRepo.remove(habit.id);
    const next = habits.filter((h) => h.id !== habit.id);
    setHabits(next);
    onHabitsUpdated?.();
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
      habitRepo.list().then((items) => setHabits(items));
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
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-panel p-6 shadow-xl">
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

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {[
            { key: "calendars", label: "Calendars" },
            { key: "habits", label: "Habits" },
            { key: "general", label: "General" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`rounded-full border border-border px-3 py-1 ${
                activeTab === tab.key ? "bg-border/30" : ""
              }`}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1 space-y-6">
          {activeTab === "calendars" && (
            <section className="space-y-3">
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
          )}

          {activeTab === "habits" && (
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-[0.2em] text-muted">
                Habits
              </h3>
              <form
                onSubmit={handleHabitAdd}
                className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]"
              >
                <input
                  value={habitTitle}
                  onChange={(event) => setHabitTitle(event.target.value)}
                  placeholder="Habit title"
                  className="rounded-2xl border border-border bg-transparent px-3 py-2 text-sm"
                />
                <select
                  value={habitSchedule}
                  onChange={(event) =>
                    setHabitSchedule(event.target.value as HabitSchedule["type"])
                  }
                  className="rounded-2xl border border-border bg-transparent px-3 py-2 text-sm"
                >
                  <option value="daily">Every day</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekends">Weekends</option>
                  <option value="custom">Custom days</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={habitTarget}
                  onChange={(event) => setHabitTarget(Number(event.target.value) || 1)}
                  className="rounded-2xl border border-border bg-transparent px-3 py-2 text-sm"
                  placeholder="Target"
                />
                <button
                  type="submit"
                  className="rounded-2xl border border-border px-3 py-2 text-sm"
                >
                  Add
                </button>
              </form>
              {habitSchedule === "custom" ? (
                <div className="flex flex-wrap gap-2 text-xs">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, idx) => {
                    const active = customDays.has(idx);
                    return (
                      <button
                        key={label}
                        type="button"
                        className={`rounded-full border px-3 py-1 ${
                          active ? "bg-border/30" : ""
                        }`}
                        onClick={() => {
                          const next = new Set(customDays);
                          if (next.has(idx)) {
                            next.delete(idx);
                          } else {
                            next.add(idx);
                          }
                          setCustomDays(next);
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="space-y-2">
                {habits.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted">
                    No habits yet.
                  </div>
                ) : (
                  habits.map((habit) => (
                    <div
                      key={habit.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-sm"
                    >
                      <div>
                        <div className="font-medium">{habit.title}</div>
                        <div className="text-xs text-muted">
                          {habit.schedule.type === "custom"
                            ? `Custom: ${(habit.schedule.daysOfWeek ?? [])
                                .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
                                .join(", ")}`
                            : habit.schedule.type}
                          {` • Target ${habit.targetPerDay}/day`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-border px-3 py-1 text-xs"
                          onClick={() => handleHabitToggle(habit)}
                        >
                          {habit.enabled === false ? "Enable" : "Disable"}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-border px-3 py-1 text-xs"
                          onClick={() => handleHabitRemove(habit)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

        {activeTab === "general" && (
          <>
            <section className="space-y-3">
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

              <section className="space-y-3">
                <h3 className="text-xs uppercase tracking-[0.2em] text-muted">
                  Smart Defaults
                </h3>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings?.suggestDates ?? true}
                      onChange={(event) =>
                        handleSettingChange("suggestDates", event.target.checked)
                      }
                    />
                    Suggest dates from task text
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings?.suggestHabits ?? true}
                      onChange={(event) =>
                        handleSettingChange("suggestHabits", event.target.checked)
                      }
                    />
                    Suggest habits from phrases like “daily”
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings?.suggestTimeIntent ?? false}
                      onChange={(event) =>
                        handleSettingChange("suggestTimeIntent", event.target.checked)
                      }
                    />
                    Suggest time-of-day intent
                  </label>
                </div>
              </section>

            <section className="space-y-3">
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

              <section className="space-y-3">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
