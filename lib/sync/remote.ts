import { getDb } from "@/lib/storage/db";
import type {
  CalendarSource,
  Habit,
  HabitLog,
  Settings,
  TodoItem,
} from "@/lib/storage/types";

export type SyncBundle = {
  todos: TodoItem[];
  habits: Habit[];
  habitLogs: HabitLog[];
  calendarSources: CalendarSource[];
  settings: Settings | null;
};

type SyncPayload = Partial<{
  todos: TodoItem[];
  habits: Habit[];
  habitLogs: HabitLog[];
  calendarSources: CalendarSource[];
  settings: Settings;
  deletedTodos: string[];
  deletedHabits: string[];
  deletedHabitLogs: string[];
  deletedCalendarSources: string[];
}>;

const SYNC_URL = "/api/sync";

export async function pullRemoteSnapshot(): Promise<SyncBundle | null> {
  try {
    const res = await fetch(SYNC_URL, { credentials: "include" });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      return null;
    }
    if (!res.ok) return null;
    if (data && typeof data === "object" && "error" in data) return null;
    return data as SyncBundle;
  } catch {
    return null;
  }
}

export async function pushChanges(payload: SyncPayload) {
  try {
    await fetch(SYNC_URL, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silent failure; will remain local-only until next sync.
  }
}

export async function applyRemoteSnapshot(snapshot: SyncBundle) {
  const db = await getDb();
  const tx = db.transaction(
    ["todos", "habits", "habitLogs", "calendarSources", "settings"],
    "readwrite"
  );
  await Promise.all([
    tx.objectStore("todos").clear(),
    tx.objectStore("habits").clear(),
    tx.objectStore("habitLogs").clear(),
    tx.objectStore("calendarSources").clear(),
    tx.objectStore("settings").clear(),
  ]);

  snapshot.todos?.forEach((todo) => {
    tx.objectStore("todos").put(todo);
  });
  snapshot.habits?.forEach((habit) => {
    tx.objectStore("habits").put(habit);
  });
  snapshot.habitLogs?.forEach((log) => {
    tx.objectStore("habitLogs").put(log);
  });
  snapshot.calendarSources?.forEach((source) => {
    tx.objectStore("calendarSources").put(source);
  });
  if (snapshot.settings) {
    tx.objectStore("settings").put({ ...snapshot.settings, key: "settings" });
  }

  await tx.done;
}
