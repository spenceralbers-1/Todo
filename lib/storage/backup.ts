import { getDb } from "./db";
import type {
  CalendarSource,
  Habit,
  HabitLog,
  Settings,
  TodoItem,
} from "./types";

export type BackupBlob = {
  todos: TodoItem[];
  habits: Habit[];
  habitLogs: HabitLog[];
  calendarSources: CalendarSource[];
  settings: Settings | null;
};

export const exportAll = async (): Promise<BackupBlob> => {
  const db = await getDb();
  const [todos, habits, habitLogs, calendarSources, settings] = await Promise.all([
    db.getAll("todos"),
    db.getAll("habits"),
    db.getAll("habitLogs"),
    db.getAll("calendarSources"),
    db.get("settings", "settings"),
  ]);
  return {
    todos,
    habits,
    habitLogs,
    calendarSources,
    settings: settings ? (({ key, ...rest }) => rest)(settings) : null,
  };
};

export const importAll = async (blob: BackupBlob) => {
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

  blob.todos.forEach((item) => tx.objectStore("todos").put(item));
  blob.habits.forEach((item) => tx.objectStore("habits").put(item));
  blob.habitLogs.forEach((item) => tx.objectStore("habitLogs").put(item));
  blob.calendarSources.forEach((item) =>
    tx.objectStore("calendarSources").put(item)
  );
  if (blob.settings) {
    tx.objectStore("settings").put({ ...blob.settings, key: "settings" });
  }
  await tx.done;
};
