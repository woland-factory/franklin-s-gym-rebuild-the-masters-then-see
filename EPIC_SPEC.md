# EPIC SPEC — Polish: honest confrontation, everywhere, on every device

Franklin's Gym: rebuild the masters, then see your gaps in color.

This is a UX, performance, accessibility, and copy pass over the whole delivered
product. It ships **no new features and no new mechanics**. The loop is already
built and works end to end: browse or paste a passage, condense it sentence by
sentence into hints, vault it behind a real delay, rebuild it from the hints
alone, and see a deterministic sentence-by-sentence alignment against the fixed
original. This EPIC tightens what exists so the product clears the QUALITY BAR
on every screen and so its one differentiator lands cleanly for every user,
including color-blind and keyboard-only ones.

The single most important change is in the alignment view. Today the marks that
show what you kept and what you dropped are carried by **background color
alone**. The product's whole claim is "see your gaps in color", and for a
color-blind user that claim currently fails. Fixing it is the heart of this
polish pass.

---

## Quality differentiator (this app must win here)

**Incorruptible, instant confrontation.** The product wins on the honesty and
precision of a deterministic sentence-by-sentence diff against a fixed original,
computed in seconds. Paper cannot collate without tedium. A chatbot flatters and
lets the original leak from scrollback. We win on the honesty and precision of
the feedback.

**What it demands of THIS EPIC:** the confrontation must be honest, precise, and
legible to everyone, in the first minute, on a phone.

- **Legible to everyone.** The marks must read as differences for a color-blind
  user, not just a full-color one. Right now the word-level marks in a matched
  pair and the two legend swatches distinguish "in the original" from "in yours"
  by hue only. That is a direct miss against the planner's accessibility
  criterion and against the product's own name. The alignment marks must be
  conveyed by more than color: a shape, pattern, underline, or text cue that
  survives without color perception.
- **Honest, never a verdict.** The confrontation shows *differences*, not
  *worseness*. Keep the neutral two-hue palette (no red/green, no
  good/bad coding), the neutral per-pair length line, and the "differences
  only" guarantee the existing `AlignmentView` test already pins. Any non-color
  cue added here must stay neutral: a pattern that reads as "this differs", never
  a cross, an X, a warning icon, or anything that reads as "wrong".
- **Instant and steady.** The alignment computation must show in-place progress
  and never flash a white screen on the way to the result. It already computes
  in well under a second on a 40×40 grid; this pass proves the transition holds
  the layout and gives feedback within 100ms.

---

## Scope

### In scope (refine only; touch nothing else)

1. **Non-color alignment marks** in `src/components/AlignmentView.tsx` and its
   CSS: every mark (word-level marks inside matched pairs, and the single-side
   omission/addition blocks) carries a non-color cue in addition to its hue, and
   the legend shows that same cue beside each label. The two sides stay visually
   distinct without color. Neutral throughout.
2. **Designed error paths on the "start / save" actions** that currently fail
   silently: `Library` start, `PastePassage` start, `FirstRunGuide` start,
   and `Condense` vault. A failed tap must say, in the product's voice, what to
   do next, instead of resetting a spinner and looking dead.
3. **Keyboard-visible skip link** in `AppLayout`: the "Skip to content" link
   becomes visible when focused, so a keyboard user can see and use it.
4. **A 390px mobile and accessibility sweep** across every route
   (`/`, `/library`, `/ledger`, `/condense/:id`, `/reconstruct/:id`,
   `/align/:id`, `/example`, 404): no horizontal scroll, ~44px touch targets,
   labeled controls, semantic headings and landmarks, full keyboard reach,
   sufficient contrast, visible focus. Fix any concrete miss found; change
   nothing that already passes.
5. **A copy sweep** over every user-visible string (the mechanical sweep test
   already guards dashes, banned vocabulary, and negative phrasing; keep it
   green and fix anything it or a manual read surfaces).
6. **A README verification** pass: the run commands must match the actual
   `Dockerfile`, `docker-entrypoint.sh`, and compose files, and the copy must
   carry no factory internals. Correct any drift.
7. **A perceived-speed verification** of the reconstruct → align transition: the
   submit button shows progress within 100ms and the align route holds its
   layout with a skeleton, with no white flash.

### Out of scope (binding)

- **No new features. No new mechanics. No new drills.** (Planner non-goals.)
  Condense, vault, reconstruct, and the alignment engine (`src/lib/align.ts`)
  keep their exact behavior and output. This pass changes presentation,
  resilience, and copy, never what the loop computes or stores.
