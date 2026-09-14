# EPIC SPEC — App shell, seed library & staging scaffold

Franklin's Gym: rebuild the masters, then see your gaps in color.

This is the first EPIC. It builds the foundation the loop stands on: the
client app skeleton (build, routing, local persistence), the curated seed
passage library, the home dashboard shell with its designed empty state,
analytics and error-tracking wiring, and the deploy scaffold. It ships no
part of the condense → vault → reconstruct → align → ledger loop yet.

---

## Quality differentiator (this app must win here)

**Incorruptible, instant confrontation.** The product wins on the honesty
and precision of a deterministic sentence-by-sentence diff against a fixed
original, computed in seconds, where paper cannot collate without tedium
and a chatbot flatters. That alignment logic lands in EPIC 3, not here.

**What it demands of THIS EPIC:** build the foundation so the future
confrontation loads fast, feels honest, and never leaks the original.
Concretely for this EPIC:
- The seed library is the raw material the confrontation runs on. Segment
  each passage cleanly and pick works whose prose still reads as modern,
  so the eventual diff teaches instead of confusing the user with archaic
  syntax. Sloppy seed data poisons every downstream alignment.
- The shell must be fast and local-first from the first commit: real
  content within ~1s, all state on the device, no network round-trip in
  the core path. The differentiator is "computed in seconds on your
  machine"; a slow or server-dependent shell contradicts it before the
  loop even exists.

---

## Scope

### In scope
1. **App skeleton**: a single-page browser app (Vite + React +
   TypeScript), client-side routing, a production build, and a small,
   fast bundle.
2. **Local persistence layer**: an IndexedDB database initialized on
   startup with a forward-only schema, plus a typed data-access module.
   No user data ever leaves the device.
3. **Curated seed passage library**: at least 12 pre-1930 public-domain
   passages, each pre-segmented into sentences and tagged
   short/medium/long, with title, author, source, and year. Bundled as
   static read-only data. A read-only `/library` browse screen surfaces
   them.
4. **Home dashboard shell**: the `/` route with its designed empty state
   (no attempts exist yet), one obvious primary action, and a "See an
   example" entry point.
5. **Analytics & error-tracking wiring**: Umami (`UMAMI_URL`,
   `UMAMI_WEBSITE_ID`) and GlitchTip/Sentry (`SENTRY_DSN`), each read from
   env/deploy config, never committed, each active only when present. The
   app runs correctly with all three unset.
6. **Deploy scaffold**: a `Dockerfile` that builds the production image,
   a `docker-compose.staging.yml` that serves it on a documented port,
   nginx SPA config, and runtime env injection.
7. **README** rewritten for strangers (understand / run / contribute),
   verified against the actual compose files.

### Out of scope (non-goals — do not build)
- **No condense / reconstruct / align logic.** No hint capture, no
  vaulting, no delay clock, no reconstruction surface, no diff
  computation. (EPICs 2 and 3.)
- **No runtime segmentation of pasted text.** Seed sentences are
  hand-split in the data file. The pasted-text segmenter is EPIC 2.
- **No worked example payload.** The "See an example" button exists and
  is not a dead end (see Technical design §9), but the live worked
  attempt with a real alignment is EPIC 3.
- **No accounts, no server-side storage, no cloud sync.**
- **No first-run guided walkthrough, micro-drill, or `SEED_DEMO` demo
  state.** (EPIC 5.) The deploy scaffold must not crash when `SEED_DEMO`
  is set or unset, but it implements no demo behavior.
- **No ledger, trend chart, or export/import.** (EPIC 4.)
- **No quality/similarity score, streak, or leaderboard — ever.** (Binding
  condition 1; a permanent product-wide fence.)

---

## Quality bar applied to this EPIC

The quality bar is part of this spec. The clauses that attach to EPIC 1:

- **Perceived speed.** First meaningful render shows real home content,
  not a blank page, within ~1s on an ordinary connection. Keep the
  initial bundle small (budget below). Persistence init must not block
  first paint.
- **Mobile-first.** Every delivered screen (`/`, `/library`) is fully
  usable at a 390px viewport: no horizontal scroll, touch targets ~44px,
  text readable without zoom. Desktop is the enhancement.
- **Designed states.** Home empty state, library loading state
  (skeleton/placeholder that holds layout), and a persistence-error state
  in the product's voice with a next step. No white screens, no raw
  errors.
