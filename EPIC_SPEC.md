# EPIC SPEC — First-run walkthrough & micro-drill

Franklin's Gym: rebuild the masters, then see your gaps in color.

This EPIC solves the day-one cliff. A brand-new user today lands on a designed
empty state, picks a passage, condenses it, and then hits a wall: the standard
delay is three days, so the first session ends in homework, not in the
alignment that is the whole point. This EPIC leads that user through the loop
once, the same day, and ends the first session in a real, honest alignment.

It adds three first-run surfaces and nothing else:
1. A short guided path (a "first workout" checklist) that walks a new user from
   the first note to the first alignment, skippable at any step, gone forever
   after the first success.
2. A micro-drill: a short passage vaulted behind a minutes-long delay filled by
   a warm-up passage to read, so the interval is real yet the session finishes
   the same day.
3. The `SEED_DEMO` staging demo: with the flag set, the app opens on demo state
   that reaches the alignment view within a minute with no typing.

The foundation already exists (EPICs 1 to 4): a Vite + React 18 + TypeScript
app; `react-router-dom` v7 routing in `src/App.tsx`; the IndexedDB layer
(`src/lib/db.ts`, `src/lib/store.ts`) with an `attempts` object store and a
`settings` object store; the full loop condense (`/condense/:id`) → vault →
reconstruct (`/reconstruct/:id`) → align (`/align/:id`); the ledger
(`/ledger`); the deterministic alignment engine (`src/lib/align.ts`); runtime
config (`src/lib/config.ts`) injected by `docker-entrypoint.sh`; and a worked
example at `/example`. This EPIC adds guidance and a demo seed on top. It
changes nothing about how condensing, vaulting, reconstructing, or aligning
work.

---

## Quality differentiator (this app must win here)

**Incorruptible, instant confrontation.** The product wins on the honesty and
precision of a deterministic sentence-by-sentence diff against a fixed
original, computed in seconds. Paper cannot collate without tedium. A chatbot
flatters and lets the original leak from scrollback.

**What it demands of THIS EPIC:** onboarding must deliver the honest
confrontation on day one without cheapening it.

- **The wait stays real.** The micro-drill's delay is genuinely minutes long,
  not zero. Forgetting is the exercise. The warm-up passage fills the wait so
  the user stays engaged, but it never shortens or fakes the delay, and it
  never lets the user peek at the vaulted original.
- **The demo shows the truth, not a trophy.** The `SEED_DEMO` attempt reaches a
  real alignment with genuine gaps (an omission and an addition, marked in
  color), computed by the same engine as any attempt. A demo that shows a
  flawless rebuild demonstrates nothing and is a defect.
- **Guidance points, never lectures.** Every guide string is one short
  imperative anchored to a real control. The screen is still the product.

---

## Scope

### In scope
- **First-run guide** on the home dashboard (`src/components/FirstRunGuide.tsx`):
  a compact "first workout" checklist of three steps, each one short imperative
  sentence, whose ticks fill from the real state of the guided attempt. Its
  active-step action is always the real next control. A "Skip the guide"
  control is present in every state.
- **Micro-drill** started by the guide: creates an attempt on a fixed short
  seed passage, steers the vault to the `micro` delay (minutes), and fills the
  wait with a read-only **warm-up passage** (a different short seed) plus the
  live ripeness countdown. When ripe, the guide's action becomes "Rebuild now".
- **Pipeline nudge** on the populated first-run dashboard: one short hint line
  encouraging the user to condense a few passages so one is ripe on return.
- **`SEED_DEMO` demo state**: when the flag is set and the store is empty,
  bootstrap seeds one reconstructed demo attempt (a real passage, a canned
  imperfect rebuild, a real cached alignment) so the app opens on demo state
  and the alignment view is one tap away.
- **First-run gate**: all three surfaces are hidden the moment the user has any
  completed (reconstructed) attempt, and hidden after the user skips.
