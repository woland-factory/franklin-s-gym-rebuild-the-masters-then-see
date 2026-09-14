# EPIC SPEC — Condense & vault

Franklin's Gym: rebuild the masters, then see your gaps in color.

This EPIC builds the front half of the training loop: start an attempt from
a passage, condense it one sentence at a time into short hints, then vault the
original behind a chosen delay so it cannot be peeked at until it is ripe. The
home dashboard becomes a live pipeline that shows every attempt's state, and
each vaulted attempt can export a calendar reminder for its ripe date. It stops
before reconstruction and alignment, which land in EPIC 3.

The foundation this builds on already exists (EPIC 1): a Vite + React 18 +
TypeScript app, `react-router-dom` v7 routing in `src/App.tsx`, an IndexedDB
layer (`src/lib/db.ts`, `src/lib/store.ts`) with an `attempts` object store and
a `settings` store, the seed library (`src/data/seedPassages.ts`,
`.types.ts`), the read-only `/library` browser, the home empty state, and the
designed `EmptyState` / `ErrorState` / `Skeleton` components.

---

## Quality differentiator (this app must win here)

**Incorruptible, instant confrontation.** The product wins on the honesty and
precision of a deterministic sentence-by-sentence diff against a fixed
original, computed in seconds, where paper cannot collate without tedium and a
chatbot flatters. That alignment view lands in EPIC 3.

**What it demands of THIS EPIC:** the vault is the promise that makes the later
confrontation honest. If the original leaks before it is ripe, the whole
exercise is void. So the load-bearing quality work here is the integrity of the
vault, not decoration:

- Once an attempt is vaulted, the original text MUST NOT be rendered on any
  screen until `now >= vaultedUntil`. The condense screen, the dashboard, and
  the reconstruct seam all obey this. The vault is a UI access rule, not
  encryption (there is no server and a determined user can open devtools), but
  the app must never be the thing that shows the answer early.
- Sentence segmentation for paste-your-own must be clean and deterministic. It
  is the raw material the EPIC-3 diff runs on, so a sloppy split poisons every
  downstream alignment.
- The loop must feel instant and local. Creating, saving, and vaulting an
  attempt is a local IndexedDB write with immediate UI feedback. No network
  round-trip touches the core path.

---

## Scope

### In scope
- Start an attempt from any seed library passage.
- Paste-your-own: accept pasted text, segment it into sentences client-side,
  enforce the documented length cap, keep it local and private.
- A condense screen that presents one original sentence at a time and captures
  one short hint per sentence, saving progress as the user goes.
- On completion: pick a delay (standard default plus a short micro option) and
  vault the attempt. The original is hidden until ripe.
- A home dashboard that lists attempts and shows each one's state: condensing,
  vaulted (with countdown or ripe date), or ripe. Ripe attempts are visibly the
  primary thing to act on.
- Export an `.ics` calendar event for a vaulted attempt's ripe date.
- All new state persists in IndexedDB and survives reload.

### Out of scope (built by later EPICs, do not build here)
- Reconstruction (the rebuild-from-hints writing surface) and the alignment
  diff view. EPIC 3. This EPIC adds only a thin, non-leaking placeholder route
  so a ripe attempt has a real destination instead of a dead link.
- The ledger, trend chart, and export/import of the whole record. EPIC 4.
- The guided first-run walkthrough, the full micro-drill with a distractor
  passage, and the `SEED_DEMO` staging demo. EPIC 5. This EPIC ships
  self-explanatory screens (one primary action, examples, designed empty
  states) but does NOT build the step-by-step guided path.
- Push or email reminders of any kind. Calendar export is the only reminder.
- A settings screen, theme switching, or a persisted "remembered" default
  delay. The default delay is a constant in this EPIC.
- Any quality/similarity score, streak, or leaderboard.
- Any runtime LLM, AI, or network call.

---