- **Security hygiene (applicable subset — there is no server).** Secrets
  via env only, never in the bundle or git. React output-encoding kept
  intact (no `dangerouslySetInnerHTML` on any text). No PII in logs
  (there is no user PII in this EPIC regardless). Server-auth and
  rate-limit clauses have no route to attach to and are not applicable.
- **Accessibility basics.** Semantic headings and landmarks, every
  interactive control labeled and keyboard-reachable, visible focus
  states, sufficient contrast, alt text on meaningful images.
- **Radically simple interface.** One obvious primary action per screen.
  Cut copy to the minimum. Show the passages, do not explain them.
- **Copy sounds like a person.** Run the mechanical sweep (below) over
  every user-visible string before finishing.
- **README for strangers.** Delivered and verified against the compose
  files.

The **full first-run guided walkthrough is EPIC 5 and out of scope here.**
For this EPIC, the home empty state alone must make the product
self-explanatory: a new visitor understands what the app does and sees an
obvious next step. That is comprehension via layout, not a walkthrough.

---

## Technical design

### 1. Stack and rationale
- **Vite + React + TypeScript.** Static SPA, fast dev, small production
  bundle, trivial to serve from a container. No backend, matching the
  local-first architecture.
- **Routing:** `react-router-dom` (client-side).
- **Persistence:** IndexedDB via the small `idb` wrapper (promise-based,
  ~1KB). No ORM, no Dexie — the smallest thing that gives typed access.
- **Styling:** plain CSS with CSS custom properties as design tokens
  (colors, spacing, radii, type scale) in one `tokens.css`, plus
  component-scoped CSS Modules. No UI component library, no Tailwind. This
  keeps the bundle small and the surface honest.
- **Analytics:** conditional Umami script injection.
- **Error tracking:** `@sentry/react`, initialized only when a DSN is
  present.
- **Tests:** Vitest + `@testing-library/react` + `fake-indexeddb` for
  unit/component tests; one Playwright smoke spec for viewport and
  first-render checks.

Do not add state-management libraries, form libraries, or a component kit.
Nothing here needs them.

### 2. Project structure (files/modules to create)
```
/  (worktree root)
  Dockerfile
  docker-compose.staging.yml
  nginx.conf
  docker-entrypoint.sh
  .env.example
  .dockerignore
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  public/
    env-config.js          # default empty runtime config (committed, no secrets)
  src/
    main.tsx               # app bootstrap: mount, init persistence, init observability
    App.tsx                # router + layout shell
    routes/
      Home.tsx             # '/' dashboard shell + empty state
      Library.tsx          # '/library' read-only seed browser
      NotFound.tsx         # catch-all 404, in-voice
    components/
      AppLayout.tsx        # header/landmarks, responsive container
      EmptyState.tsx       # reusable designed empty state
      PassageCard.tsx      # one seed passage (title/author/source/band)
      Skeleton.tsx         # layout-holding loading placeholder
      ErrorState.tsx       # in-voice error surface
    data/
      seedPassages.ts      # the >=12 curated passages (typed, read-only)
      seedPassages.types.ts
    lib/
      db.ts                # IndexedDB open/init, forward-only migration
      store.ts             # typed data-access over db.ts
      config.ts            # reads runtime + build env (Umami, Sentry)
      analytics.ts         # conditional Umami injection
      observability.ts     # conditional Sentry init
      wordCount.ts         # helper for band validation/tests
    styles/
      tokens.css
      global.css
  tests/                   # or *.test.ts colocated; pick one, be consistent
    ...
    smoke.spec.ts          # Playwright: 390px + first render
```
This is a guide, not a contract. Match names to what reads cleanly. Do not
create modules for logic this EPIC does not implement (no `align.ts`,
`segment.ts`, `attempt.ts`).

### 3. Data model — persistence (forward-only, version 1)
IndexedDB database, opened once at startup.

- **Database name:** `franklins-gym`
- **Version:** `1`
- **Object stores created in v1:**
  - `attempts` — `keyPath: "id"`; indexes: `by-status` on `status`,
    `by-createdAt` on `createdAt`. (No records are written this EPIC;
    the store is created so later EPICs migrate forward, never rewrite v1.)
  - `settings` — `keyPath: "key"`. Seed one record only if you need a
    schema/version marker; otherwise leave empty.
- **Migrations are forward-only.** `db.ts` uses the `upgrade` callback and
  switches on `oldVersion` so future versions add stores/indexes without
  destroying v1 data. Never delete-and-recreate the database on schema
  change.
