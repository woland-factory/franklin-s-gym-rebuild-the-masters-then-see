# EPIC SPEC — Ledger & durability

Franklin's Gym: rebuild the masters, then see your gaps in color.

This EPIC makes the record durable and visible. It builds the `/ledger` screen:
the dated history of every completed attempt, newest first, each entry linking
back to its saved alignment; a trend view of the two reconstruction-fidelity
metrics over time; and plain-file export/import so the user owns the whole
record as a JSON file that restores byte-faithfully into a fresh store.

The foundation already exists (EPICs 1 to 3): a Vite + React 18 + TypeScript
app, `react-router-dom` v7 routing in `src/App.tsx`, the IndexedDB layer
(`src/lib/db.ts`, `src/lib/store.ts`) with an `attempts` object store indexed
`by-createdAt`, the deterministic alignment engine (`src/lib/align.ts`), and a
complete loop: condense (`/condense/:id`) → vault → reconstruct
(`/reconstruct/:id`) → align (`/align/:id`). A reconstructed attempt already
carries `reconstructionText`, `reconstructedAt`, and a cached `alignment`
(`Alignment` in `db.ts`), saved by `saveReconstruction`. This EPIC reads that
saved data; it changes nothing about how it is produced.

---

## Quality differentiator (this app must win here)

**Incorruptible, instant confrontation.** The product wins on the honesty and
precision of a deterministic sentence-by-sentence diff against a fixed
original, computed in seconds. Paper cannot collate without tedium. A chatbot
flatters and lets the original leak from scrollback.

**What it demands of THIS EPIC:** the ledger extends that honesty across
months. Every number it shows is derived, deterministically and locally, from
alignments the engine already saved; nothing is estimated, smoothed, or
reframed to look kinder.

- **Fidelity, never a grade.** The two charted metrics measure how much of the
  hinted substance a rebuild recovered, not how good the prose is. A composite
  quality score, a similarity-to-the-master number, a streak, or a leaderboard
  is the metric trap (plan binding condition 1) and is a defect, not a feature.
- **Deterministic derivation.** The same saved alignment always yields the
  same metrics. Metrics are computed by a pure function from the cached
  `Alignment`; no clock, no randomness, no model.
- **The record is the user's.** Export writes the entire store to one plain,
  pretty-printed JSON file the user can read in a text editor and keep
  forever. Import restores it exactly. Losing this record should be the thing
  the north-star user would mourn; this EPIC is what makes it unlosable.

---

## Scope

### In scope
- **Ledger screen** at `/ledger`, linked from the primary nav. It lists every
  completed (reconstructed) attempt, dated, newest first, DOM-paginated in
  pages of 20, each entry linking to `/align/:id`.
- **Trend view** on the same screen: two small single-series SVG charts over
  the completed attempts in time order, one per reconstruction-fidelity
  metric (share of hinted ideas recovered; sentence-count difference), each
  explicitly labeled "Reconstruction fidelity". Dependency-free inline SVG;
  no chart library.
- **Metrics module** `src/lib/metrics.ts`: a pure function deriving the two
  fidelity metrics from a saved `Alignment`. Derived on read; never persisted.
- **Export**: one button that downloads the entire `attempts` store (every
  status, not only reconstructed) as a versioned, pretty-printed JSON file.
- **Import**: a file control that reads such a file, validates it at the
  boundary, and merges the records into the store, skipping ids already
  present. Export then import into a fresh store reproduces the ledger.
- **Ledger empty state** that says what will accumulate here and points to the
  first action, with the import control still reachable (a returning user on a
  fresh device arrives at an empty ledger holding a file).
- Store helper `importAttempts`, transfer module `src/lib/transfer.ts`, date
  label helper in `src/lib/attempts.ts`, the `/ledger` route, and the nav link.

### Out of scope (do not build here)
- The guided first-run walkthrough, micro-drill, and `SEED_DEMO` staging demo.
  All EPIC 5.
- The whole-product polish pass (color-blind chart treatment beyond the
  baseline bar, deep chart interactivity such as crosshairs and pinned
  tooltips). EPIC 6.
- A `/settings` route or settings screen. Export/import lives on the ledger
  screen itself.
