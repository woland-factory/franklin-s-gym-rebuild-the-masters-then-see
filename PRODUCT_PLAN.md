# PRODUCT PLAN — Franklin's Gym

Rebuild the masters, then see your gaps in color.

## Core value (one sentence)

Days after condensing a great passage into sentence-level hints, you rebuild
it blind from the hints alone and the tool lays your version beside the
master's with everything you dropped or flattened marked, then files the
attempt into a dated ledger that lets you watch your prose converge on the
writers you chose.

## North star

The excellent v3 feels like a gym with a mirror that never lies. A writer who
has trained here for months opens their ledger and can see, attempt by dated
attempt, their sentences landing closer to the masters they admire: fewer
dropped clauses, fewer abstractions where the original was concrete, rhythm
that holds. They keep coming back not because a badge told them to, but
because something is always ripe and the confrontation is always honest. The
value they carry away is not a score. It is a durable skill and a record they
would mourn losing: proof, in their own words next to Addison's or Twain's,
that the distance is closing. The standard is trust. The user believes what
the tool shows them because it never flatters and never moralizes; it just
shows the truth of the gap and lets that do the teaching.

## Quality differentiator (the one dimension we win on)

**Incorruptible, instant confrontation.** The alignment view is a
deterministic sentence-by-sentence diff against a fixed original, computed in
seconds. Paper cannot compute it without a tedious manual collation (the step
where DIY practice dies). A chatbot will not tell you the truth: its critique
is variable and flattering, and the original sits in scrollback where nothing
stops the peek that voids the exercise. Hemingway and the typing sites do not
attempt it at all. We commit to this one dimension: the honesty and precision
of the feedback. Every other choice bends to keep that confrontation fast,
fixed, and unflinching.

## Signature moment

Days after hinting a passage, you rebuild it blind and press align. Your
sentence appears beside the master's, and the twelve words you spent where the
original spent six, the second clause you forgot, the metaphor you turned into
an abstraction, are all marked in color. "It showed me exactly what I
flattened."

## Architecture at a glance

This is a **local-first browser app with no backend and no accounts.** The
whole loop is deterministic client-side computation: sentence segmentation
plus best-match alignment (token overlap + edit distance, the same family as a
code diff). This is a deliberate design choice, not a shortcut, and it is what
makes the product what it is:

- **No runtime LLM anywhere in the core loop.** No bring-your-own-key wall, no
  gateway grant, no per-use cost, no chatbot to flatter you. First value needs
  no key and no account.
- **No accounts, no server-side user data.** The ledger lives on the user's
  device (IndexedDB). Pasted modern passages stay local and are never uploaded
  or redistributed. Durability comes from plain-file export/import, not a
  cloud.
- **The reminder mechanism is a calendar file (.ics)**, not email or push. No
  mail service, no notification storms.

Deployment is a static frontend served from a container (Dockerfile +
`docker-compose.staging.yml`), honoring the `SEED_DEMO` convention for the
staging first-minute demo. Umami analytics (`UMAMI_WEBSITE_ID` / `UMAMI_URL`)
and GlitchTip/Sentry (`SENTRY_DSN`) wire in from env at build/deploy time and
are never committed.

Because there is no server, the QUALITY BAR's server-auth and rate-limit
clauses have no route to attach to. The applicable hygiene still binds and is
in scope on every EPIC: validate pasted input at the boundary (types, size
caps), encode all user text on output to prevent XSS, keep secrets out of the
bundle, keep the alignment computation bounded so no passage can make it slow,
and keep no PII in logs.

## The two binding traps (from validation — treated as spec)

1. **The metric trap is fenced off.** Deterministic metrics measure
   *reconstruction fidelity* (how many hinted ideas you recovered, sentence
   and structure match), never *prose quality*. A parrot scores perfectly, and
   Franklin's own endgame of improving the original is deliberate divergence a
   similarity score would punish. The ledger charts recovered-substance over
   time. There is **no single "similarity to the master" quality score, no
   streak, and no leaderboard** anywhere in the product. Building one would
   measurably train memorization, the exact thing this tool exists to be
   better than.
2. **The diff is honest, never oversold.** The alignment marks *differences*
   (omissions, additions, length and structure gaps), never *worseness*.
   Framing copy and the color legend say "in the original / in yours" and let
   the confrontation teach. Nothing labels the user "wrong."

---

## User stories (MVP only)

- As someone told to "read more" one time too many, I pick a passage from a
  curated library, note each sentence in a few words, and the tool locks the
  original away until the delay passes, so I cannot cheat the forgetting.
- As a returning user, I see which of my passages are ripe and rebuild one
  from my notes alone.
- As a writer, when I submit my rebuild I see it aligned sentence by sentence
  against the original with everything I dropped or padded marked in color, so
  I learn exactly what I flatten.
- As a long-term user, I open my ledger and see every dated attempt and my
  recovered-substance trend, and I export the whole record as plain files I
  own.
