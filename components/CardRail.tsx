"use client";

import type { WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DayCard } from "@/components/DayCard";
import { buildDateRange } from "@/lib/date/range";
import { dateKey } from "@/lib/date/dateKey";
import { buildDailySummary } from "@/lib/summary/dailySummary";
import type { Habit, HabitLog, TodoItem } from "@/lib/storage/types";
import type { CalendarEvent } from "@/lib/calendar/types";

type CardRailProps = {
  centerDate: Date;
  onToday?: () => void;
  onOpenSettings?: () => void;
  onCentered?: () => void;
  recenterSignal: number;
  todosByDate: Record<string, TodoItem[]>;
  onToggleTodo: (id: string, completed: boolean) => void;
  onAddTodo: (dateKey: string, title: string) => void;
  habitsByDate: Record<string, Habit[]>;
  habitLogsByDate: Record<string, HabitLog[]>;
  onUpdateHabitLog: (dateKey: string, habit: Habit, nextCount: number) => void;
  meetingsByDate: Record<string, CalendarEvent[]>;
  showCompletedTodos: boolean;
  suggestDates: boolean;
  suggestHabits: boolean;
  suggestTimeIntent: boolean;
  carryOverTodos: TodoItem[];
  onCarryToToday: (todoId: string) => void;
  onReschedule: (todoId: string, dateKey: string) => void;
  onDismissCarry: (todoId: string) => void;
  onReorderTodos: (dateKey: string, orderedIds: string[]) => void;
};

export function CardRail({
  centerDate,
  onCentered,
  recenterSignal,
  todosByDate,
  onToggleTodo,
  onAddTodo,
  habitsByDate,
  habitLogsByDate,
  onUpdateHabitLog,
  meetingsByDate,
  showCompletedTodos,
  suggestDates,
  suggestHabits,
  suggestTimeIntent,
  carryOverTodos,
  onCarryToToday,
  onReschedule,
  onDismissCarry,
  onReorderTodos,
  onToday,
  onOpenSettings,
}: CardRailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const isTodayVisibleRef = useRef(true);
  const [, forceUpdate] = useState(0);

  const dates = useMemo(() => buildDateRange(centerDate, 7, 14), [centerDate]);
  const todayKey = dateKey(centerDate);
  const todaySummary = useMemo(() => {
    const todos = todosByDate[todayKey] ?? [];
    const habits = habitsByDate[todayKey] ?? [];
    const meetings = meetingsByDate[todayKey] ?? [];
    return buildDailySummary({
      date: centerDate,
      meetings,
      todos,
      habits,
    });
  }, [centerDate, habitsByDate, meetingsByDate, todayKey, todosByDate]);
  const formatFreeAfter = (meetings: CalendarEvent[]) => {
    if (meetings.length === 0) return "You're free all day.";
    const allDay = meetings.every((m) => m.allDay);
    if (allDay) return "";
    const now = new Date();
    const relevant = meetings.filter((m) => m.end.getTime() >= now.getTime());
    const remaining = relevant.length === 0 ? meetings : relevant;
    const last = remaining.reduce((latest, meeting) =>
      meeting.end.getTime() > latest.end.getTime() ? meeting : latest
    );
    const formatted = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(last.end);
    return `You're free after ${formatted}.`;
  };

  useEffect(() => {
    if (!todayRef.current) {
      return;
    }
    todayRef.current.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
    onCentered?.();
  }, []);

  useEffect(() => {
    if (!todayRef.current) {
      return;
    }
    todayRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [recenterSignal]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      event.preventDefault();
      const card = containerRef.current.querySelector<HTMLElement>("[data-card]");
      const width = card?.offsetWidth ?? 320;
      const gap = 24;
      const delta = event.key === "ArrowLeft" ? -(width + gap) : width + gap;
      containerRef.current.scrollBy({ left: delta, behavior: "smooth" });
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!containerRef.current) {
      return;
    }
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      return;
    }
    event.preventDefault();
    containerRef.current.scrollLeft += event.deltaY;
  };

  const updateTodayVisibility = () => {
    const container = containerRef.current;
    const todayEl = todayRef.current;
    if (!container || !todayEl) return;
    const containerRect = container.getBoundingClientRect();
    const todayRect = todayEl.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    const todayCenter = todayRect.left + todayRect.width / 2;
    const isVisible = Math.abs(containerCenter - todayCenter) < todayRect.width / 2;
    if (isVisible !== isTodayVisibleRef.current) {
      isTodayVisibleRef.current = isVisible;
      forceUpdate((v) => v + 1);
    }
  };

  useEffect(() => {
    updateTodayVisibility();
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => updateTodayVisibility();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="overflow-hidden">
      {todaySummary ? (
        <div className="pb-2 pt-4 text-foreground">
          <div className="mx-auto max-w-[720px] text-center space-y-2">
            <div className="flex items-center justify-center text-3xl font-semibold">
              {todaySummary.split("\n")[0]}
            </div>
            <div className="text-sm">
              <span className="text-muted">You have </span>
              <span className="font-semibold text-[color:var(--accent-calendar)]">
                {(meetingsByDate[todayKey] ?? []).length} meetings
              </span>
              <span className="text-muted">, </span>
              <span className="font-semibold text-[color:var(--accent-tasks)]">
                {(todosByDate[todayKey] ?? []).filter((t) => !t.completedAt).length} tasks
              </span>
              <span className="text-muted">, and </span>
              <span className="font-semibold text-[color:var(--accent-habits)]">
                {(habitsByDate[todayKey] ?? []).length} habits
              </span>
              <span className="text-muted"> today.</span>
              {!isTodayVisibleRef.current && (
                <button
                  type="button"
                  className="ml-2 rounded-full border border-border px-3 py-1 text-xs"
                  onClick={onToday}
                >
                  Center on Today
                </button>
              )}
            </div>
            {formatFreeAfter(meetingsByDate[todayKey] ?? []) ? (
              <div className="text-sm text-muted">
                {formatFreeAfter(meetingsByDate[todayKey] ?? [])}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div
        ref={containerRef}
        className="flex gap-6 overflow-x-auto px-6 pb-6 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
        onWheel={handleWheel}
      >
        {dates.map((date) => {
          const key = dateKey(date);
          const isToday = dateKey(centerDate) === key;
          const todos = todosByDate[key] ?? [];
          const habits = habitsByDate[key] ?? [];
          const habitLogs = habitLogsByDate[key] ?? [];
          const meetings = meetingsByDate[key] ?? [];
          return (
            <div
              key={key}
              ref={isToday ? todayRef : null}
              data-card
              className="flex-shrink-0"
            >
              <DayCard
                date={date}
                isToday={isToday}
                todos={todos}
                showCompletedTodos={showCompletedTodos}
                onToggleTodo={onToggleTodo}
                onAddTodo={(targetKey, title) => onAddTodo(targetKey, title)}
                onReorderTodos={(orderedIds) => onReorderTodos(key, orderedIds)}
                habits={habits}
                habitLogs={habitLogs}
                onUpdateHabitLog={(habit, count) =>
                  onUpdateHabitLog(key, habit, count)
                }
                meetings={meetings}
                suggestDates={suggestDates}
                suggestHabits={suggestHabits}
                suggestTimeIntent={suggestTimeIntent}
                carryOverTodos={isToday ? carryOverTodos : []}
                onCarryToToday={onCarryToToday}
                onRescheduleCarry={onReschedule}
                onDismissCarry={onDismissCarry}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
