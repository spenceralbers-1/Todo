export type TodoItem = {
  id: string;
  date: string;
  title: string;
  notes?: string;
  linkUrl?: string;
  icon?: string;
  originDate?: string;
  dismissedOnDate?: string;
  order?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type HabitSchedule = {
  type: "daily" | "weekdays" | "weekends" | "custom";
  daysOfWeek?: number[];
};

export type Habit = {
  id: string;
  title: string;
  notes?: string;
  icon?: string;
  schedule: HabitSchedule;
  targetPerDay: number;
  enabled?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HabitLog = {
  id: string;
  habitId: string;
  date: string;
  count: number;
  updatedAt: string;
};

export type CalendarSource = {
  id: string;
  name: string;
  icsUrl: string;
  enabled: boolean;
  icon?: string;
};

export type Settings = {
  theme: "light" | "dark" | "system";
  showCompletedTodos: boolean;
  calendarRefreshMinutes: number;
  suggestDates?: boolean;
  suggestHabits?: boolean;
  suggestTimeIntent?: boolean;
};
