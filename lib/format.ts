export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  const seconds = Math.max(0, Math.round((now - then) / 1000));

  if (seconds < 45) {
    return "now";
  }

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.round(hours / 24);

  if (days < 7) {
    return `${days}d`;
  }

  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isWithinWindow(
  iso: string,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  return now - new Date(iso).getTime() < windowMs;
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function mediaUrl(file: string | null | undefined): string | null {
  return file ? `/api/media/${encodeURIComponent(file)}` : null;
}