## Non-goals (binding — a built non-goal is a defect)
- No reconstruction or alignment logic. No writing surface that accepts a
  rebuild, no diff, no metrics.
- No push or email reminders. No mail service call.
- No accounts, no server, no upload of any passage or hint. Pasted text and all
  hints stay on the device.
- No redistribution or export of seed or pasted passage text beyond the single
  attempt owner's own `.ics` (which carries only the title and ripe date, not
  the passage body).

---

## Technical design

### Stack and conventions (match what exists)
- TypeScript, React 18 function components, CSS Modules (`*.module.css`) with
  tokens from `src/styles/tokens.css`. Global button classes `btn`,
  `btn-primary` already exist; reuse them.
- Routing via `react-router-dom` v7 in `src/App.tsx`. Use `useParams`,
  `useNavigate`, `Link`.
- Persistence via the `idb` wrappers in `src/lib/db.ts` / `src/lib/store.ts`.
  All reads and writes go through `store.ts`; components never call `openDb`
  directly.
- Tests: Vitest + Testing Library (`*.test.ts[x]` next to the file), with
  `fake-indexeddb` for store tests (see `src/lib/db.test.ts` for the pattern).
  Playwright smoke tests in `e2e/`.
- IDs: `crypto.randomUUID()` (available in browsers and the jsdom/Node test
  env).
- User text (custom passages, hints) is rendered only as React text nodes,
  which auto-escape. Never use `dangerouslySetInnerHTML`.

### Data model (forward-only, no DB version bump)

The `attempts` object store, its `keyPath: "id"`, and its `by-status` /
`by-createdAt` indexes already exist and are sufficient. Adding fields to the
record does NOT require a `DB_VERSION` bump: IndexedDB records are schemaless
per row, and a bump is only needed to create a new store or index. Leave
`DB_VERSION` at 1. Existing rows (if any) are `{id, status, createdAt}`; new
code must tolerate absent new fields by treating them as unset.

Extend `AttemptRecord` in `src/lib/db.ts`:

```ts
export type DelayType = "standard" | "micro";

// Persisted status. "ripe" and "reconstructed" are NOT stored: ripeness is
// derived from the clock (see attemptState), and reconstruction lands in EPIC 3.
export type AttemptStatus = "condensing" | "vaulted";

// A frozen copy of the passage this attempt trains on. Embedding it (rather
// than only referencing a seed id) keeps custom passages private and local,
// and keeps every attempt stable if the seed library later changes.
export interface PassageSnapshot {
  originalPassageId: string | null; // seed slug, or null for a custom passage
  title: string;
  author: string;   // "" allowed for custom
  source: string;   // "" allowed for custom
  year: number | null;
  sentences: string[];
  isCustom: boolean;
}

export interface AttemptRecord {
  id: string;
  status: AttemptStatus;
  createdAt: number;          // epoch ms
  passage: PassageSnapshot;
  hints: string[];            // length === passage.sentences.length; "" until filled
  cursor: number;             // sentence index to resume condensing at
  delayType?: DelayType;      // set at vault
  vaultedAt?: number;         // epoch ms, set at vault
  vaultedUntil?: number;      // epoch ms, ripe when now >= this; set at vault
}
```

`SettingRecord` and the `settings` store are unchanged and unused by this EPIC.

### Delay presets — `src/lib/delays.ts` (new)

```ts
import type { DelayType } from "./db";

export const DELAY_PRESETS: Record<DelayType, { label: string; ms: number }> = {
  standard: { label: "In 3 days", ms: 3 * 24 * 60 * 60 * 1000 },
  micro: { label: "In 15 minutes", ms: 15 * 60 * 1000 },
};

export const DEFAULT_DELAY: DelayType = "standard";
```

Exactly two presets, matching the `micro | standard` data model. `standard` is
the default and the short `micro` option is offered alongside it. The micro
option here is only a short delay preset. The full micro-drill experience (a
distractor passage that fills the wait) is EPIC 5 and is out of scope.

