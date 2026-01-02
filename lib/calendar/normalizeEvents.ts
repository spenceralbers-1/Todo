import { dateKey } from "@/lib/date/dateKey";
import type { CalendarEvent } from "./types";

type ParsedEvent = {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  allDay: boolean;
  status?: string;
};

export const normalizeEvents = (events: ParsedEvent[], sourceId: string) => {
  const result: CalendarEvent[] = [];

  events.forEach((event) => {
    if (event.status?.toLowerCase() === "cancelled") {
      return;
    }
    result.push({
      id: `${sourceId}-${event.uid}`,
      title: event.summary,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      sourceId,
    });
  });

  return result;
};

export const bucketEventsByDate = (events: CalendarEvent[]) => {
  const map: Record<string, CalendarEvent[]> = {};
  events.forEach((event) => {
    const key = dateKey(event.start);
    map[key] = [...(map[key] ?? []), event];
  });
  Object.values(map).forEach((list) =>
    list.sort((a, b) => a.start.getTime() - b.start.getTime())
  );
  return map;
};
