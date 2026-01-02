import { addDays, startOfDay } from "./dateKey";

export const buildDateRange = (
  center: Date,
  pastDays: number,
  futureDays: number
) => {
  const start = addDays(startOfDay(center), -pastDays);
  const end = addDays(startOfDay(center), futureDays);
  const dates: Date[] = [];
  let cursor = start;

  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
};
