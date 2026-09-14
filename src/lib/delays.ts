import type { DelayType } from "./db";

// Exactly two delay presets, matching the DelayType data model. "standard" is
// the default. "micro" is a short delay only. The full micro-drill experience
// (a distractor passage that fills the wait) is later scope.
export const DELAY_PRESETS: Record<DelayType, { label: string; ms: number }> = {
  standard: { label: "In 3 days", ms: 3 * 24 * 60 * 60 * 1000 },
  micro: { label: "In 15 minutes", ms: 15 * 60 * 1000 },
};

export const DEFAULT_DELAY: DelayType = "standard";
