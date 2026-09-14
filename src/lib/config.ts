// Reads runtime config (injected into window.__APP_CONFIG__ by the container
// entrypoint) first, then falls back to Vite build-time env so local dev with a
// .env file also works. Empty strings count as absent.

export interface AppConfig {
  umamiUrl: string;
  umamiWebsiteId: string;
  sentryDsn: string;
}

interface RuntimeConfig {
  UMAMI_URL?: string;
  UMAMI_WEBSITE_ID?: string;
  SENTRY_DSN?: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig;
  }
}

function clean(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  // Guard against a placeholder that survived a misconfigured deploy.
  if (trimmed.startsWith("${")) return "";
  return trimmed;
}

function pick(runtimeKey: keyof RuntimeConfig, buildValue: string | undefined): string {
  const runtime = typeof window !== "undefined" ? window.__APP_CONFIG__?.[runtimeKey] : undefined;
  const chosen = clean(runtime);
  return chosen || clean(buildValue);
}

export function getConfig(): AppConfig {
  return {
    umamiUrl: pick("UMAMI_URL", import.meta.env.VITE_UMAMI_URL),
    umamiWebsiteId: pick("UMAMI_WEBSITE_ID", import.meta.env.VITE_UMAMI_WEBSITE_ID),
    sentryDsn: pick("SENTRY_DSN", import.meta.env.VITE_SENTRY_DSN),
  };
}
