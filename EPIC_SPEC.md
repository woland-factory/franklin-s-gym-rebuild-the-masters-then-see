# EPIC SPEC — Reconstruct & alignment view (signature)

Franklin's Gym: rebuild the masters, then see your gaps in color.

This is the signature EPIC. It builds the back half of the training loop: a
ripe attempt is rebuilt from the hints alone (the original stays vaulted), and
on submit the app computes a deterministic sentence-by-sentence alignment of
your rebuild against the fixed original and shows it in color. It also ships a
built-in worked example so a brand-new visitor sees the confrontation within a
minute, with no delay to wait out.

The foundation this builds on already exists (EPIC 1 and EPIC 2): a Vite +
React 18 + TypeScript app, `react-router-dom` v7 routing in `src/App.tsx`, an
IndexedDB layer (`src/lib/db.ts`, `src/lib/store.ts`) with an `attempts` object
store, the seed library (`src/data/seedPassages.ts`), the sentence segmenter
(`src/lib/segment.ts`), ripeness derivation (`src/lib/attempts.ts`), the home
dashboard with its designed empty state and `AttemptCard`, the condense screen,
and the vaulted-until-ripe rule. The `/reconstruct/:attemptId` route currently
points at a thin placeholder (`ReconstructPlaceholder.tsx`); this EPIC replaces
it with the real screen.

---

## Quality differentiator (this app must win here)

**Incorruptible, instant confrontation.** The product wins on the honesty and
precision of a deterministic sentence-by-sentence diff against a fixed
original, computed in seconds. Paper cannot collate without tedium. A chatbot
flatters and lets the original leak from scrollback.

**What it demands of THIS EPIC:** the alignment view is the product. Everything
here is held to the differentiator, not just the baseline bar:

- **Deterministic and honest.** The same rebuild against the same original
  always produces the exact same alignment. No randomness, no model, no
  network. The marks are differences the user can verify by eye, not a verdict
  they must trust.
- **Never flatters, never moralizes.** The view marks what is only in the
  original and what is only in yours, plus how the lengths compare. It never
  scores you, never says one version is better, never calls you wrong. The
  legend reads "In the original / In yours" and lets the confrontation teach.
  (This is binding plan condition 2.)
- **Fast.** The whole alignment computes in well under a second for any library
  passage and renders without a white flash.
- **The vault holds until the moment of truth.** The rebuild screen shows the
  user's own hints and a writing surface, never the original. The original is
  revealed only in the alignment, after the rebuild is submitted. That reveal
  is the payoff; leaking it earlier voids the exercise.

---

## Scope

### In scope
- **Reconstruct screen** at `/reconstruct/:attemptId` (replaces the
  placeholder). Available only when the attempt is ripe. Shows the user's hints
  and a writing surface. Never shows the original text.
- **Deterministic alignment library** (`src/lib/align.ts`): segments the
  rebuild, computes an order-preserving best-match alignment of rebuild
  sentences against original sentences using token overlap plus a
  longest-common-subsequence (the indel form of edit distance), and produces
  matched pairs, omissions (only in the original), and additions (only in
  yours), with within-sentence word marks and a per-pair length comparison.
  Bounded by the length cap; finishes in well under a second.
- **Alignment view** at `/align/:attemptId`: matched sentences side by side on
  desktop, stacked at 390px, with color marks for words only-in-the-original,
  words only-in-yours, and a per-pair length indicator. Omissions and additions
  render as single-side blocks. A legend and a differences-only framing.
- **Persist the result.** On submit, the rebuild text, the timestamp, and the
  computed alignment are saved to the attempt (status becomes `reconstructed`)
  so the alignment survives reload and is ready for the EPIC 4 ledger.
- **Dashboard state.** An `AttemptCard` gains a `reconstructed` state whose one
  action is "See alignment" to `/align/:id`.
- **Built-in worked example** at `/example`: a fixed original plus a crafted
  imperfect rebuild, rendered through the same alignment view, reachable from
  the home empty state's "See an example" action, with no delay. Its alignment
  shows genuine gaps (a matched pair with a dropped clause, an omission, and an
  addition).