- Any change to the alignment engine, the condense/reconstruct/align screens,
  or the home dashboard. Home keeps its own pipeline list exactly as is.
- Deleting attempts, editing attempts, or re-running alignments.
- Exporting the `settings` object store (nothing meaningful lives there yet;
  the versioned format leaves room later).

### Two scope decisions, settled here so nobody re-litigates them

1. **The ledger lists completed attempts.** The planner's criterion says every
   entry links to its alignment, and only reconstructed attempts have one. So
   the ledger is the record of completed loops, dated by `reconstructedAt`.
   In-progress attempts (condensing, vaulted, ripe) stay on the home
   dashboard, which is the pipeline; the ledger is the archive. No entry ever
   needs a fallback link.
2. **Export carries the whole store.** Durability covers in-progress work too:
   a condensing or vaulted attempt (its hints, its vault clock) survives the
   round trip even though it has no ledger entry yet. "Reproduces the ledger"
   is then a strict subset of what import restores.

---

## Non-goals (binding — a built non-goal is a defect)
- **No composite quality or similarity-to-master score, no streak, no
  leaderboard, no badge.** Not on the ledger, not in the charts, not in the
  export file. Each of the two metrics is charted separately and labeled as
  reconstruction fidelity. (Plan binding condition 1.)
- **No cloud sync.** No network call anywhere in this EPIC. Export and import
  are local file operations via Blob download and `File` read.
- **No accounts.** Nothing identifies the user; the export file carries no
  name, email, or device identifier.
- **No sharing.** No share links, no publish, no copy-to-clipboard of another
  person's view. The export file is for the user's own keeping.
- **No new dependencies.** The charts are hand-rolled SVG; JSON handling is
  `JSON.parse`/`JSON.stringify`.

---

## Technical design

### Stack and conventions (match what exists)
- TypeScript, React 18 function components, CSS Modules with tokens from
  `src/styles/tokens.css`. Reuse the global `btn`, `btn-primary`,
  `btn-secondary` classes and the `Skeleton` / `ErrorState` / `EmptyState`
  components.
- Persistence through `store.ts` helpers only; components never call `openDb`.
- All user text renders as React text nodes (auto-escaped). Never
  `dangerouslySetInnerHTML`, including inside SVG.
- Pass `now` into pure helpers; call `Date.now()` only at the component edge,
  as `Home.tsx` and `AttemptCard.tsx` already do.
- Tests: Vitest + Testing Library colocated, `fake-indexeddb` for store tests,
  Playwright in `e2e/` at the 390px viewport.

### Data model: NO changes

No `DB_VERSION` bump, no new record fields, no new object store. Metrics are
derived on read from the cached `Alignment` by a pure function. Persisting
them would create a second source of truth that could drift from the
alignment; deriving keeps the mirror incorruptible and costs microseconds per
attempt (an alignment has at most ~80 pairs).

### Metrics — `src/lib/metrics.ts` (new)

Pure, deterministic, no I/O.

```ts
import type { Alignment } from "./db";

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

export function fidelityMetrics(alignment: Alignment): FidelityMetrics;
```

Definitions, fixed here so every surface agrees:
- **Share of hinted ideas recovered.** Every original sentence received a hint
  during condensing (the `hints` array is parallel to `passage.sentences`), so
  "hinted ideas" = original sentences. A hinted idea is *recovered* when its
  sentence appears in a `matched` pair. `recoveredShare` =
  matched / (matched + omissions). Guard the zero denominator: return 0, not
  NaN.
- **Sentence-count difference.** `sentenceDelta` = (matched + additions) −
  (matched + omissions). Zero means the rebuild used exactly as many sentences
  as the original. It is a signed count, not a score; the UI shows it with an
  explicit sign.

### Date label — `src/lib/attempts.ts` (extend)

Add one formatter beside `ripeLabel`, reusing the module's `MONTHS` array so
output is deterministic and locale-independent (matching the existing style):

```ts
/** "Sep 15, 2026" style label for ledger entries and chart axis ends. */
export function dateLabel(ms: number): string;
```

### Transfer — `src/lib/transfer.ts` (new)

Pure build/parse; the file I/O lives at the component edge.

