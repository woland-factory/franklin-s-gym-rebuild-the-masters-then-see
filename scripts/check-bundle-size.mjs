#!/usr/bin/env node
// Fails the build if the eagerly-loaded bundle (entry JS + everything it imports
// statically, plus CSS) exceeds the gzipped budget. Lazy chunks such as the
// on-demand Sentry import are excluded because they never load on first paint.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIST = "dist";
const BUDGET_BYTES = 200 * 1024; // 200 KB gzipped

const manifestPath = join(DIST, ".vite", "manifest.json");
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch {
  console.error(`Bundle-size check: no manifest at ${manifestPath}. Run "npm run build" first.`);
  process.exit(1);
}

const entry = Object.values(manifest).find((chunk) => chunk.isEntry);
if (!entry) {
  console.error("Bundle-size check: no entry chunk in manifest.");
  process.exit(1);
}

// Walk static imports only. dynamicImports (Sentry) are intentionally skipped.
const files = new Set();
const visit = (key) => {
  const chunk = manifest[key];
  if (!chunk || files.has(chunk.file)) return;
  files.add(chunk.file);
  for (const css of chunk.css ?? []) files.add(css);
  for (const imp of chunk.imports ?? []) visit(imp);
};
const entryKey = Object.keys(manifest).find((k) => manifest[k] === entry);
visit(entryKey);

let total = 0;
const rows = [];
for (const file of files) {
  const bytes = gzipSync(readFileSync(join(DIST, file))).length;
  total += bytes;
  rows.push([file, bytes]);
}

rows.sort((a, b) => b[1] - a[1]);
for (const [file, bytes] of rows) {
  console.log(`  ${(bytes / 1024).toFixed(2).padStart(7)} KB  ${file}`);
}
console.log(`  ${"-".repeat(7)}`);
console.log(`  ${(total / 1024).toFixed(2).padStart(7)} KB  total (gzipped, eager)`);

if (total > BUDGET_BYTES) {
  console.error(
    `\nBundle-size check FAILED: ${(total / 1024).toFixed(2)} KB > ${BUDGET_BYTES / 1024} KB budget.`,
  );
  process.exit(1);
}
console.log(`\nBundle-size check passed (budget ${BUDGET_BYTES / 1024} KB).`);
