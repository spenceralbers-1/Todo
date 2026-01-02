import { openDB } from "idb";
import type {
  CalendarSource,
  Habit,
  HabitLog,
  Settings,
  TodoItem,
} from "./types";

export type TodoDB = {
  todos: {
    key: string;
    value: TodoItem;
    indexes: { "by-date": string };
  };
  habits: {
    key: string;
    value: Habit;
  };
  habitLogs: {
    key: string;
    value: HabitLog;
    indexes: { "by-date": string; "by-habit-date": [string, string] };
  };
  calendarSources: {
    key: string;
    value: CalendarSource;
  };
  settings: {
    key: string;
    value: Settings & { key: string };
  };
};

const DB_NAME = "todo-db";
const DB_VERSION = 1;

export const getDb = () =>
  openDB<TodoDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const todos = db.createObjectStore("todos", { keyPath: "id" });
      todos.createIndex("by-date", "date");

      db.createObjectStore("habits", { keyPath: "id" });

      const habitLogs = db.createObjectStore("habitLogs", { keyPath: "id" });
      habitLogs.createIndex("by-date", "date");
      habitLogs.createIndex("by-habit-date", ["habitId", "date"]);

      db.createObjectStore("calendarSources", { keyPath: "id" });
      db.createObjectStore("settings", { keyPath: "key" });
    },
  });
