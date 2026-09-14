import { getConfig } from "./config";

// Initializes Sentry only when a DSN is present. Sentry is imported on demand so
// it stays out of the main bundle and never loads when tracking is off. The DSN
// is never logged.
export async function initObservability(): Promise<void> {
  const { sentryDsn } = getConfig();
  if (!sentryDsn) return;

  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: 0,
      // No passage or attempt text is ever attached to events.
      sendDefaultPii: false,
    });
  } catch {
    // Tracking is optional. A failed load must never break the app.
  }
}
