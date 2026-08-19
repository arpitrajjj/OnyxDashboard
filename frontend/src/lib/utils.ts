import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui cn() helper — merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an ISO datetime as relative time, e.g. "2m ago". */
export function timeAgo(iso: string): string {
  if (!iso) return "—";
  const t = new Date(iso.endsWith("Z") ? iso : iso + "Z").getTime();
  if (Number.isNaN(t)) return "—";
  const diff = (Date.now() - t) / 1000;
  if (diff < 5) return "just now";
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(t).toLocaleDateString();
}

/** Format an ISO datetime as a short absolute time. */
export function formatTime(iso: string): string {
  if (!iso) return "—";
  const t = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
