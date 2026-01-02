import type { Habit } from "@/lib/storage/types";

export const isHabitDue = (habit: Habit, date: Date) => {
  if (habit.enabled === false) return false;
  const day = date.getDay();
  switch (habit.schedule.type) {
    case "daily":
      return true;
    case "weekdays":
      return day >= 1 && day <= 5;
    case "weekends":
      return day === 0 || day === 6;
    case "custom":
      return habit.schedule.daysOfWeek?.includes(day) ?? false;
    default:
      return false;
  }
};