- **Seed passages do NOT live in IndexedDB.** They are bundled static
  data (`data/seedPassages.ts`), read-only, imported at build time. This
  guarantees seed quality and keeps them versioned in git.
- **No user data leaves the device.** There is no network write path in
  this EPIC. Do not add fetch/XHR calls that transmit user or app state.
  (Analytics and Sentry, when enabled, transmit their own telemetry only;
  they carry no passage or attempt data.)

Initialization contract: `main.tsx` awaits (or renders a loading state
while) `openDb()` before rendering interactive content. If `openDb()`
rejects (e.g. IndexedDB unavailable in a locked-down browser), render
`ErrorState` in the product's voice with a retry action. The app must not
crash to a blank page.

### 4. Seed library data contract
`data/seedPassages.ts` exports a typed array. Each passage:

```ts
type LengthBand = "short" | "medium" | "long";

interface SeedPassage {
  id: string;            // stable slug, e.g. "twain-life-on-the-mississippi-1"
  title: string;         // work title
  author: string;        // author full name
  source: string;        // where it is sourced, e.g. "Project Gutenberg"
  year: number;          // publication year, MUST be < 1930
  sentences: string[];   // hand-split, in order, non-empty strings
  lengthBand: LengthBand;
  tags: string[];        // optional descriptive tags (e.g. "narrative", "essay")
  isCustom: false;       // literal false for all seeds
}
```

**Length bands** (by sentence count; word count is guidance to keep bands
honest, and every passage stays within the EPIC 2 cap of ≤400 words / ≤40
sentences):
- `short`: 2–4 sentences (~30–90 words). For the future micro-drill.
- `medium`: 5–9 sentences (~90–220 words).
- `long`: 10–18 sentences (~220–400 words).

**Library invariants (all must hold and are unit-tested):**
- At least **12** passages total.
- At least **3** passages with `lengthBand: "short"`.
- Every passage: `year < 1930`; non-empty `title`, `author`, `source`;
  `sentences.length >= 2` with no empty/whitespace-only sentence; unique
  `id`.
- Each passage's `sentences.length` falls within its declared band's
  range, and its total word count stays ≤400 and ≤40 sentences.
- Selection **skews toward still-modern-sounding classics** (concrete,
  plain prose), not ornate archaic syntax.