- As a brand-new user, I complete the loop once the same day through a short
  guided micro-drill, so my first session ends in a real alignment instead of
  homework days away.
- As a privacy-minded user, I paste my own modern passage and practice on it
  knowing it never leaves my device.

## Data model sketch (client-side store)

- **Passage** — `id, title, author, source, year, sentences[], lengthBand
  (short|medium|long), tags[], isCustom`. Seed passages are read-only and
  bundled; custom passages are user-pasted, local, and private.
- **Attempt** — `id, passageRef (or embedded snapshot for custom),
  createdAt, hints[] (one per sentence), delayType (micro|standard),
  vaultedUntil, status (condensing|vaulted|ripe|reconstructed),
  reconstructionText, reconstructedAt, timeSpentMs, alignment, metrics`.
- **Alignment** — `pairs[] { originalSentence, yourSentence|null, matchType
  (matched|omission|addition), diffSpans[], lengthDelta }`. Cached on the
  attempt.
- **Metrics** — reconstruction-fidelity only: `recoveredSubstancePct,
  sentenceCountDelta, lengthRatio`. No composite quality score.
- **Settings** — default delay, theme.

## Screen / route inventory (all client-side; no server endpoints)

- `/` Home dashboard: pipeline of attempts with ripeness states; designed
  empty state; "See an example" entry to the worked demo.
- `/library` Browse seed passages (filter by length band); paste-your-own.
- `/condense/:attemptId` Sentence-by-sentence hint capture; on finish, vault.
- `/reconstruct/:attemptId` Rebuild from hints only; original never shown.
- `/align/:attemptId` The alignment view (signature moment).
- `/ledger` Dated history + recovered-substance trend + export/import.
- `/settings` Delay defaults, data export/import, theme.

---

## EPIC list (build order)

Depth-first toward the signature moment. EPICs 2 and 3 build the loop; 4 makes
it durable; 5 solves the delay cliff so day one ends in a real alignment; 6 is
the professional polish pass.

### EPIC 1 — App shell, seed library & staging scaffold

**Scope.** The client app skeleton (build, routing, local persistence layer),
the curated seed passage library, the home dashboard shell with its designed
empty state, analytics and error-tracking wiring, and the deploy scaffold.

**Acceptance criteria.**
- App builds and runs. A `Dockerfile` builds the production image, and
  `docker compose -f docker-compose.staging.yml up` serves the built app on
  the documented port. (Staging scaffold; a missing staging compose is a
  shipping blocker.)
- Home route shows real content within ~1s on first load (no blank page) and
  is usable at 390px with no horizontal scroll.
- Seed library holds at least 12 curated pre-1930 public-domain passages,
  each segmented into sentences and tagged short/medium/long, with title,
  author, and source attribution. At least three "short" passages exist for
  the micro-drill. The library skews toward still-modern-sounding classics.
- Home empty state names what the app is for and offers one obvious primary
  action, plus a "See an example" entry point (its payload lands in EPIC 3).
- Umami wired via `UMAMI_WEBSITE_ID` / `UMAMI_URL`; GlitchTip/Sentry via
  `SENTRY_DSN`; both read from env/build config, neither committed. The app
  runs correctly with all three unset.
- Local persistence (IndexedDB or equivalent) is initialized; no user data
  leaves the device.

**Non-goals.** No condense/reconstruct/align logic yet. No accounts.

### EPIC 2 — Condense & vault

**Scope.** Start an attempt, capture a hint per sentence, vault the original
on completion with a chosen delay, show ripeness on the dashboard, export a
calendar reminder.

**Acceptance criteria.**
- User can start an attempt from any library passage. Paste-your-own accepts
  text, segments it into sentences client-side, enforces a documented length
  cap (e.g. 400 words / 40 sentences), and keeps it local and private.
- The condense screen presents one sentence at a time and captures a short
  hint for each; progress saves as you go.
- On completion the original is vaulted: it is not displayed anywhere until
  the ripe time passes. The user picks a delay, with a standard default and a
  short micro-drill option offered.
- The dashboard shows each attempt's state: condensing, vaulted (with a
  countdown or ripe date), or ripe. Ripe attempts are clearly actionable.
- Each vaulted attempt can export an `.ics` calendar event for its ripe date.
- All state survives reload.

**Non-goals.** No reconstruction or alignment yet. No push/email reminders.

### EPIC 3 — Reconstruct & alignment view (signature)

**Scope.** The rebuild step (hints only, original stays vaulted) and the
deterministic sentence-alignment view, plus a built-in worked example
reachable immediately.

**Acceptance criteria.**
- Reconstruct is available only when an attempt is ripe. The screen shows the
  user's hints and a writing surface and never the original text.
- On submit, the app segments both texts and computes a deterministic
  alignment (token overlap + edit distance) producing matched pairs,
  omissions (in the original, not in the rebuild), and additions (in the
  rebuild, not in the original). Computation is bounded by the length cap and
  finishes within ~1s for library passages.
