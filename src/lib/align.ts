import type { Alignment, AlignmentPair, DiffSpan } from "./db";

// Deterministic sentence-by-sentence alignment of a rebuild against the fixed
// original. Pure: no clock, no randomness, no I/O. The same inputs always
// produce the exact same output, so the view can be trusted and cached.
//
// Both inputs are validated against MAX_SENTENCES upstream, so the dynamic
// programming grid stays at most 40 x 40 and the whole computation finishes in
// well under a second.

// Minimum blended similarity for two sentences to pair. Below it they fall out
// as an omission plus an addition. A single named constant so tuning is one
// edit; its boundary behavior is pinned by tests.
export const MATCH_THRESHOLD = 0.3;

interface TokenizedSentence {
  /** Whitespace-split display words, punctuation attached, as typed. */
  displays: string[];
  /**
   * Comparison token per display word, index-aligned with `displays`. A word
   * that normalizes to empty (bare punctuation) keeps an empty slot so a mark
   * on token k always maps to display word k.
   */
  tokens: string[];
  /** Count of nonempty comparison tokens, the denominator for similarity. */
  contentCount: number;
}

function splitDisplayWords(sentence: string): string[] {
  const trimmed = sentence.trim();
  if (!trimmed) return [];
  return trimmed.split(/\s+/);
}

// Lowercase and strip leading and trailing punctuation. Interior characters
// stay, so "travel's" and "feather-bed" each remain one token.
function normalizeToken(word: string): string {
  return word
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/[^\p{L}\p{N}]+$/u, "");
}

function tokenize(sentence: string): TokenizedSentence {
  const displays = splitDisplayWords(sentence);
  const tokens = displays.map(normalizeToken);
  const contentCount = tokens.filter((t) => t !== "").length;
  return { displays, tokens, contentCount };
}

// Tokens compare equal only when both are nonempty. Empty slots (bare
// punctuation) never match anything, keeping them off the common subsequence.
function tokensEqual(a: string, b: string): boolean {
  return a !== "" && a === b;
}

