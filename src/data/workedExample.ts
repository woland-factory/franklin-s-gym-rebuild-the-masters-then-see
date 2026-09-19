import type { Alignment } from "../lib/db";
import { alignSentences } from "../lib/align";
import { segmentSentences } from "../lib/segment";
import { seedPassages } from "./seedPassages";

// A fixed, precomputable demo: a plausible imperfect rebuild of a seed
// passage, run through the same alignment engine as a real attempt. It writes
// nothing to the database and needs no delay. The original prose comes from
// the seed library so the author's own text stays in one exempt place.

// Exported so the first-run demo builds from the same seed prose, keeping the
// author's text in one place.
export const EXAMPLE_SEED_ID = "stevenson-travels-with-a-donkey";

// The sample rebuild. It keeps the first sentence with small changes, skips
// the second, flattens the third, and adds a closing thought of its own, so
// the alignment shows a marked matched pair, an omission, and an addition.
export const EXAMPLE_REBUILD =
  "For my part, I travel not to arrive somewhere, but simply to go. " +
  "The great thing is to move and to feel the troubles of life more nearly. " +
  "Travel teaches you a great deal about yourself.";

export interface WorkedExample {
  title: string;
  author: string;
  alignment: Alignment;
}

export function getWorkedExample(): WorkedExample {
  const passage = seedPassages.find((p) => p.id === EXAMPLE_SEED_ID);
  if (!passage) throw new Error(`Seed passage ${EXAMPLE_SEED_ID} is missing`);
  const alignment = alignSentences(passage.sentences, segmentSentences(EXAMPLE_REBUILD));
  return { title: passage.title, author: passage.author, alignment };
}