**Selection guidance (candidate pool — verify each is pre-1930 and public
domain, and record the specific work in `source`/`title`):** Mark Twain,
Robert Louis Stevenson, Abraham Lincoln (speeches/letters), Frederick
Douglass, Ambrose Bierce, William Hazlitt, Henry David Thoreau, Jonathan
Swift, Oscar Wilde, Charles Lamb, and Joseph Addison / Richard Steele (The
Spectator — Franklin's own training material, a fitting nod). Prefer
passages that read cleanly today. Attribute honestly; if a passage is
lightly modernized (spelling), note it in `tags`. Do not include anything
published in 1930 or later, and do not include user-pasted or modern text.

The implementer authors the actual passage text. Sweep every seed string
for the copy tells in the sweep list below (the passages are historical
prose, so em-dashes inside a quoted classic are the author's, not UI copy;
the tells apply to UI/microcopy you write, not to the public-domain text
itself — but do read the seed prose to confirm it reads as intended).

### 5. Config, analytics, error tracking (runtime-injectable)
The factory injects `UMAMI_URL`, `UMAMI_WEBSITE_ID`, and `SENTRY_DSN` as
**env at deploy time**. A static bundle is built once and deployed with
varying env, so use **runtime injection**, not only build-time baking:

- `public/env-config.js` (committed, default empty):
  ```js
  window.__APP_CONFIG__ = { UMAMI_URL: "", UMAMI_WEBSITE_ID: "", SENTRY_DSN: "" };
  ```
- `index.html` loads it in `<head>` before the app module:
  `<script src="/env-config.js"></script>`.
- `docker-entrypoint.sh` regenerates `env-config.js` from container env on
  startup, then launches nginx:
  ```sh
  #!/bin/sh
  set -e
  cat > /usr/share/nginx/html/env-config.js <<EOF
  window.__APP_CONFIG__ = {
    UMAMI_URL: "${UMAMI_URL:-}",
    UMAMI_WEBSITE_ID: "${UMAMI_WEBSITE_ID:-}",
    SENTRY_DSN: "${SENTRY_DSN:-}"
  };
  EOF
  exec nginx -g 'daemon off;'
  ```
- `lib/config.ts` reads each value from `window.__APP_CONFIG__` first,
  falling back to Vite build env (`import.meta.env.VITE_UMAMI_URL`, etc.)
  so local dev via `.env` also works. Treat empty string as absent.
- `lib/analytics.ts`: if both `UMAMI_URL` and `UMAMI_WEBSITE_ID` are
  present, inject `<script defer src="{UMAMI_URL}" data-website-id="{id}">`
  once. Otherwise do nothing.
- `lib/observability.ts`: if `SENTRY_DSN` is present, `Sentry.init({ dsn })`
  (browser/React). Otherwise do nothing. Never log the DSN or any key.

**With all three unset the app must run identically and cleanly** (no
injected script, no Sentry, no console errors). This is an acceptance
criterion and is unit-tested.

`.env.example` lists `VITE_UMAMI_URL`, `VITE_UMAMI_WEBSITE_ID`,
`VITE_SENTRY_DSN` with placeholder values and a comment that real values
arrive via deploy env. No real secret values in any tracked file.

### 6. Routing
- `/` → `Home` (dashboard shell; empty state this EPIC).
- `/library` → `Library` (read-only seed browser).
- `*` → `NotFound` (in-voice 404 with a link home).

Routes for `/condense`, `/reconstruct`, `/align`, `/ledger`, `/settings`
are **not** created this EPIC. Do not stub them.

### 7. Home dashboard shell (`/`)
- On first load there are no attempts, so `/` renders the **designed empty
  state**: a heading and one line saying what the app is for, one obvious
  **primary action**, and a subordinate **"See an example"** entry point.
- The pipeline-of-attempts view is a later EPIC; this EPIC renders only
  the empty state. Structure the component so a future "has attempts"
  branch is a clean addition, but do not build it.
- Primary action routes to `/library` (the natural first step: pick a
  passage). It is a real, working destination, not a dead end.
- "See an example" is the subordinate action (visually secondary). Its
  behavior this EPIC is defined in §9.

### 8. `/library` read-only browser
- Lists all seed passages as cards showing title, author, source, and
  length band. Grouped or filterable by band (a simple filter control is
  fine; do not over-build).
- **Read-only.** No "start an attempt" action (EPIC 2). A card may be
  expandable to preview the passage text, or not — keep it simple.
- Loading state uses `Skeleton` to hold layout while data resolves (seed
  data is synchronous import, so this is mostly the shell's initial paint;
  still provide the component for consistency and reuse downstream).
- Fully usable at 390px: cards stack, no horizontal scroll.

### 9. "See an example" this EPIC (no dead end, no EPIC 3 logic)
The live worked example with a real alignment is EPIC 3. To honor the
quality bar (no dead ends) without building align logic, "See an example"
this EPIC opens a short static **"How it works"** panel (modal or route
section) that explains the loop in 3–4 short steps and shows one real seed
sentence as an illustration. It performs **no** condense, vault, or diff
computation. Mark in a code comment that EPIC 3 replaces this target with
the live worked attempt.

This panel is NOT the EPIC 5 guided walkthrough (which anchors to live
controls step by step). It is a static explainer. Keep it to a few short
sentences; do not write an onboarding essay.

### 10. Deploy scaffold
- **Dockerfile** (multi-stage): stage 1 `node` builds (`npm ci` +
  `npm run build`); stage 2 `nginx:alpine` serves `dist/`, copies
  `nginx.conf`, `docker-entrypoint.sh`, and the built `env-config.js`
  target. Entrypoint regenerates config then runs nginx.
- **nginx.conf**: SPA fallback (`try_files $uri $uri/ /index.html;`),
  serves on container port `80`; sensible static caching for hashed
  assets; `env-config.js` served with no-cache so redeploys take effect.
- **docker-compose.staging.yml**: builds the image, maps a **documented
  host port** (use `8080:80`), passes `UMAMI_URL`, `UMAMI_WEBSITE_ID`,
  `SENTRY_DSN`, and `SEED_DEMO` through from env (all optional; app works
  with them unset). Document the URL (`http://localhost:8080`) in the
  README.
- **.dockerignore** excludes `node_modules`, `dist`, `.git`, `.env`.
- No secrets in any of these files.

### 11. Suggested UI copy (already swept — ship or improve, keep it clean)
These are provided so the implementer does not have to invent copy that
passes the sweep. Improve if you can; keep them tell-free.
- Home empty-state heading: **"Train against the masters"**
- Home empty-state line: **"Condense a great passage into hints. Days
  later, rebuild it from memory and see, sentence by sentence, what you
  kept and what you lost."**
- Primary action label: **"Browse passages"**
- Secondary action label: **"See an example"**
- Library heading: **"The library"** (or **"Passages"**)
- 404 copy: **"That page moved. Head back to the library."** with a link.
- Persistence error: **"This browser blocked local storage. Check your
  privacy settings and reload."** (adjust wording to the real cause; keep
  it positive and actionable, no stack trace).

