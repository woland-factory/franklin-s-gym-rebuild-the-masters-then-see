# Franklin's Gym

Rebuild the masters, then see your gaps in color.

Franklin's Gym is a writing practice tool built on Benjamin Franklin's own
exercise. You condense a great passage into short hints, wait a few days, then
rebuild it from memory. The tool lays your version beside the original, sentence
by sentence, so you can see exactly what you kept and what you lost. Everything
stays on your device. There is no account and no server.

The full loop works end to end. You start an attempt from a library passage or
your own pasted text, condense it into hints one sentence at a time, and vault
the original behind a delay so memory does the work. Once the attempt is ripe
you rebuild the passage from your hints alone, and the app computes a
deterministic sentence-by-sentence alignment against the original: matched
sentences side by side with word-level marks, sentences only in the original,
sentences only in yours, and a neutral length comparison per pair. The
alignment is pure local computation. There is no score and no AI critique, just
the differences in color. A worked example at `/example` shows a finished
alignment without the wait.

A first-time visitor lands on a short guided path that walks the whole loop
once. It starts a quick drill on a small passage, fills the short wait with a
warm-up reading, and ends the first session in a real alignment the same day.
The guide is skippable at any step and never returns once you finish your first
rebuild.

Every completed attempt files into the ledger at `/ledger`: a dated history,
newest first, each linking back to its alignment, plus two reconstruction
fidelity charts that track how much of the hinted substance each rebuild
recovered. Both numbers are derived from the saved alignment, never a graded
quality score. The ledger also exports your whole record as one plain JSON file
you can read in any editor and keep, and imports it back into a fresh device.

## Run it

You need [Node.js](https://nodejs.org/) 22+ for local development, or Docker to
run the built app.

### Local development

```bash
git clone <this-repo-url>
cd franklin-s-gym-rebuild-the-masters-then-see
npm install
npm run dev
```

Vite prints a local URL (default `http://localhost:5173`). Open it in a browser.

Analytics and error tracking are optional. To enable them locally, copy
`.env.example` to `.env` and fill in the values. The app runs fine with them
left blank.

### Run the built app in Docker

Build the production image and serve it:

```bash
docker build -t franklins-gym .
docker run --rm -p 8080:80 franklins-gym
```

Open `http://localhost:8080`. The container serves the static build through
nginx with SPA routing. It reads `UMAMI_URL`, `UMAMI_WEBSITE_ID`, `SENTRY_DSN`,
and `SEED_DEMO` from the environment at start and injects them at runtime, so the
same image works across environments. Set `SEED_DEMO=1` to open a fresh device on
a ready-made demo attempt that reaches the alignment view in one tap. Pass any of
them with `-e` if you want them set:

```bash
docker run --rm -p 8080:80 \
  -e UMAMI_URL=... -e UMAMI_WEBSITE_ID=... -e SENTRY_DSN=... \
  franklins-gym
```

`docker-compose.staging.yml` is the deploy manifest. It runs the same image
behind a shared reverse proxy and does not publish a host port, so use the
`docker run` command above for local checks.

## How the code is laid out

- `src/routes/` screens: the home dashboard, the library browser, the condense
  screen, the reconstruct screen, the alignment view, the ledger, the worked
  example, and the 404.
- `src/components/` shared UI: layout, empty state, error state, skeleton,
  passage card, attempt card, paste-your-own, the alignment renderer, and the
  trend chart.
- `src/data/` the curated seed passages, their types, and the fixed worked
  example.
- `src/lib/` local persistence (IndexedDB), the typed data store, sentence
  segmentation, the alignment engine, fidelity metrics, record export and
  import, delay presets, ripeness helpers, calendar export, runtime config,
  the first-run guide logic, the demo-seed builder, analytics, and
  error-tracking wiring.
- `src/styles/` design tokens and global CSS.
- `e2e/` Playwright smoke tests.

## Run the tests

Unit and component tests (Vitest, jsdom, fake-indexeddb):

```bash
npm test
```

End-to-end smoke tests run in the pinned Playwright container so browsers match
the installed version and the shared host stays clean:

```bash
bash scripts/e2e.sh
```

The end-to-end suite builds the app, serves the production build on a
run-scoped port, and drives it in a headless browser. It needs no database: the
app stores everything in the browser's IndexedDB, and each run starts from a
clean profile.

Check the production bundle size budget:

```bash
npm run build && npm run check:size
```

## License

MIT. See [LICENSE](./LICENSE).
