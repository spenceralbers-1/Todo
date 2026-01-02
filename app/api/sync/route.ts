import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";
export const preferredRegion = "iad1";
export const maxDuration = 10;

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const ensureAuth = (req: NextRequest, password?: string) => {
  if (!password) return true;
  const cookie = req.cookies.get("app_auth")?.value;
  return cookie === password;
};

const jsonError = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

async function ensureSchema(DB: any) {
  const alters = [
    'ALTER TABLE todos ADD COLUMN updatedAt TEXT',
    'ALTER TABLE todos ADD COLUMN order_num INTEGER',
    'ALTER TABLE todos ADD COLUMN createdAt TEXT',
    'ALTER TABLE todos ADD COLUMN user_id TEXT DEFAULT "default"',
    'ALTER TABLE habits ADD COLUMN createdAt TEXT',
    'ALTER TABLE habits ADD COLUMN updatedAt TEXT',
    'ALTER TABLE habits ADD COLUMN user_id TEXT DEFAULT "default"',
    'ALTER TABLE habit_logs ADD COLUMN updatedAt TEXT',
    'ALTER TABLE habit_logs ADD COLUMN user_id TEXT DEFAULT "default"',
    'ALTER TABLE calendar_sources ADD COLUMN createdAt TEXT',
    'ALTER TABLE calendar_sources ADD COLUMN updatedAt TEXT',
    'ALTER TABLE calendar_sources ADD COLUMN user_id TEXT DEFAULT "default"',
  ];
  for (const stmt of alters) {
    try {
      await DB.prepare(stmt).run();
    } catch {
      // Ignore if column already exists.
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const DB = (env as any)?.DB as any;
    const PASSWORD = (env as any)?.APP_PASSWORD as string | undefined;
    if (!DB) return jsonError("Missing database binding", 500);
    if (!ensureAuth(request, PASSWORD)) return unauthorized();
    await ensureSchema(DB);

    const userId = "default";

    const fetchAll = async (
      table: string,
      select: string,
      fallbackSelect: string
    ) => {
      try {
        const stmt = DB.prepare(
          `SELECT ${select} FROM ${table} WHERE user_id = ?`
        ).bind(userId);
        const result = await stmt.all();
        return result?.results ?? [];
      } catch {
        await ensureSchema(DB);
        const stmt = DB.prepare(
          `SELECT ${fallbackSelect} FROM ${table} WHERE user_id = ?`
        ).bind(userId);
        const result = await stmt.all();
        return (result?.results ?? []).map((row: any) => {
          if (!("updatedAt" in row) || row.updatedAt === undefined) {
            row.updatedAt = row.createdAt ?? new Date().toISOString();
          }
          if (!("createdAt" in row) || row.createdAt === undefined) {
            row.createdAt = row.updatedAt ?? new Date().toISOString();
          }
          return row;
        });
      }
    };

    const todos = await fetchAll(
      "todos",
      "id,title,notes,linkUrl,icon,date,completedAt,originDate,dismissedOnDate,order_num as \"order\",createdAt,updatedAt",
      "id,title,notes,linkUrl,icon,date,completedAt,originDate,dismissedOnDate,order_num as \"order\",createdAt"
    );
    const habits = await fetchAll(
      "habits",
      "id,title,notes,icon,schedule_json as scheduleJson,targetPerDay,enabled,createdAt,updatedAt",
      "id,title,notes,icon,schedule_json as scheduleJson,targetPerDay,enabled,createdAt"
    );
    const habitLogs = await fetchAll(
      "habit_logs",
      "id,habitId,date,count,updatedAt",
      "id,habitId,date,count,updatedAt"
    );
    const calendarSources = await fetchAll(
      "calendar_sources",
      "id,name,icsUrl,enabled,icon,createdAt,updatedAt",
      "id,name,icsUrl,enabled,icon,createdAt,updatedAt"
    );

    const settingsStmt = DB.prepare(
      "SELECT theme,showCompletedTodos,calendarRefreshMinutes,suggestDates,suggestHabits,suggestTimeIntent FROM settings WHERE user_id = ?"
    ).bind(userId);
    const settingsRow: any = await settingsStmt.first();

    const parsedHabits = habits.map((h: any) => ({
      ...h,
      enabled: Boolean(h.enabled),
      schedule: h.scheduleJson ? JSON.parse(h.scheduleJson) : null,
    }));

    const settings = settingsRow
      ? {
          theme: settingsRow.theme,
          showCompletedTodos: Boolean(settingsRow.showCompletedTodos),
          calendarRefreshMinutes: settingsRow.calendarRefreshMinutes,
          suggestDates: Boolean(settingsRow.suggestDates),
          suggestHabits: Boolean(settingsRow.suggestHabits),
          suggestTimeIntent: Boolean(settingsRow.suggestTimeIntent),
        }
      : null;

    return NextResponse.json({
      todos,
      habits: parsedHabits,
      habitLogs,
      calendarSources,
      settings,
    });
  } catch (error: any) {
    const message =
      typeof error?.message === "string" ? error.message : "Sync GET failed";
    return jsonError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext();
    const DB = (env as any)?.DB as any;
    const PASSWORD = (env as any)?.APP_PASSWORD as string | undefined;
    if (!DB) return jsonError("Missing database binding", 500);
    if (!ensureAuth(request, PASSWORD)) return unauthorized();

    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return jsonError("Invalid JSON");
    }

    const userId = "default";

    const upsertTodo = async (todo: any) => {
      const v = (x: any) => (x === undefined ? null : x);
      const orderVal =
        typeof todo.order === "number" && Number.isFinite(todo.order)
          ? todo.order
          : null;
      const stmt = DB.prepare(
        `INSERT INTO todos (id,title,notes,linkUrl,icon,date,completedAt,originDate,dismissedOnDate,order_num,createdAt,updatedAt,user_id)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)
         ON CONFLICT(id) DO UPDATE SET
           title=excluded.title,
           notes=excluded.notes,
           linkUrl=excluded.linkUrl,
           icon=excluded.icon,
           date=excluded.date,
           completedAt=excluded.completedAt,
           originDate=excluded.originDate,
           dismissedOnDate=excluded.dismissedOnDate,
           order_num=excluded.order_num,
           createdAt=excluded.createdAt,
           updatedAt=excluded.updatedAt,
           user_id=excluded.user_id`
      ).bind(
        todo.id,
        todo.title,
        v(todo.notes),
        v(todo.linkUrl),
        v(todo.icon),
        todo.date,
        v(todo.completedAt),
        v(todo.originDate),
        v(todo.dismissedOnDate),
        orderVal,
        todo.createdAt ?? new Date().toISOString(),
        todo.updatedAt ?? new Date().toISOString(),
        userId
      );
      await stmt.run();
    };

    const upsertHabit = async (habit: any) => {
      const enabledVal = habit.enabled ? 1 : 0;
      const scheduleJson = JSON.stringify(habit.schedule ?? {});
      const stmt = DB.prepare(
        `INSERT INTO habits (id,title,notes,icon,schedule_json,targetPerDay,enabled,createdAt,updatedAt,user_id)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
         ON CONFLICT(id) DO UPDATE SET
           title=excluded.title,
           notes=excluded.notes,
           icon=excluded.icon,
           schedule_json=excluded.schedule_json,
           targetPerDay=excluded.targetPerDay,
           enabled=excluded.enabled,
           createdAt=excluded.createdAt,
           updatedAt=excluded.updatedAt,
           user_id=excluded.user_id`
      ).bind(
        habit.id,
        habit.title,
        habit.notes ?? null,
        habit.icon ?? null,
        scheduleJson,
        habit.targetPerDay ?? 1,
        enabledVal,
        habit.createdAt ?? new Date().toISOString(),
        habit.updatedAt ?? new Date().toISOString(),
        userId
      );
      await stmt.run();
    };

    const upsertHabitLog = async (log: any) => {
      const countVal =
        typeof log.count === "number" && Number.isFinite(log.count)
          ? log.count
          : 0;
      const stmt = DB.prepare(
        `INSERT INTO habit_logs (id,habitId,date,count,updatedAt,user_id)
         VALUES (?1,?2,?3,?4,?5,?6)
         ON CONFLICT(id) DO UPDATE SET
           habitId=excluded.habitId,
           date=excluded.date,
           count=excluded.count,
           updatedAt=excluded.updatedAt,
           user_id=excluded.user_id`
      ).bind(
        log.id,
        log.habitId,
        log.date,
        countVal,
        log.updatedAt ?? new Date().toISOString(),
        userId
      );
      await stmt.run();
    };

    const upsertCalendar = async (source: any) => {
      const enabledVal = source.enabled ? 1 : 0;
      const stmt = DB.prepare(
        `INSERT INTO calendar_sources (id,name,icsUrl,enabled,icon,user_id)
         VALUES (?1,?2,?3,?4,?5,?6)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name,
           icsUrl=excluded.icsUrl,
           enabled=excluded.enabled,
           icon=excluded.icon,
           user_id=excluded.user_id`
      ).bind(
        source.id,
        source.name,
        source.icsUrl,
        enabledVal,
        source.icon ?? null,
        userId
      );
      await stmt.run();
    };

    const upsertSettings = async (settings: any) => {
      const theme = settings.theme ?? "system";
      const stmt = DB.prepare(
        `INSERT INTO settings (user_id,theme,showCompletedTodos,calendarRefreshMinutes,suggestDates,suggestHabits,suggestTimeIntent)
         VALUES (?1,?2,?3,?4,?5,?6,?7)
         ON CONFLICT(user_id) DO UPDATE SET
           theme=excluded.theme,
           showCompletedTodos=excluded.showCompletedTodos,
           calendarRefreshMinutes=excluded.calendarRefreshMinutes,
           suggestDates=excluded.suggestDates,
           suggestHabits=excluded.suggestHabits,
           suggestTimeIntent=excluded.suggestTimeIntent`
      ).bind(
        userId,
        theme,
        settings.showCompletedTodos ? 1 : 0,
        settings.calendarRefreshMinutes ?? 15,
        settings.suggestDates ? 1 : 0,
        settings.suggestHabits ? 1 : 0,
        settings.suggestTimeIntent ? 1 : 0
      );
      await stmt.run();
    };

    const deletions = async (ids: string[] | undefined, table: string) => {
      if (!ids || ids.length === 0) return;
      for (const id of ids) {
        const stmt = DB.prepare(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`).bind(
          id,
          userId
        );
        await stmt.run();
      }
    };

    const { todos, habits, habitLogs, calendarSources, settings, deletedTodos, deletedHabits, deletedHabitLogs, deletedCalendarSources } =
      payload;

    if (Array.isArray(todos)) {
      for (const todo of todos) {
        await upsertTodo(todo);
      }
    }
    if (Array.isArray(habits)) {
      for (const habit of habits) {
        await upsertHabit(habit);
      }
    }
    if (Array.isArray(habitLogs)) {
      for (const log of habitLogs) {
        await upsertHabitLog(log);
      }
    }
    if (Array.isArray(calendarSources)) {
      for (const source of calendarSources) {
        await upsertCalendar(source);
      }
    }
    if (settings) {
      await upsertSettings(settings);
    }

    await deletions(deletedTodos, "todos");
    await deletions(deletedHabits, "habits");
    await deletions(deletedHabitLogs, "habit_logs");
    await deletions(deletedCalendarSources, "calendar_sources");

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const message =
      typeof error?.message === "string" ? error.message : "Sync POST failed";
    return jsonError(message, 500);
  }
}
