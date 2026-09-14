import { getConfig } from "./config";

const SCRIPT_ID = "umami-analytics";

// Injects the Umami script once, and only when both the URL and website id are
// present. Umami transmits its own page-view telemetry only. It never receives
// passage or attempt data.
export function initAnalytics(): void {
  if (typeof document === "undefined") return;

  const { umamiUrl, umamiWebsiteId } = getConfig();
  if (!umamiUrl || !umamiWebsiteId) return;
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.defer = true;
  script.src = umamiUrl;
  script.setAttribute("data-website-id", umamiWebsiteId);
  document.head.appendChild(script);
}