- Supporting pieces: `src/lib/firstRun.ts` (pure gate + view derivation +
  constants), `src/lib/demo.ts` (pure demo-attempt builder), `seedDemoAttempt`
  in `src/lib/store.ts`, a `seedDemo` field in `src/lib/config.ts`, the
  `SEED_DEMO` line in `docker-entrypoint.sh`, the micro-delay default for the
  guided attempt in `src/routes/Condense.tsx`, and the demo seed step in
  `src/components/Bootstrap.tsx`.

### Out of scope (do not build here)
- **No new core mechanics** (planner non-goal). Condensing, vaulting,
  reconstructing, and the alignment engine are untouched. The warm-up passage
  is read-only display of an existing seed. It is not a new exercise, has no
  input, and writes nothing.
- **No additional Franklin drills** (planner non-goal). One loop only:
  condense → vault → reconstruct → align. The warm-up is reading material, not
  a jumble/verse/improve drill.
- **No settings screen, no configurable delays.** The two existing delay
  presets in `src/lib/delays.ts` stay exactly as they are. The guide selects
  `micro` as the default for its attempt; it adds no new preset.
- **No analytics requirement.** Emitting a first-run event is allowed if it
  matches existing `initAnalytics` usage and carries no passage text, but it is
  not an acceptance criterion. Do not build a funnel.
- **No changes to the ledger, library, reconstruct, or align screens** beyond
  what is listed above (only Condense gains a micro default; only Home and
  Bootstrap gain first-run wiring).
- **No data-model changes.** No `DB_VERSION` bump, no new object store, no new
  `AttemptRecord` field. First-run state lives in the existing `settings`
  store; the demo attempt is an ordinary `AttemptRecord`.

### Two scope decisions, settled here so nobody re-litigates them

1. **`SEED_DEMO` and the walkthrough are mutually exclusive by design, and that
   is correct.** The seeded demo attempt is a completed (reconstructed)
   attempt, so it trips the first-run gate and the walkthrough does not show on
   a demo-seeded store. This is intended: `SEED_DEMO` exists to show a stranger
   the differentiator (the alignment) in the first minute, not the onboarding.
   The walkthrough is proven on a clean, unseeded store (the default in dev,
   test, and the e2e build). Both criteria are independently provable. Do not
   try to show both at once.
2. **The guide tracks one attempt, chosen robustly.** The guided micro-drill
   attempt's id is persisted in `settings`. If that id is missing but an
   in-progress attempt exists (for example the user started from the library
   instead of the guide), the guide tracks the most recent non-reconstructed
   attempt so it still walks the user to first success. The same-day guarantee
   and the warm-up attach specifically to the guided micro-drill attempt (the
   one vaulted with the `micro` delay).

---

## Non-goals (binding — a built non-goal is a defect)
- **No new mechanic and no new drill.** (Planner non-goals, restated.)
- **No shortening or faking the delay.** The micro delay stays a real
  15 minutes (`DELAY_PRESETS.micro`). No zero-delay path, no "reveal now"
  button, no way to reach the alignment without the wait actually elapsing.
- **No peeking.** The warm-up display never renders the vaulted passage's
  sentences. The vault guard is not weakened.
- **No quality score, streak, badge, or leaderboard** anywhere in the guide,
  nudge, or demo. (Plan binding condition 1 still holds.) The guide counts
  steps in a fixed checklist; three steps of a first loop is not a streak.
- **No accounts, no network call, no cloud.** Everything is local. The demo
  seed is a local write; no data leaves the device.
- **No new dependencies.** Plain React, existing store, existing tokens.
- **No onboarding essay, modal takeover, or tour library.** The guide is an
  inline card with one imperative per step. (Quality bar §4 and §7 together.)

---

## Technical design

### Stack and conventions (match what exists)
- TypeScript, React 18 function components, CSS Modules with tokens from
  `src/styles/tokens.css`. Reuse the global `btn`, `btn-primary`,
  `btn-secondary` classes and `EmptyState` / `ErrorState` / `Skeleton`.
- Persistence through `store.ts` helpers only; components never call `openDb`.
- All user and passage text renders as React text nodes (auto-escaped). Never
  `dangerouslySetInnerHTML`.
- Pure helpers take `now: number`; call `Date.now()` only at the component edge,
  as `Home.tsx`, `AttemptCard.tsx`, and `Condense.tsx` already do.
