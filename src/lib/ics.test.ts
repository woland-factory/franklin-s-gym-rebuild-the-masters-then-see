import { describe, expect, it } from "vitest";
import { buildIcs, type IcsEvent } from "./ics";

// 2026-09-17T12:00:00Z and a stamp a little earlier, both fixed for determinism.
const RIPE = Date.UTC(2026, 8, 17, 12, 0, 0);
const STAMP = Date.UTC(2026, 8, 14, 9, 30, 0);

function makeEvent(overrides: Partial<IcsEvent> = {}): IcsEvent {
  return {
    uid: "abc-123@franklins-gym",
    start: RIPE,
    stamp: STAMP,
    title: 'Rebuild "Walden" in Franklin\'s Gym',
    description: "Your hints are ready.",
    ...overrides,
  };
}

describe("buildIcs", () => {
  it("emits a valid VCALENDAR/VEVENT with the required properties", () => {
    const ics = buildIcs(makeEvent());
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//Franklin's Gym//EN");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:abc-123@franklins-gym");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("writes DTSTART for the ripe time in UTC basic format", () => {
    const ics = buildIcs(makeEvent());
    expect(ics).toContain("DTSTART:20260917T120000Z");
    expect(ics).toContain("DTSTAMP:20260914T093000Z");
  });

  it("uses CRLF line endings", () => {
    const ics = buildIcs(makeEvent());
    expect(ics.includes("\r\n")).toBe(true);
    // No bare LF that is not part of a CRLF pair.
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it("escapes commas, semicolons, backslashes, and newlines", () => {
    const ics = buildIcs(
      makeEvent({ description: "a, b; c \\ d\nnext" }),
    );
    expect(ics).toContain("DESCRIPTION:a\\, b\\; c \\\\ d\\nnext");
  });

  it("carries only the title and never a passage body", () => {
    const body = "The mass of men lead lives of quiet desperation.";
    const ics = buildIcs(makeEvent({ title: 'Rebuild "Walden"' }));
    expect(ics.includes(body)).toBe(false);
  });
});
