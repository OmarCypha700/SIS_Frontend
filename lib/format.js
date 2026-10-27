const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

/** Value for <input type="datetime-local"> from an ISO string (local time). */
export function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

/** ISO string (with timezone) from a datetime-local value. */
export function fromDateTimeLocal(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function titleCase(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ROLE_LABELS = {
  ADMIN: "Administrator",
  REGISTRAR: "Registrar",
  LECTURER: "Lecturer",
  RESULTS_OFFICER: "Results Officer",
  STUDENT: "Student",
};
