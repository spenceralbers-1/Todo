-- D1 schema for cross-device sync

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  linkUrl TEXT,
  icon TEXT,
  date TEXT NOT NULL,
  completedAt TEXT,
  originDate TEXT,
  dismissedOnDate TEXT,
  order_num INTEGER,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  icon TEXT,
  schedule_json TEXT NOT NULL,
  targetPerDay INTEGER NOT NULL,
  enabled INTEGER DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id TEXT PRIMARY KEY,
  habitId TEXT NOT NULL,
  date TEXT NOT NULL,
  count INTEGER NOT NULL,
  updatedAt TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS calendar_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icsUrl TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  icon TEXT,
  user_id TEXT NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'system',
  showCompletedTodos INTEGER NOT NULL DEFAULT 1,
  calendarRefreshMinutes INTEGER NOT NULL DEFAULT 15,
  suggestDates INTEGER NOT NULL DEFAULT 1,
  suggestHabits INTEGER NOT NULL DEFAULT 1,
  suggestTimeIntent INTEGER NOT NULL DEFAULT 0
);
