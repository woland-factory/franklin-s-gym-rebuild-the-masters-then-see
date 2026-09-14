import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// Mechanical copy sweep over source and the README. Historical seed prose is
// exempt (em-dashes there are the authors' own), as are test files.
const ROOT = resolve(__dirname, "..", "..");
const SRC = resolve(__dirname, "..");

const EXEMPT = new Set(["seedPassages.ts"]);

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
      continue;
    }
    if (/\.(test|spec)\.[tj]sx?$/.test(entry.name)) continue;
    if (EXEMPT.has(entry.name)) continue;
    if (/\.(ts|tsx|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const filesToScan = [...collectFiles(SRC), join(ROOT, "README.md")];

const DASH_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "em-dash", re: /—/ },
  { label: "en-dash", re: /–/ },
];

const BANNED_WORDS = [
  "seamlessly",
  "effortlessly",
  "unlock",
  "elevate",
  "empower",
  "leverage",
  "robust",
  "dive in",
  "fast-paced world",
  "we've got you covered",
];

const NEGATIVE_PHRASES: RegExp[] = [
  /you don't have/i,
  /no\s+[\w\s]{0,20}\s+yet\b/i,
  /nothing[\w\s]{0,20}here/i,
  /unable to/i,
  /something went wrong/i,
];

describe("copy sweep", () => {
  it.each(filesToScan)("%s has no dash-aside characters", (file) => {
    const text = readFileSync(file, "utf8");
    for (const { label, re } of DASH_PATTERNS) {
      expect(re.test(text), `${label} found in ${file}`).toBe(false);
    }
  });

  it.each(filesToScan)("%s uses no banned LLM vocabulary", (file) => {
    const text = readFileSync(file, "utf8").toLowerCase();
    for (const word of BANNED_WORDS) {
      expect(text.includes(word), `banned word "${word}" found in ${file}`).toBe(false);
    }
  });

  it.each(filesToScan)("%s has no negative empty-state phrasing", (file) => {
    const text = readFileSync(file, "utf8");
    for (const re of NEGATIVE_PHRASES) {
      expect(re.test(text), `negative phrasing ${re} found in ${file}`).toBe(false);
    }
  });
});