```ts
import type { AttemptRecord } from "./db";

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

/** Pretty-printed (2-space) JSON so the file is human-readable in any editor. */
export function buildExport(attempts: AttemptRecord[], now: number): string;

export type ParseResult =
  | { ok: true; attempts: AttemptRecord[] }
  | { ok: false; reason: "unreadable" | "wrong-format" | "bad-record" | "too-large" };

export function parseExport(text: string): ParseResult;
```

`parseExport` validates at the boundary (types, sizes, formats), strictly
enough that an imported record can never crash a screen or wedge routing:
- `unreadable`: not valid JSON.
- `wrong-format`: `format` !== `EXPORT_FORMAT` or `version` !== 1 or
  `attempts` is not an array.
- `too-large`: more than `IMPORT_MAX_ATTEMPTS` records (the byte cap is
  checked against `file.size` before reading, in the component).
- `bad-record` when any record fails the row checks:
  - `id` nonempty string; `status` one of `condensing | vaulted |
    reconstructed`; `createdAt` a finite number.
  - `passage` object: `title` string, `author` string, `source` string,
    `year` number or null, `originalPassageId` string or null, `isCustom`
    boolean, `sentences` a nonempty string array with length ≤
    `MAX_SENTENCES` (import from `src/data/seedPassages.types`).
  - `hints` a string array with `hints.length === passage.sentences.length`;
    `cursor` a finite number.
  - When present: `delayType` one of `standard | micro`; `vaultedAt`,
    `vaultedUntil`, `reconstructedAt` finite numbers; `reconstructionText` a
    string.
  - `alignment` when present: `version === 1`, `pairs` an array where each
    pair has `matchType` in `matched | omission | addition`, `original` and
    `your` string-or-null consistent with the matchType (`omission` has
    `your: null`, `addition` has `original: null`, `matched` has both),
    span arrays either null or arrays of `{ text: string, kind: "same" |
    "onlyInOriginal" | "onlyInYours" }`, and finite `originalWords`,
    `yourWords`, `lengthDelta`, `similarity`.
  - **Status coherence (this prevents a routing trap):** a `reconstructed`
    record MUST have `alignment`, `reconstructionText`, and `reconstructedAt`;
    a `vaulted` record MUST have finite `vaultedAt` and `vaultedUntil`. A
    reconstructed record without an alignment would bounce forever between
    `/align/:id` (redirects to reconstruct when `alignment` is absent) and
    `/reconstruct/:id` (redirects to align when status is `reconstructed`).
    Refuse the record instead.
- Unknown extra properties on a record are preserved as-is (copy the object
  through), so a future export version downgrades gracefully.
- Validation failures name no row internals to the user; the UI shows one
  in-voice message (below).

Round-trip guarantee: `buildExport` serializes the records exactly as stored
(every field of `AttemptRecord` is JSON-safe: strings, numbers, booleans,
nulls, arrays, plain objects), so `parseExport(buildExport(rows, t))` yields
records deeply equal to `rows`. Pin this with a test.

Add a small download helper in `transfer.ts`, mirroring `downloadIcs` in
`src/lib/ics.ts` (temporary anchor + object URL, no network):

```ts
export function downloadJson(filename: string, contents: string): void;
```

Filename at the call site: `franklins-gym-record-YYYY-MM-DD.json` derived from
`Date.now()` at click time.

### Store — `src/lib/store.ts` (extend; keep all existing helpers)

```ts
// Merges imported records into the attempts store in one readwrite
// transaction. Records whose id already exists are left untouched (imports
// never overwrite newer local work). Returns what happened for the UI.
export async function importAttempts(
  records: AttemptRecord[],
): Promise<{ added: number; skipped: number }>;
```

Reads for the ledger reuse the existing `listAttempts()` (one indexed
`getAll`). The screen filters to `status === "reconstructed"` and sorts by
`reconstructedAt` descending (tie-break and fallback: `createdAt`). One read
serves the list, the trend, and the export button. Bound rationale: records
are size-capped at the paste boundary (400 words), so even years of daily
training stay a few thousand rows read once per visit; what must never be
unbounded is the DOM, which is paginated below.

### Routes and nav

- `src/App.tsx`: add `<Route path="/ledger" element={<Ledger />} />`.
- `src/components/AppLayout.tsx`: add a second nav link, "Ledger" →
  `/ledger`, beside "Library" (same `navLink` class; nav stays two links, no
  menu). Touch target per the existing header sizing.