- **No data-model change.** `DB_VERSION` stays 1. No new object store, no new
  `AttemptRecord` field, no migration.
- **No new dependencies.** Plain React, existing tokens, existing components.
- **No re-theming or redesign.** Keep the current type scale, spacing, radii,
  and the two neutral mark hues. This is a correction pass, not a restyle. Do
  not introduce animations, a design system, or new color families.
- **No new routes, nav items, or screens.** No settings screen. The two delay
  presets in `src/lib/delays.ts` stay exactly as they are.
- **No change to the first-run guide, demo seed, ledger metrics, charts, or
  import/export logic** beyond the error-path, mobile, a11y, and copy fixes
  named above. Their mechanics are done and out of scope.
- **No verdict coding anywhere.** No red/green, no score, no streak, no badge,
  no "better/worse". The alignment stays a mirror, not a grade.

---

## Non-goals (a built non-goal is a defect)

- **No new mechanic and no new drill.** (Planner non-goals, restated.)
- **No good/bad or right/wrong signaling in the marks.** The non-color cue is a
  neutral pattern that means "this text differs". It is never a warning glyph, a
  strike-through that reads as "deleted-and-wrong", a checkmark, or a color that
  codes quality. The existing test that forbids "better/worse/wrong/…/score/
  grade" in the alignment stays green.
- **No weakening of the vault guard.** The reconstruct and condense screens never
  render a vaulted original; this pass does not touch that path.
- **No content rewrite of the public-domain passages.** Seed passage bodies are
  the authors' own words and are exempt from the copy sweep (as the sweep test
  already encodes). Only app chrome copy is in scope.
- **No speculative accessibility scaffolding.** Add the specific cues the
  criteria require on the surfaces that miss them. Do not add ARIA to elements
  that are already correct, and do not add a live-region framework.

---

## Technical design

### Stack and conventions (unchanged)

TypeScript, React 18 function components, CSS Modules with tokens from
`src/styles/tokens.css`, global `btn` / `btn-primary` / `btn-secondary` classes,
and the shared `EmptyState` / `ErrorState` / `Skeleton` primitives. Persistence
through `src/lib/store.ts` helpers only. All user and passage text renders as
escaped React text nodes; never `dangerouslySetInnerHTML`. Pure helpers take
`now`; `Date.now()` is called only at the component edge. Tests: Vitest +
Testing Library colocated, `fake-indexeddb` for store tests, Playwright in `e2e/`
at a 390px viewport.

### 1. Non-color alignment marks — `AlignmentView.tsx` + `AlignmentView.module.css`

Current state (`src/components/AlignmentView.tsx`, `AlignmentView.module.css`):
a differing word renders as `<mark class="mark markOriginal|markYours">` whose
only distinguishing signal is `background: var(--color-mark-original | -yours)`.
The legend (`aria-label="What the marks mean"`) shows two `.swatch` squares that
are pure color plus the text "In the original" / "In yours". A color-blind or
low-vision user cannot reliably tell a marked word from an unmarked one, nor one
side's hue from the other's.

Required change (keep it neutral and minimal):

- **Add a non-color cue to every mark, distinct per side.** Give
  `.markOriginal` and `.markYours` two different, non-color treatments that both
  read as "this text differs" and are distinguishable from each other and from
  plain text without color. A sturdy, honest choice: a solid underline for one
  side and a dotted (or double) underline for the other, using
  `text-decoration` / `text-underline-offset` so the cue rides the text and
  survives at 390px. The cue must not read as a verdict (no strike-through, no
  color-coded good/bad). Keep both mark backgrounds as the existing neutral
  tints; the underline is additive, not a replacement, so full-color users see
  exactly what they see today plus a subtle pattern.
- **Reflect the cue in the legend.** Each legend item shows the same per-side
  pattern next to its text label, not a bare color square, so the key itself is
  legible without color. The legend text ("In the original", "In yours") stays.
- **Verify mark contrast.** Confirm the marked text keeps sufficient contrast
  against its tint in both light and dark themes (the mark text uses
  `--color-text` on the tint). Adjust the tint or text token only if a real
  contrast miss is found; do not restyle otherwise.