### Out of scope (built by later EPICs, do not build here)
- The ledger list, the recovered-substance trend chart, and export/import of
  the whole record. EPIC 4. This EPIC saves the alignment onto the attempt but
  builds no ledger screen and no chart.
- The guided first-run walkthrough, the same-day micro-drill with a distractor
  passage, and the `SEED_DEMO` staging demo. EPIC 5. The worked example here is
  a single static example reachable from the empty state, not a guided path and
  not the seeded staging state.
- Any settings screen, theme switching, or persisted default delay.
- Editing or re-running an alignment after submit, deleting attempts, or
  re-opening a reconstructed attempt for a second rebuild.

---

## Non-goals (binding — a built non-goal is a defect)
- **No quality or similarity score.** No composite "similarity to the master"
  number, no percentage grade, no streak, no leaderboard, no badge. The
  per-pair length indicator is a neutral factual comparison, not a score.
  (Plan binding condition 1.)
- **No trend chart** and no aggregate metric across attempts. That is EPIC 4.
- **No AI critique, no runtime LLM, no network call.** The alignment is pure
  local computation. No bring-your-own-key surface, no gateway call.
- **No copy, label, legend, icon, or color that claims one version is better,
  or that marks the user "wrong," "missed," "failed," or "lost."** Framing is
  differences only.
- **No upload or redistribution.** The rebuild text, the hints, and the
  passage stay on the device.

---

## Technical design

### Stack and conventions (match what exists)
- TypeScript, React 18 function components, CSS Modules (`*.module.css`) with
  tokens from `src/styles/tokens.css`. Reuse the global `btn`, `btn-primary`,
  `btn-secondary` classes.
- Routing via `react-router-dom` v7 in `src/App.tsx` (`useParams`,
  `useNavigate`, `Link`).
- Persistence through the `store.ts` helpers only; components never call
  `openDb` directly.
- Tests: Vitest + Testing Library colocated `*.test.ts[x]`, `fake-indexeddb`
  for store tests, Playwright in `e2e/`.
- User text (hints, the rebuild, custom passage sentences) renders only as
  React text nodes, which auto-escape. Never use `dangerouslySetInnerHTML`,
  including for the diff marks (wrap marked words in `<span>` / `<mark>` with
  the token as a child text node).

### Data model (forward-only, no DB version bump)

Adding fields to a record is a schemaless change; leave `DB_VERSION` at 1. The
`attempts` store and its indexes are sufficient. Extend the types in
`src/lib/db.ts`:

```ts
// A reconstructed attempt is one the user has rebuilt and aligned. It is
// terminal for this EPIC's loop. "ripe" is still derived from the clock and
// never stored (see attemptState).
export type AttemptStatus = "condensing" | "vaulted" | "reconstructed";

// Alignment result, cached on the attempt so the view and the later ledger
// need no recompute. Versioned for forward compatibility.
export type MatchType = "matched" | "omission" | "addition";
export type SpanKind = "same" | "onlyInOriginal" | "onlyInYours";

export interface DiffSpan {
  text: string;       // one display word (with its punctuation), as typed
  kind: SpanKind;
}

export interface AlignmentPair {
  matchType: MatchType;
  original: string | null;         // original sentence; null for an addition
  your: string | null;             // your sentence; null for an omission
  originalSpans: DiffSpan[] | null; // word marks for the original side; matched pairs only
  yourSpans: DiffSpan[] | null;     // word marks for your side; matched pairs only
  originalWords: number;           // word count of the original sentence, else 0
  yourWords: number;               // word count of your sentence, else 0
  lengthDelta: number;             // yourWords - originalWords
  similarity: number;              // [0,1] for matched pairs; 0 for omission/addition
}

export interface Alignment {
  version: 1;
  pairs: AlignmentPair[];
}

export interface AttemptRecord {
  // ... existing fields (id, status, createdAt, passage, hints, cursor,
  // delayType?, vaultedAt?, vaultedUntil?) unchanged ...
  reconstructionText?: string; // the raw rebuild the user typed; set at submit
  reconstructedAt?: number;    // epoch ms, set at submit
  alignment?: Alignment;       // cached alignment, set at submit
}
```

