import type { AttemptRecord } from "./db";
import { MAX_SENTENCES } from "../data/seedPassages.types";

// Plain-file export and import for the whole attempts store. The user owns the
// record as one human-readable JSON file: no accounts, no network, no cloud.
// buildExport/parseExport are pure; the file I/O lives at the component edge.

export const EXPORT_FORMAT = "franklins-gym-record";
export const EXPORT_VERSION = 1;
/** Boundary caps for import. A file past either is refused before parsing rows. */
export const IMPORT_MAX_ATTEMPTS = 2000;
export const IMPORT_MAX_BYTES = 10 * 1024 * 1024;

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: number; // epoch ms, passed in by the caller
  attempts: AttemptRecord[];
}

// Pretty-printed (2-space) JSON so the file is readable in any text editor.
export function buildExport(attempts: AttemptRecord[], now: number): string {
  const payload: ExportFile = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now,
    attempts,
  };
  return JSON.stringify(payload, null, 2);
}

export type ParseResult =
  | { ok: true; attempts: AttemptRecord[] }
  | { ok: false; reason: "unreadable" | "wrong-format" | "bad-record" | "too-large" };

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validPassage(p: unknown): boolean {
  if (!isPlainObject(p)) return false;
  if (!isString(p.title) || !isString(p.author) || !isString(p.source)) return false;
  if (!(p.year === null || isFiniteNumber(p.year))) return false;
  if (!(p.originalPassageId === null || isString(p.originalPassageId))) return false;
  if (typeof p.isCustom !== "boolean") return false;
  if (!Array.isArray(p.sentences) || !p.sentences.every(isString)) return false;
  if (p.sentences.length === 0 || p.sentences.length > MAX_SENTENCES) return false;
  return true;
}

function validSpans(v: unknown): boolean {
  if (v === null) return true;
  if (!Array.isArray(v)) return false;
  return v.every(
    (s) =>
      isPlainObject(s) &&
      isString(s.text) &&
      (s.kind === "same" || s.kind === "onlyInOriginal" || s.kind === "onlyInYours"),
  );
}

function validPair(v: unknown): boolean {
  if (!isPlainObject(v)) return false;
  const mt = v.matchType;
  if (mt === "omission") {
    if (!(isString(v.original) && v.your === null)) return false;
  } else if (mt === "addition") {
    if (!(v.original === null && isString(v.your))) return false;
  } else if (mt === "matched") {
    if (!(isString(v.original) && isString(v.your))) return false;
  } else {
    return false;
  }
  if (!validSpans(v.originalSpans) || !validSpans(v.yourSpans)) return false;
  if (!isFiniteNumber(v.originalWords) || !isFiniteNumber(v.yourWords)) return false;
  if (!isFiniteNumber(v.lengthDelta) || !isFiniteNumber(v.similarity)) return false;
  return true;
}

function validAlignment(v: unknown): boolean {
  if (!isPlainObject(v)) return false;
  if (v.version !== 1) return false;
  if (!Array.isArray(v.pairs)) return false;
  return v.pairs.every(validPair);
}

function validRecord(v: unknown): boolean {
  if (!isPlainObject(v)) return false;
  if (!isString(v.id) || v.id.length === 0) return false;
  const status = v.status;
  if (status !== "condensing" && status !== "vaulted" && status !== "reconstructed") return false;
  if (!isFiniteNumber(v.createdAt)) return false;
  if (!validPassage(v.passage)) return false;
  const sentences = (v.passage as Record<string, unknown>).sentences as string[];
  if (!Array.isArray(v.hints) || !v.hints.every(isString)) return false;
  if (v.hints.length !== sentences.length) return false;
  if (!isFiniteNumber(v.cursor)) return false;

  // Optional fields, checked only when present.
  if (v.delayType !== undefined && v.delayType !== "standard" && v.delayType !== "micro") {
    return false;
  }
  if (v.vaultedAt !== undefined && !isFiniteNumber(v.vaultedAt)) return false;
  if (v.vaultedUntil !== undefined && !isFiniteNumber(v.vaultedUntil)) return false;
  if (v.reconstructedAt !== undefined && !isFiniteNumber(v.reconstructedAt)) return false;
  if (v.reconstructionText !== undefined && !isString(v.reconstructionText)) return false;
  if (v.alignment !== undefined && !validAlignment(v.alignment)) return false;

  // Status coherence: refuse records that would wedge routing.
  if (status === "reconstructed") {
    if (!validAlignment(v.alignment)) return false;
    if (!isString(v.reconstructionText)) return false;
    if (!isFiniteNumber(v.reconstructedAt)) return false;
  }
  if (status === "vaulted") {
    if (!isFiniteNumber(v.vaultedAt) || !isFiniteNumber(v.vaultedUntil)) return false;
  }
  return true;
}

// Validate at the boundary so an imported record can never crash a screen or
// wedge routing. Unknown extra properties pass through untouched, so a future
// export version downgrades gracefully.
export function parseExport(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  if (!isPlainObject(data)) return { ok: false, reason: "wrong-format" };
  if (data.format !== EXPORT_FORMAT || data.version !== EXPORT_VERSION) {
    return { ok: false, reason: "wrong-format" };
  }
  if (!Array.isArray(data.attempts)) return { ok: false, reason: "wrong-format" };
  if (data.attempts.length > IMPORT_MAX_ATTEMPTS) return { ok: false, reason: "too-large" };
  for (const record of data.attempts) {
    if (!validRecord(record)) return { ok: false, reason: "bad-record" };
  }
  return { ok: true, attempts: data.attempts as AttemptRecord[] };
}

// Triggers a client-side download of a JSON file via a temporary anchor. No
// network call. Mirrors downloadIcs in lib/ics.ts.
export function downloadJson(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