- `nginx.conf` SPA fallback already serves deep links (proven for
  `/library` in e2e); `/ledger` needs no server change.

### Ledger screen — `src/routes/Ledger.tsx` (new) + `Ledger.module.css`

Load once with `listAttempts()`; `Date.now()` once per render pass as in
`Home.tsx`.

**States:**
- **Loading**: `<Skeleton lines={6} label="Loading your ledger" />`.
- **Error** (read failed): `ErrorState` in the established voice, title
  "Your ledger did not load", message "This device blocked local storage.
  Allow it, then try again.", action "Try again" re-runs the load.
- **Empty** (zero *reconstructed* attempts, regardless of in-progress ones):
  `EmptyState` with:
  - title: "Your record starts with the first rebuild"
  - description: "Every aligned attempt files here with its date, its
    fidelity numbers, and a link back to the alignment."
  - primary: link "Browse passages" → `/library`
  - secondary: the **import control** (below), labeled "Restore from a file".
    A returning user on a fresh device lands here holding an export file;
    import must be reachable from the empty state, not hidden behind having
    data.
- **Populated**: heading "Your ledger", then the trend section, then the list,
  then the files block.

**Trend section** (populated state only):
- Section heading "Trend".
- One shared caption line: "How much of the hinted substance each rebuild
  recovered. Fidelity, never a grade."
- Two charts (see `TrendChart` below), each with its own title and, directly
  under the title, the small tag "Reconstruction fidelity" (this satisfies
  "each explicitly labeled", per chart, not just per section):
  1. "Hinted ideas recovered" — `recoveredShare` as a percent, y fixed 0 to
     100 with ticks at 0 / 50 / 100.
  2. "Sentence count difference" — `sentenceDelta`, symmetric y domain
     `[-D, +D]` where `D = max(3, max |delta|)`, ticks at −D / 0 / +D, the
     zero gridline drawn slightly stronger and labeled 0. Caption under this
     chart: "0 means your rebuild used the same number of sentences as the
     original."
- Points are the reconstructed attempts in `reconstructedAt` ascending order
  (oldest left, newest right), evenly spaced by attempt index; the x axis ends
  are labeled with `dateLabel` of the first and last plotted attempts. Even
  spacing is deliberate: the story is fidelity per attempt, and exact dates
  live on the entries below.
- Plot at most the most recent `TREND_MAX_POINTS = 60` attempts. When older
  ones fall outside the window, say so under the charts: "Showing the last 60
  attempts." Never truncate silently.
- One point renders as a single dot with its value label; the connecting line
  needs two.

**The list**:
- An ordered list of completed attempts, newest first. Each entry is one
  `<li>` containing a single block link to `/align/:id` (whole row tappable,
  min height ~44px) with:
  - the date (`dateLabel(reconstructedAt)`),
  - passage title, and author when present,
  - both metric values as plain text, e.g. "Recovered 7 of 9" and
    "9 sentences in the original, 8 in yours",
  - the action wording "See alignment" (visible text or the row's clear
    affordance; the accessible name of the link must include the passage
    title so rows are distinguishable to a screen reader).
- These per-entry values double as the charts' accessible data table, so the
  numbers are never locked behind the SVG.
- **Pagination**: render the first `LEDGER_PAGE_SIZE = 20` entries; a
  "Show more" button (btn-secondary) reveals the next 20 each press and
  disappears when everything is shown. The DOM never renders unbounded rows.

**Files block** (populated state only), at the bottom:
- Small heading "Your files" and one line: "Your whole record as one plain
  JSON file. Yours to keep."
- Button "Export record" (btn-secondary): `buildExport(allAttempts,
  Date.now())` → `downloadJson`. Exports every attempt, all statuses.
- The **import control**, labeled "Import record": a visually-styled
  `<label>` wrapping `<input type="file" accept=".json,application/json">`
  (the input itself visually hidden but focusable, so keyboard and screen
  reader users reach it; the label styled as btn-secondary). On file select:
  - refuse when `file.size > IMPORT_MAX_BYTES` with the error line below;
  - read text, `parseExport`, then `importAttempts`;
  - on success, reload the list and show an inline status line, `role="status"`:
    "Restored 12 attempts." or, with duplicates,
    "Restored 3 attempts. 2 were already here." A zero-added import reads
    "All of those attempts were already here."
  - on any parse failure, one inline in-voice error line: "That file did not
    match. Choose a JSON export from Franklin's Gym."
  - Give the control a busy/disabled state while reading so the tap has
    sub-100ms feedback even on a big file.