Do NOT add `timeSpentMs` or a `metrics` object: neither is required by any
acceptance criterion, and reconstruction-fidelity metrics are EPIC 4. Older
rows without the new fields are tolerated by treating the absent fields as
unset. Update the doc comment on `AttemptStatus` to note `reconstructed`.

### Alignment algorithm — `src/lib/align.ts` (new)

The single most important, most testable module in this EPIC. It is pure (no
`Date.now()`, no I/O), deterministic, and bounded.

**Public surface:**

```ts
import type { Alignment } from "./db";
export function alignSentences(original: string[], your: string[]): Alignment;
```

**Tokenization (shared internal helper).** For similarity and word-diff:
- Split a sentence into display words on whitespace (keep each word with its
  attached punctuation, exactly as typed, for rendering).
- Normalize each display word to a comparison token: lowercase, strip leading
  and trailing punctuation (keep interior apostrophes so "travel's" stays one
  token), drop tokens that normalize to empty.
- Keep display words and comparison tokens index-aligned so a mark on token *k*
  maps to display word *k*.

**Sentence similarity (bounded, in [0,1]).** Blend two order-complementary
measures on the comparison tokens of sentences A and B:
- `dice` = token overlap = `2 * |multiset intersection(A, B)| / (|A| + |B|)`
  (order-insensitive vocabulary overlap).
- `lcsSim` = `2 * LCS(A, B) / (|A| + |B|)` where `LCS` is the
  longest-common-subsequence length of the token sequences (order-sensitive;
  this is the indel form of edit distance).
- `similarity = 0.5 * dice + 0.5 * lcsSim`.
- Both terms are 0 when either sentence has zero tokens. Return 0, not NaN.

**Order-preserving alignment (Needleman-Wunsch over sentences).** Let `m` =
original count, `n` = rebuild count. Fill a DP grid `F[i][j]` (`(m+1) x (n+1)`):

```
F[i][j] = max(
  sim(i-1, j-1) >= MATCH_THRESHOLD ? F[i-1][j-1] + sim(i-1, j-1) : -Infinity, // pair i-1 with j-1
  F[i-1][j],   // original sentence i-1 is unmatched -> omission
  F[i][j-1]    // rebuild sentence j-1 is unmatched  -> addition
)
```

A diagonal (pair) step is ONLY allowed when the pair similarity reaches
`MATCH_THRESHOLD`; below the threshold the two sentences cannot pair and each
falls out as an omission / addition. Gaps contribute 0, so the DP maximizes the
total similarity of the pairs it does make.

- `export const MATCH_THRESHOLD = 0.3;` A documented, tunable constant. Pin its
  boundary behavior with tests (a pair just above matches; a pair just below
  becomes omission + addition). Keep it a single named constant so tuning is
  one edit.
- **Traceback with a fixed tie-break** so output is deterministic: at each cell
  prefer, in this exact order, the diagonal (pair) when it is allowed and equals
  the max, then the up move (omission, advance the original), then the left move
  (addition). Document the order in a comment. Emit pairs in reading order
  (reverse the traceback).
- Bounds: `m, n <= MAX_SENTENCES` (the rebuild is validated against the cap
  before this runs, see below), so the grid is at most 40 x 40 and each cell's
  similarity is over token arrays of tens of tokens. This is far under the ~1s
  budget.

**Within-sentence marks (matched pairs only).** For each matched pair, run an
LCS-based word diff on the two token sequences and project it onto the display
words:
- Tokens on the common subsequence render as `kind: "same"` on both sides.
- Original display words not on the subsequence render as `kind: "onlyInOriginal"`.
- Your display words not on the subsequence render as `kind: "onlyInYours"`.
- The result is `originalSpans` and `yourSpans`, each a `DiffSpan[]` covering
  every display word of that side in order (so the renderer just maps over them).
