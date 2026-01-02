"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { Habit, HabitLog, TodoItem } from "@/lib/storage/types";
import type { CalendarEvent } from "@/lib/calendar/types";
import { formatTimeRange } from "@/lib/date/time";
import { dateKey, fromDateKey } from "@/lib/date/dateKey";

type DayCardProps = {
  date: Date;
  isToday: boolean;
  todos: TodoItem[];
  showCompletedTodos: boolean;
  onToggleTodo: (id: string, completed: boolean) => void;
  onAddTodo: (dateKey: string, title: string) => void;
  onReorderTodos: (orderedIds: string[]) => void;
  habits: Habit[];
  habitLogs: HabitLog[];
  onUpdateHabitLog: (habit: Habit, nextCount: number) => void;
  meetings: CalendarEvent[];
  suggestDates: boolean;
  suggestHabits: boolean;
  suggestTimeIntent: boolean;
  carryOverTodos: TodoItem[];
  onCarryToToday: (todoId: string) => void;
  onRescheduleCarry: (todoId: string, dateKey: string) => void;
  onDismissCarry: (todoId: string) => void;
};

export function DayCard({
  date,
  isToday,
  todos,
  showCompletedTodos,
  onToggleTodo,
  onAddTodo,
  onReorderTodos,
  habits,
  habitLogs,
  onUpdateHabitLog,
  meetings,
  suggestDates,
  suggestHabits,
  suggestTimeIntent,
  carryOverTodos,
  onCarryToToday,
  onRescheduleCarry,
  onDismissCarry,
}: DayCardProps) {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const [taskInput, setTaskInput] = useState("");
  const [suggestion, setSuggestion] = useState<
    { dateKey?: string; label: string; type: "date" | "time" | "habit" } | null
  >(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    if (!lastAdded) return;
    const timer = setTimeout(() => setLastAdded(null), 2000);
    return () => clearTimeout(timer);
  }, [lastAdded]);

  useEffect(() => {
    if (!lastAdded) return;
    const timer = setTimeout(() => setLastAdded(null), 2000);
    return () => clearTimeout(timer);
  }, [lastAdded]);
  const baseDateKey = useMemo(() => dateKey(date), [date]);
  const anchorDate = useMemo(() => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [date]);

  const computeSuggestion = (text: string) => {
    const lower = text.toLowerCase().trim();
    if (!lower) return null;

    const now = anchorDate;
    const candidates: { date?: Date; type: "date" | "time" | "habit"; label: string }[] = [];

    if (suggestDates) {
      if (lower.includes("tomorrow")) {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        candidates.push({
          date: d,
          type: "date",
          label: `Schedule for ${d.toLocaleDateString("en-US", { weekday: "long" })}?`,
        });
      }
      if (lower.includes("next week")) {
        const d = new Date(now);
        d.setDate(d.getDate() + 7);
        candidates.push({
          date: d,
          type: "date",
          label: `Schedule for ${d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}?`,
        });
      }
      const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      weekdays.forEach((dayName, idx) => {
        if (lower.includes(dayName)) {
          const currentDay = now.getDay();
          const offsetRaw = (idx - currentDay + 7) % 7;
          const offset = offsetRaw === 0 ? 7 : offsetRaw;
          const d = new Date(now);
          d.setDate(d.getDate() + offset);
          candidates.push({
            date: d,
            type: "date",
            label: `Schedule for ${d.toLocaleDateString("en-US", { weekday: "long" })}?`,
          });
        }
      });
    }

    if (suggestTimeIntent) {
      if (lower.includes("morning") || lower.includes("after ") || lower.includes("evening")) {
        candidates.push({
          type: "time",
          label: "Add a time note?",
        });
      }
    }

    if (suggestHabits) {
      if (lower.includes("every day") || lower.includes("daily")) {
        candidates.push({
          type: "habit",
          label: "Looks like a habit. Add in Settings?",
        });
      }
    }

    if (candidates.length === 0) return null;
    const first = candidates[0];
    return {
      dateKey: first.date ? dateKey(first.date) : undefined,
      label: first.label,
      type: first.type,
    };
  };

  useEffect(() => {
    const next = computeSuggestion(taskInput);
    setSuggestion(next);
  }, [taskInput, suggestDates, suggestHabits, suggestTimeIntent]);

  const submitTask = () => {
    if (!taskInput.trim()) return;
    const targetDate = suggestion?.dateKey ?? baseDateKey;
    const shouldStripDateText =
      suggestion?.type === "date" && suggestion?.dateKey && suggestion.dateKey !== baseDateKey;
    const cleanedTitle = shouldStripDateText
      ? taskInput
          .replace(/\b(?:on\s+)?(tomorrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, "")
          .replace(/\s+/g, " ")
          .trim()
      : taskInput.trim();
    onAddTodo(targetDate, cleanedTitle || taskInput.trim());
    setLastAdded(targetDate !== baseDateKey ? targetDate : null);
    setTaskInput("");
    setSuggestion(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitTask();
  };
  const openTodos = todos.filter((todo) => !todo.completedAt);
  const completedTodos = showCompletedTodos
    ? todos.filter((todo) => todo.completedAt)
    : [];

  const sortedOpenTodos = useMemo(() => {
    return [...openTodos].sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [openTodos]);

  const handleReorderDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const ids = sortedOpenTodos.map((t) => t.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, draggingId);
    onReorderTodos(ids);
  };

  const habitLogMap = new Map(habitLogs.map((log) => [log.habitId, log]));

  const formattedDate = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const weekdayLabel = date.toLocaleDateString("en-US", { weekday: "short" });

  return (
    <article
      className={[
        "flex w-[320px] flex-shrink-0 flex-col rounded-3xl border px-5 py-6 shadow-sm",
        "snap-center transition-shadow",
        isWeekend ? "bg-[color:var(--weekend)]" : "bg-panel",
        isToday
          ? "border-foreground/30 shadow-lg ring-2 ring-foreground/20"
          : "border-border hover:shadow-md",
      ].join(" ")}
    >
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span>{weekdayLabel}</span>
            {isToday ? (
              <span className="rounded-full bg-foreground px-2 py-1 text-[10px] font-bold uppercase text-background">
                Today
              </span>
            ) : null}
          </div>
          <div className="text-right text-sm leading-tight text-muted">
            {formattedDate}
          </div>
        </div>
      </header>

      {isToday && carryOverTodos.length > 0 ? (
        <section className="mt-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
            From yesterday
          </div>
          <div className="mt-2 space-y-3">
            {carryOverTodos.map((todo) => {
              const origin = todo.originDate ?? todo.date;
              const originLabel = new Date(origin).toLocaleDateString("en-US", {
                weekday: "short",
              });
              const minDate = dateKey(new Date());
              const defaultDate = dateKey(date);
              const handleReschedule = (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                const form = event.currentTarget;
                const formData = new FormData(form);
                const target = `${formData.get("rescheduleDate") ?? ""}`;
                if (!target) return;
                onRescheduleCarry(todo.id, target);
              };
              return (
                <div
                  key={todo.id}
                  className="rounded-2xl border border-border/70 bg-panel/60 px-3 py-3"
                >
                  <div className="text-sm font-medium">{todo.title}</div>
                  <div className="text-xs text-muted">From {originLabel}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      className="rounded-full border border-foreground/30 px-3 py-1 font-semibold"
                      onClick={() => onCarryToToday(todo.id)}
                    >
                      Carry to today
                    </button>
                    <form
                      onSubmit={handleReschedule}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="date"
                        name="rescheduleDate"
                        defaultValue={defaultDate}
                        min={minDate}
                        className="rounded-xl border border-border bg-transparent px-2 py-1 text-xs outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-border px-2 py-1"
                      >
                        Reschedule
                      </button>
                    </form>
                    <button
                      type="button"
                      className="rounded-full border border-border px-3 py-1 text-muted"
                      onClick={() => onDismissCarry(todo.id)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-4 rounded-2xl border border-border/70 bg-background/40 overflow-hidden">
        <div className="divide-y divide-dashed divide-border/60">
          <div className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted flex items-center gap-2">
            <span className="text-base leading-none text-[color:var(--accent-tasks)]">Tasks</span>
          </div>
          <div className="sticky top-0 z-10 space-y-2 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-3 text-sm"
            >
            <textarea
              name="title"
              value={taskInput}
              onChange={(event) => setTaskInput(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitTask();
                }
              }}
              placeholder="Add a task…"
              rows={1}
              className="w-full h-12 min-h-[48px] resize-none rounded-2xl bg-transparent px-3 py-3 text-sm outline-none leading-[1.4]"
            />
            </form>
            {isToday && suggestion?.dateKey && (
              <div className="text-xs text-muted">
                Will be scheduled to{" "}
                <span className="font-semibold">
                  {fromDateKey(suggestion.dateKey).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>{" "}
                unless you set Today.
                <button
                  type="button"
                  className="ml-2 rounded-full border border-border px-2 py-1 text-[11px] uppercase tracking-[0.15em]"
                  onClick={() => setSuggestion(null)}
                >
                  Set Today
                </button>
              </div>
            )}
            {isToday && lastAdded && (
              <div className="text-xs text-muted">
                Added to{" "}
                <span className="font-semibold">
                  {fromDateKey(lastAdded).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>{" "}
                <button
                  type="button"
                  className="ml-2 rounded-full border border-border px-2 py-1 text-[11px] uppercase tracking-[0.15em]"
                  onClick={() => setLastAdded(null)}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {sortedOpenTodos.map((todo) => (
            <div
              key={todo.id}
              className="group flex items-center justify-between gap-3 px-4 py-3 text-sm"
              draggable
              onDragStart={() => setDraggingId(todo.id)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleReorderDrop(todo.id)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={(event) =>
                    onToggleTodo(todo.id, event.target.checked)
                  }
                  className="h-4 w-4 accent-foreground"
                />
                <span>{todo.title}</span>
              </div>
              <span
                className={`opacity-0 transition-opacity group-hover:opacity-100 cursor-grab rounded-full border border-border px-2 text-[11px] ${
                  draggingId === todo.id ? "bg-border/40" : ""
                }`}
                title="Drag to reorder"
              >
                ::
              </span>
            </div>
          ))}
          {completedTodos.length === 0 ? null : completedTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-muted"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked
                  onChange={(event) =>
                    onToggleTodo(todo.id, event.target.checked)
                  }
                  className="h-4 w-4 accent-foreground"
                />
                <span className="line-through">{todo.title}</span>
              </div>
            </div>
          ))}

          {habits.length > 0 ? (
            <>
              <div className="px-4 pb-3 pt-5 text-xs font-semibold uppercase tracking-[0.15em] text-muted flex items-center gap-2">
                <span className="text-base leading-none text-[color:var(--accent-habits)]">Habits</span>
              </div>
              {habits.map((habit) => {
                const log = habitLogMap.get(habit.id);
                const count = log?.count ?? 0;
                const target = habit.targetPerDay || 1;
                const isDone = count >= target;
                return (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      {target <= 1 ? (
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={(event) =>
                            onUpdateHabitLog(habit, event.target.checked ? 1 : 0)
                          }
                          className="h-4 w-4 accent-foreground"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-full border border-border px-2 py-1 text-xs"
                            onClick={() =>
                              onUpdateHabitLog(habit, Math.max(0, count - 1))
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
                              onUpdateHabitLog(habit, Math.min(target, count + 1))
                            }
                          >
                            +
                          </button>
                        </div>
                      )}
                      <div className={isDone ? "text-muted line-through" : ""}>
                        {habit.title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : null}

          {meetings.length > 0 ? (
            <>
              <div className="px-4 pb-3 pt-5 text-xs font-semibold uppercase tracking-[0.15em] text-muted flex items-center gap-2">
                <span className="text-base leading-none text-[color:var(--accent-calendar)]">Calendar</span>
              </div>
              {meetings
                .slice()
                .sort((a, b) => {
                  if (a.allDay && !b.allDay) return -1;
                  if (!a.allDay && b.allDay) return 1;
                  return a.start.getTime() - b.start.getTime();
                })
                .map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg leading-none">
                        {meeting.allDay ? "★" : "🗓️"}
                      </span>
                      <div>
                        <div className="text-xs text-muted">
                          {meeting.allDay
                            ? "All day"
                            : formatTimeRange(meeting.start, meeting.end)}
                        </div>
                        <div>{meeting.title}</div>
                      </div>
                    </div>
                  </div>
                ))}
            </>
          ) : null}
        </div>
      </section>
    </article>
  );
}
