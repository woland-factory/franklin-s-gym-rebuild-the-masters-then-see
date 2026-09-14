export type LengthBand = "short" | "medium" | "long";

export interface SeedPassage {
  /** Stable slug, unique across the library. */
  id: string;
  /** Work title. */
  title: string;
  /** Author full name. */
  author: string;
  /** Where the text is sourced. */
  source: string;
  /** Publication year. Every seed is before 1930 and public domain. */
  year: number;
  /** Hand-split sentences, in order. Each is a non-empty complete sentence. */
  sentences: string[];
  /** Length band, by sentence count. */
  lengthBand: LengthBand;
  /** Descriptive tags (genre, notes on light modernization). */
  tags: string[];
  /** Literal false for every bundled seed. Custom passages come later. */
  isCustom: false;
}

/** Sentence-count ranges per band. Word counts are guidance, not a hard rule. */
export const BAND_SENTENCE_RANGE: Record<LengthBand, { min: number; max: number }> = {
  short: { min: 2, max: 4 },
  medium: { min: 5, max: 9 },
  long: { min: 10, max: 18 },
};

/** Hard caps shared with the future paste-your-own segmenter. */
export const MAX_WORDS = 400;
export const MAX_SENTENCES = 40;
