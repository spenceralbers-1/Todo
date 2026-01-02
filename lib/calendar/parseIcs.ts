import ICAL from "ical.js";

type ParsedEvent = {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  allDay: boolean;
  status?: string;
};

export const parseIcs = (icsText: string) => {
  const data = ICAL.parse(icsText);
  const comp = new ICAL.Component(data);
  const events = comp.getAllSubcomponents("vevent");

  return events.map((event) => {
    const vevent = new ICAL.Event(event);
    const start = vevent.startDate?.toJSDate();
    const end = vevent.endDate?.toJSDate();
    const allDay = vevent.startDate?.isDate ?? false;
    return {
      uid: vevent.uid,
      summary: vevent.summary || "Untitled",
      start: start ?? new Date(),
      end: end ?? start ?? new Date(),
      allDay,
      status: vevent.status,
    } satisfies ParsedEvent;
  });
};
