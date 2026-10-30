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

/** "just now", "5 min ago", "3 h ago", "2 days ago", then the date. */
export function timeAgo(value) {
  if (!value) return "";
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 7 * 86400) {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  return formatDate(value);
}

export function titleCase(value) {
  if (!value) return "";
  return String(value)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "Lecturer · Acting Results Officer": the person's own role plus the offices they hold now. */
export function capacityLabel(user) {
  const offices = (user?.offices || []).map((office) => office.title);
  return [ROLE_LABELS[user?.role], ...offices].filter(Boolean).join(" · ");
}

export const ROLE_LABELS = {
  ADMIN: "Administrator",
  REGISTRAR: "Registrar",
  LECTURER: "Lecturer",
  RESULTS_OFFICER: "Results Officer",
  STUDENT: "Student",
};