- The same import control instance is what the empty state embeds as its
  secondary action (share the component or extract a small
  `ImportControl` inside `Ledger.tsx`; implementer's choice, no new file
  required).

### Trend chart — `src/components/TrendChart.tsx` (new) + `TrendChart.module.css`

One reusable single-series chart; the ledger renders two instances. Titles and
the fidelity tag are rendered by `Ledger.tsx`; the component only plots.

```ts
export interface TrendPoint {
  date: number;  // epoch ms, for the hover title
  value: number;
}

interface TrendChartProps {
  points: TrendPoint[];          // time-ascending
  yMin: number;
  yMax: number;
  yTicks: number[];              // e.g. [0, 50, 100] or [-3, 0, 3]
  formatValue: (v: number) => string; // "78%" or "+1"
  zeroEmphasis?: boolean;        // stronger gridline at y=0
  ariaLabel: string;             // one-sentence summary, built by the caller
}
```

Rendering rules (these follow the house dataviz method; they are spec, not
taste):
- **One y axis per chart, one series per chart.** The two metrics have
  different scales; they are two charts, never one dual-axis chart.
- Inline SVG sized to the container: measure the container width with a
  `ResizeObserver` (fall back to a sane default before first measure) and
  render at native pixels, height ~140px. Never a fixed 600px viewBox scaled
  down, which would shrink axis text unreadably at 390px.
- Line: 2px, `stroke-linejoin: round`, `stroke-linecap: round`, in
  `var(--color-accent)`. Dots: r=4, filled accent, with a 2px ring in
  `var(--color-surface)` so overlapping points stay legible.
- Gridlines at the given ticks: 1px solid `var(--color-border)`, recessive;
  the zero line uses `var(--color-text-muted)` at 1px when `zeroEmphasis`.
- Axis and tick text in `var(--color-text-muted)` at `var(--text-xs)`; never
  in the series color. No legend (single series; the title above names it).
- **Label selectively**: only the last point gets a direct value label
  (`formatValue`), placed clear of the dot; every other value rides the tick
  lines and the list below. Never a number on every point.
- Each dot carries a native SVG `<title>` ("Sep 15, 2026. 78%") for hover;
  the SVG root has `role="img"` and `aria-label={ariaLabel}` (for example
  "Hinted ideas recovered across 12 attempts, latest 78 percent."). The
  per-entry text in the list is the accessible data table. Deeper
  interactivity (crosshair, pinned tooltip) is EPIC 6 polish; do not build it
  here.
- Both themes already work from the tokens used above; no new color tokens.

### Copy inventory (ships verbatim; already swept)

Nav: "Ledger". Headings: "Your ledger", "Trend", "Your files".
Empty state: "Your record starts with the first rebuild" / "Every aligned
attempt files here with its date, its fidelity numbers, and a link back to
the alignment." / "Browse passages" / "Restore from a file".
Charts: "Hinted ideas recovered", "Sentence count difference",
"Reconstruction fidelity", "How much of the hinted substance each rebuild
recovered. Fidelity, never a grade.", "0 means your rebuild used the same
number of sentences as the original.", "Showing the last 60 attempts."
List: "See alignment", "Show more", "Recovered 7 of 9",
"9 sentences in the original, 8 in yours".
Files: "Your whole record as one plain JSON file. Yours to keep.",
"Export record", "Import record", "Restored 12 attempts.",
"Restored 3 attempts. 2 were already here.",
"All of those attempts were already here.",
"That file did not match. Choose a JSON export from Franklin's Gym."
States: "Loading your ledger", "Your ledger did not load", "This device
blocked local storage. Allow it, then try again.", "Try again".

---

## QUALITY BAR application (binding on the new surfaces)

