import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Manual chunking keeps the main entry bundle small so first paint is fast.
// Sentry is loaded on demand (see lib/observability.ts) and never enters the
// main chunk.
export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
    css: true,
  },
});