Do not use "—" or "–" in any UI string. Do not use the banned vocabulary.
Do not phrase empty/error states negatively.

---

## Ordered task list

Each task lists concrete, testable acceptance criteria (AC).

### T1 — Project skeleton and build
Scaffold Vite + React + TS, routing, tokens/global CSS, layout shell.
- **AC1.1** `npm ci && npm run build` produces a `dist/` with no type
  errors.
- **AC1.2** `npm run dev` serves the app; `/` renders the layout shell.
- **AC1.3** Routes `/`, `/library`, and a catch-all `*` resolve; unknown
  paths render the in-voice 404.
- **AC1.4** Initial bundle budget: main JS + CSS gzipped **< 200 KB**
  combined (protects perceived speed). A build-size check asserts this.

### T2 — Local persistence layer
- **AC2.1** On startup the app opens the `franklins-gym` IndexedDB at
  version 1, creating the `attempts` (with `by-status`, `by-createdAt`
  indexes) and `settings` stores.
- **AC2.2** The `upgrade` path is forward-only (switch on `oldVersion`),
  written so later versions extend without destroying v1 data.
- **AC2.3** If the DB fails to open, the app shows the in-voice
  persistence `ErrorState` with a retry, never a blank page or raw error.
- **AC2.4** No code path transmits user/app data off-device.

### T3 — Seed passage library data
- **AC3.1** `data/seedPassages.ts` exports ≥ 12 passages matching the
  `SeedPassage` shape.
- **AC3.2** ≥ 3 passages are `short`; every passage's sentence count fits
  its band; every passage ≤ 400 words and ≤ 40 sentences.
- **AC3.3** Every passage has non-empty `title`, `author`, `source`,
  `year < 1930`, unique `id`, and ≥ 2 non-empty sentences.
- **AC3.4** Selection skews toward still-modern-sounding classics
  (reviewer-checkable; include a short rationale note in the file header
  comment listing the works and confirming public-domain/pre-1930 status).

### T4 — Home dashboard shell + empty state
- **AC4.1** `/` renders the designed empty state: a heading, one line
  naming what the app is for, one visually dominant primary action, and a
  subordinate "See an example" entry point.
- **AC4.2** Primary action navigates to `/library` (working destination).
- **AC4.3** "See an example" opens the static "How it works" panel (§9);
  it is not a dead end and computes no diff.
- **AC4.4** `/` shows real content on load (no blank page), usable at
  390px with no horizontal scroll, touch targets ~44px.

### T5 — Library browse screen
- **AC5.1** `/library` lists all seed passages with title, author, source,
  and length band, filterable or grouped by band.
- **AC5.2** Read-only: no attempt-starting action exists.
- **AC5.3** Usable at 390px (cards stack, no horizontal scroll); loading
  uses a layout-holding skeleton.

### T6 — Analytics & error-tracking wiring
- **AC6.1** Runtime `env-config.js` + `lib/config.ts` read `UMAMI_URL`,
  `UMAMI_WEBSITE_ID`, `SENTRY_DSN` (runtime first, Vite env fallback),
  treating empty as absent.
- **AC6.2** Umami script injects only when both Umami vars are present;
  Sentry inits only when the DSN is present.
- **AC6.3** With all three unset the app runs cleanly: no injected script,
  no Sentry, no console errors.
- **AC6.4** No secret or DSN appears in any committed file; `.env` is
  gitignored; `.env.example` holds placeholders only.

### T7 — Deploy scaffold
- **AC7.1** `docker build` produces a production image serving the built
  app via nginx with SPA fallback.