### Ripeness derivation — `src/lib/attempts.ts` (new)

```ts
import type { AttemptRecord } from "./db";

export type AttemptState = "condensing" | "vaulted" | "ripe";

export function attemptState(a: AttemptRecord, now: number): AttemptState {
  if (a.status === "condensing") return "condensing";
  return (a.vaultedUntil ?? Infinity) <= now ? "ripe" : "vaulted";
}
```

Pass `now` in (do not call `Date.now()` inside) so it is deterministically
testable. Also put a small human-readable countdown formatter here, e.g.
`ripeLabel(vaultedUntil, now): string` returning "Ripe in 2 days" /
"Ripe in 3 hours" / "Ripe on Sep 17" when far off, and "Ready" when ripe. Keep
phrasing positive and free of em-dashes.

### Sentence segmentation — `src/lib/segment.ts` (new)

```ts
export function segmentSentences(text: string): string[];
```

Deterministic client-side split, used by paste-your-own (and reused by EPIC 3):
- Normalize whitespace (collapse runs, trim). Split paragraphs on newlines too.
- Split on sentence terminators `.`, `!`, `?`, including a trailing closing
  quote or bracket (`."`, `?"`, `.)`), keeping the terminator attached to the
  sentence.
- Guard a small, documented abbreviation list so it does not false-split
  (`Mr.`, `Mrs.`, `Ms.`, `Dr.`, `St.`, `Jr.`, `Sr.`, `vs.`, `etc.`). This list
  is intentionally small. Document in a comment that segmentation is a
  heuristic and edge cases (initials, decimals) may split imperfectly.
- Drop empty fragments; trim each result.

Also export the validation helper used at the paste boundary:

```ts
import { MAX_WORDS, MAX_SENTENCES } from "../data/seedPassages.types";

export const MIN_SENTENCES = 2;

export type SegmentResult =
  | { ok: true; sentences: string[] }
  | { ok: false; reason: "too-short" | "too-many-sentences" | "too-long"; count: number };

export function segmentAndValidate(text: string): SegmentResult;
```

Reuse the existing `MAX_WORDS = 400` and `MAX_SENTENCES = 40` from
`seedPassages.types.ts` and `totalWordCount` from `src/lib/wordCount.ts`.
`count` carries the offending number so the UI can name it. Order of checks:
too-short (fewer than `MIN_SENTENCES`), then too-many-sentences, then too-long
by words.

### Calendar export — `src/lib/ics.ts` (new)

```ts
export interface IcsEvent {
  uid: string;        // stable per attempt, e.g. `${attempt.id}@franklins-gym`
  start: number;      // epoch ms of the ripe time (DTSTART)
  stamp: number;      // epoch ms for DTSTAMP (pass Date.now() at call site; a param keeps it testable)
  title: string;      // e.g. `Rebuild "Walden" in Franklin's Gym`
  description: string;
}

export function buildIcs(event: IcsEvent): string;   // pure, returns iCalendar text
export function downloadIcs(filename: string, contents: string): void; // Blob + anchor click
```

`buildIcs` requirements:
- Valid RFC 5545: CRLF (`\r\n`) line breaks, `BEGIN:VCALENDAR` / `VERSION:2.0`
  / `PRODID:-//Franklin's Gym//EN` / `BEGIN:VEVENT` ... `END:VEVENT` /
  `END:VCALENDAR`.
- `VEVENT` carries `UID`, `DTSTAMP`, `DTSTART` (UTC basic format
  `YYYYMMDDTHHMMSSZ`), `SUMMARY`, `DESCRIPTION`.
- Escape text values per RFC 5545: backslash, comma, semicolon, and newline in
  `SUMMARY`/`DESCRIPTION`.
- The `.ics` carries only the passage title and ripe date, never the passage
  body or any hint.

`downloadIcs` builds a `text/calendar` Blob and triggers a download via a
temporary anchor. Filename like `franklins-gym-<slug-or-id>.ics`.

