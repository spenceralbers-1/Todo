import type { CalendarEvent } from "@/lib/calendar/types";
import type { Habit } from "@/lib/storage/types";
import type { TodoItem } from "@/lib/storage/types";

type SummaryInput = {
  date: Date;
  meetings: CalendarEvent[];
  todos: TodoItem[];
  habits: Habit[];
  now?: Date;
};

const getGreeting = (date: Date) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const formatFreeAfter = (meetings: CalendarEvent[], date: Date, now: Date) => {
  if (meetings.length === 0) {
    return "You're free all day.";
  }

  const allDay = meetings.every((m) => m.allDay);
  if (allDay) {
    return "Busy all day.";
  }

  const isToday =
    date.toDateString() === new Date(now.getFullYear(), now.getMonth(), now.getDate()).toDateString();

  const relevantMeetings = isToday
    ? meetings.filter((meeting) => meeting.end.getTime() >= now.getTime())
    : meetings;

  if (relevantMeetings.length === 0) {
    return "You're free all day.";
  }

  const last = relevantMeetings.reduce((latest, meeting) =>
    meeting.end.getTime() > latest.end.getTime() ? meeting : latest
  );
  const formatted = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(last.end);

  return `You're free after ${formatted}.`;
};

export const buildDailySummary = ({
  date,
  meetings,
  todos,
  habits,
  now = new Date(),
}: SummaryInput) => {
  const greeting = getGreeting(now);
  const openTodos = todos.filter((todo) => !todo.completedAt).length;
  const meetingCount = meetings.length;
  const habitCount = habits.length;
  const freeAfter = formatFreeAfter(meetings, date, now);

  return `${greeting}, Spencer. You have ${meetingCount} meeting${
    meetingCount === 1 ? "" : "s"
  }, ${openTodos} task${openTodos === 1 ? "" : "s"}, and ${habitCount} habit${
    habitCount === 1 ? "" : "s"
  } today. ${freeAfter}`;
};
