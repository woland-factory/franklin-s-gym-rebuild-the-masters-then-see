import type { AttemptRecord, PassageSnapshot } from "./db";
import { alignSentences } from "./align";
import { segmentSentences } from "./segment";
import { DELAY_PRESETS } from "./delays";
import { seedPassages } from "../data/seedPassages";
import { EXAMPLE_SEED_ID, EXAMPLE_REBUILD } from "../data/workedExample";

// Pure, deterministic demo builder. It produces one reconstructed attempt from a
// seed passage and a canned imperfect rebuild, run through the real alignment
// engine so the demo shows genuine marks, not a trophy.

/** Stable id so a re-seed is idempotent even if the empty-store guard is
 *  bypassed. */
export const DEMO_ATTEMPT_ID = "demo-first-minute";

// One short hint per sentence of the seed passage, in order. Length must equal
// the passage's sentence count.
const DEMO_HINTS = [
  "Travel to go, not to arrive.",
  "Travel for its own sake.",
  "The point is to move and feel life closely.",
];

function snapshotFromSeed(id: string): PassageSnapshot {
  const passage = seedPassages.find((p) => p.id === id);
  if (!passage) throw new Error(`Seed passage ${id} is missing`);
  return {
    originalPassageId: passage.id,
    title: passage.title,
    author: passage.author,
    source: passage.source,
    year: passage.year,
    sentences: passage.sentences,
    isCustom: false,
  };
}

/** A reconstructed attempt with a real cached alignment that contains at least
 *  one omission and one addition (genuine gaps). `now` sets createdAt and
 *  reconstructedAt; vaultedAt/vaultedUntil sit in the past. */
export function buildDemoAttempt(now: number): AttemptRecord {
  const passage = snapshotFromSeed(EXAMPLE_SEED_ID);
  const alignment = alignSentences(passage.sentences, segmentSentences(EXAMPLE_REBUILD));
  const microMs = DELAY_PRESETS.micro.ms;
  return {
    id: DEMO_ATTEMPT_ID,
    status: "reconstructed",
    createdAt: now,
    passage,
    hints: DEMO_HINTS.slice(0, passage.sentences.length),
    cursor: passage.sentences.length,
    delayType: "micro",
    vaultedAt: now - microMs,
    vaultedUntil: now - 1,
    reconstructionText: EXAMPLE_REBUILD,
    reconstructedAt: now,
    alignment,
  };
}
