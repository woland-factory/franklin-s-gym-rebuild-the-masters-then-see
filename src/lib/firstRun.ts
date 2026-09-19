import type { AttemptRecord } from "./db";
import { attemptState } from "./attempts";

// Pure, deterministic first-run logic. No I/O, no clock of its own: callers pass
// `now` in. Every gate and step decision lives here so it is unit-testable
// without a DOM.

export const FIRST_RUN_DISMISSED_KEY = "firstRun.dismissed";
export const FIRST_RUN_MICRO_DRILL_KEY = "firstRun.microDrillId";

/** Fixed short seeds for the guided drill and its warm-up. Both must exist in
 *  seedPassages and be distinct. Verified by a test. */
export const MICRO_DRILL_PASSAGE_ID = "wilde-dorian-gray-preface";
export const WARMUP_PASSAGE_ID = "lincoln-gettysburg-address";

// Step copy inventory (imperative, one idea each). Shipped verbatim.
export const STEP_NOTE = "Note each sentence in a few words.";
export const STEP_WARMUP = "Read the warm-up while the vault holds.";
export const STEP_REBUILD = "Rebuild the passage and see your alignment.";

/** True once any attempt is reconstructed. The master switch: when true, no
 *  first-run surface shows, ever. */
export function hasCompletedAttempt(attempts: AttemptRecord[]): boolean {
  return attempts.some((a) => a.status === "reconstructed");
}

export type StepState = "todo" | "active" | "done";

export interface GuideStep {
  label: string; // one short imperative sentence
  state: StepState;
}

export type GuideView =
  | { kind: "hidden" }
  | { kind: "start"; steps: GuideStep[] } // before any drill starts
  | { kind: "condensing"; attemptId: string; steps: GuideStep[] }
  | { kind: "waiting"; attemptId: string; warmup: boolean; steps: GuideStep[] }
  | { kind: "ripe"; attemptId: string; steps: GuideStep[] };

export interface FirstRunInput {
  attempts: AttemptRecord[];
  microDrillId: string | undefined; // from settings
  dismissed: boolean; // from settings
  now: number;
}

type ActiveKind = "start" | "condensing" | "waiting" | "ripe";

// The three fixed steps, with states derived from the current view kind.
function buildSteps(kind: ActiveKind): GuideStep[] {
  const note: StepState = kind === "start" || kind === "condensing" ? "active" : "done";
  const warmup: StepState =
    kind === "start" || kind === "condensing" ? "todo" : kind === "waiting" ? "active" : "done";
  const rebuild: StepState = kind === "ripe" ? "active" : "todo";
  return [
    { label: STEP_NOTE, state: note },
    { label: STEP_WARMUP, state: warmup },
    { label: STEP_REBUILD, state: rebuild },
  ];
}

// Resolves the one attempt the guide walks: the tracked micro-drill if it still
// exists, else the most recent non-reconstructed attempt (so a user who started
// from the library is still walked to first success).
function resolveTracked(
  attempts: AttemptRecord[],
  microDrillId: string | undefined,
): AttemptRecord | undefined {
  if (microDrillId) {
    const tracked = attempts.find((a) => a.id === microDrillId);
    if (tracked) return tracked;
  }
  let best: AttemptRecord | undefined;
  for (const a of attempts) {
    if (a.status === "reconstructed") continue;
    if (!best || a.createdAt > best.createdAt) best = a;
  }
  return best;
}

/** The single source of truth for what the guide shows. */
export function firstRunView(input: FirstRunInput): GuideView {
  const { attempts, microDrillId, dismissed, now } = input;
  if (dismissed || hasCompletedAttempt(attempts)) return { kind: "hidden" };

  const tracked = resolveTracked(attempts, microDrillId);
  if (!tracked) return { kind: "start", steps: buildSteps("start") };

  const state = attemptState(tracked, now);
  if (state === "condensing") {
    return { kind: "condensing", attemptId: tracked.id, steps: buildSteps("condensing") };
  }
  if (state === "ripe") {
    return { kind: "ripe", attemptId: tracked.id, steps: buildSteps("ripe") };
  }
  // Vaulted but not yet ripe. The warm-up fills a micro-delay wait only.
  const warmup = tracked.delayType === "micro";
  return { kind: "waiting", attemptId: tracked.id, warmup, steps: buildSteps("waiting") };
}

/** True when the populated-dashboard pipeline nudge should show: there is at
 *  least one attempt, and first-run is active (not dismissed, not completed). */
export function showPipelineNudge(attempts: AttemptRecord[], dismissed: boolean): boolean {
  return attempts.length > 0 && !dismissed && !hasCompletedAttempt(attempts);
}
