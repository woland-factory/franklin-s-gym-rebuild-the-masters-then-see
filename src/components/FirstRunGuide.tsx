import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AttemptRecord, PassageSnapshot } from "../lib/db";
import { ripeLabel } from "../lib/attempts";
import {
  FIRST_RUN_DISMISSED_KEY,
  FIRST_RUN_MICRO_DRILL_KEY,
  MICRO_DRILL_PASSAGE_ID,
  WARMUP_PASSAGE_ID,
  firstRunView,
  type GuideStep,
} from "../lib/firstRun";
import { createAttempt, getSetting, putSetting } from "../lib/store";
import { seedPassages } from "../data/seedPassages";
import styles from "./FirstRunGuide.module.css";

interface FirstRunGuideProps {
  attempts: AttemptRecord[]; // already loaded by Home
  now: number; // Date.now() captured once by Home per render
  onChanged: () => void; // ask Home to reload after an action
}

const STATUS_LABEL: Record<GuideStep["state"], string> = {
  done: "Done",
  active: "Now",
  todo: "Next",
};

function snapshotFromSeed(id: string): PassageSnapshot {
  const passage = seedPassages.find((p) => p.id === id);
  if (!passage) throw new Error(`Seed passage ${id} is missing`);
  return {
    originalPassageId: passage.id,
    title: passage.title,
    author: passage.author,
    source: passage.source,
    year: passage.year,
    sentences: passage.sentences,
    isCustom: false,
  };
}

interface Settings {
  dismissed: boolean;
  microDrillId: string | undefined;
}

const START_BLOCKED = "This device blocked the save. Allow storage, then try again.";

// The first-run guide: a compact "first workout" checklist that walks a new user
// from the first note to the first alignment. It reads its own settings and
// derives its view with firstRunView, so all gate logic stays pure and tested.
export function FirstRunGuide({ attempts, now, onChanged }: FirstRunGuideProps) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const loadSettings = useCallback(() => {
    let live = true;
    Promise.all([
      getSetting<boolean>(FIRST_RUN_DISMISSED_KEY),
      getSetting<string>(FIRST_RUN_MICRO_DRILL_KEY),
    ])
      .then(([dismissed, microDrillId]) => {
        if (live) setSettings({ dismissed: dismissed === true, microDrillId });
      })
      .catch(() => {
        if (live) setSettings({ dismissed: false, microDrillId: undefined });
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => loadSettings(), [loadSettings]);

  // The guide is additive; a one-frame absence while settings load is fine.
  if (!settings) return null;

  const view = firstRunView({
    attempts,
    microDrillId: settings.microDrillId,
    dismissed: settings.dismissed,
    now,
  });
  if (view.kind === "hidden") return null;

  async function startDrill() {
    if (starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const attempt = await createAttempt(snapshotFromSeed(MICRO_DRILL_PASSAGE_ID), Date.now());
      await putSetting(FIRST_RUN_MICRO_DRILL_KEY, attempt.id);
      navigate(`/condense/${attempt.id}`);
    } catch {
      setStartError(START_BLOCKED);
      setStarting(false);
    }
  }

  async function skip() {
    await putSetting(FIRST_RUN_DISMISSED_KEY, true);
    onChanged();
    loadSettings();
  }

  const tracked =
    view.kind === "waiting" ? attempts.find((a) => a.id === view.attemptId) : undefined;
  const warmupPassage = seedPassages.find((p) => p.id === WARMUP_PASSAGE_ID);

  return (
    <section className={styles.card} aria-labelledby="first-run-heading">
      <h2 id="first-run-heading" className={styles.title}>
        Finish your first loop today
      </h2>
      <p className={styles.lede}>
        Note a short passage, pause a few minutes, then rebuild it. Your first alignment lands
        today.
      </p>

      <ol className={styles.steps}>
        {view.steps.map((step, i) => (
          <li key={i} className={styles.step} data-state={step.state}>
            <span className={styles.status} data-state={step.state}>
              {STATUS_LABEL[step.state]}
            </span>
            <span className={styles.stepLabel}>{step.label}</span>
          </li>
        ))}
      </ol>

      {view.kind === "waiting" && view.warmup && warmupPassage && (
        <div className={styles.warmup}>
          <h3 className={styles.warmupTitle}>Warm-up reading</h3>
          <p className={styles.warmupLede}>
            Read this while your passage ripens. The wait keeps your memory honest.
          </p>
          <ol className={styles.warmupList}>
            {warmupPassage.sentences.map((sentence, i) => (
              <li key={i}>{sentence}</li>
            ))}
          </ol>
          {tracked?.vaultedUntil != null && (
            <p className={styles.countdown} aria-live="polite">
              {ripeLabel(tracked.vaultedUntil, now)}
            </p>
          )}
        </div>
      )}

      <div className={styles.actions}>
        {view.kind === "start" && (
          <button
            type="button"
            className={`btn btn-primary ${styles.action}`}
            onClick={startDrill}
            disabled={starting}
          >
            {starting ? "Starting" : "Start the quick drill"}
          </button>
        )}
        {view.kind === "condensing" && (
          <Link to={`/condense/${view.attemptId}`} className={`btn btn-primary ${styles.action}`}>
            Keep noting
          </Link>
        )}
        {view.kind === "ripe" && (
          <Link
            to={`/reconstruct/${view.attemptId}`}
            className={`btn btn-primary ${styles.action}`}
          >
            Rebuild now
          </Link>
        )}

        {view.kind === "start" && (
          <div className={styles.secondary}>
            <Link to="/library">Browse passages</Link>
            <Link to="/example">See an example</Link>
          </div>
        )}

        {startError && (
          <p className={styles.startError} role="alert">
            {startError}
          </p>
        )}
      </div>

      <button type="button" className={styles.skip} onClick={skip}>
        Skip the guide
      </button>
    </section>
  );
}