- Omission pairs: `original` set, `your` null, `originalSpans`/`yourSpans` null,
  `similarity` 0. Addition pairs: mirror image.

**Per-pair length.** `originalWords` / `yourWords` are the display-word counts
(0 on the null side). `lengthDelta = yourWords - originalWords`. No judgment is
computed here; the renderer turns the delta into neutral copy.

Reuse `segmentSentences` from `src/lib/segment.ts` to split the rebuild text
before calling `alignSentences` (the caller does this; `alignSentences` takes
arrays). Do NOT re-implement segmentation. The original array is the frozen
`attempt.passage.sentences`.

### Store additions — `src/lib/store.ts`

Add one helper (keep all existing helpers):

```ts
import type { Alignment } from "./db";

// Saves a submitted rebuild and its alignment onto the attempt. Terminal for
// the loop: status becomes "reconstructed". `now` is passed in for testability.
export async function saveReconstruction(
  id: string,
  reconstructionText: string,
  alignment: Alignment,
  now: number,
): Promise<AttemptRecord>;
// Loads the attempt (throw if not found), sets status "reconstructed",
// reconstructionText, reconstructedAt = now, alignment; persists; returns it.
```

The screen computes the `Alignment` via `align.ts` and passes it in, so the
store stays a thin persistence layer and the algorithm stays independently
testable.

### Ripeness / state — `src/lib/attempts.ts`

Extend the derived state to carry the terminal case:

```ts
export type AttemptState = "condensing" | "vaulted" | "ripe" | "reconstructed";

export function attemptState(a: AttemptRecord, now: number): AttemptState {
  if (a.status === "reconstructed") return "reconstructed";
  if (a.status === "condensing") return "condensing";
  return (a.vaultedUntil ?? Infinity) <= now ? "ripe" : "vaulted";
}
```

`ripeLabel` is unchanged. Existing tests stay green; add cases for the
`reconstructed` branch.

### Routes — `src/App.tsx`

- Replace the `ReconstructPlaceholder` import/element with the new `Reconstruct`
  screen at `/reconstruct/:attemptId`.
- Add `/align/:attemptId` → `Align`.
- Add `/example` → `WorkedExample`.
- Keep `/`, `/library`, `/condense/:attemptId`, and the `*` NotFound.

### Screens and components

**Reconstruct screen — `src/routes/Reconstruct.tsx` (new) + `.module.css`**

Replaces `ReconstructPlaceholder.tsx`. Loads the attempt by `:attemptId` via
`getAttempt`.
- **Loading**: `Skeleton` inside layout (no white flash). **Not found / read
  error**: in-voice `ErrorState` with "Back to your attempts" to `/`.
- **Availability guard (derive with `attemptState(attempt, Date.now())`):**
  - `condensing`: this attempt is not ready to rebuild. Redirect to
    `/condense/:id` (resume condensing).
  - `vaulted` (not yet ripe): do NOT show any original sentence and do NOT show
    the writing surface. Render a short in-voice note with the `ripeLabel`
    countdown and a link home, e.g. heading "This opens when it is ripe", body
    the countdown line.
  - `reconstructed`: already done. Redirect to `/align/:id`.
  - `ripe`: render the writing surface (below).
- **The writing surface (ripe only):**
  - A heading with the passage title and author.
  - The user's **hints**, in sentence order, as memory triggers (these are the
    user's own words; showing them is the point). Render each hint as text; for
    a blank hint show a subtle muted marker such as "Blank" so the row is not
    empty. Number them so they map to the sentence order.
  - A large labeled `<textarea>` for the rebuild (label "Your rebuild",
    placeholder like "Write the passage from your hints"). Never render
    `attempt.passage.sentences` on this screen.
  - Primary action "See alignment". Disabled while the rebuild textarea is empty
    (trimmed). On click: validate the rebuild against the caps, segment it,
    compute the alignment, save, and navigate to `/align/:id`.
  - **Cap validation (bounds the computation):** segment the rebuild with
    `segmentSentences`. If it exceeds `MAX_SENTENCES` sentences or `MAX_WORDS`
    words (import both from `src/data/seedPassages.types`, reuse `totalWordCount`
    from `src/lib/wordCount`), show a designed in-voice inline message that
    names the cap and does not submit, e.g. "Keep your rebuild to 400 words."
    / "Keep it to 40 sentences." This guarantees the alignment grid stays within
    40 x 40.
  - Give the primary action a pressed/disabled state during the compute-and-save
    so the tap feels immediate. The compute is synchronous and fast; the visible
    disabled state plus the navigation is the feedback.