- Tests: Vitest + Testing Library colocated, `fake-indexeddb` for store tests,
  Playwright in `e2e/` at the 390px viewport.

### Data model: NO changes

`DB_VERSION` stays 1. No new fields, no new store. First-run state is two keys
in the existing `settings` store (via `getSetting`/`putSetting`):

- `firstRun.microDrillId`: `string` — the id of the guided micro-drill attempt,
  written when the guide starts it.
- `firstRun.dismissed`: `boolean` — written `true` when the user skips.

The demo attempt is a normal `AttemptRecord` written to `attempts`.

### First-run logic — `src/lib/firstRun.ts` (new)

Pure, deterministic, no I/O. This is where every gate and step decision lives so
it is unit-testable without a DOM.

```ts
import type { AttemptRecord } from "./db";

export const FIRST_RUN_DISMISSED_KEY = "firstRun.dismissed";
export const FIRST_RUN_MICRO_DRILL_KEY = "firstRun.microDrillId";

/** Fixed short seeds for the guided drill and its warm-up. Both must exist in
 *  seedPassages and be distinct. Verified by a test. */
export const MICRO_DRILL_PASSAGE_ID = "wilde-dorian-gray-preface";
export const WARMUP_PASSAGE_ID = "lincoln-gettysburg-address";

/** True once any attempt is reconstructed. The master switch: when true, no
 *  first-run surface shows, ever. */
export function hasCompletedAttempt(attempts: AttemptRecord[]): boolean;

export type StepState = "todo" | "active" | "done";

export interface GuideStep {
  label: string;      // one short imperative sentence (from the copy inventory)
  state: StepState;
}

export type GuideView =
  | { kind: "hidden" }
  | { kind: "start"; steps: GuideStep[] }                       // no drill yet
  | { kind: "condensing"; attemptId: string; steps: GuideStep[] }
  | { kind: "waiting"; attemptId: string; warmup: boolean; steps: GuideStep[] }
  | { kind: "ripe"; attemptId: string; steps: GuideStep[] };

export interface FirstRunInput {
  attempts: AttemptRecord[];
  microDrillId: string | undefined;   // from settings
  dismissed: boolean;                  // from settings
  now: number;
}

/**
 * The single source of truth for what the guide shows.
 * - Returns { kind: "hidden" } when dismissed OR hasCompletedAttempt(attempts).
 * - Otherwise resolves the tracked attempt: the microDrillId attempt if
 *   present, else the most recent non-reconstructed attempt (by createdAt),
 *   else none.
 * - With no tracked attempt -> "start".
 * - Tracked attempt by attemptState (reuse src/lib/attempts.ts):
 *     condensing -> "condensing"; vaulted -> "waiting"; ripe -> "ripe".
 *     ("reconstructed" cannot occur: it would make hasCompletedAttempt true.)
 * - warmup is true in "waiting" only when the tracked attempt's delayType is
 *   "micro" (a 3-day standard wait shows no warm-up).
 * - steps: exactly three GuideStep entries, labels from the copy inventory,
 *   with deterministic states:
 *     step 1 (note):    active while "start"/"condensing"; else "done".
 *     step 2 (warm-up): "todo" in "start"/"condensing"; "active" in "waiting";
 *                       "done" in "ripe".
 *     step 3 (rebuild): "todo" until "ripe"; "active" in "ripe".
 */
export function firstRunView(input: FirstRunInput): GuideView;

/** True when the populated-dashboard pipeline nudge should show: there is at
 *  least one attempt, and first-run is active (not dismissed, not completed). */
export function showPipelineNudge(
  attempts: AttemptRecord[],
  dismissed: boolean,
): boolean;
```

Reuse `attemptState` from `src/lib/attempts.ts` for ripeness; do not
reimplement the clock logic.

### Demo builder — `src/lib/demo.ts` (new)

Pure, deterministic. Builds one reconstructed `AttemptRecord` from a seed
passage and a canned imperfect rebuild, run through the real alignment engine so
the demo shows genuine marks.

