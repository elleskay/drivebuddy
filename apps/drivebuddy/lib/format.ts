// Date/number formatting shared by the history, trip and notification screens.

export function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "Today", "Yesterday", or "Mon, 22 Sep" (with the year when it differs). */
export function dayLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

/** "Morning drive" style name for trips the user has not named. */
export function driveName(start: Date): string {
  const h = start.getHours();
  if (h < 5) return "Night drive";
  if (h < 12) return "Morning drive";
  if (h < 17) return "Afternoon drive";
  if (h < 21) return "Evening drive";
  return "Night drive";
}

/** Minutes between two ISO timestamps, or null while a trip has no end. */
export function minutesBetween(startIso: string, endIso: string | null): number | null {
  if (!endIso) return null;
  return Math.max(0, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60_000));
}

/** 45 -> "45 min", 95 -> "1 h 35 min". */
export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Compact "now", "5m", "3h", "2d", then a short date. */
export function relativeTime(iso: string): string {
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function money(n: number, digits = 2): string {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}
