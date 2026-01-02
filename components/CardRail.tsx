"use client";

import type { WheelEvent } from "react";
import { useEffect, useMemo, useRef } from "react";
import { DayCard } from "@/components/DayCard";
import { buildDateRange } from "@/lib/date/range";
import { dateKey } from "@/lib/date/dateKey";
import type { Habit, HabitLog, TodoItem } from "@/lib/storage/types";
import type { CalendarEvent } from "@/lib/calendar/types";

type CardRailProps = {
  centerDate: Date;
  onCentered?: () => void;
  recenterSignal: number;
  todosByDate: Record<string, TodoItem[]>;
  onToggleTodo: (id: string, completed: boolean) => void;
  onAddTodo: (dateKey: string, title: string) => void;
  habitsByDate: Record<string, Habit[]>;
  habitLogsByDate: Record<string, HabitLog[]>;
  onAddHabit: (title: string) => void;
  onUpdateHabitLog: (dateKey: string, habit: Habit, nextCount: number) => void;
  meetingsByDate: Record<string, CalendarEvent[]>;
  showCompletedTodos: boolean;
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
  onAddHabit,
  onUpdateHabitLog,
  meetingsByDate,
  showCompletedTodos,
}: CardRailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  const dates = useMemo(() => buildDateRange(centerDate, 7, 14), [centerDate]);

  useEffect(() => {
    if (!todayRef.current) {
      return;
    }
    todayRef.current.scrollIntoView({ behavior: "auto", inline: "center" });
    onCentered?.();
  }, []);

  useEffect(() => {
    if (!todayRef.current) {
      return;
    }
    todayRef.current.scrollIntoView({ behavior: "smooth", inline: "center" });
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

  return (
    <div className="overflow-hidden">
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
                onAddTodo={(title) => onAddTodo(key, title)}
                habits={habits}
                habitLogs={habitLogs}
                onAddHabit={onAddHabit}
                onUpdateHabitLog={(habit, count) =>
                  onUpdateHabitLog(key, habit, count)
                }
                meetings={meetings}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
