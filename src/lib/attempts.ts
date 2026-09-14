import type { AttemptRecord } from "./db";

export type AttemptState = "condensing" | "vaulted" | "ripe";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Ripeness is derived from the clock, never stored. Pass `now` in so the
// derivation stays deterministic and testable.
export function attemptState(a: AttemptRecord, now: number): AttemptState {
  if (a.status === "condensing") return "condensing";
  return (a.vaultedUntil ?? Infinity) <= now ? "ripe" : "vaulted";
}

function unit(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// A short, positive countdown for a vaulted attempt. "Ready" once ripe,
// otherwise the smallest sensible unit up to a calendar date far out. No
// em-dashes, no negative phrasing.
export function ripeLabel(vaultedUntil: number, now: number): string {
  const diff = vaultedUntil - now;
  if (diff <= 0) return "Ready";
  if (diff < HOUR) return `Ripe in ${unit(Math.max(1, Math.round(diff / MINUTE)), "minute")}`;
  if (diff < DAY) return `Ripe in ${unit(Math.round(diff / HOUR), "hour")}`;
  if (diff < 7 * DAY) return `Ripe in ${unit(Math.round(diff / DAY), "day")}`;
  const d = new Date(vaultedUntil);
  return `Ripe on ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
