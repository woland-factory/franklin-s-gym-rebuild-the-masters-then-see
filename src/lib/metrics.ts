import type { Alignment } from "./db";

// Reconstruction fidelity, derived on read from a saved alignment. These are
// two separate measurements of how much hinted substance a rebuild recovered,
// never a graded quality score. Pure and deterministic: the same alignment
// always yields the same numbers, with no clock, randomness, or model.

export interface FidelityMetrics {
  /** Original sentences: matched pairs + omissions. */
  originalSentences: number;
  /** Original sentences recovered: the matched pairs. */
  recoveredSentences: number;
  /** recoveredSentences / originalSentences, in [0,1]; 0 when the original is empty. */
  recoveredShare: number;
  /** Rebuild sentences: matched pairs + additions. */
  yourSentences: number;
  /** yourSentences - originalSentences. Negative when the rebuild is shorter. */
  sentenceDelta: number;
}

export function fidelityMetrics(alignment: Alignment): FidelityMetrics {
  let matched = 0;
  let omissions = 0;
  let additions = 0;
  for (const pair of alignment.pairs) {
    if (pair.matchType === "matched") matched += 1;
    else if (pair.matchType === "omission") omissions += 1;
    else if (pair.matchType === "addition") additions += 1;
  }

  const originalSentences = matched + omissions;
  const yourSentences = matched + additions;
  const recoveredShare = originalSentences === 0 ? 0 : matched / originalSentences;

  return {
    originalSentences,
    recoveredSentences: matched,
    recoveredShare,
    yourSentences,
    sentenceDelta: yourSentences - originalSentences,
  };
}