```ts
import type { AttemptRecord } from "./db";

/** Stable id so a re-seed is idempotent even if the empty-store guard is
 *  bypassed. */
export const DEMO_ATTEMPT_ID = "demo-first-minute";

/** A reconstructed attempt with a real cached alignment that contains at least
 *  one omission and one addition (genuine gaps). now sets createdAt,
 *  reconstructedAt; vaultedAt/vaultedUntil are set in the past. */
export function buildDemoAttempt(now: number): AttemptRecord;
```

Reuse the worked-example prose so demo prose lives in one place: export
`EXAMPLE_SEED_ID` and keep `EXAMPLE_REBUILD` from `src/data/workedExample.ts`,
and build the demo from that seed's `sentences` plus `EXAMPLE_REBUILD`, aligned
with `alignSentences(passage.sentences, segmentSentences(EXAMPLE_REBUILD))`.
Fill `hints` with one short note per sentence (length equals
`passage.sentences.length`), `status: "reconstructed"`, `delayType: "micro"`,
`cursor` at the end, and `reconstructionText: EXAMPLE_REBUILD`. The existing
`getWorkedExample` already proves this alignment carries an omission and an
addition; a demo test re-asserts it.

### Store — `src/lib/store.ts` (extend; keep all existing helpers)

```ts
/**
 * Seeds the demo attempt for the SEED_DEMO staging demo. No-op when the store
 * already holds any attempt, so it never clobbers real user work and is
 * idempotent across restarts. now is passed in for testability.
 */
export async function seedDemoAttempt(now: number): Promise<void>;
```

Implementation: `if ((await countAttempts()) > 0) return;` then
`db.put("attempts", buildDemoAttempt(now))`. The existing `getSetting` /
`putSetting` cover the first-run settings keys; no new settings helper needed.

### Config — `src/lib/config.ts` (extend)

Add `seedDemo: boolean` to `AppConfig`, and `SEED_DEMO?: string` to
`RuntimeConfig`. Read it with the existing runtime-over-build precedence and the
placeholder guard, then parse to a boolean:

```ts
// Truthy tokens (case-insensitive): "1", "true", "yes", "on".
// Everything else, including "", "0", "false", is false.
function truthy(value: string): boolean { /* ... */ }

// in getConfig():
seedDemo: truthy(pick("SEED_DEMO", import.meta.env.VITE_SEED_DEMO)),
```

`pick` already returns "" when unset, so `seedDemo` defaults to `false` in dev,
test, and any deploy that does not set the flag.

### Container plumbing — `docker-entrypoint.sh` and `.env.example`

`docker-compose.staging.yml` already passes `SEED_DEMO` (default `"1"`), but the
entrypoint does not forward it to the browser. Add one line to the generated
`env-config.js`:

```sh
window.__APP_CONFIG__ = {
  UMAMI_URL: "${UMAMI_URL:-}",
  UMAMI_WEBSITE_ID: "${UMAMI_WEBSITE_ID:-}",
  SENTRY_DSN: "${SENTRY_DSN:-}",
  SEED_DEMO: "${SEED_DEMO:-}"
};
```

Add a commented placeholder to `.env.example` so local dev can opt in:

```
# Demo seed for staging. Set to 1 to open on a ready-made demo attempt.
# Leave blank for normal use.
# VITE_SEED_DEMO=
```

No secret is involved; this stays consistent with the existing runtime-config
pattern.

### Bootstrap — `src/components/Bootstrap.tsx` (extend)

After the DB opens successfully and before rendering children, seed the demo
when configured. Keep it non-fatal: a demo-seed failure must not block the app.

```ts
open()
  .then(async () => {
    if (getConfig().seedDemo) {
      try { await seedDemoAttempt(Date.now()); } catch { /* demo is optional */ }
    }
    return active && setState("ready");
  })
  .catch(() => active && setState("error"));
```

Because the seed is gated on an empty store, a returning real user is never
reseeded. The injectable `open` prop stays; tests that do not set `seedDemo`
seed nothing.

### First-run guide — `src/components/FirstRunGuide.tsx` (new) + `.module.css`

Presentational-plus-actions component rendered by `Home`. It receives the loaded
attempts and a reload callback; it reads its own settings and computes its view
with `firstRunView`.