- **Keep the single-side blocks consistent.** The omission ("Only in the
  original") and addition ("Only in yours") blocks already carry a text label
  that names the side, so they are not color-only; apply the same per-side mark
  pattern to their `<mark>` for visual consistency.
- **Provability.** Add a `data-side="original" | "yours"` attribute (or an
  equivalent stable hook) to each `<mark>` and to each legend swatch so a test
  can assert that both sides are distinguished by a non-color attribute, not
  only by class-driven color. Extend `AlignmentView.test.tsx` to assert:
  (a) marked words carry the per-side non-color hook; (b) the legend exposes the
  same per-side hook; (c) the existing "never claims one version is better" and
  two-side-labeled assertions still pass.

This is the differentiator surface, so it is held to the differentiator, not
just the baseline: the fix must be honest (differences, never worseness),
precise (every marked word and both legend keys), and legible without color.

### 2. Designed error paths on start/save actions

Four actions today catch a storage failure and only reset a busy flag, leaving
the user on a dead-looking tap with no next step:

- `src/routes/Library.tsx` `start()` — `catch { setStarting(false); }`.
- `src/components/PastePassage.tsx` — its start path (same shape).
- `src/components/FirstRunGuide.tsx` `startDrill()` — `catch { setStarting(false); }`.
- `src/routes/Condense.tsx` `confirmVault()` — `catch { setVaulting(false); }`.

For each, surface an in-voice, positive, actionable message on failure instead
of a silent reset. Reuse the wording already used elsewhere for the same cause
("This device blocked the save. Allow storage, then try again." matches
`Reconstruct.tsx`). Render it inline near the action with `role="alert"` and
clear it on the next attempt. Do not add a new component or a global toast; a
local inline message string beside the button is enough and matches the existing
`Reconstruct`/`Ledger` inline-message pattern. This satisfies the QUALITY BAR
"error states are designed surfaces" clause on the start/save paths that
currently miss it, without touching the happy path.

Keep the messages swept: positive, plain, one idea per sentence, no dash-aside,
no banned vocabulary.

### 3. Keyboard-visible skip link — `AppLayout.tsx` + `AppLayout.module.css`

The skip link is `<a href="#main" class="visually-hidden">Skip to content</a>`.
`visually-hidden` keeps it clipped even on focus, so a keyboard user never sees
it. Add a focus-reveal: on `:focus` / `:focus-visible` the link un-clips to a
visible, positioned control (top-left, above the sticky header's z-index) with
the existing focus outline, then re-hides on blur. Use a small CSS-module class
on the link plus a `:focus-visible` rule; do not change the link text or target.
`#main` already exists on the `<main>` landmark.

### 4. Mobile 390px + accessibility sweep (every route)

Audit each route at a 390px viewport and fix concrete misses only. Known-good
baselines to preserve (do not "improve" them):

- `AppLayout` header is sticky with a max-width container and ~44px nav targets;
  the main content pads to `--container-max` and centers.
- `AlignmentView` `.pairGrid` is two columns that collapse to one at
  `max-width: 640px`, and `.sentence` uses `overflow-wrap: anywhere`, so long
  words and side-by-side sentences do not scroll sideways at 390px.
- `TrendChart` measures its container with a `ResizeObserver` and renders inline
  SVG at native text size, with `role="img"` and a one-sentence `aria-label`.
- `Skeleton` announces via `role="status"`; `ErrorState` uses `role="alert"`;
  the condense/reconstruct textareas are labeled with real `<label htmlFor>`;
  the delay chooser is a `<fieldset>`/`<legend>` with radio labels; the library
  filters are a labeled `role="group"` with `aria-pressed`.

Check specifically for, and fix if present: any fixed pixel width or `min-width`
that exceeds ~358px of content at 390px; any multi-column grid (library cards,
ledger, file actions, guide steps) that does not stack or wrap on a narrow
screen; any touch target under ~44px on a primary or secondary action; any
interactive control reachable only by mouse; any input without an associated
label; any heading level skipped within a screen; any meaningful image without
alt text. Report in the run summary exactly what was changed and what was
already compliant. Do not restyle compliant screens.

**Confirmed misses to fix (found in the audit; each is a specific, named gap):**

- **Ledger import control has no visible focus indicator.** In
  `src/routes/Ledger.tsx` the `ImportControl` hides the real `<input type="file">`
  with `className="visually-hidden"`, so its `:focus-visible` outline is clipped
  and the styled `<label>` wrapper receives no focus style. A keyboard user
  tabbing to Import / Restore sees nothing. Fix: give the `<label>` a
  `focus-within` treatment (the existing focus outline) so the control shows a
  visible focus ring when the hidden input is focused. Do not un-hide the input;
  do not change its behavior.
- **Full-screen `ErrorState` starts at `<h2>`, leaving those pages with no
  `<h1>`.** `src/components/ErrorState.tsx` renders its title as `<h2>`. When it
  is the whole screen (the Home, Ledger, Align, Condense, Reconstruct error and
  not-found paths), the page has no `<h1>`, so the heading hierarchy skips the
  top level. Fix so an error page has a single `<h1>`: promote the ErrorState
  title to `<h1>` (it is always the page's top heading in every current use),
  keeping `role="alert"` on the region. Verify no screen ends up with two `<h1>`s
  after the change.
- **Primary nav has no current-page indicator.** In
  `src/components/AppLayout.tsx` the Library and Ledger nav links carry no
  `aria-current` and no active style. Add `aria-current="page"` (via
  `NavLink` from `react-router-dom`, already a dependency, or an equivalent) and
  a subtle active style so the current section is conveyed to sighted and
  assistive-tech users. Keep it subtle; the nav stays visibly subordinate to the
  page's primary action.
- **Secondary `<Link>` in `EmptyState` is not visibly subordinate (cosmetic,
  optional).** `EmptyState.module.css` `.secondary` styles only
  `:global(button)`, so a secondary rendered as an `<a>` (Home's "See an
  example") renders as a plain accent link, not a subordinate control. If a
  quick CSS-only fix makes it match, apply it; otherwise leave it and note it.
  This is a nicety, not a bar miss.

### 5. Copy sweep (every user-visible string)

The mechanical sweep (`src/test/copy-sweep.test.ts`) already scans all
`src/**/*.{ts,tsx,css}` and `README.md` for em/en dashes, the banned LLM
vocabulary list, and negative empty-state phrasing, exempting `seedPassages.ts`
and test files. Keep it green. In addition, read every app-chrome string once
for tone: positive and direct, plain, one idea per sentence, no register
inflation. Fix any hit in the same run and re-run the sweep.

**Confirmed copy to fix (negative "did not / is not" error titles).** The
planner criterion asks for positive, plain phrasing that says what to do, not
what failed. These error titles state the failure; rewrite them to say the next
step, keeping the existing (already-positive) message body:

- `src/routes/Home.tsx` `title="Your attempts did not load"` → a positive title
  such as `"Reload your attempts"`.
- `src/routes/Ledger.tsx` `title="Your ledger did not load"` → `"Reload your
  ledger"`.
- The shared not-found title `"That attempt is not here"` (in `Align.tsx`,
  `Condense.tsx`, `Reconstruct.tsx`) → a positive title such as `"Start a fresh
  attempt"`, which matches the message body ("It may have been removed. Start a
  fresh one from your attempts.").

These rewrites are examples the implementer may adopt or improve; whatever ships
must be swept (no dash-aside, no banned vocabulary, positive and plain) and must
still name the real next step. Do not expand the mechanical banned list unless a
real recurring tell justifies it; if so, note it in the run summary.

### 6. README verification

`README.md` must let a stranger understand, run, and contribute. Verify the
commands against the real files, not from memory: `npm install` / `npm run dev`;
`docker build -t franklins-gym .` and `docker run --rm -p 8080:80 franklins-gym`
against the actual `Dockerfile`; the `UMAMI_URL` / `UMAMI_WEBSITE_ID` /
`SENTRY_DSN` / `SEED_DEMO` runtime env against `docker-entrypoint.sh`; the
`docker-compose.staging.yml` reference; `npm test`, `bash scripts/e2e.sh`, and
`npm run build && npm run check:size`. Correct any command, path, or flag that
does not match. Confirm no factory internals (agent names, task types, internal
service paths) appear. The current README reads accurate; this task is to prove
each command against the files and fix drift, not to rewrite it.

One confirmed drift to fix (a comment, so exempt from the copy sweep, but
factually wrong now): `docker-compose.staging.yml` still comments the
`SEED_DEMO` line with "This release implements no demo behavior". The demo was
delivered in the prior EPIC (`seedDemoAttempt`, the `SEED_DEMO` runtime flag, and
`docker-entrypoint.sh` forwarding it). Update that comment to describe the real
behavior (set the flag to open on a ready-made demo attempt) so the deploy
manifest does not mislead. Do not change the value or the entrypoint.

### 7. Perceived-speed verification of reconstruct → align

`Reconstruct.tsx` computes the alignment synchronously (a ≤40×40 grid, sub-second)
inside `submit()`, shows the button label "Aligning" while `saving` is true, and
navigates to `/align/:id`, which renders `<Skeleton lines={6}>` until the record
loads. This already avoids a white flash. This task proves it: an e2e/component
assertion that submitting a rebuild shows a busy/progress control within 100ms
and that the align route holds a layout-steady skeleton (not a blank screen)
before the marks appear.

One sharpening: `submit()` sets `saving` and then runs `alignSentences(...)`
synchronously in the same handler, so the "Aligning" label is not guaranteed to
paint before the compute blocks the main thread. The grid is small so this is
usually invisible, but to honor the "feedback within 100ms" clause reliably, let
the busy state paint before the synchronous work runs (for example yield once to
the event loop after `setSaving(true)` and before `alignSentences`, or move the
compute behind a microtask/`requestAnimationFrame`). Keep it minimal and add no
artificial delay. If any real white-flash or missing-feedback gap is found on the
transition, close it with an in-place progress indicator, not a spinner with no
layout.

### First meaningful render

`index.html` ships a static shell and loads `env-config.js` before the module
bundle; `AppLayout` paints the header immediately and `Bootstrap` shows a
skeleton while IndexedDB opens. Confirm the first meaningful paint is content
(header + skeleton), not a blank page, within ~1s. No code change expected
unless a real regression is found.

---

## Ordered task list (each item is provable)

1. **Non-color alignment marks.** Update `AlignmentView.tsx` and
   `AlignmentView.module.css` so each mark and each legend key carries a
   per-side, non-color cue distinct from plain text and from the other side, and
   add the `data-side` (or equivalent) hook.
   - AC: in the rendered alignment, a marked word and the legend key for each
     side expose a stable non-color hook identifying the side; a test asserts
     both sides are distinguishable without relying on the color class.
   - AC: the marks stay neutral — the existing `AlignmentView.test.tsx`
     assertions (two labeled sides, neutral length line, and the "never claims
     one version is better" regex over `better|worse|wrong|right|missed|failed|
     lost|score|grade`) all still pass.
   - AC: at 390px the cue is visible and causes no horizontal scroll; the
     matched-pair grid still collapses to one column.

2. **Designed error paths.** Add an in-voice inline error on failure to
   `Library.start`, `PastePassage` start, `FirstRunGuide.startDrill`, and
   `Condense.confirmVault`.
   - AC: when the underlying store call rejects, each surface shows a positive,
     actionable `role="alert"` message and re-enables its action, instead of
     silently resetting; a test forces the rejection and asserts the message
     appears. The happy path is unchanged (existing tests stay green).

3. **Keyboard-visible skip link.** Reveal the `AppLayout` skip link on focus.
   - AC: the "Skip to content" link is clipped by default and becomes a visible,
     focus-outlined control when focused via keyboard; activating it moves focus
     to `#main`. A test asserts the link is present, targets `#main`, and is not
     permanently `visually-hidden` (has a focus-reveal class/rule).

4. **Mobile + a11y sweep.** Walk every route at 390px; fix concrete misses only,
   including the four confirmed ones: the Ledger import control focus indicator,
   the full-screen `ErrorState` `<h1>`, the primary-nav current-page indicator,
   and (optionally) the `EmptyState` secondary-link styling.
   - AC: at 390px no route scrolls horizontally; every primary and secondary
     action is a ~44px target; every input has a label; headings are ordered
     (each screen has exactly one `<h1>`, including error pages) and landmarks
     present; every interactive element is keyboard reachable with a visible
     focus state (the Ledger import control included); the current nav item
     carries `aria-current="page"`. The e2e asserts no horizontal scroll on each
     route; the run summary lists what changed and what was already compliant.

5. **Copy sweep.** Keep `copy-sweep.test.ts` green, rewrite the three negative
   error titles to positive phrasing, and read every chrome string for tone.
   - AC: the "did not load" / "is not here" error titles are replaced with
     positive, swept titles that still name the next step; `npm test` including
     `copy-sweep.test.ts` passes; the summary states that every touched string
     was swept for dashes, banned vocabulary, and negative phrasing.

6. **README verification.** Prove each command against the real files; fix drift.
   - AC: every command in `README.md` matches the `Dockerfile`,
     `docker-entrypoint.sh`, compose file, and `package.json` scripts; no factory
     internals appear; the run and test sections are accurate.

7. **Perceived-speed proof.** Assert the reconstruct → align transition gives
   feedback within 100ms and holds a skeleton with no white flash.
   - AC: a test asserts the submit control shows a busy/progress state on click
     and that `/align/:id` renders a layout-holding skeleton before the marks;
     no artificial delay is added.

8. **Full suite green.** Run `npm test` and `bash scripts/e2e.sh` to completion.
   - AC: both suites pass; `npm run build && npm run check:size` stays within
     the bundle budget (no new dependency, no material size regression).

---

## Test plan (which test proves each planner criterion)

**Criterion — every screen usable at 390px, no horizontal scroll, ~44px targets,
readable text:** the Playwright suite (`e2e/`) runs at a 390px viewport and, for
each route, asserts `document.scrollingElement.scrollWidth <= clientWidth` (no
horizontal scroll) and that the primary action is tappable. Component tests keep
the labeled controls and ~44px `btn`/`navLink` targets pinned. Task 4 AC.

**Criterion — empty, loading, and error states designed on every screen:** the
existing `Skeleton` (loading), `ErrorState` (error), and `EmptyState` (empty)
primitives are already used across Home, Ledger, Library, Condense, Reconstruct,
and Align; their component tests stay green. Task 2 adds the missing designed
error surfaces on the start/save actions, proven by tests that force a store
rejection and assert the in-voice `role="alert"` message. Task 7 proves the
loading state holds the layout on the reconstruct → align transition.

**Criterion — perceived speed (first render ~1s, feedback within 100ms,
alignment shows in-place progress and never flashes white, lists capped):** Task
7 proves the align transition (busy label within 100ms, skeleton holds, no white
flash). Home caps its pipeline at 50 and Ledger paginates at 20 with a "Show
more" and caps the trend at 60; their tests keep those caps pinned. The align
engine's sub-second bound is documented in `align.ts` and covered by
`align.test.ts`.

**Criterion — accessibility (contrast, focus, labeled inputs, semantic headings
and landmarks, keyboard reach, alt text; marks conveyed by more than color):**
Task 1 delivers and tests the non-color marks and legend (the core of this
criterion for this product). Task 3 delivers and tests the keyboard-visible skip
link. Task 4 fixes and asserts any remaining label/heading/landmark/keyboard/
contrast miss. Component tests assert the labeled textareas, the fieldset/legend
delay chooser, the labeled filter group, the `role="img"` charts, and the
`role="status"`/`role="alert"` state surfaces.

**Criterion — copy sweep (no dashes, no banned vocabulary, no negative
phrasing; positive, plain, one idea per sentence):** `copy-sweep.test.ts` scans
all `src/**/*.{ts,tsx,css}` and `README.md` mechanically and must stay green
(Task 5); the manual tone read fixes anything mechanical rules miss.

**Criterion — differentiator verifiably present: the confrontation is reachable
in the first minute and reads as honest (differences, not worseness):** the
worked example at `/example` (`WorkedExample.tsx`) reaches a real alignment in
one tap with no wait, and `SEED_DEMO` opens straight onto a demo alignment; the
e2e reaches `/align`-style marks in one navigation. `AlignmentView.test.tsx`
pins that the view states differences only and never codes worseness, and Task 1
adds the non-color-cue assertions so the confrontation is legible to every user.

**Criterion — README lets a stranger understand, run (exact commands verified
against the compose files), and contribute; no factory internals:** Task 6
verifies every command against the real files; `copy-sweep.test.ts` already
guards the README for tone. A manual check confirms no factory internals.

Commands (both must pass before the run ends): `npm test` (Vitest, includes the
copy sweep), `bash scripts/e2e.sh` (Playwright in the pinned container).
`npm run build && npm run check:size` confirms the bundle budget.

---

## Notes for the implementer

- The alignment marks are the differentiator. Make them legible without color and
  keep them neutral. A pattern that means "this differs" is correct; anything
  that reads as "this is wrong" (an X, a strike-through, red) is a defect against
  the honesty guarantee and the "never claims one version is better" test.
- This is a correction pass. When a screen already clears the bar, leave it.
  Every change here closes a specific, named gap; "while I'm here" restyling is
  drift.
- Reuse existing copy for the new error messages ("This device blocked the save.
  Allow storage, then try again.") so the voice stays consistent and the sweep
  stays green.
- Do not touch the loop's computation or storage: `align.ts`, the vault guard,
  the store contract, and `DB_VERSION` are all frozen for this EPIC.
- Prove the mobile and a11y claims at 390px in the e2e, not by eye. State in the
  run summary what changed and what was already compliant, so the reviewer can
  see the pass was real and scoped.