### Store additions — `src/lib/store.ts`

Add typed helpers (keep existing `countAttempts`, `listAttempts`,
`getSetting`, `putSetting`):

```ts
export async function createAttempt(passage: PassageSnapshot, now: number): Promise<AttemptRecord>;
// id = crypto.randomUUID(); status "condensing"; createdAt = now;
// hints = Array(passage.sentences.length).fill(""); cursor = 0. Persists and returns it.

export async function getAttempt(id: string): Promise<AttemptRecord | undefined>;

export async function saveHint(id: string, index: number, hint: string): Promise<void>;
// writes hints[index] and advances cursor to max(cursor, index+1). No-op if not found.

export async function vaultAttempt(id: string, delayType: DelayType, now: number): Promise<AttemptRecord>;
// status "vaulted"; delayType; vaultedAt = now; vaultedUntil = now + DELAY_PRESETS[delayType].ms.
```

`listAttempts` already returns rows by `by-createdAt` (ascending). The
dashboard reverses to show newest first. Pass `now` into `createAttempt` /
`vaultAttempt` from the caller for testability (callers use `Date.now()`).

### Routes — `src/App.tsx`

Add three routes inside the existing `<Routes>`:
- `/condense/:attemptId` → `Condense` screen.
- `/reconstruct/:attemptId` → `ReconstructPlaceholder` (thin seam, see below).
- Keep `/`, `/library`, and the `*` NotFound.

### Screens and components

**Library start action — `src/routes/Library.tsx`, `src/components/PassageCard.tsx`**
- Each `PassageCard` gains a primary "Start" action. On click, `Library`
  builds a `PassageSnapshot` from the seed (`originalPassageId = passage.id`,
  `isCustom: false`, copying title/author/source/year/sentences),
  `createAttempt`s it, and navigates to `/condense/:id`. Keep the existing
  read-only preview.
- The "Start" control must be the card's one obvious primary action; the
  preview `<details>` stays visibly subordinate.

**Paste-your-own — a surface on `src/routes/Library.tsx` (new component `src/components/PastePassage.tsx`)**
- A titled section with a `<textarea>` for the passage and an optional title
  input (author/source optional; default title "Your passage" when blank).
- On submit: `segmentAndValidate(text)`. On `ok`, build a custom
  `PassageSnapshot` (`originalPassageId: null`, `isCustom: true`,
  `year: null`), `createAttempt`, navigate to condense. On failure, show a
  designed inline error in the product voice that names the limit and the
  user's current count, e.g.:
  - too-short: "Paste at least 2 sentences to train on."
  - too-many-sentences: "Keep it to 40 sentences. Yours has 46."
  - too-long: "Trim to 400 words to keep the rebuild focused. Yours has 512."
- A short line states the cap up front so it is not a surprise, e.g. "Up to
  400 words, 40 sentences. It stays on this device."
- No network call. The text never leaves the page except into local IndexedDB.

**Condense screen — `src/routes/Condense.tsx` (new) + `Condense.module.css`**
- Loads the attempt by `:attemptId` via `getAttempt`. While loading, render the
  `Skeleton` inside layout (no white flash). If not found, render an
  `ErrorState` in voice with a link back to the dashboard.
- **Vault guard (differentiator-critical):** if the loaded attempt's
  `status === "vaulted"`, do NOT render any sentence. Redirect to `/` (or show a
  short in-voice note with a link home). The original is never shown after
  vaulting.
