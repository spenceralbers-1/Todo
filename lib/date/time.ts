export const formatTimeRange = (start: Date, end: Date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
};