Props:

```ts
interface FirstRunGuideProps {
  attempts: AttemptRecord[];   // already loaded by Home
  now: number;                 // Date.now() captured once by Home per render
  onChanged: () => void;       // ask Home to reload attempts after an action
}
```

Behavior:
- On mount (and after actions) load `FIRST_RUN_DISMISSED_KEY` and
  `FIRST_RUN_MICRO_DRILL_KEY` via `getSetting`. While loading settings, render
  nothing (the guide is additive; a one-frame absence is fine).
- Compute `view = firstRunView({ attempts, microDrillId, dismissed, now })`.
  Render nothing when `view.kind === "hidden"`.
- Render a card: a heading, the three-step checklist (each step shows its
  imperative label and a tick/active/idle marker reflecting `step.state`), the
  active-step action button, and a "Skip the guide" text button.
- **Actions:**
  - `start` (view `"start"`): create the micro-drill attempt from the fixed
    seed snapshot (`createAttempt`), `putSetting(FIRST_RUN_MICRO_DRILL_KEY,
    attempt.id)`, then `navigate('/condense/' + attempt.id)`. Guard against
    double taps with a `starting` flag; the button shows a busy label within
    100ms.
  - `"condensing"`: the action is a link "Keep noting" to
    `/condense/:attemptId`.
  - `"waiting"`: when `warmup` is true, render the **warm-up block** (below) and
    the live countdown `ripeLabel(vaultedUntil, now)`; the rebuild action is
    disabled/absent until ripe.
  - `"ripe"`: the action is a link "Rebuild now" to `/reconstruct/:attemptId`.
  - `skip` (every view): `putSetting(FIRST_RUN_DISMISSED_KEY, true)`, then
    `onChanged()` so Home re-renders without the guide.
- **Warm-up block:** heading "Warm-up reading", one line, then the
  `WARMUP_PASSAGE_ID` seed's sentences rendered read-only as a list. It never
  shows the vaulted passage. It has no input and writes nothing.
- The `start` view also offers the existing secondary links "Browse passages"
  (`/library`) and "See an example" (`/example`) as subordinate actions, so a
  new user who prefers the library still has it.

Accessibility: the checklist is a real `<ol>`; each step's state is conveyed by
text (for example a leading "Done" / "Now" label or `aria-label`), not by color
alone. The active action is one clear primary control; "Skip the guide" is a
visibly subordinate button. Touch targets ~44px.

### Home — `src/routes/Home.tsx` (extend)

- Capture `now` once (already does) and compute
  `completed = hasCompletedAttempt(attempts)`.
- **Empty store (`attempts.length === 0`):** if first-run is active (not
  dismissed), render `<FirstRunGuide .../>` as the primary surface. If the guide
  resolves to hidden (user skipped earlier), fall back to the existing
  `EmptyState` unchanged. The guide loads `dismissed` itself, so Home can always
  render the guide when the store is empty and let the guide decide; when the
  guide renders nothing, Home shows the `EmptyState`. Implementer's choice
  between (a) letting the guide report "hidden" up via `onChanged`/state or
  (b) Home reading `dismissed` too. Keep whichever is simplest; the observable
  rule is: empty store + not dismissed → guide; empty store + dismissed →
  `EmptyState`.
- **Populated store:** render the guide banner above the pipeline list (it shows
  itself only while first-run is active and hides once completed). Below or
  above the list, when `showPipelineNudge(attempts, dismissed)` is true, render
  the one-line **pipeline nudge**. Keep the dashboard uncluttered: the nudge is
  one short sentence, not a card competing with the guide.
- Nothing else about the pipeline list, ordering, or cap changes.

### Condense — `src/routes/Condense.tsx` (extend)

Default the delay chooser to `micro` for the guided micro-drill attempt so the
first session ends the same day. In the load `.then`, after the attempt loads,
read `getSetting<string>(FIRST_RUN_MICRO_DRILL_KEY)`; if it equals the loaded
attempt id, `setDelay("micro")`. Otherwise leave `DEFAULT_DELAY` ("standard").
The user can still change it (the chooser stays). This is the only Condense
change; the sentence-by-sentence capture and the vault guard are untouched.

