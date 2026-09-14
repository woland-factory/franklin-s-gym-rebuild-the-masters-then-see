#!/bin/sh
set -e
# Regenerate runtime config from container env on every start. Empty values are
# the default, and the app runs cleanly when they are absent. No secret is ever
# baked into the image.
cat > /usr/share/nginx/html/env-config.js <<EOF
window.__APP_CONFIG__ = {
  UMAMI_URL: "${UMAMI_URL:-}",
  UMAMI_WEBSITE_ID: "${UMAMI_WEBSITE_ID:-}",
  SENTRY_DSN: "${SENTRY_DSN:-}"
};
EOF
exec nginx -g 'daemon off;'