- **Perceived speed.** One indexed `getAll` per visit; metrics derive in
  microseconds; charts render synchronously. The list DOM is paginated at 20;
  the charts cap at 60 points. Export serializes in memory and downloads; the
  import control shows a busy state within 100ms. No white flash: loading is a
  `Skeleton` inside `AppLayout`.
- **Mobile-first (390px).** The ledger stacks to one column; charts fill the
  container width via measurement (no horizontal scroll, no scaled-down
  text); rows and buttons are ~44px targets. The e2e viewport is 390px; keep
  it green.
- **Designed states.** Empty, loading, and error states are specified above,
  in the product's voice. The import success and failure lines are designed
  inline states, `role="status"` / `role="alert"`, never a browser alert.
- **First-run.** The ledger empty state names what accumulates and points to
  the first action ("Browse passages"), and offers restore for returning
  users. The guided walkthrough remains EPIC 5; do not build any tour here.
- **Security hygiene.** No server, no network call. The import boundary
  validates types, sizes, and formats before anything touches the store
  (byte cap, record cap, per-field checks, status coherence). All imported
  text renders as escaped React text nodes. The export file stays local
  (Blob download); analytics never receives passage, hint, or metric data.
  No PII anywhere: the export carries no user identity.
- **Accessibility.** Charts: `role="img"` with a real summary, native
  `<title>` on dots, and every plotted value available as text in the list.
  The file input is focusable and properly labeled; status lines use
  `role="status"`/`role="alert"`. Semantic structure: one `h1`, section
  headings, a real `<ol>`/`<ul>` for entries; visible focus states via
  existing global styles; text never wears the chart series color.
- **Copy.** Every string above is in the inventory and swept: no em/en
  dashes, no banned vocabulary, no negative empty-state phrasing.
  `src/test/copy-sweep.test.ts` scans all new `src` files automatically;
  keep it green.

---

## Ordered task list (each item is provable)

1. **Metrics module.** `src/lib/metrics.ts` with `fidelityMetrics`.
   - AC: for a hand-built alignment of 2 matched + 1 omission + 1 addition it
     returns originalSentences 3, recoveredSentences 2, recoveredShare 2/3,
     yourSentences 3, sentenceDelta 0; an all-omissions alignment returns
     share 0; an empty-pairs alignment returns all zeros with no NaN; same
     input twice gives identical output.

2. **Date label.** `dateLabel` in `src/lib/attempts.ts`.
   - AC: a known epoch renders "Sep 15, 2026" style with the correct month
     name and year; existing `attempts.test.ts` cases stay green.

3. **Transfer module.** `src/lib/transfer.ts`: `buildExport`, `parseExport`,
   `downloadJson`, the format constants and caps.
   - AC: `buildExport` output is valid pretty-printed JSON containing format,
     version, exportedAt, and every attempt field;
     `parseExport(buildExport(rows, t))` returns records deeply equal to
     `rows` (round trip); wrong `format`, wrong `version`, non-JSON, an
     over-cap attempts array, and each documented bad-record case (including
     a `reconstructed` record missing its alignment, and a `vaulted` record
     missing `vaultedUntil`) return the right `ok: false` reason; unknown
     extra fields on a record survive the round trip.

4. **Store import.** `importAttempts` in `src/lib/store.ts`.
   - AC (fake-indexeddb): importing N records into a fresh store adds N and
     `listAttempts` deep-equals the originals; importing the same file again
     reports added 0 / skipped N and changes nothing; a mixed import counts
     added and skipped correctly; existing records are never overwritten.

5. **Trend chart component.** `src/components/TrendChart.tsx` per the
   rendering rules.
   - AC: renders a line and dots for given points with `role="img"` and the
     given aria-label; exactly one direct value label (the last point);
     renders tick lines for the given ticks and emphasizes zero when asked;
     a single point renders one dot and no line; no legend element exists.

6. **Ledger screen + route + nav.** `src/routes/Ledger.tsx`, route in
   `App.tsx`, "Ledger" link in `AppLayout.tsx`. List, trend section, files
   block, empty/loading/error states, pagination.
   - AC: with seeded reconstructed attempts the list shows them newest first
     with dates, both metric texts, and links to `/align/:id`; with 45
     completed attempts the DOM shows 20 rows, then 40 after one "Show more",
     then all 45 and the button leaves; both chart titles render with the
     "Reconstruction fidelity" tag; with zero completed attempts the empty
     state renders its copy, a "Browse passages" link to `/library`, and the
     import control; the nav link reaches `/ledger` from any screen.