### Routes and nav

No route or nav changes. The guide and nudge live inside the existing home
dashboard. `/example`, `/library`, `/condense`, `/reconstruct`, `/align`, and
`/ledger` are unchanged.

### Copy inventory (ships verbatim; already swept)

Guide heading: "Finish your first loop today".
Guide lede: "Note a short passage, pause a few minutes, then rebuild it. Your
first alignment lands today."
Steps: "Note each sentence in a few words.", "Read the warm-up while the vault
holds.", "Rebuild the passage and see your alignment."
Actions: "Start the quick drill", "Keep noting", "Rebuild now", "Skip the
guide", "Browse passages", "See an example".
Warm-up: "Warm-up reading", "Read this while your passage ripens. The wait
keeps your memory honest."
Pipeline nudge: "Condense a few passages so one is always ripe when you come
back."
Step status labels (for screen readers / non-color cues): "Done", "Now",
"Next".

Countdown text reuses `ripeLabel` (for example "Ripe in 12 minutes", "Ready"),
already swept in `src/lib/attempts.ts`. The demo attempt reuses existing
`AttemptCard` copy and the real passage title; it introduces no new strings.

`src/test/copy-sweep.test.ts` scans every new `src` file automatically. Every
string above is free of em/en dashes, banned LLM vocabulary, and negative
empty-state phrasing. Keep it green.

---

## QUALITY BAR application (binding on the new surfaces)

- **Perceived speed.** The guide reads two settings keys and renders
  synchronously off attempts Home already loaded. "Start the quick drill" and
  "Skip the guide" show a busy/updated state within 100ms. The demo seed is one
  local `put` gated on an empty store; it adds no visible delay to first render
  (Bootstrap already shows a skeleton while opening). No new unbounded lists;
  the warm-up renders one short seed passage (≤3 sentences).
- **Mobile-first (390px).** The guide card, checklist, warm-up block, and nudge
  stack to one column with no horizontal scroll; buttons and step rows are
  ~44px targets. The e2e viewport is 390px; keep it green.
- **Designed states.** The guide IS a designed first-run surface. The empty
  state after a skip falls back to the existing designed `EmptyState`. The
  warm-up block gives the wait a purpose instead of a bare countdown.
- **First-run (this EPIC is the clause).** The guide actively walks a brand-new
  user through the core action once: three steps, each one short imperative
  anchored to the real control, skippable at every step, shown only until the
  first success, and never to a returning user (gate: `hasCompletedAttempt`).
  The micro-drill makes the first success reachable the same day. §4 and §7 are
  met together: the guide points at controls, it does not lecture.
- **Security hygiene.** No server, no network call, no new route. All passage
  and warm-up text renders as escaped React text nodes. The vault guard is not
  weakened; the warm-up never renders the vaulted passage. `SEED_DEMO` is a
  non-secret display flag read from runtime config like the others; no PII, no
  key, nothing logged.
- **Accessibility.** The checklist is a semantic `<ol>` with text status cues
  (not color alone), one clear primary action per state, a labeled subordinate
  "Skip the guide", visible focus via existing global styles, full keyboard
  reach.
- **Copy.** Every new string is in the inventory above and swept: no em/en
  dashes, no banned vocabulary, no negative phrasing. Positive, plain, one idea
  per sentence.

---

## Ordered task list (each item is provable)

1. **Config: `seedDemo`.** Extend `src/lib/config.ts` with `seedDemo` and the
   `truthy` parser; extend `docker-entrypoint.sh` and `.env.example`.
   - AC: `getConfig().seedDemo` is `false` when nothing is set; `true` for
     runtime `SEED_DEMO` in {"1","true","yes","on"} (case-insensitive); `false`
     for "", "0", "false", and an uninterpolated `${SEED_DEMO}` placeholder;
     runtime beats build env, matching the existing precedence.

