// Minimal RFC 5545 calendar export. The file carries only the passage title and
// ripe date, never the passage body or any hint.

export interface IcsEvent {
  uid: string; // stable per attempt, e.g. `${attempt.id}@franklins-gym`
  start: number; // epoch ms of the ripe time (DTSTART)
  stamp: number; // epoch ms for DTSTAMP (pass Date.now() at the call site)
  title: string; // e.g. `Rebuild "Walden" in Franklin's Gym`
  description: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// UTC basic format: YYYYMMDDTHHMMSSZ.
function toUtcBasic(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

// Escape per RFC 5545: backslash, comma, semicolon, and newline.
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

export function buildIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Franklin's Gym//EN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${toUtcBasic(event.stamp)}`,
    `DTSTART:${toUtcBasic(event.start)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

// Triggers a client-side download of a text/calendar file via a temporary
// anchor. No network call.
export function downloadIcs(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
