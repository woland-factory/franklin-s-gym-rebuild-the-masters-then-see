# Franklin's Gym

Rebuild the masters, then see your gaps in color.

Franklin's Gym is a writing practice tool built on Benjamin Franklin's own
exercise. You condense a great passage into short hints, wait a few days, then
rebuild it from memory. The tool lays your version beside the original, sentence
by sentence, so you can see exactly what you kept and what you lost. Everything
stays on your device. There is no account and no server.

This release is the foundation: the app shell, a curated library of
public-domain passages, and local persistence. The condense, rebuild, and
alignment steps arrive in later releases.

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
nginx with SPA routing. It reads `UMAMI_URL`, `UMAMI_WEBSITE_ID`, and
`SENTRY_DSN` from the environment at start and injects them at runtime, so the
same image works across environments. Pass them with `-e` if you want them set:

```bash
docker run --rm -p 8080:80 \
  -e UMAMI_URL=... -e UMAMI_WEBSITE_ID=... -e SENTRY_DSN=... \
  franklins-gym
```

`docker-compose.staging.yml` is the deploy manifest. It runs the same image
behind a shared reverse proxy and does not publish a host port, so use the
`docker run` command above for local checks.

## How the code is laid out

- `src/routes/` screens: the home dashboard, the library browser, the 404.
- `src/components/` shared UI: layout, empty state, error state, skeleton,
  passage card, and the "How it works" panel.
- `src/data/` the curated seed passages and their types.
- `src/lib/` local persistence (IndexedDB), the typed data store, runtime
  config, analytics, and error-tracking wiring.
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