2. **First-run logic.** `src/lib/firstRun.ts` with constants,
   `hasCompletedAttempt`, `firstRunView`, `showPipelineNudge`.
   - AC: `hasCompletedAttempt` is true iff some attempt is `reconstructed`.
   - AC: `firstRunView` returns `hidden` when dismissed or when any attempt is
     reconstructed; `start` with no tracked attempt; `condensing`/`waiting`/
     `ripe` matching the tracked attempt's `attemptState`; falls back to the
     most recent non-reconstructed attempt when `microDrillId` is unset; sets
     `warmup` true only for a `micro`-delay waiting attempt; returns exactly
     three steps with the documented deterministic states; same input twice
     gives identical output.
   - AC: `MICRO_DRILL_PASSAGE_ID` and `WARMUP_PASSAGE_ID` both exist in
     `seedPassages`, are distinct, and are `short` band (assert against the
     seed data).

3. **Demo builder + store seed.** `src/lib/demo.ts` (`buildDemoAttempt`,
   `DEMO_ATTEMPT_ID`) and `seedDemoAttempt` in `src/lib/store.ts`.
   - AC: `buildDemoAttempt(now)` returns a `reconstructed` attempt whose cached
     alignment has at least one `omission` and one `addition`, with
     `hints.length === passage.sentences.length`, a non-empty
     `reconstructionText`, and finite `reconstructedAt`/`vaultedAt`/
     `vaultedUntil`; deterministic for a fixed `now`.
   - AC (fake-indexeddb): `seedDemoAttempt` on an empty store adds exactly one
     attempt (`hasCompletedAttempt(listAttempts())` becomes true); called again,
     or on a store that already has any attempt, it adds nothing.

4. **Bootstrap seeding.** Wire `seedDemoAttempt` into `src/components/Bootstrap.tsx`
   behind `getConfig().seedDemo`.
   - AC: with `seedDemo` true and an empty store, after bootstrap the store
     holds the demo attempt; with `seedDemo` false, nothing is seeded; a
     seed failure does not put Bootstrap into the error state.

5. **First-run guide component.** `src/components/FirstRunGuide.tsx` + css.
   - AC: with an empty store and not dismissed, renders the heading, three
     imperative steps, and "Start the quick drill"; clicking it creates an
     attempt, persists `firstRun.microDrillId`, and navigates to
     `/condense/:id`.
   - AC: for a tracked `vaulted` `micro` attempt, renders the warm-up block
     (the `WARMUP_PASSAGE_ID` sentences, never the vaulted passage) and a
     countdown, with no active rebuild link; for a `ripe` attempt, renders
     "Rebuild now" to `/reconstruct/:id`.
   - AC: "Skip the guide" persists `firstRun.dismissed` and the guide
     disappears; the guide renders nothing when any attempt is reconstructed.

6. **Home wiring + pipeline nudge.** `src/routes/Home.tsx`.
   - AC: empty store + not dismissed shows the guide; empty store + dismissed
     shows the existing `EmptyState`; a populated first-run store shows the
     pipeline nudge line; once an attempt is reconstructed, neither the guide
     nor the nudge renders and the pipeline list is unchanged.

7. **Condense micro default.** `src/routes/Condense.tsx`.
   - AC: when the loaded attempt id equals the persisted
     `firstRun.microDrillId`, the delay chooser defaults to "In 15 minutes"
     (`micro`); for any other attempt it defaults to "In 3 days" (`standard`);
     existing Condense tests stay green.

8. **E2E + sweep.** Extend `e2e/smoke.spec.ts`; run the full suite.
   - AC (clean store, 390px): the home dashboard shows "Finish your first loop
     today" and "Start the quick drill"; clicking it opens `/condense/`; the
     delay chooser shows "In 15 minutes" selected; after vaulting with the
     micro delay the dashboard guide shows "Warm-up reading" and a countdown;
     "Skip the guide" removes the guide and a reload keeps it gone. No
     horizontal scroll.
   - AC (`SEED_DEMO` via `page.addInitScript` setting
     `window.__APP_CONFIG__ = { SEED_DEMO: "1" }` before load, 390px): the home
     dashboard shows a demo attempt card with "See alignment"; following it
     lands on `/align/` with the legend ("In the original" / "In yours") and at
     least one `mark`. No horizontal scroll.
   - AC: `npm test` including `copy-sweep.test.ts` passes.