**Alignment view — `src/routes/Align.tsx` (new) + a shared presentational
component `src/components/AlignmentView.tsx` + `.module.css`**

`Align.tsx` loads the attempt, handles loading / not-found / error, and:
- If the attempt has no `alignment` (not yet reconstructed), redirect to
  `/reconstruct/:id`.
- Otherwise render `<AlignmentView passage={attempt.passage} alignment={attempt.alignment} />`.

`AlignmentView` is presentational and pure (takes passage meta + an `Alignment`)
so the same component serves the worked example. It renders:
- A header: passage title and author.
- A **legend** with two swatches whose colors match the marks: "In the
  original" and "In yours". No better/worse wording anywhere. Convey each mark
  by a text label, not color alone (a labeled swatch satisfies this at the
  baseline bar; full color-blind treatment is EPIC 6).
- The pairs in order. For each pair:
  - **matched**: two columns side by side on desktop, stacked at 390px. Left =
    the original with `onlyInOriginal` words marked; right = yours with
    `onlyInYours` words marked; `same` words unmarked. Render each side by
    mapping its `DiffSpan[]` to text nodes, wrapping non-`same` spans in a
    `<mark>`/`<span>` with the mark class. A neutral per-pair length line built
    from `lengthDelta`, e.g. `lengthDelta === 0` -> "Same length",
    `lengthDelta > 0` -> "N words longer", `lengthDelta < 0` -> "N words
    shorter". No "too long" / "too short".
  - **omission**: a single block on the original side, marked
    `onlyInOriginal`, showing the original sentence, with a short neutral
    caption "Only in the original".
  - **addition**: a single block on the your side, marked `onlyInYours`,
    showing your sentence, with the caption "Only in yours".
- A "Back to your attempts" link to `/`.

**Mark colors** live in `AlignmentView.module.css`, derived from
`tokens.css` variables. Use two distinct, readable highlight backgrounds (one
for `onlyInOriginal`, one for `onlyInYours`) with sufficient text contrast in
both light and dark themes. Do not introduce a "correct/incorrect" green/red
semantic; pick two neutral, distinct hues. Keep it to the bar; no animations.

**Worked example — `src/routes/WorkedExample.tsx` (new) + a fixed demo module
`src/data/workedExample.ts` (new)**

`workedExample.ts` defines the demo without touching the DB:
- The original is a reference to an existing seed passage so its historical
  prose stays out of the copy sweep. Use
  `seedPassages.find((p) => p.id === "stevenson-travels-with-a-donkey")` for its
  three sentences, title, and author.
- The rebuild is this exact string (a plausible imperfect reconstruction that
  drops a clause, omits a sentence, and adds one). It is user-voice copy and IS
  swept, so it carries no em-dashes and no banned vocabulary:

  > "For my part, I travel not to arrive somewhere, but simply to go. The great thing is to move and to feel the troubles of life more nearly. Travel teaches you a great deal about yourself."