7. **Export/import wiring.** The files block behaviors on the ledger screen.
   - AC: "Export record" triggers a download whose contents parse back to
     every stored attempt (assert via the transfer module with the anchor
     mocked); a valid file import adds records, reloads the list, and shows
     the restored count; a duplicate import shows the skipped wording; an
     invalid file shows the in-voice error line and stores nothing; an
     oversized file is refused before parsing.

8. **E2E + sweep.** Extend `e2e/smoke.spec.ts`; run the full suite.
   - AC: at 390px, the "Ledger" nav link opens `/ledger` showing the empty
     state with no horizontal scroll; using Playwright `setInputFiles` with
     an in-test JSON buffer (one valid reconstructed attempt built inline),
     the entry appears with its date and its "See alignment" link, and
     following it renders the alignment view (legend visible); `npm test`
     including `copy-sweep.test.ts` passes.

---

## Test plan (which test proves each planner criterion)

**Criterion 1 (dated list, newest first, bounded, links to alignment):**
`Ledger.test.tsx` seeds fake-indexeddb with reconstructed attempts out of
order and asserts rendered order (newest `reconstructedAt` first), the
`dateLabel` text on each entry, hrefs to `/align/:id`, and the 20-per-page
reveal behavior at 45 entries. The e2e import test proves the link lands on a
real alignment.

**Criterion 2 (fidelity trend, labeled, no composite/streak/leaderboard):**
`metrics.test.ts` pins both metric definitions on hand-built alignments and
determinism. `TrendChart.test.tsx` proves the plotting contract.
`Ledger.test.tsx` asserts each chart title renders with a "Reconstruction
fidelity" tag, that the two charts are separate elements (no dual axis), and
that the strings "streak", "score", and "leaderboard" appear nowhere in the
rendered ledger.

**Criterion 3 (plain-file export, import restores, fresh-store round trip):**
`transfer.test.ts` proves the file is human-readable pretty JSON and the
parse/build round trip. `store.test.ts` proves `importAttempts` into a fresh
store reproduces `listAttempts` deep-equal, and the full chain
(seed → `buildExport` → wipe → `parseExport` → `importAttempts` →
`listAttempts` deep-equals the seed) runs in one test. `Ledger.test.tsx`
covers the wired buttons and every user-facing outcome message. The e2e test
proves a real file lands as a working ledger entry.

**Criterion 4 (empty state explains and points to first action):**
`Ledger.test.tsx` asserts the empty-state title and description, the primary
"Browse passages" link, and the presence of the import control. The e2e test
asserts it renders at 390px with no horizontal scroll.

Commands: `npm test` (Vitest, includes the copy sweep), `npm run test:e2e`
(Playwright). Both must pass before the run ends.

---

## Notes for the implementer

- The metric trap is the binding condition of this EPIC. Two separate,
  plainly labeled fidelity metrics; nothing combines them, ranks them, or
  turns them into a grade, a streak, or a percentage of "quality". When a
  design choice smells like gamification, it is out.
- Metrics are DERIVED from the saved `Alignment` by `fidelityMetrics`, never
  persisted and never recomputed from the raw texts (the saved alignment is
  the fixed record of the confrontation).
- `DB_VERSION` stays 1. This EPIC adds no fields and no stores.
- Import never overwrites an existing id. The user's local record always
  wins; imports only add.
- The status-coherence checks in `parseExport` are load-bearing: a
  `reconstructed` record without an alignment creates a redirect loop between
  the align and reconstruct screens. Refuse such records at the boundary.
- Two charts, one series each, one y axis each. Do not merge them, do not add
  a legend to a single-series chart, do not label every point, and do not add
  a chart library.
- Chart width comes from measuring the container, not from scaling a fixed
  viewBox; scaled text is unreadable at 390px.
- Home (`Home.tsx`) is untouched. The dashboard is the pipeline; the ledger
  is the archive.
- Keep every string from the copy inventory verbatim or re-sweep anything you
  change (no dashes, no banned vocabulary, no negative phrasing). The sweep
  test scans every new `src` file automatically.
