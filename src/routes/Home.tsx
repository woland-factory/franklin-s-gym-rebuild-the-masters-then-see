import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AttemptCard } from "../components/AttemptCard";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FirstRunGuide } from "../components/FirstRunGuide";
import { Skeleton } from "../components/Skeleton";
import { attemptState } from "../lib/attempts";
import type { AttemptRecord } from "../lib/db";
import { FIRST_RUN_DISMISSED_KEY, showPipelineNudge } from "../lib/firstRun";
import { getSetting, listAttempts } from "../lib/store";
import styles from "./Home.module.css";

type LoadStatus = "loading" | "ready" | "error";

// The dashboard. It shows the designed empty state before the first attempt,
// and a pipeline of attempt cards once there are any. Ripe attempts sort to the
// top so the next thing to do is first. Until the first success, a first-run
// guide walks a new user through one full loop.
export function Home() {
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<LoadStatus>("loading");

  const load = useCallback(() => {
    let live = true;
    setStatus("loading");
    Promise.all([listAttempts(), getSetting<boolean>(FIRST_RUN_DISMISSED_KEY)])
      .then(([rows, dismissedFlag]) => {
        if (!live) return;
        setAttempts(rows);
        setDismissed(dismissedFlag === true);
        setStatus("ready");
      })
      .catch(() => {
        if (live) setStatus("error");
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  if (status === "loading") {
    return <Skeleton lines={4} label="Loading your attempts" />;
  }

  if (status === "error") {
    return (
      <ErrorState
        title="Your attempts did not load"
        message="This device blocked local storage. Allow it, then try again."
        actionLabel="Try again"
        onAction={load}
      />
    );
  }

  const now = Date.now();

  if (attempts.length === 0) {
    // A fresh, undismissed store gets the guide as its primary surface. Once the
    // guide is skipped it renders nothing, so fall back to the designed empty
    // state.
    if (!dismissed) {
      return <FirstRunGuide attempts={attempts} now={now} onChanged={load} />;
    }
    return (
      <EmptyState
        title="Train against the masters"
        description="Condense a great passage into hints. Days later, rebuild it from memory and see, sentence by sentence, what you kept and what you lost."
        primary={
          <Link to="/library" className="btn btn-primary">
            Browse passages
          </Link>
        }
        secondary={<Link to="/example">See an example</Link>}
      />
    );
  }

  // Newest first, then float ripe attempts to the top. Capped so the list never
  // grows unbounded. Full paginated history arrives in a later release.
  const newestFirst = [...attempts].reverse();
  const ripe = newestFirst.filter((a) => attemptState(a, now) === "ripe");
  const rest = newestFirst.filter((a) => attemptState(a, now) !== "ripe");
  const ordered = [...ripe, ...rest].slice(0, 50);

  return (
    <section>
      <header className={styles.head}>
        <h1 className={styles.title}>Your attempts</h1>
        <Link to="/library" className="btn btn-secondary">
          Browse passages
        </Link>
      </header>
      <FirstRunGuide attempts={attempts} now={now} onChanged={load} />
      {showPipelineNudge(attempts, dismissed) && (
        <p className={styles.nudge}>
          Condense a few passages so one is always ripe when you come back.
        </p>
      )}
      <ul className={styles.list}>
        {ordered.map((attempt) => (
          <li key={attempt.id}>
            <AttemptCard attempt={attempt} now={now} />
          </li>
        ))}
      </ul>
    </section>
  );
}
