import { MAX_WORDS, MAX_SENTENCES } from "../data/seedPassages.types";
import { totalWordCount } from "./wordCount";

// Sentence segmentation is a heuristic, not a parser. It splits on the common
// terminators and guards a small, fixed abbreviation list. Edge cases such as
// initials ("J. R. R.") and decimals ("3.14") may split imperfectly. The same
// split feeds the later alignment diff, so it stays deterministic and stable.

export const MIN_SENTENCES = 2;

// A `.` right after one of these does not end a sentence. Intentionally small.
const ABBREVIATIONS = new Set([
  "Mr.",
  "Mrs.",
  "Ms.",
  "Dr.",
  "St.",
  "Jr.",
  "Sr.",
  "vs.",
  "etc.",
]);

const TERMINATORS = ".!?";
// Closing marks that stay attached to the sentence when they trail a terminator.
const CLOSERS = "\"')]”’";

// The whitespace-delimited token ending at (and including) the period, used to
// test the abbreviation guard.
function tokenEndingAt(text: string, from: number, periodIndex: number): string {
  let s = periodIndex;
  while (s > from && !/\s/.test(text[s - 1])) s--;
  return text.slice(s, periodIndex + 1);
}

function splitParagraph(text: string): string[] {
  const result: string[] = [];
  let start = 0;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (TERMINATORS.includes(ch)) {
      // Consume a run of terminators (e.g. "?!", "...").
      let j = i;
      while (j + 1 < text.length && TERMINATORS.includes(text[j + 1])) j++;
      // Consume trailing closing quotes or brackets.
      let k = j;
      while (k + 1 < text.length && CLOSERS.includes(text[k + 1])) k++;
      const next = k + 1;
      if (next >= text.length || /\s/.test(text[next])) {
        // A single, unadorned period may be an abbreviation, not a boundary.
        if (ch === "." && j === i && k === i && ABBREVIATIONS.has(tokenEndingAt(text, start, i))) {
          i = next;
          continue;
        }
        const sentence = text.slice(start, k + 1).trim();
        if (sentence) result.push(sentence);
        start = next;
        while (start < text.length && /\s/.test(text[start])) start++;
        i = start;
        continue;
      }
    }
    i++;
  }
  const tail = text.slice(start).trim();
  if (tail) result.push(tail);
  return result;
}

export function segmentSentences(text: string): string[] {
  const out: string[] = [];
  // Newlines separate paragraphs and always break a sentence, even without a
  // terminator.
  for (const paragraph of text.split(/\n+/)) {
    const normalized = paragraph.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    out.push(...splitParagraph(normalized));
  }
  return out.map((s) => s.trim()).filter(Boolean);
}

export type SegmentResult =
  | { ok: true; sentences: string[] }
  | { ok: false; reason: "too-short" | "too-many-sentences" | "too-long"; count: number };

// Validates pasted text at the boundary before it is stored. Order of checks:
// too-short, then too-many-sentences, then too-long by words. `count` carries
// the offending number so the UI can name it.
export function segmentAndValidate(text: string): SegmentResult {
  const sentences = segmentSentences(text);
  if (sentences.length < MIN_SENTENCES) {
    return { ok: false, reason: "too-short", count: sentences.length };
  }
  if (sentences.length > MAX_SENTENCES) {
    return { ok: false, reason: "too-many-sentences", count: sentences.length };
  }
  const words = totalWordCount(sentences);
  if (words > MAX_WORDS) {
    return { ok: false, reason: "too-long", count: words };
  }
  return { ok: true, sentences };
}