- **AC7.2** `docker compose -f docker-compose.staging.yml up` serves the
  app on the documented host port (`8080`); `GET http://localhost:8080/`
  returns HTTP 200 with the app HTML, and a deep link (e.g.
  `/library`) also returns the app (SPA fallback works).
- **AC7.3** The container starts and serves correctly with
  `UMAMI_URL`/`UMAMI_WEBSITE_ID`/`SENTRY_DSN`/`SEED_DEMO` all unset, and
  also when they are set (env injection reflected in `env-config.js`).
- **AC7.4** No secrets in `Dockerfile`, compose, nginx, or entrypoint.

### T8 — README for strangers
- **AC8.1** README states, in plain language (2–3 sentences), what the app
  is and why it exists.
- **AC8.2** README gives exact run commands (clone, install, dev; and
  `docker compose -f docker-compose.staging.yml up` with the
  `http://localhost:8080` URL) verified against the actual compose files.
- **AC8.3** README says where the code lives and how to run the tests.
- **AC8.4** No factory internals, no pipeline jargon.

### T9 — Copy sweep (part of DONE)
- **AC9.1** Every user-visible string (components, routes, empty/error
  states, 404, "How it works" panel, README UI-facing copy) is free of
  "—" and "–", the banned LLM vocabulary, and negative empty-state
  phrasing.
- **AC9.2** Strings read as written by a person: short, positive, direct.

---

## Test plan (which automated tests prove each planner criterion)

Framework: Vitest + `@testing-library/react` + `fake-indexeddb`; one
Playwright smoke spec. Every test runs in the foreground to completion.

| Planner acceptance criterion | Test(s) |
|---|---|
| App builds and runs; Dockerfile + `docker compose -f docker-compose.staging.yml up` serves on the documented port | `npm run build` succeeds in CI (AC1.1). Bundle-size check (AC1.4). Playwright smoke loads `/` and asserts the home heading is visible. **Manual/scripted integration:** `docker build` then `docker compose -f docker-compose.staging.yml up -d`, `curl -sf http://localhost:8080/` returns 200 with app HTML, `curl -sf http://localhost:8080/library` returns the app (SPA fallback). Record the result in the run summary. |
| Home shows real content within ~1s (no blank page), usable at 390px with no horizontal scroll | Playwright smoke at 390×844: assert the home heading and primary action are visible on load (proves non-blank), and `document.documentElement.scrollWidth <= window.innerWidth` (no horizontal scroll). Bundle-size budget test guards the ~1s render as an honest proxy. |
| Seed library ≥12 passages, segmented, tagged short/medium/long, title/author/source, ≥3 short, skew to modern classics | Vitest `seedPassages` invariant suite: count ≥12; ≥3 `short`; each has non-empty title/author/source, `year < 1930`, unique id, ≥2 non-empty sentences; sentence count within band; ≤400 words / ≤40 sentences. Skew-to-modern is a reviewer judgment aided by the file-header rationale. |
| Home empty state names the app's purpose, one primary action, plus "See an example" | Component test: `/` renders the heading and purpose line, exactly one primary action that links to `/library`, and a subordinate "See an example" control that opens the "How it works" panel. |
| Umami via `UMAMI_WEBSITE_ID`/`UMAMI_URL` and Sentry via `SENTRY_DSN` from env, uncommitted; app runs with all unset | Config/analytics unit tests: with vars set, `analytics` injects the Umami script and `observability` calls `Sentry.init`; with all unset, neither fires and no error is thrown. Grep-based test (or CI check) asserts no DSN/secret literals in tracked files and `.env` is gitignored. |
| Local persistence initialized; no user data leaves device | Persistence unit test with `fake-indexeddb`: `openDb()` resolves and creates `attempts` (+ indexes) and `settings`; forward-only upgrade path invoked with `oldVersion`. Error-path test: a failing open renders `ErrorState`. Static assertion: no fetch/XHR transmits app data (code review + no network module present). |

Additional (quality-bar) automated checks: copy-sweep test that scans
`src/**` user-visible strings and README for "—"/"–", the banned
vocabulary list, and negative empty-state phrases, failing on any hit.

---

## Definition of done
- All T1–T9 acceptance criteria met; all automated tests pass in the
  foreground.
- `docker compose -f docker-compose.staging.yml up` verified serving on
  `http://localhost:8080` with env set and unset.
- Copy sweep run and clean.
- README verified against the compose files.
- No non-goal built; no route or module created for later-EPIC logic.
- No secrets in tracked files.
