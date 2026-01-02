"use client";

import type { FormEvent } from "react";
import { formatDayHeader } from "@/lib/date/format";
import type { Habit, HabitLog, TodoItem } from "@/lib/storage/types";
import type { CalendarEvent } from "@/lib/calendar/types";
import { formatTimeRange } from "@/lib/date/time";
import { buildDailySummary } from "@/lib/summary/dailySummary";

type DayCardProps = {
  date: Date;
  isToday: boolean;
  todos: TodoItem[];
  showCompletedTodos: boolean;
  onToggleTodo: (id: string, completed: boolean) => void;
  onAddTodo: (title: string) => void;
  habits: Habit[];
  habitLogs: HabitLog[];
  onAddHabit: (title: string) => void;
  onUpdateHabitLog: (habit: Habit, nextCount: number) => void;
  meetings: CalendarEvent[];
};

export function DayCard({
  date,
  isToday,
  todos,
  showCompletedTodos,
  onToggleTodo,
  onAddTodo,
  habits,
  habitLogs,
  onAddHabit,
  onUpdateHabitLog,
  meetings,
}: DayCardProps) {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = `${formData.get("title") ?? ""}`.trim();
    if (!title) {
      return;
    }
    onAddTodo(title);
    event.currentTarget.reset();
  };

  const openTodos = todos.filter((todo) => !todo.completedAt);
  const completedTodos = showCompletedTodos
    ? todos.filter((todo) => todo.completedAt)
    : [];

  const habitLogMap = new Map(habitLogs.map((log) => [log.habitId, log]));
  const handleHabitSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = `${formData.get("habitTitle") ?? ""}`.trim();
    if (!title) {
      return;
    }
    onAddHabit(title);
    event.currentTarget.reset();
  };

  const summary = buildDailySummary({
    date,
    meetings,
    todos,
    habits,
  });

  return (
    <article
      className={[
        "flex h-[520px] w-[320px] flex-shrink-0 flex-col gap-4 rounded-3xl border border-border px-5 py-6 shadow-sm transition-shadow",
        "snap-center",
        isWeekend ? "bg-[color:var(--weekend)]" : "bg-panel",
        isToday ? "shadow-md" : "hover:shadow-md",
      ].join(" ")}
    >
      <header>
        <div className="text-sm uppercase tracking-[0.2em] text-muted">
          {formatDayHeader(date)}
        </div>
        <p className="mt-2 text-sm text-muted">{summary}</p>
      </header>

      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted">
          Meetings
        </h3>
        {meetings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted">
            No meetings yet.
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {meetings
              .slice()
              .sort((a, b) => {
                if (a.allDay && !b.allDay) return -1;
                if (!a.allDay && b.allDay) return 1;
                return a.start.getTime() - b.start.getTime();
              })
              .map((meeting) => (
              <li
                key={meeting.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <div>
                  <div className="text-xs text-muted">
                    {meeting.allDay
                      ? "All day"
                      : formatTimeRange(meeting.start, meeting.end)}
                  </div>
                  <div>{meeting.title}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted">Tasks</h3>
        <form onSubmit={handleSubmit}>
          <input
            name="title"
            placeholder="Add a task..."
            className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-foreground"
          />
        </form>
        {todos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted">
            Add your first task for this day.
          </div>
        ) : (
          <ul className="space-y-2">
            {openTodos.map((todo) => {
              const isDone = Boolean(todo.completedAt);
              return (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={(event) =>
                      onToggleTodo(todo.id, event.target.checked)
                    }
                  />
                  <span className={isDone ? "text-muted line-through" : ""}>
                    {todo.title}
                  </span>
                </li>
              );
            })}
            {completedTodos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked
                  onChange={(event) =>
                    onToggleTodo(todo.id, event.target.checked)
                  }
                />
                <span className="text-muted line-through">{todo.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted">Habits</h3>
        <form onSubmit={handleHabitSubmit}>
          <input
            name="habitTitle"
            placeholder="Add a habit..."
            className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:border-foreground"
          />
        </form>
        {habits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted">
            No habits due.
          </div>
        ) : (
          <ul className="space-y-2">
            {habits.map((habit) => {
              const log = habitLogMap.get(habit.id);
              const count = log?.count ?? 0;
              const target = habit.targetPerDay || 1;
              const isDone = count >= target;
              return (
                <li
                  key={habit.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-sm"
                >
                  <div className={isDone ? "text-muted line-through" : ""}>
                    {habit.title}
                  </div>
                  {target <= 1 ? (
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={(event) =>
                        onUpdateHabitLog(habit, event.target.checked ? 1 : 0)
                      }
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-border px-2 py-1 text-xs"
                        onClick={() =>
                          onUpdateHabitLog(
                            habit,
                            Math.max(0, count - 1)
                          )
                        }
                      >
                        -
                      </button>
                      <span className="text-xs text-muted">
                        {count}/{target}
                      </span>
                      <button
                        type="button"
                        className="rounded-full border border-border px-2 py-1 text-xs"
                        onClick={() =>
                          onUpdateHabitLog(
                            habit,
                            Math.min(target, count + 1)
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </article>
  );
}