// Longest common subsequence length of two token sequences.
function lcsLength(a: string[], b: string[]): number {
  const rows = a.length;
  const cols = b.length;
  let prev = new Array<number>(cols + 1).fill(0);
  let curr = new Array<number>(cols + 1).fill(0);
  for (let i = 1; i <= rows; i++) {
    for (let j = 1; j <= cols; j++) {
      curr[j] = tokensEqual(a[i - 1], b[j - 1])
        ? prev[j - 1] + 1
        : Math.max(prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[cols];
}

// Multiset intersection size of the nonempty tokens of two sentences.
function multisetOverlap(a: string[], b: string[]): number {
  const counts = new Map<string, number>();
  for (const t of a) {
    if (t === "") continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  let overlap = 0;
  for (const t of b) {
    const n = counts.get(t);
    if (n) {
      overlap++;
      counts.set(t, n - 1);
    }
  }
  return overlap;
}

// Blended similarity in [0, 1]: half vocabulary overlap (dice, order
// insensitive), half longest-common-subsequence (order sensitive, the indel
// form of edit distance). Zero when either sentence has zero content tokens.
function similarity(a: TokenizedSentence, b: TokenizedSentence): number {
  const denom = a.contentCount + b.contentCount;
  if (a.contentCount === 0 || b.contentCount === 0) return 0;
  const dice = (2 * multisetOverlap(a.tokens, b.tokens)) / denom;
  const lcsSim = (2 * lcsLength(a.tokens, b.tokens)) / denom;
  return 0.5 * dice + 0.5 * lcsSim;
}

// Word-level diff of a matched pair: display words on the token LCS render as
// "same" on both sides; the rest are marked as only on their own side.
function markPair(
  original: TokenizedSentence,
  your: TokenizedSentence,
): { originalSpans: DiffSpan[]; yourSpans: DiffSpan[] } {
  const a = original.tokens;
  const b = your.tokens;
  const rows = a.length;
  const cols = b.length;
  const grid: number[][] = Array.from({ length: rows + 1 }, () =>
    new Array<number>(cols + 1).fill(0),
  );
  for (let i = 1; i <= rows; i++) {
    for (let j = 1; j <= cols; j++) {
      grid[i][j] = tokensEqual(a[i - 1], b[j - 1])
        ? grid[i - 1][j - 1] + 1
        : Math.max(grid[i - 1][j], grid[i][j - 1]);
    }
  }
  // Deterministic traceback: prefer the pair step, then advancing the
  // original, then advancing yours.
  const onLcsA = new Array<boolean>(rows).fill(false);
  const onLcsB = new Array<boolean>(cols).fill(false);
  let i = rows;
  let j = cols;
  while (i > 0 && j > 0) {
    if (tokensEqual(a[i - 1], b[j - 1]) && grid[i][j] === grid[i - 1][j - 1] + 1) {
      onLcsA[i - 1] = true;
      onLcsB[j - 1] = true;
      i--;
      j--;
    } else if (grid[i - 1][j] >= grid[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return {
    originalSpans: original.displays.map((text, k) => ({
      text,
      kind: onLcsA[k] ? "same" : "onlyInOriginal",
    })),
    yourSpans: your.displays.map((text, k) => ({
      text,
      kind: onLcsB[k] ? "same" : "onlyInYours",
    })),
  };
}

function matchedPair(
  original: TokenizedSentence,
  your: TokenizedSentence,
  originalText: string,
  yourText: string,
  sim: number,
): AlignmentPair {
  const { originalSpans, yourSpans } = markPair(original, your);
  return {
    matchType: "matched",
    original: originalText,
    your: yourText,
    originalSpans,
    yourSpans,
    originalWords: original.displays.length,
    yourWords: your.displays.length,
    lengthDelta: your.displays.length - original.displays.length,
    similarity: sim,
  };
}

function omissionPair(original: TokenizedSentence, originalText: string): AlignmentPair {
  return {
    matchType: "omission",
    original: originalText,
    your: null,
    originalSpans: null,
    yourSpans: null,
    originalWords: original.displays.length,
    yourWords: 0,
    lengthDelta: -original.displays.length,
    similarity: 0,
  };
}

function additionPair(your: TokenizedSentence, yourText: string): AlignmentPair {
  return {
    matchType: "addition",
    original: null,
    your: yourText,
    originalSpans: null,
    yourSpans: null,
    originalWords: 0,
    yourWords: your.displays.length,
    lengthDelta: your.displays.length,
    similarity: 0,
  };
}

// Order-preserving global alignment (Needleman-Wunsch over sentences). A
// diagonal step pairs two sentences and is allowed only at or above
// MATCH_THRESHOLD; gaps score 0, so the grid maximizes the total similarity of
// the pairs it makes. Traceback ties break in a fixed order (pair, then
// omission, then addition) so the output is deterministic.
export function alignSentences(original: string[], your: string[]): Alignment {
  const A = original.map(tokenize);
  const B = your.map(tokenize);
  const m = A.length;
  const n = B.length;

  const sim: number[][] = Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) => similarity(A[i], B[j])),
  );

  const F: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const pairScore =
        sim[i - 1][j - 1] >= MATCH_THRESHOLD
          ? F[i - 1][j - 1] + sim[i - 1][j - 1]
          : -Infinity;
      F[i][j] = Math.max(pairScore, F[i - 1][j], F[i][j - 1]);
    }
  }

  // Traceback preference, in this exact order: diagonal (pair) when allowed
  // and optimal, then up (omission, advance the original), then left
  // (addition, advance yours).
  const reversed: AlignmentPair[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      sim[i - 1][j - 1] >= MATCH_THRESHOLD &&
      F[i][j] === F[i - 1][j - 1] + sim[i - 1][j - 1]
    ) {
      reversed.push(
        matchedPair(A[i - 1], B[j - 1], original[i - 1], your[j - 1], sim[i - 1][j - 1]),
      );
      i--;
      j--;
    } else if (i > 0 && (j === 0 || F[i][j] === F[i - 1][j])) {
      reversed.push(omissionPair(A[i - 1], original[i - 1]));
      i--;
    } else {
      reversed.push(additionPair(B[j - 1], your[j - 1]));
      j--;
    }
  }

  return { version: 1, pairs: reversed.reverse() };
}