- Presents ONE original sentence at a time: a progress indicator ("Sentence 3
  of 8"), the current original sentence (read-only), and a hint input labeled
  clearly (e.g. label "Your hint", placeholder "A few words to trigger this
  sentence later").
- Navigation: "Back" and "Next". Advancing (or blurring) persists the current
  hint via `saveHint` so progress survives reload; on return the screen resumes
  at `cursor`. A hint may be left blank; blank hints are allowed (the user
  chooses how much to lean on memory).
- On the last sentence the primary action is "Finish and vault", which opens a
  delay chooser (inline panel or step, not a new route): the two presets from
  `DELAY_PRESETS` with `standard` preselected, and a confirm "Vault it". Confirm
  calls `vaultAttempt` and navigates to `/`.
- Give the primary action a pressed/disabled state during the write so the tap
  feels immediate (feedback within 100ms).

**Home dashboard — `src/routes/Home.tsx` (extend) + a new `src/components/AttemptCard.tsx`**
- On mount, load attempts (`listAttempts`, reversed to newest first). While
  loading, show `Skeleton`. On read error, show `ErrorState` with a retry.
- If there are no attempts, render the existing `EmptyState` unchanged (its
  "See an example" panel stays).
- If there are attempts, render a "Your attempts" pipeline list of
  `AttemptCard`s plus a persistent way to start another (a "Browse passages"
  link). Compute `attemptState(record, Date.now())` per card:
  - **condensing**: chip "Condensing", subtext progress (e.g. "3 of 8 hinted"),
    primary action "Resume" to `/condense/:id`.
  - **vaulted**: chip "Vaulted", subtext the `ripeLabel` countdown/date,
    secondary action "Add to calendar" that builds the event and calls
    `downloadIcs`. The passage body is never shown, only title and author.
  - **ripe**: visibly elevated as the primary thing to do (chip "Ready",
    prominent primary button "Rebuild" to `/reconstruct/:id`). This is what
    "ripe attempts are clearly actionable" means.
- Cap the rendered list at a sane number (e.g. 50, newest first) so it never
  grows unbounded; note in a comment that full paginated history is EPIC 4.
- Never render `passage.sentences` for a vaulted attempt on this screen.

**Reconstruct placeholder — `src/routes/ReconstructPlaceholder.tsx` (new)**
- The minimum needed so a ripe "Rebuild" button is not a dead link. It loads
  the attempt, and renders a short in-voice message that the rebuild step is
  next, with the passage title and a link back to the dashboard. Positive
  phrasing, no em-dashes, e.g. heading "Rebuild", body "Your hints are saved
  and ready. The rebuild step opens next.", link "Back to your attempts".
- **It MUST NOT render `passage.sentences`** (the vault holds even here).
- EPIC 3 replaces this file with the real reconstruct screen. It is the only
  forward seam this EPIC touches, justified by the no-dead-end quality bar.

---

## QUALITY BAR application (binding on the new surfaces)

- **Perceived speed.** All reads/writes are local IndexedDB. Every primary
  action (Start, Next, Finish and vault, Add to calendar) gives visible
  feedback within 100ms (pressed/disabled state or immediate navigation). No
  new screen shows a white flash: loading uses `Skeleton` inside `AppLayout`.
- **Mobile-first (390px).** Condense (sentence + input + nav), the dashboard
  pipeline, the delay chooser, and paste-your-own are all fully usable at 390px
  with no horizontal scroll. Touch targets ~44px. The e2e viewport is already
  390px; keep it green.
- **Designed states.** Every new screen has designed empty, loading, and error
  states: dashboard uses the existing empty state; condense/reconstruct show a
  `Skeleton` while loading and an in-voice `ErrorState` for a missing attempt.
  Paste errors are designed inline messages, never raw validation dumps.
- **First-run.** The screens are self-explanatory: one obvious primary action
  each, real examples/defaults (standard delay preselected, cap stated up
  front). The guided step-by-step walkthrough and the same-day micro-drill are
  EPIC 5 and are NOT built here.
- **Security hygiene.** No server, so auth/rate-limit clauses have no route.
  What binds and is in scope: validate pasted input at the boundary (min/max
  sentences, max words) before it is stored; render all user text as escaped
  React text nodes; keep everything local (no upload); keep no passage or hint
  text in logs or analytics; secrets stay in env (unchanged from EPIC 1).
- **Accessibility.** Progress indicator is announced (e.g. `aria-live` or a
  labeled heading). The hint input is labeled. The delay chooser is a labeled
  radio group. State chips convey status by text, not color alone. Visible
  focus states; full keyboard reach through condense, the chooser, and the
  dashboard actions.
- **Copy.** Every new visible string is positive, plain, one idea per sentence,
  with no em-dashes/en-dashes and none of the banned LLM vocabulary. The
  existing `src/test/copy-sweep.test.ts` auto-scans new `src` files, so new copy
  is enforced. Sweep example copy in this spec before shipping it too.

---

## Ordered task list (each item is provable)

1. **Data model + store.** Extend `AttemptRecord` and add `DelayType`,
   `AttemptStatus`, `PassageSnapshot` in `db.ts` (no `DB_VERSION` bump). Add
   `createAttempt`, `getAttempt`, `saveHint`, `vaultAttempt` to `store.ts`.
   - AC: `createAttempt` stores a `condensing` record with `hints` sized to the
     passage and `cursor = 0`; `getAttempt` returns it; `saveHint` writes the
     right index and advances `cursor`; `vaultAttempt` sets `vaulted`,
     `vaultedAt`, and `vaultedUntil = now + preset.ms`. All survive a simulated
     reopen (fake-indexeddb).

2. **Delays + ripeness helpers.** Add `src/lib/delays.ts` and
   `src/lib/attempts.ts`.
   - AC: `attemptState` returns `condensing` for a condensing record, `vaulted`
     when `now < vaultedUntil`, `ripe` when `now >= vaultedUntil`. `ripeLabel`
     renders positive, dash-free countdown/date strings. `DEFAULT_DELAY` is
     `standard`; both presets exist.

3. **Segmentation + validation.** Add `src/lib/segment.ts`.
   - AC: `segmentSentences` splits multi-sentence text correctly, keeps
     terminators, and does not false-split the documented abbreviations.
     `segmentAndValidate` returns `too-short` below 2 sentences,
     `too-many-sentences` above 40, `too-long` above 400 words, with the
     offending `count`, and `ok` with sentences otherwise.

4. **Calendar export.** Add `src/lib/ics.ts`.
   - AC: `buildIcs` returns valid iCalendar (VCALENDAR/VEVENT with UID, DTSTAMP,
     DTSTART in UTC basic format, SUMMARY, DESCRIPTION), CRLF line endings, and
     escapes commas/semicolons/backslashes/newlines. `DTSTART` equals the passed
     ripe time. The output contains no passage body text.

5. **Start an attempt (library + paste).** Add "Start" to `PassageCard`, wire
   `Library` to create + navigate, add `PastePassage` with cap messaging and
   validation.
   - AC: starting from a seed passage creates a `condensing` attempt embedding
     that passage and lands on `/condense/:id`. Pasting valid text does the same
     with a custom snapshot. Pasting over-cap or too-short text shows the
     designed in-voice error and creates nothing.

6. **Condense screen.** Add `Condense.tsx` + route. One sentence at a time,
   hint capture, save-as-you-go, resume at cursor, finish -> delay chooser ->
   vault. Loading/not-found/vault-guard states.
   - AC: shows one original sentence with progress; typing a hint and advancing
     persists it (reload resumes at cursor); finishing opens the two-preset
     chooser with `standard` preselected; confirming vaults and returns to `/`.
     Opening `/condense/:id` for a vaulted attempt renders no sentence.

7. **Dashboard pipeline.** Extend `Home.tsx`, add `AttemptCard`. Load attempts,
   render empty vs pipeline, three states, ripe elevated, vaulted "Add to
   calendar", condensing "Resume".
   - AC: with no attempts the existing empty state shows; with attempts, each
     renders its correct state; a vaulted card shows a countdown/ripe date and
     downloads a valid `.ics`; a ripe card shows a prominent "Rebuild" primary
     action; no vaulted card renders passage sentences.

8. **Reconstruct seam.** Add `ReconstructPlaceholder.tsx` + route so "Rebuild"
   is not a dead link and does not leak the original.
   - AC: `/reconstruct/:id` renders an in-voice next-step message with a link
     back and never renders `passage.sentences`.

9. **Reload durability + copy sweep.** Confirm all state survives reload and the
   copy sweep passes.
   - AC: `npm test` (which includes `copy-sweep.test.ts`) passes; a manual/e2e
     reload after condensing and after vaulting restores the same state.

---

## Test plan (which test proves each criterion)

Unit (Vitest, colocated `*.test.ts`):
- `segment.test.ts`: multi-sentence split, terminator retention, abbreviation
  guard, and each `segmentAndValidate` branch (too-short / too-many / too-long /
  ok) with the reported `count`. Proves AC 3 and the paste cap in AC 5.
- `ics.test.ts`: required VEVENT properties present, CRLF endings, UTC DTSTART
  equals the ripe time, RFC-5545 escaping of comma/semicolon/backslash/newline,
  and that no passage body leaks into the output. Proves AC 4 and the `.ics`
  part of AC 7.
- `attempts.test.ts`: `attemptState` transitions across `now` and `ripeLabel`
  strings (positive, dash-free). Proves the state derivation behind AC 7.
- `store.test.ts` (extend, fake-indexeddb): `createAttempt` / `getAttempt` /
  `saveHint` (index + cursor) / `vaultAttempt` (status + `vaultedUntil`) and
  persistence across a store reopen. Proves AC 1 and "state survives reload".

Component (Testing Library):
- `Condense.test.tsx`: renders one sentence with progress, captures and persists
  a hint, resumes at cursor, finish opens the chooser with `standard`
  preselected, confirm vaults; a vaulted attempt renders no sentence (vault
  guard). Proves AC 6.
- `Library.test.tsx` (extend): "Start" on a seed card creates an attempt and
  navigates to condense. `PastePassage.test.tsx`: valid paste creates a custom
  attempt and navigates; over-cap and too-short show the designed error and
  create nothing. Proves AC 5.
- `Home.test.tsx` (extend): empty vs pipeline; condensing/vaulted/ripe cards
  render their state; "Add to calendar" invokes the ics download; ripe shows the
  elevated "Rebuild" action; vaulted cards show no passage body. Proves AC 7.
- `ReconstructPlaceholder.test.tsx`: renders the next-step message and a link
  back, and never renders passage sentences. Proves AC 8.

E2E (Playwright, `e2e/`, 390px viewport):
- Extend the smoke suite: start an attempt from the library, add one hint,
  reload, confirm it resumes; finish and vault with the micro preset, confirm
  the dashboard shows a vaulted state; confirm no horizontal scroll on the new
  screens. Proves the mobile and reload clauses and AC 6/7 end to end. Do not
  assert on the real 15-minute wait; assert the vaulted state renders (ripeness
  timing is covered deterministically by `attempts.test.ts`).

Copy: `src/test/copy-sweep.test.ts` already scans new `src` files for dashes,
banned vocabulary, and negative phrasing; keep it green. Proves the copy clause.

---

## Notes for the implementer
- Do not bump `DB_VERSION`. Adding record fields is a schemaless change; a bump
  would trigger an unnecessary upgrade path.
- Pass `now` into store/helper functions from the caller (callers use
  `Date.now()`), so tests stay deterministic.
- The vault guard is the single most important correctness point in this EPIC.
  A test that a vaulted attempt renders no original sentence on condense,
  dashboard, and reconstruct is non-negotiable.
- Do not start EPIC 3: no writing surface that accepts a rebuild, no diff, no
  metrics. The reconstruct route is a placeholder only.
- Keep the two delay presets. Do not add a settings screen or persist a chosen
  default; that is later scope.
