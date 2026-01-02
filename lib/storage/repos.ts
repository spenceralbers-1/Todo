import { nanoid } from "nanoid";
import { getDb } from "./db";
import type {
  CalendarSource,
  Habit,
  HabitLog,
  Settings,
  TodoItem,
} from "./types";

const nowIso = () => new Date().toISOString();

export const todoRepo = {
  async listByDate(date: string) {
    const db = await getDb();
    return db.getAllFromIndex("todos", "by-date", date);
  },
  async add(input: Omit<TodoItem, "id" | "createdAt" | "updatedAt">) {
    const db = await getDb();
    const item: TodoItem = {
      ...input,
      id: nanoid(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await db.put("todos", item);
    return item;
  },
  async update(id: string, patch: Partial<TodoItem>) {
    const db = await getDb();
    const existing = await db.get("todos", id);
    if (!existing) {
      return null;
    }
    const updated = { ...existing, ...patch, updatedAt: nowIso() };
    await db.put("todos", updated);
    return updated;
  },
  async remove(id: string) {
    const db = await getDb();
    await db.delete("todos", id);
  },
};

export const habitRepo = {
  async list() {
    const db = await getDb();
    return db.getAll("habits");
  },
  async add(input: Omit<Habit, "id" | "createdAt" | "updatedAt">) {
    const db = await getDb();
    const habit: Habit = {
      ...input,
      id: nanoid(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await db.put("habits", habit);
    return habit;
  },
  async update(id: string, patch: Partial<Habit>) {
    const db = await getDb();
    const existing = await db.get("habits", id);
    if (!existing) {
      return null;
    }
    const updated = { ...existing, ...patch, updatedAt: nowIso() };
    await db.put("habits", updated);
    return updated;
  },
  async remove(id: string) {
    const db = await getDb();
    await db.delete("habits", id);
  },
};

export const habitLogRepo = {
  async listByDate(date: string) {
    const db = await getDb();
    return db.getAllFromIndex("habitLogs", "by-date", date);
  },
  async getForDate(habitId: string, date: string) {
    const db = await getDb();
    return db.getFromIndex("habitLogs", "by-habit-date", [habitId, date]);
  },
  async upsert(input: Omit<HabitLog, "id" | "updatedAt">) {
    const db = await getDb();
    const existing = await db.getFromIndex("habitLogs", "by-habit-date", [
      input.habitId,
      input.date,
    ]);
    const record: HabitLog = existing
      ? { ...existing, count: input.count, updatedAt: nowIso() }
      : { ...input, id: nanoid(), updatedAt: nowIso() };
    await db.put("habitLogs", record);
    return record;
  },
};

export const calendarRepo = {
  async list() {
    const db = await getDb();
    return db.getAll("calendarSources");
  },
  async add(input: Omit<CalendarSource, "id">) {
    const db = await getDb();
    const source: CalendarSource = { ...input, id: nanoid() };
    await db.put("calendarSources", source);
    return source;
  },
  async update(id: string, patch: Partial<CalendarSource>) {
    const db = await getDb();
    const existing = await db.get("calendarSources", id);
    if (!existing) {
      return null;
    }
    const updated = { ...existing, ...patch };
    await db.put("calendarSources", updated);
    return updated;
  },
  async remove(id: string) {
    const db = await getDb();
    await db.delete("calendarSources", id);
  },
};

const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  showCompletedTodos: true,
  calendarRefreshMinutes: 15,
};

export const settingsRepo = {
  async get() {
    const db = await getDb();
    const stored = await db.get("settings", "settings");
    if (stored) {
      const { key, ...rest } = stored;
      return rest as Settings;
    }
    return DEFAULT_SETTINGS;
  },
  async set(next: Settings) {
    const db = await getDb();
    await db.put("settings", { ...next, key: "settings" });
  },
};