---

## Test plan (which test proves each planner criterion)

**Criterion 1 (guided path, 2 to 4 steps, imperative, anchored, skippable,
only until first success, never for returning users):** `firstRun.test.ts` pins
`firstRunView` (three steps, deterministic states, hidden when dismissed or
completed) and `hasCompletedAttempt`. `FirstRunGuide.test.tsx` proves the
rendered steps are imperative labels from the inventory, the active action
navigates to the real control, "Skip the guide" persists dismissal and hides
the guide, and a reconstructed attempt hides it. The e2e proves the visible
walk at 390px and that skip survives a reload.

**Criterion 2 (micro-drill: short passage, minutes-long real delay filled by a
distractor, session ends in an alignment the same day):** `firstRun.test.ts`
asserts the drill passage is a short seed and that a `micro`-delay waiting view
carries the warm-up. `FirstRunGuide.test.tsx` asserts the warm-up block renders
the warm-up passage (and never the vaulted one) plus a countdown, and that the
ripe view links to reconstruct. A unit assertion pins
`DELAY_PRESETS.micro.ms < 24 * 60 * 60 * 1000` and that the guided attempt
defaults to `micro` in `Condense.test.tsx`, which together prove the delay is
real yet lands the alignment the same day. The reconstruct → align leg itself
is already covered by `Reconstruct.test.tsx` and the existing alignment e2e; the
e2e does not wait a real 15 minutes (stated here so no reviewer expects it).

**Criterion 3 (dashboard nudges building a pipeline, brief hint not a
lecture):** `firstRun.test.ts` pins `showPipelineNudge`. `Home.test.tsx`
asserts the one-line nudge appears on a populated first-run dashboard and is a
single short sentence, and that it disappears once an attempt is reconstructed.

**Criterion 4 (`SEED_DEMO` opens on demo state reaching the alignment within a
minute, no hand-crafted input):** `config.test.ts` pins `seedDemo` parsing.
`demo.test.ts` proves `buildDemoAttempt` yields a reconstructed attempt with a
real alignment carrying genuine gaps. `store.test.ts` proves `seedDemoAttempt`
idempotency and empty-store gating. `Bootstrap.test.tsx` proves seeding happens
only when `seedDemo` is true and the store is empty. The e2e proves the seeded
app opens on a demo card and reaches `/align/` in one tap with a visible mark.

**Criterion 5 (none of the first-run additions appear once an attempt is
completed):** `firstRun.test.ts` (`firstRunView` hidden, `showPipelineNudge`
false when a reconstructed attempt exists) and `Home.test.tsx` (guide and nudge
both absent, list intact) prove it directly.

Commands: `npm test` (Vitest, includes the copy sweep), `bash scripts/e2e.sh`
(Playwright in the pinned container). Both must pass before the run ends.

---

## Notes for the implementer

- The delay stays real. Do not add a shortcut past the wait. The micro preset
  is already 15 minutes in `src/lib/delays.ts`; reuse it, do not change it, do
  not add a preset.
- The warm-up is reading material, not a drill. It has no input, computes
  nothing, writes nothing, and never renders the vaulted passage.
- One master gate: `hasCompletedAttempt`. Once any attempt is reconstructed,
  the guide, the warm-up, and the nudge are all gone. The seeded `SEED_DEMO`
  attempt is reconstructed, so it correctly suppresses the walkthrough. Prove
  the walkthrough on a clean store.
- Keep first-run state in the `settings` store. `DB_VERSION` stays 1; add no
  `AttemptRecord` field and no object store.
- Derive ripeness with `attemptState` from `src/lib/attempts.ts`; pass `now`
  in. Do not reimplement the clock.
- Reuse the worked-example prose for the demo so demo text lives in one place;
  export `EXAMPLE_SEED_ID` from `workedExample.ts` rather than copying prose.
- Keep the dashboard radically simple. The guide and nudge are additive and
  quiet; one primary action per state, one short sentence for the nudge. If the
  copy starts explaining the layout, fix the layout.
- Keep every string from the copy inventory verbatim or re-sweep anything you
  change. The sweep test scans every new `src` file automatically.