- The alignment view shows matched sentences side by side on desktop and
  stacked at 390px, with color marks for dropped-from-original, added-by-you,
  and within-sentence differences, plus a per-pair length/structure
  indicator.
- Framing presents differences only. No copy, label, or legend claims one
  version is better or marks the user "wrong"; the legend reads "in the
  original / in yours." (Binding condition 3.)
- A built-in worked example (a completed sample attempt whose alignment shows
  genuine gaps) is reachable from the home empty state within a minute,
  without waiting for any delay.
- The alignment result is saved to the attempt for the ledger.

**Non-goals.** No quality score. No trend chart yet. No AI critique.

### EPIC 4 — Ledger & durability

**Scope.** The dated history, the recovered-substance trend, and plain-file
export/import.

**Acceptance criteria.**
- The ledger lists every attempt dated, newest first, paginated or capped so
  it never renders unbounded rows; each entry links to its alignment.
- A trend view charts reconstruction-fidelity metrics over time (share of
  hinted ideas recovered, sentence-count match). Every metric is labeled as
  reconstruction fidelity. There is no composite "quality" or
  "similarity-to-master" score, no streak, and no leaderboard. (Binding
  condition 1.)
- Export writes a plain, human-readable file set (JSON and/or Markdown) with
  passages, hints, reconstructions, alignments, and dates. Import restores
  them. Export then import into a fresh store reproduces the ledger.
- The ledger empty state explains what will accumulate here and points to the
  first action.

**Non-goals.** No cloud sync. No accounts. No sharing.

### EPIC 5 — First-run walkthrough & micro-drill

**Scope.** The guided first-success path, the day-one micro-drill so the first
session ends in a real alignment, and the `SEED_DEMO` staging demo.

**Acceptance criteria.**
- A brand-new user is led through the core action once via a short guided path
  (2 to 4 steps), each step one short imperative sentence anchored to the real
  controls. It is skippable at any step, appears only until first success, and
  never shows to a returning user.
- The micro-drill lets the first-run user run a short passage with a
  minutes-long delay filled by a distractor passage, so the interval is real
  yet the session still ends in an alignment the same day. (Binding
  condition 2.)
- The dashboard nudges building a pipeline (condense several passages) so
  something is ripe from the first return visit. The wording is a brief hint,
  not a lecture.
- When `SEED_DEMO` is set, the app opens on demo state that reaches the
  alignment view within a minute with no hand-crafted input.
- None of the first-run additions appear for a user who has already completed
  an attempt.

**Non-goals.** No new core mechanics. No extra Franklin drills.

### EPIC 6 — Polish (final quality pass)

**Scope.** A UX, performance, accessibility, and copy pass over the whole
delivered product against the QUALITY BAR and the quality differentiator. No
new features; tighten what exists.

**Acceptance criteria.**
- Every screen is usable at 390px with no horizontal scroll, touch targets
  ~44px, text readable without zoom.
- Empty, loading, and error states are designed on every screen: loading holds
  the layout (skeletons), errors speak in the product's voice with a next
  step, empties say what the screen is for.
- Perceived speed: first meaningful render ~1s; every interaction gives
  feedback within 100ms (pressed states, optimistic saves); the alignment
  computation shows in-place progress and never flashes a white screen; lists
  stay paginated or capped.
- Accessibility: sufficient contrast, visible focus states, labeled inputs,
  semantic headings and landmarks, full keyboard reach, meaningful alt text.
  The alignment marks are conveyed by more than color (icon, label, or
  pattern too) so the core view works for color-blind users.
- Copy sweep over every user-visible string: no "—" or "–", none of the
  banned LLM vocabulary, no negative empty-state phrasing. Positive, plain,
  one idea per sentence.
- The differentiator is verifiably present: the alignment confrontation is
  reachable in the first minute and reads as honest (differences, not
  worseness).
- `README.md` lets a stranger understand what the app is (plain language),
  run it (exact commands verified against the compose files), and contribute
  (where code lives, how to run tests). No factory internals.

---

## Non-goals / Out of scope (the fence)

- **No accounts, login, or server-side storage of user data.** Local-first by
  design; durability is plain-file export/import.
- **No runtime LLM, AI judge, or chatbot critique** anywhere in the loop.
  Bolting one on surrenders the substitution defense and re-imports the
  key-paste wall the architecture exists to avoid.
- **No single similarity/quality score, streak, leaderboard, or gamified
  "similarity to the master."** This is the metric trap; it would train
  parroting.
- **No spoken or audio reconstruction** (the "Franklin's Podium" sibling).
- **No full seven-drill Franklin curriculum** (jumble, verse, improve-the-
  original drills). v1 is one loop: condense → vault → reconstruct → align →
  ledger.
- **No social features, sharing, public profiles, or multiplayer.**
- **No push notifications or email reminders.** Calendar export only; no mail
  service.
- **No redistribution of user-pasted or modern/copyrighted passages.** Pasted
  text stays local and is never uploaded.
- **No instructor dashboards or classroom features** (the teacher variant).
- **No native mobile apps** and no cloud sync.
