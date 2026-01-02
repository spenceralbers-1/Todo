"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { CardRail } from "@/components/CardRail";
import { SettingsModal } from "@/components/SettingsModal";
import { buildDateRange } from "@/lib/date/range";
import { dateKey } from "@/lib/date/dateKey";
import { calendarRepo, habitLogRepo, habitRepo, settingsRepo, todoRepo } from "@/lib/storage/repos";
import { isHabitDue } from "@/lib/habits/isHabitDue";
import type { CalendarSource, Habit, HabitLog, TodoItem } from "@/lib/storage/types";
import { fetchIcsWithProxy } from "@/lib/calendar/fetchIcs";
import { parseIcs } from "@/lib/calendar/parseIcs";
import { bucketEventsByDate, normalizeEvents } from "@/lib/calendar/normalizeEvents";
import type { CalendarEvent } from "@/lib/calendar/types";

export default function Home() {
  const today = new Date();
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [todosByDate, setTodosByDate] = useState<Record<string, TodoItem[]>>(
    {}
  );
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogsByDate, setHabitLogsByDate] = useState<
    Record<string, HabitLog[]>
  >({});
  const [calendarSources, setCalendarSources] = useState<CalendarSource[]>([]);
  const [meetingsByDate, setMeetingsByDate] = useState<
    Record<string, CalendarEvent[]>
  >({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showCompletedTodos, setShowCompletedTodos] = useState(true);
  const [suggestDates, setSuggestDates] = useState(true);
  const [suggestHabits, setSuggestHabits] = useState(true);
  const [suggestTimeIntent, setSuggestTimeIntent] = useState(false);
  const [lastCalendarSync, setLastCalendarSync] = useState<string | null>(null);
  const { setTheme } = useTheme();

  const dateRange = useMemo(() => buildDateRange(today, 7, 14), [today]);
  const todayKey = useMemo(() => dateKey(today), [today]);
  const yesterdayKey = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return dateKey(d);
  }, [today]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      dateRange.map(async (date) => {
        const key = dateKey(date);
        const todos = await todoRepo.listByDate(key);
        return [key, todos] as const;
      })
    ).then((entries) => {
      if (cancelled) {
        return;
      }
      const next: Record<string, TodoItem[]> = {};
      entries.forEach(([key, todos]) => {
        next[key] = todos;
      });
      setTodosByDate(next);
    });

    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  useEffect(() => {
    let cancelled = false;
    habitRepo.list().then((items) => {
      if (cancelled) {
        return;
      }
      setHabits(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      dateRange.map(async (date) => {
        const key = dateKey(date);
        const logs = await habitLogRepo.listByDate(key);
        return [key, logs] as const;
      })
    ).then((entries) => {
      if (cancelled) {
        return;
      }
      const next: Record<string, HabitLog[]> = {};
      entries.forEach(([key, logs]) => {
        next[key] = logs;
      });
      setHabitLogsByDate(next);
    });

    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  useEffect(() => {
    let cancelled = false;
    calendarRepo.list().then((sources) => {
      if (cancelled) {
        return;
      }
      setCalendarSources(sources);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    settingsRepo.get().then((settings) => {
      if (cancelled) {
        return;
      }
      setShowCompletedTodos(settings.showCompletedTodos);
      setSuggestDates(settings.suggestDates ?? true);
      setSuggestHabits(settings.suggestHabits ?? true);
      setSuggestTimeIntent(settings.suggestTimeIntent ?? false);
      setTheme(settings.theme);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (calendarSources.length === 0) {
        setMeetingsByDate({});
        setLastCalendarSync(null);
        return;
      }
      const allEvents: CalendarEvent[] = [];
      for (const source of calendarSources) {
        if (!source.enabled) {
          continue;
        }
        try {
          const ics = await fetchIcsWithProxy(source.icsUrl);
          const parsed = parseIcs(ics);
          allEvents.push(...normalizeEvents(parsed, source.id));
        } catch (error) {
          // Ignore fetch errors for now.
        }
      }
      if (cancelled) {
        return;
      }
      setLastCalendarSync(new Date().toLocaleString());
      setMeetingsByDate(bucketEventsByDate(allEvents));
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [calendarSources]);

  const habitsByDate = useMemo(() => {
    const next: Record<string, Habit[]> = {};
    dateRange.forEach((date) => {
      const key = dateKey(date);
      next[key] = habits.filter((habit) => isHabitDue(habit, date));
    });
    return next;
  }, [dateRange, habits]);

  const refreshHabits = async () => {
    const items = await habitRepo.list();
    setHabits(items);
  };

  const carryOverTodos = useMemo(() => {
    const yesterdayTodos = todosByDate[yesterdayKey] ?? [];
    return yesterdayTodos.filter(
      (todo) => !todo.completedAt && !todo.dismissedOnDate
    );
  }, [todosByDate, yesterdayKey]);

  const moveTodoToDate = async (todo: TodoItem, targetDate: string) => {
    const originDate = todo.originDate ?? todo.date;
    const updated = await todoRepo.update(todo.id, {
      date: targetDate,
      originDate,
      dismissedOnDate: undefined,
    });
    if (!updated) return;

    setTodosByDate((prev) => {
      const next = { ...prev };
      const removeKey = todo.date;
      next[removeKey] = (next[removeKey] ?? []).filter(
        (item) => item.id !== todo.id
      );
      next[targetDate] = [updated, ...(next[targetDate] ?? [])];
      return next;
    });
  };

  const handleCarryToToday = async (todoId: string) => {
    const source = (todosByDate[yesterdayKey] ?? []).find(
      (t) => t.id === todoId
    );
    if (!source) return;
    await moveTodoToDate(source, todayKey);
  };

  const handleReschedule = async (todoId: string, targetDate: string) => {
    const source = (todosByDate[yesterdayKey] ?? []).find(
      (t) => t.id === todoId
    );
    if (!source) return;
    await moveTodoToDate(source, targetDate);
  };

  const handleDismissCarry = async (todoId: string) => {
    const source = (todosByDate[yesterdayKey] ?? []).find(
      (t) => t.id === todoId
    );
    if (!source) return;
    const updated = await todoRepo.update(todoId, {
      dismissedOnDate: todayKey,
    });
    if (!updated) return;
    setTodosByDate((prev) => {
      const next = { ...prev };
      next[yesterdayKey] = (next[yesterdayKey] ?? []).map((item) =>
        item.id === todoId ? updated : item
      );
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="py-6">
        <CardRail
          centerDate={today}
          recenterSignal={recenterSignal}
          todosByDate={todosByDate}
          showCompletedTodos={showCompletedTodos}
          onToday={() => setRecenterSignal((value) => value + 1)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleTodo={async (id, completed) => {
            const completedAt = completed ? new Date().toISOString() : undefined;
            const updated = await todoRepo.update(id, { completedAt });
            if (!updated) {
              return;
            }
            setTodosByDate((prev) => {
              const next = { ...prev };
              const key = updated.date;
              next[key] = (next[key] ?? []).map((item) =>
                item.id === updated.id ? updated : item
              );
              return next;
            });
          }}
          onAddTodo={async (key, title) => {
            const existing = todosByDate[key] ?? [];
            const minOrder = existing.reduce(
              (min, t) => (t.order ?? min),
              Number.POSITIVE_INFINITY
            );
            const order = Number.isFinite(minOrder) ? minOrder - 1 : 0;
            const item = await todoRepo.add({
              date: key,
              title,
              order,
            });
            setTodosByDate((prev) => {
              const next = { ...prev };
              next[key] = [item, ...(next[key] ?? [])];
              return next;
            });
          }}
          onReorderTodos={async (key, orderedIds) => {
            const current = todosByDate[key] ?? [];
            const byId = new Map(current.map((t) => [t.id, t]));
            const reordered: TodoItem[] = orderedIds
              .map((id, idx) => {
                const t = byId.get(id);
                if (!t) return null;
                return { ...t, order: idx };
              })
              .filter(Boolean) as TodoItem[];
            setTodosByDate((prev) => ({ ...prev, [key]: reordered }));
            await Promise.all(
              reordered.map((todo) => todoRepo.update(todo.id, { order: todo.order }))
            );
          }}
          habitsByDate={habitsByDate}
          habitLogsByDate={habitLogsByDate}
          onUpdateHabitLog={async (key, habit, nextCount) => {
            const log = await habitLogRepo.upsert({
              habitId: habit.id,
              date: key,
              count: nextCount,
            });
            setHabitLogsByDate((prev) => {
              const next = { ...prev };
              const current = next[key] ?? [];
              const idx = current.findIndex((item) => item.id === log.id);
              if (idx >= 0) {
                const updated = [...current];
                updated[idx] = log;
                next[key] = updated;
              } else {
                next[key] = [...current, log];
              }
              return next;
            });
          }}
          meetingsByDate={meetingsByDate}
          suggestDates={suggestDates}
          suggestHabits={suggestHabits}
          suggestTimeIntent={suggestTimeIntent}
          carryOverTodos={carryOverTodos}
          onCarryToToday={handleCarryToToday}
          onReschedule={handleReschedule}
          onDismissCarry={handleDismissCarry}
        />
      </main>
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onCalendarsUpdated={(sources) => setCalendarSources(sources)}
        onSettingsUpdated={(settings) => {
          setShowCompletedTodos(settings.showCompletedTodos);
          setSuggestDates(settings.suggestDates ?? true);
          setSuggestHabits(settings.suggestHabits ?? true);
          setSuggestTimeIntent(settings.suggestTimeIntent ?? false);
          setTheme(settings.theme);
        }}
        lastCalendarSync={lastCalendarSync ?? undefined}
        onHabitsUpdated={refreshHabits}
      />
      <button
        type="button"
        className="fixed bottom-4 right-4 rounded-full border border-border bg-panel px-4 py-2 text-sm shadow-md"
        onClick={() => setSettingsOpen(true)}
      >
        Settings
      </button>
    </div>
  );
}