- Export a helper that segments the rebuild and computes the alignment via
  `alignSentences` against the seed sentences, plus the passage meta, so the
  route just renders `AlignmentView`. This produces, deterministically: a
  matched first pair with small within-sentence marks, an omission (the seed's
  second sentence "I travel for travel's sake." has no match in the rebuild), a
  matched pair for the third sentence with a large `lengthDelta` and the dropped
  metaphor marked `onlyInOriginal`, and an addition ("Travel teaches you a great
  deal about yourself."). All three gap types are visible.

`WorkedExample.tsx` renders a short in-voice intro line stating this is a sample
("A sample rebuild, aligned against the original."), the `AlignmentView` for the
demo, and a primary action to start real training ("Browse passages" -> `/library`)
plus a link home. No DB write, no delay, reachable directly at `/example`.

**Home empty state — `src/routes/Home.tsx`, `src/components/EmptyState.tsx`**

The empty state's secondary action "See an example" currently opens the static
`HowItWorks` modal. Repoint it at the worked example (this is the EPIC 1
promise that the "See an example" payload lands in EPIC 3). Change the secondary
action to a `<Link to="/example">See an example</Link>`. Remove the
`showExample` state and the `HowItWorks` usage from `Home.tsx`, and delete
`src/components/HowItWorks.tsx` and `HowItWorks.module.css` (superseded by the
live worked example). Leave the populated dashboard, ordering, and the rest of
the empty state unchanged.

**Dashboard card — `src/components/AttemptCard.tsx`**

Add the `reconstructed` state:
- Chip label "Aligned" (extend `STATE_LABEL`).
- Subtext a short neutral line, e.g. "Rebuilt and aligned."
- Primary action "See alignment" -> `/align/:id`.
- Add a `data-state="reconstructed"` style rule (reuse the existing chip/card
  styling patterns; no elevation needed, ripe stays the elevated state).
The existing `condensing` / `vaulted` / `ripe` branches are unchanged. The card
still never renders `passage.sentences`.

`Home.tsx` ordering is unchanged: ripe floats to the top; reconstructed and the
rest follow, newest first, capped at 50.

### The vault, restated for this EPIC
The original text may be rendered ONLY in the alignment view (and the worked
example), and only for a `reconstructed` attempt (or the demo). It is never
rendered on the reconstruct screen, on a condensing / vaulted / ripe attempt, or
on any dashboard card. This is the correctness core: cover it with tests on the
reconstruct screen (no original before submit) and the align screen (original
appears only when `alignment` exists).

---

## QUALITY BAR application (binding on the new surfaces)

- **Perceived speed.** The alignment is synchronous local computation, well
  under 1s for any library passage; document and test the bound (40 x 40 grid
  cap). "See alignment" shows a pressed/disabled state during compute-and-save,
  then navigates. No new screen shows a white flash: loading uses `Skeleton`
  inside `AppLayout`.
- **Mobile-first (390px).** The reconstruct screen (hints + textarea + action),
  the alignment view (matched pairs stack to one column at 390px, no horizontal
  scroll even for long sentences: wrap words, allow the marked spans to wrap),
  and the worked example are all fully usable at 390px. Touch targets ~44px.
  The e2e viewport is 390px; keep it green.
- **Designed states.** Reconstruct and align both show a `Skeleton` while
  loading and an in-voice `ErrorState` for a missing attempt. The
  not-yet-ripe reconstruct case is a designed in-voice note, not a dead end. The
  align view of a reconstructed attempt always has content (at least the
  matched/omission/addition blocks). There is no empty alignment for a valid
  submit because an empty rebuild is blocked at the boundary.
- **First-run.** The worked example is the first-minute payoff: from the empty
  state, one tap reaches a real, populated alignment that shows genuine gaps,
  with no delay. It uses real seed prose and produces real marks (the "sample
  that yields zero findings does not count" rule is met: the demo shows an
  omission, an addition, and a flattened matched pair). The guided step-by-step
  walkthrough is EPIC 5 and is NOT built here.
- **Security hygiene.** No server, so the auth / rate-limit clauses have no
  route. What binds: validate the rebuild at the boundary (cap on words and
  sentences) before it is stored and before it is aligned; render all user text
  and all diff spans as escaped React text nodes (never
  `dangerouslySetInnerHTML`); keep everything local (no upload, no analytics
  payload carrying passage or rebuild text); secrets stay in env (unchanged).
- **Accessibility.** The rebuild textarea is labeled. The alignment legend text
  labels each mark (not color alone). Sufficient contrast on both mark
  backgrounds in light and dark. Visible focus states; full keyboard reach
  through the reconstruct action and the alignment/back links. Use semantic
  headings and list structure for the pairs.
- **Copy.** Every new visible string is positive, plain, one idea per sentence,
  no em-dashes or en-dashes, none of the banned LLM vocabulary, and no
  worseness / negative phrasing. The alignment framing says only what is in the
  original and what is in yours. `src/test/copy-sweep.test.ts` auto-scans new
  `src` files (including `workedExample.ts`, which is NOT exempt), so the demo
  rebuild string and all UI copy are enforced. The seed original renders from
  the exempt `seedPassages.ts`, so the author's own em-dashes are allowed there.

---

## Ordered task list (each item is provable)

1. **Data model.** Extend `AttemptStatus` with `reconstructed`; add
   `MatchType`, `SpanKind`, `DiffSpan`, `AlignmentPair`, `Alignment`; add
   `reconstructionText?`, `reconstructedAt?`, `alignment?` to `AttemptRecord`.
   No `DB_VERSION` bump.
   - AC: types compile; existing store/attempt tests stay green; older rows
     without the new fields still load.

2. **Alignment library (`src/lib/align.ts`).** Tokenization, similarity
   (`dice` + `lcsSim`), `MATCH_THRESHOLD`, Needleman-Wunsch with the documented
   tie-break, within-sentence word marks, per-pair length.
   - AC: `alignSentences` returns matched pairs for similar sentences,
     omissions for original-only sentences, additions for rebuild-only
     sentences, in reading order; matched pairs carry `same`/`onlyInOriginal`/
     `onlyInYours` spans; a pair at similarity just above `MATCH_THRESHOLD`
     matches and one just below splits into omission + addition; the same input
     always yields identical output; empty rebuild yields all omissions and no
     crash.

3. **Store + state.** Add `saveReconstruction`; extend `attemptState` with the
   `reconstructed` branch.
   - AC: `saveReconstruction` sets `status: "reconstructed"`,
     `reconstructionText`, `reconstructedAt`, and `alignment`, and the result
     survives a store reopen (fake-indexeddb); `attemptState` returns
     `reconstructed` for a reconstructed record and is unchanged for the others.

4. **Reconstruct screen.** Replace `ReconstructPlaceholder.tsx` with
   `Reconstruct.tsx` + route. Availability guard, hints display, writing
   surface, cap validation, compute + save + navigate.
   - AC: a ripe attempt shows the hints and a rebuild textarea and NO original
     sentence; a not-yet-ripe attempt shows the in-voice wait note and no
     original and no textarea; a condensing attempt redirects to condense; a
     reconstructed attempt redirects to align; an over-cap rebuild shows the
     in-voice inline cap message and saves nothing; a valid submit saves the
     alignment and navigates to `/align/:id`.

5. **Alignment view.** Add `AlignmentView` component + `Align.tsx` route.
   Side-by-side matched pairs, stacked at 390px, marks, legend, per-pair length,
   omission/addition blocks.
   - AC: for a reconstructed attempt the view renders the original beside the
     rebuild with the correct color marks, the legend reads "In the original /
     In yours", omissions and additions render on their single side, each
     matched pair shows a neutral length line, no string claims one version is
     better; an attempt without an alignment redirects to reconstruct.

6. **Worked example.** Add `workedExample.ts` + `WorkedExample.tsx` route;
   repoint the empty state's "See an example" to `/example`; remove
   `HowItWorks`.
   - AC: `/example` renders a populated alignment (a matched pair, an omission,
     and an addition) from the fixed demo without any DB write or delay; the
     home empty state links to it; the demo rebuild string passes the copy
     sweep.

7. **Dashboard card.** Add the `reconstructed` state to `AttemptCard` (chip
   "Aligned", "See alignment" action) and its style.
   - AC: a reconstructed attempt renders the "Aligned" chip and a "See
     alignment" action to `/align/:id`, and renders no passage sentences; the
     other three states are unchanged.

8. **Reload durability + copy sweep.** Confirm the alignment survives reload and
   the sweep passes.
   - AC: `npm test` (including `copy-sweep.test.ts`) passes; reloading after a
     reconstruct restores the same alignment view.

---

## Test plan (which test proves each criterion)

Unit (Vitest, colocated `*.test.ts`):
- `align.test.ts`: token normalization (apostrophes kept, punctuation
  stripped); `dice`/`lcsSim`/`similarity` on fixed inputs; matched vs
  omission vs addition on a small hand-built case; the `MATCH_THRESHOLD`
  boundary (just-above matches, just-below splits); within-sentence spans mark
  the right words on both sides; per-pair `lengthDelta` sign and value;
  determinism (same input twice, identical output); empty rebuild yields all
  omissions. Proves the alignment ACs (plan AC 2) and the differentiator's
  determinism.
- `store.test.ts` (extend, fake-indexeddb): `saveReconstruction` sets status
  and all three fields and survives a reopen. Proves "saved for the ledger" and
  reload durability.
- `attempts.test.ts` (extend): `attemptState` returns `reconstructed`; other
  branches unchanged.

Component (Testing Library):
- `Reconstruct.test.tsx`: a ripe attempt shows hints and the textarea and no
  original sentence (assert an original sentence string is absent); a
  not-yet-ripe attempt shows the wait note and no original and no textarea; an
  over-cap rebuild shows the inline cap message and calls no save; a valid
  submit calls `saveReconstruction` with a computed alignment and navigates.
  Proves the reconstruct ACs and the vault guard.
- `AlignmentView.test.tsx` / `Align.test.tsx`: renders matched pairs with
  `onlyInOriginal` and `onlyInYours` marks, an omission block, an addition
  block, the "In the original / In yours" legend, and a neutral length line;
  asserts no worseness copy; an attempt with no alignment redirects to
  reconstruct. Proves the alignment-view ACs and plan binding condition 2.
- `WorkedExample.test.tsx`: `/example` renders a populated alignment showing at
  least one omission and one addition and one matched pair, with no DB access.
  `Home.test.tsx` (extend): the empty state's "See an example" links to
  `/example`. Proves the worked-example AC.
- `AttemptCard` coverage (extend `Home.test.tsx` or a card test): a
  reconstructed attempt shows the "Aligned" chip and "See alignment" action and
  no passage sentences. Proves the dashboard AC.

E2E (Playwright, `e2e/`, 390px viewport):
- Extend the smoke suite: open `/example` directly and assert the alignment
  legend and a marked span are visible with no horizontal scroll at 390px.
  (The full ripe-to-align path is covered by the vault-timing-independent
  component tests, since a real ripe wait cannot run in the smoke suite; do not
  assert on wall-clock ripeness here.)

Copy: `src/test/copy-sweep.test.ts` scans new `src` files (including
`workedExample.ts`) for dashes, banned vocabulary, and negative phrasing; keep
it green. Proves the copy clause and the differentiator's no-flattery framing.

---

## Notes for the implementer
- The alignment marks DIFFERENCES, never worseness. No copy, color, icon, or
  label may say better/worse/right/wrong/missed/failed/lost. The legend is "In
  the original / In yours". This is a binding plan condition, not a style
  preference.
- `align.ts` is pure and deterministic: no `Date.now()`, no randomness, no
  I/O. Pin its behavior with fixed-input tests so a future refactor cannot
  silently change the diff.
- Keep the algorithm bounded: validate the rebuild against `MAX_WORDS` /
  `MAX_SENTENCES` before aligning so the grid never exceeds 40 x 40.
- The original text is revealed ONLY in the alignment view, only after submit.
  The reconstruct screen shows hints and the writing surface, never the
  original. Test both halves of this guard.
- Do not build a score, a percentage, a streak, or a trend. The per-pair length
  indicator is a neutral factual delta, nothing more. Metrics and the ledger are
  EPIC 4.
- Do not build the guided walkthrough, the micro-drill distractor, or the
  `SEED_DEMO` staging state. The single static worked example at `/example` is
  the whole first-minute payoff for this EPIC.
- Reuse `segmentSentences` for the rebuild; do not re-implement segmentation.
- `DB_VERSION` stays 1. Adding record fields is a schemaless change.
